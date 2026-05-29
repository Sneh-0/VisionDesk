import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar />
      <main className="lg:pl-72">
        <Navbar />
        <div className="w-full px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
