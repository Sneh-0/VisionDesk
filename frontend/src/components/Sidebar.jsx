import { NavLink } from "react-router-dom";
import { BarChart3, Boxes, Building2, ClipboardList, Contact, Gauge, Package, Settings, Sparkles, Truck, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge, roles: ["owner", "branch_admin", "staff"] },
  { to: "/customers", label: "Customers", icon: Contact, roles: ["owner", "branch_admin", "staff"] },
  { to: "/orders", label: "Orders", icon: ClipboardList, roles: ["owner", "branch_admin", "staff"] },
  { to: "/inventory", label: "Inventory", icon: Boxes, roles: ["owner", "branch_admin"] },
  { to: "/products", label: "Products", icon: Package, roles: ["owner", "branch_admin"] },
  { to: "/suppliers", label: "Suppliers", icon: Truck, roles: ["owner", "branch_admin"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["owner", "branch_admin"] },
  { to: "/branches", label: "Branches", icon: Building2, roles: ["owner"] },
  { to: "/staff", label: "Staff", icon: Users, roles: ["owner", "branch_admin"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["owner", "branch_admin"] }
];

export default function Sidebar() {
  const { user } = useAuth();
  const visibleLinks = links.filter((link) => link.roles.includes(user?.role));

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 overflow-hidden border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950 lg:block">
        <div className="relative mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 px-2 dark:border-slate-800 dark:bg-slate-900">
          <BrandLogo className="h-[116px] w-full" />
        </div>
        <nav className="relative space-y-1">
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"}`}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
        <div className="flex gap-1 overflow-x-auto">
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `flex min-w-20 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition ${isActive ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-300"}`}
            >
              <Icon size={18} />
              <span className="max-w-full truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
