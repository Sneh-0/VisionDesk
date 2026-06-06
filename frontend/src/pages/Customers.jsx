import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import SearchBar from "../components/SearchBar";
import api from "../services/api";
import { useApi } from "../hooks/useApi";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const blank = { name: "", mobile_number: "", email: "", address: "", loyalty_points: 0 };

export default function Customers() {
  const { user } = useAuth();
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blank);
  const { data, loading, refetch } = useApi(() => api.get(`/customers?search=${search}`), [search]);
  const rows = useMemo(() => data?.data || [], [data]);

  const save = async (event) => {
    event.preventDefault();
    if (editingId) {
      await api.put(`/customers/${editingId}`, form);
      push("Customer updated");
    } else {
      await api.post("/customers", form);
      push("Customer added");
    }
    setForm(blank);
    setEditingId(null);
    setOpen(false);
    refetch();
  };

  const addCustomer = () => {
    setEditingId(null);
    setForm(blank);
    setOpen(true);
  };

  const editCustomer = (customer) => {
    setEditingId(customer.customer_id);
    setForm({
      name: customer.name || "",
      mobile_number: customer.mobile_number || "",
      email: customer.email || "",
      address: customer.address || "",
      loyalty_points: customer.loyalty_points || 0
    });
    setOpen(true);
  };

  const remove = async (id) => {
    await api.delete(`/customers/${id}`);
    push("Customer deleted");
    refetch();
  };

  return (
    <>
      <PageHeader
        title="Customers"
        eyebrow="Profiles and prescriptions"
        actions={<button className="btn-primary" onClick={addCustomer}><Plus size={17} /> Add customer</button>}
      />
      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Search by mobile, name, or email" /></div>
      {loading ? <div className="card p-6">Loading customers...</div> : (
        <DataTable
          columns={[
            { key: "customer_id", header: "ID" },
            { key: "name", header: "Name" },
            { key: "mobile_number", header: "Mobile" },
            { key: "email", header: "Email" },
            { key: "created_by_login_id", header: "Logged by", render: (row) => row.created_by_login_id || row.created_by_name || "-" },
            { key: "loyalty_points", header: "Loyalty" },
            { key: "loyalty_tier", header: "Tier", render: (row) => row.loyalty_tier || "basic" },
            {
              key: "actions",
              header: "",
              render: (row) => ["owner", "branch_admin"].includes(user?.role) && (
                <div className="flex justify-end gap-2">
                  <button className="btn-secondary h-9 w-9 px-0" title="Edit customer" onClick={() => editCustomer(row)}><Pencil size={16} /></button>
                  <button className="btn-secondary h-9 w-9 px-0" title="Delete customer" onClick={() => remove(row.customer_id)}><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
          rows={rows}
        />
      )}
      <Modal title={editingId ? "Edit customer" : "Add customer"} open={open} onClose={() => { setOpen(false); setEditingId(null); setForm(blank); }}>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {["name", "mobile_number", "email", "address", "loyalty_points"].map((field) => (
            <label key={field} className="text-sm font-semibold">
              {field.replace("_", " ")}
              <input
                className="input mt-2"
                type={field === "loyalty_points" ? "number" : "text"}
                min={field === "loyalty_points" ? "0" : undefined}
                value={form[field]}
                onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                required={field === "name" || field === "mobile_number"}
                disabled={editingId && field === "mobile_number"}
              />
            </label>
          ))}
          <button className="btn-primary sm:col-span-2">{editingId ? "Update customer" : "Save customer"}</button>
        </form>
      </Modal>
    </>
  );
}
