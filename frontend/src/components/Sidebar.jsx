import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  Boxes,
} from "lucide-react";

export default function Sidebar({ open, onClose }) {
  const linkClass = ({ isActive }) =>
    "nav-link" + (isActive ? " active" : "");

  return (
    <>
      <div
        className={"sidebar-overlay" + (open ? " open" : "")}
        onClick={onClose}
      />
      <aside className={"sidebar" + (open ? " open" : "")}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Boxes />
          </div>
          <div className="sidebar-logo-text">
            <h2>Inventory Management System</h2>
          </div>
        </div>

        <nav className="sidebar-nav" onClick={onClose}>
          <p className="nav-section">Overview</p>
          <NavLink to="/" end className={linkClass}>
            <LayoutDashboard />
            Dashboard
          </NavLink>

          <p className="nav-section">Catalog</p>
          <NavLink to="/products" className={linkClass}>
            <Package />
            Products
          </NavLink>

          <p className="nav-section">CRM</p>
          <NavLink to="/customers" className={linkClass}>
            <Users />
            Customers
          </NavLink>

          <p className="nav-section">Commerce</p>
          <NavLink to="/orders" className={linkClass}>
            <ShoppingCart />
            Orders
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-footer-text">Inventory Management System v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
