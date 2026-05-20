import { NavLink } from "react-router-dom";
import { BarChart3, Boxes, Building2, ClipboardList, Contact, Gauge, Package, Settings, Truck } from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/customers", label: "Customers", icon: Contact },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/products", label: "Products", icon: Package },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950 lg:block">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">VD</div>
        <div>
          <div className="text-lg font-bold tracking-tight">Visondesk</div>
          <div className="text-xs font-medium text-slate-500">Optical retail CRM</div>
        </div>
      </div>
      <nav className="space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
