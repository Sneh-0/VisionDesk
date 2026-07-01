import { useState } from "react";
import { Building2, KeyRound, ShieldCheck, Users } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import api from "../services/api";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

function ChangePasswordCard() {
  const { push } = useToast();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [saving, setSaving] = useState(false);

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
      push("Password updated successfully");
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      push(err.apiMessage || "Failed to update password", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card max-w-xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="inline-flex rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
          <KeyRound size={20} />
        </div>
        <div>
          <h3 className="section-title">Change password</h3>
          <p className="text-sm text-slate-500">Update the password for your own account.</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Current password</label>
          <input
            type="password"
            className="input"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            required
            autoComplete="current-password"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { data: branches } = useApi(() => api.get("/branches"), []);
  const { data: analytics } = useApi(() => api.get("/branches/analytics"), []);

  return (
    <>
      <PageHeader title="Settings" eyebrow="Branches, roles, and operating defaults" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Signed in as" value={user?.role_label || user?.role} icon={ShieldCheck} />
        <StatCard label="Branches" value={branches?.length || 0} icon={Building2} tone="green" />
        <StatCard label="Access model" value="Owner / Branch Admin / Staff" icon={Users} tone="amber" />
      </div>
      <DataTable columns={[
        { key: "name", header: "Branch" },
        { key: "code", header: "Code" },
        { key: "address", header: "Address" },
        { key: "phone", header: "Phone" }
      ]} rows={branches || []} />
      <h2 className="mb-3 mt-8 text-lg font-bold">Branch operations</h2>
      <DataTable columns={[
        { key: "name", header: "Branch" },
        { key: "orders", header: "Orders" },
        { key: "stock_units", header: "Stock units" },
        { key: "sales", header: "Sales", render: (row) => `$${Number(row.sales).toFixed(2)}` }
      ]} rows={analytics || []} />
      <h2 className="mb-3 mt-8 text-lg font-bold">Security</h2>
      <ChangePasswordCard />
    </>
  );
}
