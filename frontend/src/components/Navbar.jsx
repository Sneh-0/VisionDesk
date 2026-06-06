import { LogOut, Moon, Search, Sun, UserRound } from "lucide-react";
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
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="relative hidden min-w-80 md:block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
          <input className="input pl-10" placeholder="Search customers, orders, products" />
        </div>
        <div className="flex flex-1 items-center justify-between gap-3 md:justify-end">
          <div className="min-w-0 lg:hidden">
            <div className="truncate text-lg font-bold">VisionDesk</div>
            <div className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:hidden">Inventory &amp; Sales Platform</div>
          </div>
          <button className="btn-secondary h-10 w-10 px-0" onClick={() => setDark((value) => !value)} aria-label="Toggle dark mode">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:flex">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-slate-100 to-zinc-100 text-slate-700 dark:from-slate-900 dark:to-zinc-900 dark:text-slate-200"><UserRound size={16} /></div>
            <div className="text-right">
              <div className="text-sm font-semibold">{user?.name}</div>
              <div className="text-xs capitalize text-slate-500">{user?.role_label || user?.role}</div>
            </div>
          </div>
          <button className="btn-secondary h-10 w-10 px-0" onClick={logout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
