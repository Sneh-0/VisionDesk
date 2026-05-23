import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";
import Inventory from "./pages/Inventory";
import Products from "./pages/Products";
import Suppliers from "./pages/Suppliers";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Branches from "./pages/Branches";
import Staff from "./pages/Staff";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/orders" element={<Orders />} />
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
  );
}
