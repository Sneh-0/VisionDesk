import { Plus } from "lucide-react";
import { useState } from "react";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import api from "../services/api";
import { useApi } from "../hooks/useApi";
import { useToast } from "../context/ToastContext";

const blank = { name: "", contact_person: "", phone: "", email: "", address: "" };

export default function Suppliers() {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const { data, loading, refetch } = useApi(() => api.get("/suppliers"), []);
  const { data: history } = useApi(() => api.get("/suppliers/supplies/history"), []);

  const save = async (event) => {
    event.preventDefault();
    await api.post("/suppliers", form);
    push("Supplier added");
    setOpen(false);
    setForm(blank);
    refetch();
  };

  return (
    <>
      <PageHeader title="Suppliers" eyebrow="Vendor details and supply records" actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={17} /> Add supplier</button>} />
      {loading ? <div className="card p-6">Loading suppliers...</div> : (
        <DataTable columns={[
          { key: "name", header: "Supplier" },
          { key: "contact_person", header: "Contact" },
          { key: "phone", header: "Phone" },
          { key: "email", header: "Email" }
        ]} rows={data || []} />
      )}
      <h2 className="mb-3 mt-8 text-lg font-bold">Supply history</h2>
      <DataTable columns={[
        { key: "supplied_at", header: "Date", render: (row) => new Date(row.supplied_at).toLocaleDateString() },
        { key: "supplier_name", header: "Supplier" },
        { key: "item_name", header: "Item" },
        { key: "branch_name", header: "Branch" },
        { key: "quantity", header: "Qty" },
        { key: "total_cost", header: "Total", render: (row) => `$${Number(row.total_cost).toFixed(2)}` }
      ]} rows={history || []} />
      <Modal title="Add supplier" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {Object.keys(blank).map((field) => (
            <label key={field} className="text-sm font-semibold">{field.replace("_", " ")}<input className="input mt-2" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} required={field === "name"} /></label>
          ))}
          <button className="btn-primary sm:col-span-2">Save supplier</button>
        </form>
      </Modal>
    </>
  );
}
