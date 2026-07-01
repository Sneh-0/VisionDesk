import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Blocks all app routes until a user with a temporary (admin-set) password has chosen their own.
export default function PasswordChangeGate() {
  const { user } = useAuth();

  if (user?.must_change_password) {
    return <Navigate to="/force-password" replace />;
  }

  return <Outlet />;
}
