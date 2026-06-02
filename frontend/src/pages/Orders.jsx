import { useEffect, useState, useMemo } from "react";
import {
  Plus, Trash2, Eye, ShoppingCart, X, Search,
  PlusCircle, Minus, AlertCircle, AlertTriangle, Info, Pencil,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getOrders, createOrder, deleteOrder } from "../api/orders";
import { getCustomers } from "../api/customers";
import { getProducts } from "../api/products";
import ConfirmDialog from "../components/ConfirmDialog";

const EMPTY_ITEM = { product_id: "", quantity: "" };

const STATUS_BADGE = {
  pending:   "badge-yellow",
  completed: "badge-green",
  cancelled: "badge-red",
};

/* ── helpers ─────────────────────────────────────────────── */

/** Returns the product object (or null) for a given row */
function resolveProduct(products, product_id) {
  return product_id ? products.find((p) => p.id === +product_id) || null : null;
}

/**
 * Returns a map of { product_id -> total requested qty }
 * across all rows — used for duplicate / over-stock detection.
 */
function buildQtyMap(items) {
  const map = {};
  for (const it of items) {
    if (!it.product_id || !it.quantity) continue;
    map[+it.product_id] = (map[+it.product_id] || 0) + +it.quantity;
  }
  return map;
}

/** Validate all items; returns an error map keyed by field id */
function validateItems(items, products) {
  const errors = {};
  const seenIds = new Set();

  items.forEach((it, i) => {
    const pid = +it.product_id;
    const qty = +it.quantity;

    if (!it.product_id) {
      errors[`p${i}`] = "Select a product";
      return;
    }
    if (seenIds.has(pid)) {
      errors[`p${i}`] = "Duplicate — this product is already in the order";
    }
    seenIds.add(pid);

    if (!it.quantity || isNaN(qty) || qty < 1) {
      errors[`q${i}`] = "Quantity must be at least 1";
      return;
    }
    if (!Number.isInteger(qty)) {
      errors[`q${i}`] = "Quantity must be a whole number";
      return;
    }

    const product = resolveProduct(products, it.product_id);
    if (product) {
      if (product.quantity === 0) {
        errors[`q${i}`] = `"${product.name}" is out of stock`;
      } else if (qty > product.quantity) {
        errors[`q${i}`] = `Only ${product.quantity} in stock`;
      }
    }
  });

  return errors;
}

/* ── Stock indicator chip ────────────────────────────────── */
function StockChip({ product, requestedQty }) {
  if (!product) return null;
  const qty = product.quantity;
  const req = +requestedQty || 0;

  if (qty === 0)
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--danger)", display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
        <AlertTriangle size={11} /> Out of stock
      </span>
    );
  if (req > qty)
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--danger)", display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
        <AlertTriangle size={11} /> Only {qty} available
      </span>
    );
  if (req > 0 && qty - req <= 5)
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--warning)", display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
        <Info size={11} /> {qty - req} will remain after order
      </span>
    );
  return (
    <span style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 4, display: "block" }}>
      {qty} in stock
    </span>
  );
}

