import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Trash2, AlertTriangle, ShoppingBag, User, Hash,
  Pencil, CheckCircle, XCircle, Clock, X, PlusCircle, Minus,
  AlertCircle, Info, Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { getOrder, updateOrderItems, updateOrderStatus, deleteOrder } from "../api/orders";
import { getProducts } from "../api/products";
import ConfirmDialog from "../components/ConfirmDialog";

/* ── Constants ───────────────────────────────────────────── */
const STATUS_BADGE = {
  pending:   "badge-yellow",
  completed: "badge-green",
  cancelled: "badge-red",
};

const STATUS_ICON = {
  pending:   <Clock   size={15} />,
  completed: <CheckCircle size={15} />,
  cancelled: <XCircle  size={15} />,
};

/** What transitions are allowed from each status */
const TRANSITIONS = {
  pending:   ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const TRANSITION_META = {
  completed: {
    label:   "Mark as Completed",
    icon:    <CheckCircle size={15} />,
    cls:     "btn-complete",
    confirm: (id) => `Mark order #${id} as completed? This cannot be undone.`,
  },
  cancelled: {
    label:   "Cancel Order",
    icon:    <XCircle size={15} />,
    cls:     "btn-danger",
    confirm: (id) => `Cancel order #${id}? Stock for all items will be automatically restored.`,
  },
};

/* ── Item helpers (shared with create) ───────────────────── */
const EMPTY_ITEM = { product_id: "", quantity: "" };

function resolveProduct(products, pid) {
  return pid ? products.find((p) => p.id === +pid) || null : null;
}

function validateEditItems(items, products) {
  const errors = {};
  const seen = new Set();
  items.forEach((it, i) => {
    const pid = +it.product_id;
    const qty = +it.quantity;
    if (!it.product_id) { errors[`p${i}`] = "Select a product"; return; }
    if (seen.has(pid))  { errors[`p${i}`] = "Duplicate — already in this order"; }
    seen.add(pid);
    if (!it.quantity || isNaN(qty) || qty < 1)   { errors[`q${i}`] = "Minimum quantity is 1"; return; }
    if (!Number.isInteger(qty))                   { errors[`q${i}`] = "Must be a whole number"; return; }
    const product = resolveProduct(products, pid);
    if (product) {
      if (product.quantity === 0) { errors[`q${i}`] = `"${product.name}" is out of stock`; }
      else if (qty > product.quantity + (it._original_qty || 0)) {
        errors[`q${i}`] = `Only ${product.quantity + (it._original_qty || 0)} available`;
      }
    }
  });
  return errors;
}

/* ── Status Panel ────────────────────────────────────────── */
function StatusPanel({ order, onStatusChange, loading }) {
  const allowed  = TRANSITIONS[order.status] || [];
  const isLocked = allowed.length === 0;
  const [confirming, setConfirming] = useState(null); // "completed" | "cancelled"

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="stat-card-icon" style={{
            width: 34, height: 34,
            background: order.status === "completed" ? "#d1fae5" : order.status === "cancelled" ? "#fee2e2" : "#fef3c7",
            color: order.status === "completed" ? "#059669" : order.status === "cancelled" ? "#dc2626" : "#d97706",
          }}>
            {STATUS_ICON[order.status]}
          </div>
          <div>
            <h3>Order Status</h3>
            <p>Manage the lifecycle of this order</p>
          </div>
        </div>
        <span className={`badge ${STATUS_BADGE[order.status] || "badge-gray"}`} style={{ fontSize: 13, padding: "5px 14px" }}>
          {STATUS_ICON[order.status]}&nbsp;{order.status}
        </span>
      </div>

      <div className="card-body">
        {/* Status timeline */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
          {["pending", "completed"].map((s, i) => {
            const done   = order.status === "completed" && s === "completed";
            const active = order.status === s;
            const skip   = order.status === "cancelled";
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 1 ? "none" : 1 }}>
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  minWidth: 80,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: done || active ? (s === "cancelled" ? "var(--danger)" : s === "completed" ? "var(--success)" : "var(--primary)") : "var(--gray-200)",
                    color: done || active ? "white" : "var(--gray-400)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700,
                    border: active ? `2px solid ${s === "completed" ? "var(--success)" : "var(--primary)"}` : "2px solid transparent",
                    boxShadow: active ? `0 0 0 3px ${s === "completed" ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.2)"}` : "none",
                    transition: "all 0.2s",
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? "var(--gray-900)" : "var(--gray-400)", textTransform: "capitalize" }}>
                    {s}
                  </span>
                </div>
                {i < 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: "0 4px", marginBottom: 16,
                    background: order.status === "completed" ? "var(--success)" : "var(--gray-200)",
                    transition: "background 0.3s",
                  }} />
                )}
              </div>
            );
          })}
          {order.status === "cancelled" && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "var(--danger)", fontSize: 12.5, fontWeight: 600 }}>
              <XCircle size={14} /> Cancelled — stock restored
            </div>
          )}
        </div>

        {/* Action buttons */}
        {isLocked ? (
          <div style={{
            background: "var(--gray-50)", border: "1px solid var(--border)",
            borderRadius: "var(--r-md)", padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 10,
            color: "var(--gray-500)", fontSize: 13.5,
          }}>
            <Lock size={15} style={{ color: "var(--gray-400)", flexShrink: 0 }} />
            This order is <strong style={{ color: "var(--gray-700)" }}>{order.status}</strong> and cannot be modified.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {allowed.map((nextStatus) => {
              const meta = TRANSITION_META[nextStatus];
              return (
                <button
                  key={nextStatus}
                  className={`btn ${meta.cls}`}
                  onClick={() => setConfirming(nextStatus)}
                  disabled={loading}
                >
                  {meta.icon} {meta.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Inline confirm for status transitions */}
      {confirming && (
        <ConfirmDialog
          title={TRANSITION_META[confirming].label}
          message={TRANSITION_META[confirming].confirm(order.id)}
          onConfirm={() => { onStatusChange(confirming); setConfirming(null); }}
          onCancel={() => setConfirming(null)}
          loading={loading}
        />
      )}
    </div>
  );
}

/* ── Edit Items Modal ────────────────────────────────────── */
function EditItemsModal({ order, products, onSave, onClose }) {
  const [items, setItems]       = useState(
    order.items.map((it) => ({
      product_id: String(it.product_id),
      quantity:   String(it.quantity),
      _original_qty: it.quantity, // so we can add back during stock check
    }))
  );
  const [errors, setErrors]     = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving]     = useState(false);

  const selectedIds = new Set(items.map((it) => it.product_id).filter(Boolean).map(Number));

  const addItem    = () => setItems((p) => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (i) => {
    const next = items.filter((_, idx) => idx !== i);
    setItems(next);
    if (submitted) setErrors(validateEditItems(next, products));
  };
  const setItem = (i, k, v) => {
    const next = items.map((it, idx) => idx === i ? { ...it, [k]: v } : it);
    setItems(next);
    if (submitted) setErrors(validateEditItems(next, products));
  };

  const handleProductChange = (i, newPid) => {
    if (!newPid) { setItem(i, "product_id", ""); return; }
    const existingIdx = items.findIndex((it, xi) => xi !== i && +it.product_id === +newPid);
    if (existingIdx !== -1) {
      const existingQty = +items[existingIdx].quantity || 0;
      const thisQty     = +items[i].quantity || 1;
      const merged      = existingQty + thisQty;
      const product     = resolveProduct(products, newPid);
      const available   = (product?.quantity || 0) + (items[existingIdx]._original_qty || 0) + (items[i]._original_qty || 0);
      if (merged > available) {
        toast.error(`Cannot merge: combined quantity (${merged}) exceeds available stock (${available}).`, { duration: 4000 });
        return;
      }
      toast(`Quantities merged for "${product?.name}" → ${merged} units`, { icon: "🔀", duration: 3000 });
      const next = items
        .map((it, xi) => xi === existingIdx ? { ...it, quantity: String(merged) } : it)
        .filter((_, xi) => xi !== i);
      setItems(next);
      if (submitted) setErrors(validateEditItems(next, products));
      return;
    }
    setItem(i, "product_id", newPid);
  };

  const calcTotal = () =>
    items.reduce((sum, it) => {
      const p = resolveProduct(products, it.product_id);
      return p && it.quantity ? sum + +p.price * +it.quantity : sum;
    }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validateEditItems(items, products);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({ items: items.map((it) => ({ product_id: +it.product_id, quantity: +it.quantity })) });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div>
            <h3>Edit Order #{order.id}</h3>
            <p style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>
              Items will be updated and stock adjusted automatically
            </p>
          </div>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {/* Info banner */}
            <div style={{
              background: "#eff6ff", border: "1px solid #bfdbfe",
              borderRadius: "var(--r-md)", padding: "10px 14px",
              display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16,
            }}>
              <Info size={15} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: "#1e40af", lineHeight: 1.5 }}>
                The current stock counts shown already include what this order is holding.
                Your changes will adjust stock automatically.
              </p>
            </div>

            {/* Duplicate warning */}
            {(() => {
              const seen = {};
              const dupes = [];
              for (const it of items) {
                if (!it.product_id) continue;
                const pid = +it.product_id;
                if (seen[pid]) {
                  const p = resolveProduct(products, pid);
                  if (p && !dupes.find((d) => d.id === pid)) dupes.push(p);
                }
                seen[pid] = true;
              }
              return dupes.length > 0 ? (
                <div style={{
                  background: "#fffbeb", border: "1px solid #fcd34d",
                  borderRadius: "var(--r-md)", padding: "10px 14px",
                  display: "flex", gap: 10, marginBottom: 12,
                }}>
                  <AlertTriangle size={15} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>Duplicate product</div>
                    <div style={{ fontSize: 12, color: "#b45309" }}>
                      {dupes.map((p) => `"${p.name}"`).join(", ")} {dupes.length === 1 ? "appears" : "appear"} more than once.
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            <span className="order-items-label">
              Order Items <span style={{ color: "var(--danger)" }}>*</span>
            </span>

            {items.map((it, i) => {
              const product = resolveProduct(products, it.product_id);
              const isDupe  = items.some((x, xi) => xi !== i && x.product_id && +x.product_id === +it.product_id);
              const availableForThis = product
                ? product.quantity + (it._original_qty || 0)
                : 0;

              return (
                <div key={i} style={{
                  background: isDupe ? "#fffbeb" : "var(--gray-50)",
                  border: `1px solid ${isDupe ? "#fcd34d" : "var(--border)"}`,
                  borderRadius: "var(--r-md)", padding: "12px 12px 10px", marginBottom: 8,
                  transition: "border-color 0.15s",
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 32px", gap: 8, alignItems: "start" }}>
                    <div>
                      <select
                        className={`form-control${errors[`p${i}`] ? " is-error" : ""}`}
                        value={it.product_id}
                        onChange={(e) => handleProductChange(i, e.target.value)}
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => {
                          const alreadySelected = selectedIds.has(p.id) && +it.product_id !== p.id;
                          const avail = p.quantity + (it.product_id && +it.product_id === p.id ? it._original_qty || 0 : 0);
                          return (
                            <option key={p.id} value={p.id} disabled={alreadySelected || (avail === 0 && +it.product_id !== p.id)}>
                              {p.name}
                              {alreadySelected ? " (already added)" : avail === 0 && +it.product_id !== p.id ? " (out of stock)" : ""}
                              {" "}— ${Number(p.price).toFixed(2)}
                            </option>
                          );
                        })}
                      </select>
                      {errors[`p${i}`] && <p className="form-error"><AlertCircle size={11} />{errors[`p${i}`]}</p>}
                      {product && (
                        <span style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 3, display: "block" }}>
                          {availableForThis > 0 ? `${availableForThis} available (incl. current order)` : "Out of stock"}
                        </span>
                      )}
                    </div>

                    <div>
                      <input
                        type="number" min="1" step="1"
                        max={product ? availableForThis : undefined}
                        className={`form-control${errors[`q${i}`] ? " is-error" : ""}`}
                        value={it.quantity} placeholder="Qty"
                        onChange={(e) => setItem(i, "quantity", e.target.value)}
                        style={{ textAlign: "center" }}
                      />
                      {errors[`q${i}`] && <p className="form-error" style={{ whiteSpace: "nowrap" }}><AlertCircle size={11} />{errors[`q${i}`]}</p>}
                    </div>

                    <button type="button" className="item-remove-btn"
                      onClick={() => removeItem(i)} disabled={items.length === 1}>
                      <Minus />
                    </button>
                  </div>

                  {product && it.quantity && +it.quantity > 0 && (
                    <div style={{ fontSize: 11.5, color: "var(--gray-500)", textAlign: "right", marginTop: 6, paddingRight: 40 }}>
                      {it.quantity} × ${Number(product.price).toFixed(2)} =&nbsp;
                      <strong style={{ color: "var(--gray-800)" }}>${(+it.quantity * +product.price).toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              );
            })}

            <button type="button" className="add-item-btn" onClick={addItem}>
              <PlusCircle /> Add Another Item
            </button>

            {calcTotal() > 0 && (
              <div className="order-total-box" style={{ marginTop: 14 }}>
                <span>New Order Total</span>
                <span>${calcTotal().toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving Changes…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function OrderDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [order, setOrder]           = useState(null);
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]           = useState(null);
  const [showEdit, setShowEdit]     = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const reload = () =>
    getOrder(id).then(setOrder).catch((e) => setError(e.message));

  useEffect(() => {
    Promise.all([getOrder(id), getProducts()])
      .then(([o, p]) => { setOrder(o); setProducts(p); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    setActionLoading(true);
    try {
      const updated = await updateOrderStatus(+id, newStatus);
      setOrder(updated);
      // Refresh products so edit modal has fresh stock
      getProducts().then(setProducts).catch(() => {});
      toast.success(
        newStatus === "completed"
          ? "Order marked as completed"
          : "Order cancelled — stock restored"
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSave = async (payload) => {
    const updated = await updateOrderItems(+id, payload);
    setOrder(updated);
    getProducts().then(setProducts).catch(() => {});
    setShowEdit(false);
    toast.success("Order updated successfully");
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteOrder(+id);
      toast.success("Order deleted");
      navigate("/orders");
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /> Loading order…</div>;

  if (error) return (
    <div className="empty-state">
      <div className="empty-state-icon"><AlertTriangle /></div>
      <h4>Order not found</h4>
      <p>{error}</p>
      <Link to="/orders" className="btn btn-secondary" style={{ marginTop: 8 }}>
        <ArrowLeft /> Back to Orders
      </Link>
    </div>
  );

  const canEdit = order.status === "pending";

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <Link to="/orders" className="back-link"><ArrowLeft /> All Orders</Link>
          <div className="page-header-text" style={{ marginTop: 4 }}>
            <h2>Order #{order.id}</h2>
            <p>
              Placed {order.created_at
                ? new Date(order.created_at).toLocaleString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })
                : "—"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {canEdit && (
            <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
              <Pencil /> Edit Items
            </button>
          )}
          {canEdit && (
            <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 /> Delete Order
            </button>
          )}
        </div>
      </div>

      {/* Status management panel */}
      <StatusPanel
        order={order}
        onStatusChange={handleStatusChange}
        loading={actionLoading}
      />

      {/* Info grid */}
      <div className="order-detail-grid" style={{ marginBottom: 20 }}>
        {/* Customer */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="stat-card-icon sky" style={{ width: 34, height: 34 }}><User size={16} /></div>
              <h3>Customer</h3>
            </div>
          </div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <dl className="detail-kv"><dt>Full Name</dt><dd>{order.customer?.full_name || "—"}</dd></dl>
            <dl className="detail-kv"><dt>Email</dt><dd style={{ fontSize: 13.5, wordBreak: "break-all" }}>{order.customer?.email || "—"}</dd></dl>
            <dl className="detail-kv"><dt>Phone</dt><dd>{order.customer?.phone || "—"}</dd></dl>
            <dl className="detail-kv"><dt>Customer ID</dt><dd>#{order.customer_id}</dd></dl>
          </div>
        </div>

        {/* Order summary */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="stat-card-icon violet" style={{ width: 34, height: 34 }}><ShoppingBag size={16} /></div>
              <h3>Order Summary</h3>
            </div>
          </div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <dl className="detail-kv"><dt>Order ID</dt><dd>#{order.id}</dd></dl>
            <dl className="detail-kv">
              <dt>Status</dt>
              <dd><span className={`badge ${STATUS_BADGE[order.status] || "badge-gray"}`}>{order.status}</span></dd>
            </dl>
            <dl className="detail-kv">
              <dt>Items</dt>
              <dd>{order.items?.length || 0} line item{order.items?.length !== 1 ? "s" : ""}</dd>
            </dl>
            <dl className="detail-kv">
              <dt>Total Amount</dt>
              <dd style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.03em" }}>
                ${Number(order.total_amount).toFixed(2)}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Line items table */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="stat-card-icon indigo" style={{ width: 34, height: 34 }}><Hash size={16} /></div>
            <div>
              <h3>Line Items</h3>
              <p>{order.items?.length || 0} product{order.items?.length !== 1 ? "s" : ""} ordered</p>
            </div>
          </div>
          {canEdit && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>
              <Pencil /> Edit Items
            </button>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Unit Price</th>
                <th>Quantity</th>
                <th style={{ textAlign: "right" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, idx) => (
                <tr key={item.id}>
                  <td className="td-muted">{idx + 1}</td>
                  <td className="td-main">{item.product?.name || `Product #${item.product_id}`}</td>
                  <td>{item.product?.sku ? <span className="sku-pill">{item.product.sku}</span> : <span className="td-muted">—</span>}</td>
                  <td>${Number(item.unit_price).toFixed(2)}</td>
                  <td><span className="badge badge-blue">× {item.quantity}</span></td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>
                    ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border)" }}>
                <td colSpan={5} style={{ textAlign: "right", padding: "16px", fontWeight: 700, color: "var(--gray-600)", fontSize: 13 }}>
                  ORDER TOTAL
                </td>
                <td style={{ textAlign: "right", padding: "16px", fontWeight: 800, fontSize: 20, color: "var(--primary)", letterSpacing: "-0.03em" }}>
                  ${Number(order.total_amount).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <EditItemsModal
          order={order}
          products={products}
          onSave={handleEditSave}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Order"
          message={`Permanently delete order #${order.id}? Stock will be restored and this cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}
