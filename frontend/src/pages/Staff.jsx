import { useState } from "react";
import { Plus, User, ToggleLeft, ToggleRight, KeyRound } from "lucide-react";
import api from "../services/api";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

export default function Staff() {
  const { user } = useAuth();
  const { push } = useToast();
  const isOwner = user?.role === "owner";
  const [selectedBranch, setSelectedBranch] = useState("");
  const { data: staff, loading, refetch } = useApi(
    () => api.get("/staff", { params: selectedBranch ? { branch_id: selectedBranch } : {} }),
    [selectedBranch]
  );
  const { data: branches } = useApi(() => api.get("/branches"), []);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    login_id: "",
    email: "",
    phone: "",
    role: "staff",
    branch_id: user?.branch_id || "",
    password: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/staff", formData);
      setIsModalOpen(false);
      setFormData({
        full_name: "",
        login_id: "",
        email: "",
        phone: "",
        role: "staff",
        branch_id: user?.branch_id || "",
        password: ""
      });
      refetch();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create staff");
    }
  };

  const toggleStatus = async (staffId, currentStatus) => {
    try {
      await api.patch(`/staff/${staffId}/status`, { is_active: !currentStatus });
      refetch();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const [resetTarget, setResetTarget] = useState(null);
  const [resetForm, setResetForm] = useState({ new_password: "", confirm_password: "" });
  const [resetting, setResetting] = useState(false);

  const openReset = (row) => {
    setResetTarget(row);
    setResetForm({ new_password: "", confirm_password: "" });
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (resetForm.new_password !== resetForm.confirm_password) {
      push("Passwords do not match", "error");
      return;
    }
    setResetting(true);
    try {
      await api.patch(`/staff/${resetTarget.staff_id}/password`, { new_password: resetForm.new_password });
      push(`Password reset for ${resetTarget.full_name}`);
      setResetTarget(null);
    } catch (err) {
      push(err.apiMessage || "Failed to reset password", "error");
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Staff Management" eyebrow="Personnel & Access Control" />
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {isOwner && (
        <div className="mb-4 max-w-xs">
          <label className="label">Branch</label>
          <select className="input" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
            <option value="">All branches</option>
            {branches?.map((branch) => (
              <option key={branch.branch_id} value={branch.branch_id}>{branch.name}</option>
            ))}
          </select>
        </div>
      )}

      <DataTable
        columns={[
          { key: "full_name", header: "Name", render: (row) => (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-full dark:bg-slate-800 dark:text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">{row.full_name}</div>
                <div className="text-xs text-slate-500">{row.login_id}</div>
              </div>
            </div>
          )},
          { key: "login_id", header: "Login ID" },
          { key: "role", header: "Role", render: (row) => (
            <span className="capitalize px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium dark:bg-slate-900/40 dark:text-slate-300">
              {row.role.replace('_', ' ')}
            </span>
          )},
          { key: "branch_name", header: "Branch" },
          { key: "status", header: "Status", render: (row) => (
            <button onClick={() => toggleStatus(row.staff_id, row.is_active)} className="flex items-center gap-2">
              {row.is_active ? (
                <><ToggleRight className="h-6 w-6 text-green-500" /> <span className="text-sm text-green-600">Active</span></>
              ) : (
                <><ToggleLeft className="h-6 w-6 text-slate-400" /> <span className="text-sm text-slate-500">Inactive</span></>
              )}
            </button>
          )},
          { key: "actions", header: "Actions", render: (row) => (
            isOwner ? (
              <button onClick={() => openReset(row)} className="btn-secondary h-9 px-3 text-xs">
                <KeyRound className="h-4 w-4" /> Reset password
              </button>
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )
          )}
        ]}
        rows={staff || []}
        loading={loading}
      />

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New User">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="text"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Login ID</label>
            <input
              type="text"
              className="input"
              value={formData.login_id}
              onChange={(e) => setFormData({ ...formData, login_id: e.target.value })}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="staff">Staff</option>
                {isOwner && <option value="branch_admin">Branch Admin</option>}
                {isOwner && <option value="owner">Owner</option>}
              </select>
            </div>
            <div>
              <label className="label">Branch</label>
              <select
                className="input"
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                required
                disabled={!isOwner}
              >
                <option value="">Select Branch</option>
                {branches?.map(b => (
                  <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Temporary Password</label>
            <input
              type="password"
              className="input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create User</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title="Reset password">
        <form onSubmit={submitReset} className="space-y-4">
          <p className="text-sm text-slate-500">
            Set a new password for <span className="font-semibold text-slate-700 dark:text-slate-200">{resetTarget?.full_name}</span> ({resetTarget?.login_id}).
            They can change it themselves later from Settings.
          </p>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              value={resetForm.new_password}
              onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
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
              value={resetForm.confirm_password}
              onChange={(e) => setResetForm({ ...resetForm, confirm_password: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-ghost" onClick={() => setResetTarget(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={resetting}>
              {resetting ? "Resetting…" : "Reset password"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
