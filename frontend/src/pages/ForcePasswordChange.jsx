import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function ForcePasswordChange() {
  const { user, refreshUser, logout } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [saving, setSaving] = useState(false);

  // Already cleared (e.g. navigated here directly) — nothing to do.
  if (user && !user.must_change_password) {
    return <Navigate to="/dashboard" replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    if (form.new_password !== form.confirm_password) {
      push("New passwords do not match", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-password", {
        current_password: form.current_password,
        new_password: form.new_password
      });
      await refreshUser();
      push("Password set. Welcome!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      push(err.apiMessage || "Failed to set password", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-brand-950 px-4 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex rounded-xl bg-white/10 p-3 text-brand-200">
            <KeyRound size={26} />
          </div>
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <p className="mt-2 text-sm text-brand-100/80">
            Your account uses a temporary password set by an administrator. For your security, choose your
            own password before continuing.
          </p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6 text-slate-900 dark:text-white">
          <div>
            <label className="label">Temporary password</label>
            <input
              type="password"
              className="input"
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              className="input"
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? "Saving…" : "Save and continue"}
          </button>
          <button type="button" className="btn-ghost w-full" onClick={logout}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
