import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AppLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(100,116,139,0.12),transparent_36%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(100,116,139,0.10),transparent_34%)]" />
      <Sidebar />
      <main className="relative lg:pl-72">
        <Navbar />
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
