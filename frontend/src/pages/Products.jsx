import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Package, X, Search, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../api/products";
import ConfirmDialog from "../components/ConfirmDialog";

const EMPTY = { name: "", sku: "", price: "", quantity: "", description: "" };

function validate(f) {
  const e = {};
  if (!f.name.trim())                                   e.name = "Product name is required";
  if (!f.sku.trim())                                    e.sku  = "SKU is required";
  if (!f.price || isNaN(f.price) || +f.price <= 0)     e.price = "Enter a valid positive price";
  if (f.quantity === "" || isNaN(f.quantity) || +f.quantity < 0) e.quantity = "Quantity must be 0 or more";
  return e;
}

function stockBadge(qty) {
  if (qty === 0) return <span className="badge badge-red">Out of stock</span>;
  if (qty <= 10) return <span className="badge badge-yellow">Low — {qty}</span>;
  return <span className="badge badge-green">{qty} in stock</span>;
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    getProducts().then(setProducts).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() =>
    products.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase())
    ), [products, query]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setErrors({}); setShowModal(true); };
  const openEdit   = (p) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, price: String(p.price), quantity: String(p.quantity), description: p.description || "" });
    setErrors({});
    setShowModal(true);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), sku: form.sku.trim().toUpperCase(),
        price: +form.price, quantity: +form.quantity,
        description: form.description.trim() || null,
      };
      if (editing) { await updateProduct(editing.id, payload); toast.success("Product updated"); }
      else          { await createProduct(payload);             toast.success("Product created"); }
      setShowModal(false);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try { await deleteProduct(deleteTarget.id); toast.success("Product deleted"); setDeleteTarget(null); load(); }
    catch (err) { toast.error(err.message); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2>Products</h2>
          <p>{products.length} products in your catalog</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus /> Add Product
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <div className="search-box">
              <span className="search-box-icon"><Search /></span>
              <input
                className="search-input"
                placeholder="Search by name or SKU…"
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
          <div className="loading"><div className="spinner" /> Loading products…</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Package /></div>
            <h4>No products yet</h4>
            <p>Add your first product to start tracking your inventory.</p>
            <button className="btn btn-primary" onClick={openCreate}><Plus /> Add Product</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Description</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "48px 24px", color: "var(--gray-400)" }}>
                      No products match "{query}"
                    </td>
                  </tr>
                ) : filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="td-main">{p.name}</td>
                    <td><span className="sku-pill">{p.sku}</span></td>
                    <td style={{ fontWeight: 700, color: "var(--gray-900)" }}>
                      ${Number(p.price).toFixed(2)}
                    </td>
                    <td>{stockBadge(p.quantity)}</td>
                    <td className="td-muted" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.description || "—"}
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-success btn-sm" onClick={() => openEdit(p)}>
                          <Pencil /> Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(p)}>
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? "Edit Product" : "Add New Product"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name <span>*</span></label>
                  <input className={`form-control${errors.name ? " is-error" : ""}`} value={form.name} onChange={set("name")} placeholder="e.g. Wireless Mouse" />
                  {errors.name && <p className="form-error"><AlertCircle size={11} />{errors.name}</p>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">SKU / Code <span>*</span></label>
                    <input className={`form-control${errors.sku ? " is-error" : ""}`} value={form.sku} onChange={set("sku")} placeholder="e.g. WM-001" />
                    {errors.sku && <p className="form-error"><AlertCircle size={11} />{errors.sku}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price (USD) <span>*</span></label>
                    <input type="number" step="0.01" min="0.01" className={`form-control${errors.price ? " is-error" : ""}`} value={form.price} onChange={set("price")} placeholder="0.00" />
                    {errors.price && <p className="form-error"><AlertCircle size={11} />{errors.price}</p>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity in Stock <span>*</span></label>
                  <input type="number" min="0" className={`form-control${errors.quantity ? " is-error" : ""}`} value={form.quantity} onChange={set("quantity")} placeholder="0" />
                  {errors.quantity && <p className="form-error"><AlertCircle size={11} />{errors.quantity}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Description <span style={{ color: "var(--gray-400)", fontWeight: 400 }}>(optional)</span></label>
                  <textarea className="form-control" rows={3} value={form.description} onChange={set("description")} placeholder="Brief product description…" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Product"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
