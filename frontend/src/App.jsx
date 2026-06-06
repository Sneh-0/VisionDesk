import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Customers = lazy(() => import("./pages/Customers"));
const Orders = lazy(() => import("./pages/Orders"));
const PaymentMethod = lazy(() => import("./pages/PaymentMethod"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Products = lazy(() => import("./pages/Products"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Login = lazy(() => import("./pages/Login"));
const Branches = lazy(() => import("./pages/Branches"));
const Staff = lazy(() => import("./pages/Staff"));

export default function App() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-semibold text-slate-500 dark:bg-slate-950">Loading workspace...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:invoiceId/payment" element={<PaymentMethod />} />
            <Route path="/inventory" element={<ProtectedRoute allowedRoles={["owner", "branch_admin"]}><Inventory /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute allowedRoles={["owner", "branch_admin"]}><Products /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute allowedRoles={["owner", "branch_admin"]}><Suppliers /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={["owner", "branch_admin"]}><Reports /></ProtectedRoute>} />
            <Route path="/branches" element={<ProtectedRoute allowedRoles={["owner"]}><Branches /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute allowedRoles={["owner", "branch_admin"]}><Staff /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={["owner", "branch_admin"]}><Settings /></ProtectedRoute>} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
