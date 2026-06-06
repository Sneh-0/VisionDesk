import { useState } from "react";
import { Plus, Building2, MapPin, Phone, Mail } from "lucide-react";
import api from "../services/api";
import { useApi } from "../hooks/useApi";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

export default function Branches() {
  const { data: branches, loading, refetch } = useApi(() => api.get("/branches"), []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/branches", formData);
      setIsModalOpen(false);
      setFormData({ name: "", address: "", city: "", state: "", pincode: "", phone: "", email: "" });
      refetch();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create branch");
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Branch Management" eyebrow="Manage retail locations" />
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add Branch
        </button>
      </div>

      <DataTable
        columns={[
          { key: "name", header: "Branch Name", render: (row) => (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 text-slate-700 rounded-lg dark:bg-slate-900/40 dark:text-slate-300">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="font-semibold">{row.name}</span>
            </div>
          )},
          { key: "city", header: "City" },
          { key: "phone", header: "Phone" },
          { key: "email", header: "Email" },
          { key: "status", header: "Status", render: (row) => (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {row.is_active ? 'Active' : 'Inactive'}
            </span>
          )}
        ]}
        rows={branches || []}
        loading={loading}
      />

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Branch">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Branch Name</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Phone</label>
              <input
                type="text"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea
              className="input"
              rows="2"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            ></textarea>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">City</label>
              <input
                type="text"
                className="input"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="label">State</label>
              <input
                type="text"
                className="input"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input
                type="text"
                className="input"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Branch</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
