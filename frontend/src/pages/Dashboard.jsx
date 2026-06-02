import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package, Users, ShoppingCart, AlertTriangle,
  TrendingUp, ArrowRight, RefreshCw,
} from "lucide-react";
import { getDashboard } from "../api/dashboard";
import { getOrders } from "../api/orders";

function StatCard({ icon, label, value, iconClass, trend, trendLabel }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className={`stat-card-icon ${iconClass}`}>{icon}</div>
        {trend !== undefined && (
          <span className={`stat-card-trend ${trend >= 0 ? "up" : "down"}`}>
            <TrendingUp size={10} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
        {trendLabel && (
          <div style={{ fontSize: 11.5, color: "var(--gray-400)", marginTop: 4 }}>
            {trendLabel}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [dash, ord] = await Promise.all([getDashboard(), getOrders()]);
      setData(dash);
      setOrders(ord.slice(0, 5));
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="loading"><div className="spinner" /> Loading dashboard…</div>;
  if (!data) return (
    <div className="empty-state">
      <div className="empty-state-icon"><AlertTriangle /></div>
      <h4>Failed to load dashboard</h4>
      <p>Check that the backend is running and try again.</p>
    </div>
  );

  const statusBadge = (s) => {
    const m = { pending: "badge-yellow", completed: "badge-green", cancelled: "badge-red" };
    return m[s] || "badge-gray";
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h2>Welcome back</h2>
          <p>Here's what's happening with your inventory today.</p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? "spin 0.65s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          icon={<Package />}
          label="Total Products"
          value={data.total_products}
          iconClass="indigo"
          trendLabel="In your catalog"
        />
        <StatCard
          icon={<Users />}
          label="Total Customers"
          value={data.total_customers}
          iconClass="emerald"
          trendLabel="Registered accounts"
        />
        <StatCard
          icon={<ShoppingCart />}
          label="Total Orders"
          value={data.total_orders}
          iconClass="violet"
          trendLabel="All time"
        />
        <StatCard
          icon={<AlertTriangle />}
          label="Low Stock Items"
          value={data.low_stock_products.length}
          iconClass={data.low_stock_products.length > 0 ? "amber" : "emerald"}
          trendLabel={data.low_stock_products.length === 0 ? "All items well stocked" : "Needs attention"}
        />
      </div>

      {/* Main grid */}
      <div className="dashboard-grid">
        {/* Recent orders */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Recent Orders</h3>
              <p>Last {orders.length} orders placed</p>
            </div>
            <Link to="/orders" className="btn btn-ghost btn-sm">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 24px" }}>
              <div className="empty-state-icon"><ShoppingCart /></div>
              <h4>No orders yet</h4>
              <p>Create your first order to see it here.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link
                          to={`/orders/${o.id}`}
                          style={{ color: "var(--primary)", fontWeight: 700, fontSize: 13 }}
                        >
                          #{o.id}
                        </Link>
                      </td>
                      <td className="td-main">{o.customer?.full_name || `#${o.customer_id}`}</td>
                      <td style={{ fontWeight: 700 }}>${Number(o.total_amount).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${statusBadge(o.status)}`}>{o.status}</span>
                      </td>
                      <td className="td-muted">
                        {o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low stock sidebar */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Low Stock Alert</h3>
              <p>Items at or below 10 units</p>
            </div>
            <Link to="/products" className="btn btn-ghost btn-sm">
              Manage <ArrowRight size={13} />
            </Link>
          </div>
          {data.low_stock_products.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 24px" }}>
              <div className="empty-state-icon" style={{ background: "#d1fae5" }}>
                <Package style={{ color: "var(--success)" }} />
              </div>
              <h4 style={{ color: "var(--success)" }}>All stocked up!</h4>
              <p>No products are running low on inventory.</p>
            </div>
          ) : (
            <div className="card-body" style={{ padding: "12px 20px 20px" }}>
              {data.low_stock_products.map((p) => {
                const pct = Math.min(100, (p.quantity / 10) * 100);
                return (
                  <div key={p.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--gray-900)" }}>{p.name}</div>
                        <span className="sku-pill" style={{ marginTop: 3, display: "inline-block" }}>{p.sku}</span>
                      </div>
                      <span className={`badge ${p.quantity === 0 ? "badge-red" : "badge-yellow"}`}>
                        {p.quantity === 0 ? "Out of stock" : `${p.quantity} left`}
                      </span>
                    </div>
                    <div className="progress-bar-wrap" style={{ width: "100%" }}>
                      <div
                        className="progress-bar"
                        style={{
                          width: `${pct}%`,
                          background: p.quantity === 0
                            ? "var(--danger)"
                            : "linear-gradient(90deg, var(--warning), #fb923c)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
