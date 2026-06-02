import { useEffect, useState, useMemo } from "react";
import { Plus, Trash2, Users, X, Search, AlertCircle, Mail, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { getCustomers, createCustomer, deleteCustomer } from "../api/customers";
import ConfirmDialog from "../components/ConfirmDialog";

const EMPTY = { full_name: "", email: "", phone: "" };

function validate(f) {
  const e = {};
  if (!f.full_name.trim()) e.full_name = "Full name is required";
  if (!f.email.trim())     e.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email address";
  return e;
}

function initials(name) {
  return name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
}

const AVATAR_COLORS = [
  ["#6366f1","#eef2ff"],["#10b981","#d1fae5"],["#f59e0b","#fef3c7"],
  ["#0ea5e9","#e0f2fe"],["#8b5cf6","#f5f3ff"],["#f43f5e","#ffe4e6"],
];

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);

  const load = () => {
    setLoading(true);
    getCustomers().then(setCustomers).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() =>
    customers.filter((c) =>
      c.full_name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase()) ||
      (c.phone || "").includes(query)
    ), [customers, query]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await createCustomer({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
      });
      toast.success("Customer created");
      setShowModal(false);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try { await deleteCustomer(deleteTarget.id); toast.success("Customer deleted"); setDeleteTarget(null); load(); }
    catch (err) { toast.error(err.message); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2>Customers</h2>
          <p>{customers.length} registered customers</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setErrors({}); setShowModal(true); }}>
          <Plus /> Add Customer
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="toolbar">
            <div className="search-box">
              <span className="search-box-icon"><Search /></span>
              <input className="search-input" placeholder="Search by name, email or phone…"
                value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {query && (
              <span style={{ fontSize: 12.5, color: "var(--gray-500)" }}>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Loading customers…</div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users /></div>
            <h4>No customers yet</h4>
            <p>Add your first customer to start managing your CRM.</p>
            <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setErrors({}); setShowModal(true); }}>
              <Plus /> Add Customer
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "48px", color: "var(--gray-400)" }}>
                      No customers match "{query}"
                    </td>
                  </tr>
                ) : filtered.map((c, idx) => {
                  const [fg, bg] = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: bg, color: fg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 700, flexShrink: 0,
                          }}>
                            {initials(c.full_name)}
                          </div>
                          <div>
                            <div className="td-main">{c.full_name}</div>
                            <div className="td-muted">ID #{c.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--gray-600)" }}>
                          <Mail size={13} style={{ color: "var(--gray-400)" }} />
                          {c.email}
                        </div>
                      </td>
                      <td>
                        {c.phone ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--gray-600)" }}>
                            <Phone size={13} style={{ color: "var(--gray-400)" }} />
                            {c.phone}
                          </div>
                        ) : <span className="td-muted">—</span>}
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(c)}>
                          <Trash2 />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
              <h3>Add New Customer</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name <span>*</span></label>
                  <input className={`form-control${errors.full_name ? " is-error" : ""}`} value={form.full_name}
                    onChange={set("full_name")} placeholder="e.g. Jane Doe" />
                  {errors.full_name && <p className="form-error"><AlertCircle size={11} />{errors.full_name}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address <span>*</span></label>
                  <input type="email" className={`form-control${errors.email ? " is-error" : ""}`} value={form.email}
                    onChange={set("email")} placeholder="jane@example.com" />
                  {errors.email && <p className="form-error"><AlertCircle size={11} />{errors.email}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone <span style={{ color: "var(--gray-400)", fontWeight: 400 }}>(optional)</span></label>
                  <input className="form-control" value={form.phone} onChange={set("phone")} placeholder="+1 555 000 0000" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Customer"
          message={`Delete "${deleteTarget.full_name}"? This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
