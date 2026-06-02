import { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";

const PAGE_META = {
  "/":          { title: "Dashboard",    sub: "Overview of your business at a glance" },
  "/products":  { title: "Products",     sub: "Manage your product catalog" },
  "/customers": { title: "Customers",    sub: "Manage your customer base" },
  "/orders":    { title: "Orders",       sub: "Track and manage orders" },
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const isOrderDetail = pathname.startsWith("/orders/") && pathname !== "/orders";
  const meta = isOrderDetail
    ? { title: "Order Details", sub: "Full order breakdown" }
    : PAGE_META[pathname] || { title: "", sub: "" };

  return (
    <div className="layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setSidebarOpen((v) => !v)}>
              <Menu />
            </button>
            <div>
              <div className="topbar-title">{meta.title}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-chip">
              <span className="dot" />
              All systems operational
            </div>
          </div>
        </header>

        <main className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
