import { LogOut, Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem("visondesk_theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("visondesk_theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="relative hidden min-w-80 md:block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
          <input className="input pl-10" placeholder="Search customers, orders, products" />
        </div>
        <div className="flex flex-1 items-center justify-between gap-3 md:justify-end">
          <div className="lg:hidden">
            <div className="text-lg font-bold">Visondesk</div>
          </div>
          <button className="btn-secondary h-10 w-10 px-0" onClick={() => setDark((value) => !value)} aria-label="Toggle dark mode">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold">{user?.name}</div>
            <div className="text-xs text-slate-500">{user?.role}</div>
          </div>
          <button className="btn-secondary h-10 w-10 px-0" onClick={logout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