/* ── DuplicateWarning banner ─────────────────────────────── */
function DuplicateWarning({ items, products }) {
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
  if (dupes.length === 0) return null;
  return (
    <div style={{
      background: "#fffbeb",
      border: "1px solid #fcd34d",
      borderRadius: "var(--r-md)",
      padding: "10px 14px",
      marginBottom: 12,
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
    }}>
      <AlertTriangle size={16} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>Duplicate product detected</div>
        <div style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>
          {dupes.map((p) => `"${p.name}"`).join(", ")} appear{dupes.length === 1 ? "s" : ""} more than once.
          Each product can only appear once per order — remove the duplicate row.
        </div>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */
export default function Orders() {
  const [orders, setOrders]           = useState([]);
  const [customers, setCustomers]     = useState([]);
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [query, setQuery]             = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [customerId, setCustomerId]   = useState("");
  const [items, setItems]             = useState([{ ...EMPTY_ITEM }]);
  const [errors, setErrors]           = useState({});
  const [saving, setSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const [submitted, setSubmitted]     = useState(false); // track if user tried to submit once

  const load = () => {
    setLoading(true);
    getOrders().then(setOrders).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getCustomers().then(setCustomers).catch(() => {});
    getProducts().then(setProducts).catch(() => {});
  }, []);

  const filtered = useMemo(() =>
    orders.filter((o) => {
      const name = o.customer?.full_name?.toLowerCase() || "";
      return name.includes(query.toLowerCase()) || String(o.id).includes(query);
    }), [orders, query]);

  /* ── Item helpers ──────────────────────────────────────── */
  const openCreate = () => {
    setCustomerId("");
    setItems([{ ...EMPTY_ITEM }]);
    setErrors({});
    setSubmitted(false);
    setShowModal(true);
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (i) => {
    const next = items.filter((_, idx) => idx !== i);
    setItems(next);
    if (submitted) setErrors(validateItems(next, products));
  };

  const setItem = (i, key, value) => {
    const next = items.map((it, idx) => idx === i ? { ...it, [key]: value } : it);
    setItems(next);
    if (submitted) setErrors(validateItems(next, products));
  };

  /* Auto-merge: if user picks an already-selected product, merge qty */
  const handleProductChange = (i, newProductId) => {
    if (!newProductId) { setItem(i, "product_id", ""); return; }
    const existingIdx = items.findIndex((it, idx) => idx !== i && +it.product_id === +newProductId);
    if (existingIdx !== -1) {
      // Offer merge instead of silent duplicate
      const existingQty = +items[existingIdx].quantity || 0;
      const thisQty     = +items[i].quantity || 1;
      const merged      = existingQty + thisQty;
      const product     = resolveProduct(products, newProductId);

      if (product && merged > product.quantity) {
        toast.error(
          `Cannot merge: combined quantity (${merged}) exceeds available stock (${product.quantity}).`,
          { duration: 4000 }
        );
        return;
      }

      // Merge: update existing row's qty, remove current row
      toast(`Quantities merged for "${product?.name}" → ${merged} units`, {
        icon: "🔀",
        duration: 3000,
      });
      const next = items
        .map((it, idx) => idx === existingIdx ? { ...it, quantity: String(merged) } : it)
        .filter((_, idx) => idx !== i);
      setItems(next);
      if (submitted) setErrors(validateItems(next, products));
      return;
    }
    setItem(i, "product_id", newProductId);
  };

  /* Live total */
  const calcTotal = () =>
    items.reduce((sum, it) => {
      const p = resolveProduct(products, it.product_id);
      return p && it.quantity ? sum + +p.price * +it.quantity : sum;
    }, 0);

  /* Which product_ids are already chosen (for disabling options) */
  const selectedIds = new Set(items.map((it) => it.product_id).filter(Boolean).map(Number));

  /* ── Submit ────────────────────────────────────────────── */
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSubmitted(true);

    const itemErrors = validateItems(items, products);
    const hasItemErrors = Object.keys(itemErrors).length > 0;
    const customerError = !customerId ? "Please select a customer" : null;

    setErrors({ ...itemErrors, ...(customerError ? { customer: customerError } : {}) });

    if (hasItemErrors || customerError) return;

    setSaving(true);
    try {
      await createOrder({
        customer_id: +customerId,
        items: items.map((it) => ({ product_id: +it.product_id, quantity: +it.quantity })),
      });
      toast.success("Order placed successfully");
      setShowModal(false);
      load();
      getProducts().then(setProducts).catch(() => {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Cancel/delete order ───────────────────────────────── */
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteOrder(deleteTarget.id);
      toast.success("Order cancelled — stock restored");
      setDeleteTarget(null);
      load();
      getProducts().then(setProducts).catch(() => {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2>Orders</h2>
          <p>{orders.length} total orders</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus /> New Order
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <div className="search-box">
              <span className="search-box-icon"><Search /></span>
              <input
                className="search-input"
                placeholder="Search by order # or customer…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {query && (
              <span style={{ fontSize: 12.5, color: "var(--gray-500)" }}>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ShoppingCart /></div>
            <h4>No orders yet</h4>
            <p>Create your first order to start tracking sales and inventory usage.</p>
            <button className="btn btn-primary" onClick={openCreate}><Plus /> New Order</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "48px", color: "var(--gray-400)" }}>
                      No orders match "{query}"
                    </td>
                  </tr>
                ) : filtered.map((o) => (
                  <tr key={o.id}>
                    <td><span style={{ fontWeight: 800, color: "var(--primary)", fontSize: 13.5 }}>#{o.id}</span></td>
                    <td className="td-main">{o.customer?.full_name || `Customer #${o.customer_id}`}</td>
                    <td><span className="badge badge-blue">{o.items?.length || 0} item{o.items?.length !== 1 ? "s" : ""}</span></td>
                    <td style={{ fontWeight: 700, fontSize: 14 }}>${Number(o.total_amount).toFixed(2)}</td>
                    <td><span className={`badge ${STATUS_BADGE[o.status] || "badge-gray"}`}>{o.status}</span></td>
                    <td className="td-muted">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                      <td>
                        <div className="td-actions">
                          <Link to={`/orders/${o.id}`} className="btn btn-secondary btn-sm"><Eye /> View</Link>
                          {o.status === "pending" && (
                            <Link to={`/orders/${o.id}`} className="btn btn-success btn-sm" title="Edit items">
                              <Pencil />
                            </Link>
                          )}
                          {o.status === "pending" && (
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(o)}><Trash2 /></button>
                          )}
                        </div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create order modal ────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3>Create New Order</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X /></button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">

                {/* Customer */}
                <div className="form-group">
                  <label className="form-label">Customer <span>*</span></label>
                  <select
                    className={`form-control${errors.customer ? " is-error" : ""}`}
                    value={customerId}
                    onChange={(e) => {
                      setCustomerId(e.target.value);
                      if (submitted && !e.target.value) setErrors((prev) => ({ ...prev, customer: "Please select a customer" }));
                      else if (submitted) setErrors((prev) => { const n = { ...prev }; delete n.customer; return n; });
                    }}
                  >
                    <option value="">Select a customer…</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name} — {c.email}</option>
                    ))}
                  </select>
                  {errors.customer && <p className="form-error"><AlertCircle size={11} />{errors.customer}</p>}
                </div>

                {/* Duplicate banner */}
                <DuplicateWarning items={items} products={products} />

                {/* Items */}
                <div>
                  <span className="order-items-label">
                    Order Items <span style={{ color: "var(--danger)" }}>*</span>
                    <span style={{ fontWeight: 400, color: "var(--gray-400)", marginLeft: 6, fontSize: 11 }}>
                      Each product can appear only once
                    </span>
                  </span>

                  {items.map((it, i) => {
                    const product = resolveProduct(products, it.product_id);
                    const isDupe  = items.some((x, xi) => xi !== i && x.product_id && +x.product_id === +it.product_id);

                    return (
                      <div
                        key={i}
                        style={{
                          background: isDupe ? "#fffbeb" : "var(--gray-50)",
                          border: `1px solid ${isDupe ? "#fcd34d" : "var(--border)"}`,
                          borderRadius: "var(--r-md)",
                          padding: "12px 12px 10px",
                          marginBottom: 8,
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 32px", gap: 8, alignItems: "start" }}>
                          {/* Product selector */}
                          <div>
                            <select
                              className={`form-control${errors[`p${i}`] ? " is-error" : ""}`}
                              value={it.product_id}
                              onChange={(e) => handleProductChange(i, e.target.value)}
                            >
                              <option value="">Select product…</option>
                              {products.map((p) => {
                                const alreadySelected = selectedIds.has(p.id) && +it.product_id !== p.id;
                                return (
                                  <option
                                    key={p.id}
                                    value={p.id}
                                    disabled={p.quantity === 0 || alreadySelected}
                                  >
                                    {p.name}
                                    {p.quantity === 0 ? " (out of stock)" : alreadySelected ? " (already added)" : ""}
                                    {" "}— ${Number(p.price).toFixed(2)}
                                  </option>
                                );
                              })}
                            </select>
                            {errors[`p${i}`] && (
                              <p className="form-error"><AlertCircle size={11} />{errors[`p${i}`]}</p>
                            )}
                            <StockChip product={product} requestedQty={it.quantity} />
                          </div>

                          {/* Quantity */}
                          <div>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              max={product ? product.quantity : undefined}
                              className={`form-control${errors[`q${i}`] ? " is-error" : ""}`}
                              value={it.quantity}
                              placeholder="Qty"
                              onChange={(e) => setItem(i, "quantity", e.target.value)}
                              style={{ textAlign: "center" }}
                            />
                            {errors[`q${i}`] && (
                              <p className="form-error" style={{ whiteSpace: "nowrap" }}>
                                <AlertCircle size={11} />{errors[`q${i}`]}
                              </p>
                            )}
                          </div>

                          {/* Remove */}
                          <button
                            type="button"
                            className="item-remove-btn"
                            onClick={() => removeItem(i)}
                            disabled={items.length === 1}
                            title="Remove item"
                          >
                            <Minus />
                          </button>
                        </div>

                        {/* Subtotal row */}
                        {product && it.quantity && +it.quantity > 0 && (
                          <div style={{ fontSize: 11.5, color: "var(--gray-500)", textAlign: "right", marginTop: 6, paddingRight: 40 }}>
                            {it.quantity} × ${Number(product.price).toFixed(2)} =&nbsp;
                            <strong style={{ color: "var(--gray-800)" }}>
                              ${(+it.quantity * +product.price).toFixed(2)}
                            </strong>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button type="button" className="add-item-btn" onClick={addItem}>
                    <PlusCircle /> Add Another Item
                  </button>
                </div>

                {/* Order total */}
                {calcTotal() > 0 && (
                  <div className="order-total-box" style={{ marginTop: 14 }}>
                    <span>
                      {items.filter((it) => it.product_id && it.quantity).length} item type{items.filter((it) => it.product_id && it.quantity).length !== 1 ? "s" : ""}
                    </span>
                    <span>${calcTotal().toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Placing Order…" : "Place Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Cancel Order"
          message={`Cancel order #${deleteTarget.id}? Stock for all items will be automatically restored.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
