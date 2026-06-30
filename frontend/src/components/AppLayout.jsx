import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AppLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slatepanel text-slate-950 dark:bg-slate-950 dark:text-slate-100">
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
