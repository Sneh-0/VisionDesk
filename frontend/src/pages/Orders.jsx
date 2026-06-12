import { Download, Plus, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import api from "../services/api";
import { useApi } from "../hooks/useApi";
import { useToast } from "../context/ToastContext";

const statuses = ["Pending", "In Progress", "Ready", "Delivered"];
const blankPrescription = {
  left_eye_sph: "",
  left_eye_cyl: "",
  left_eye_axis: "",
  right_eye_sph: "",
  right_eye_cyl: "",
  right_eye_axis: "",
  ipd_near: "",
  ipd_far: "",
  notes: ""
};
const blankOrder = {
  customer_id: "",
  branch_id: "",
  tax_rate: 0.18,
  notes: "",
  requires_prescription: false,
  lens_modification_notes: "",
  prescription: blankPrescription,
  items: [{ item_id: "", quantity: 1, unit_price: 0 }]
};

export default function Orders() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankOrder);

  const [q, setQ] = useState("");
  const { data, loading, refetch } = useApi(() => api.get("/orders", { params: { q } }), [q]);
  const { data: invoices } = useApi(() => api.get("/invoices"), []);
  const { data: customers } = useApi(() => api.get("/customers?limit=100"), []);
  const { data: products } = useApi(() => api.get("/products?limit=100"), []);
  const { data: branches } = useApi(() => api.get("/branches"), []);

  const updateStatus = async (order, status) => {
    await api.patch(`/orders/${order.order_id}/status`, { status });
    push("Order status updated");
    refetch();
  };

  const downloadInvoice = (invoice) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("VisionDesk Invoice", 20, 20);
    doc.setFontSize(9);
    doc.text("INVENTORY & SALES PLATFORM", 20, 26);
    doc.setFontSize(11);
    doc.text(`Invoice: ${invoice.invoice_number}`, 20, 35);
    doc.text(`Customer: ${invoice.customer_name}`, 20, 45);
    doc.text(`Branch: ${invoice.branch_name}`, 20, 55);
    doc.text(`Logged by: ${invoice.created_by_login_id || invoice.created_by_name || "-"}`, 20, 65);
    if (invoice.requires_prescription) doc.text("Lens modification: Prescription attached", 20, 75);
    doc.text(`Subtotal: $${Number(invoice.subtotal).toFixed(2)}`, 20, 90);
    doc.text(`Tax: $${Number(invoice.tax_amount).toFixed(2)}`, 20, 100);
    doc.text(`Total: $${Number(invoice.total_amount).toFixed(2)}`, 20, 110);
    doc.save(`${invoice.invoice_number}.pdf`);
  };

  const createOrder = async (event) => {
    event.preventDefault();
    const { data } = await api.post("/orders", form);
    push("Order and invoice created");
    setOpen(false);
    setForm(blankOrder);
    navigate(`/orders/${data.invoice.invoice_id}/payment`);
  };

  const setItem = (index, patch) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  };

  return (
    <>
      <PageHeader
        title="Orders"
        eyebrow="Order & Invoice Management"
        actions={(
          <>
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={17} /> Create order
            </button>
          </>
        )}
      />

      {loading ? (
        <div className="card p-6">Loading orders...</div>
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <SearchBar value={q} onChange={setQ} placeholder="Search orders" />
          </div>

          <DataTable
            columns={[
              { key: "order_id", header: "Order" },
              { key: "customer_name", header: "Customer" },
              { key: "branch_name", header: "Branch" },
              { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
              { key: "requires_prescription", header: "Lens work", render: (row) => row.requires_prescription ? "Prescription" : "-" },
              { key: "total_amount", header: "Total", render: (row) => `$${Number(row.total_amount).toFixed(2)}` },
              {
                key: "change",
                header: "Move to",
                render: (row) => (
                  <select className="input min-w-36" value={row.status} onChange={(event) => updateStatus(row, event.target.value)}>
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                )
              }
            ]}
            rows={data || []}
          />
        </>
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold">Invoices</h2>
      <DataTable
        columns={[
          { key: "invoice_number", header: "Invoice" },
          { key: "customer_name", header: "Customer" },
          { key: "created_by_login_id", header: "Logged by", render: (row) => row.created_by_login_id || row.created_by_name || "-" },
          { key: "requires_prescription", header: "Lens work", render: (row) => row.requires_prescription ? "Prescription" : "-" },
          {
            key: "payment_status",
            header: "Payment",
            render: (row) => (
              <button
                type="button"
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={() => navigate(`/orders/${row.invoice_id}/payment`)}
                title="Open payment method"
              >
                {row.payment_status || "Pending"}
              </button>
            )
          },
          { key: "total_amount", header: "Total", render: (row) => `$${Number(row.total_amount).toFixed(2)}` },
          {
            key: "download",
            header: "",
            render: (row) => (
              <button className="btn-secondary" onClick={() => downloadInvoice(row)}>
                <Download size={16} /> PDF
              </button>
            )
          }
        ]}
        rows={invoices || []}
      />

      <Modal title="Create order" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={createOrder} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Customer
              <select
                className="input mt-2"
                value={form.customer_id}
                onChange={(event) => setForm({ ...form, customer_id: event.target.value })}
                required
              >
                <option value="">Select customer</option>
                {customers?.data?.map((customer) => (
                  <option key={customer.customer_id} value={customer.customer_id}>
                    {customer.name} - {customer.mobile_number}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold">
              Branch
              <select
                className="input mt-2"
                value={form.branch_id}
                onChange={(event) => setForm({ ...form, branch_id: event.target.value })}
                required
              >
                <option value="">Select branch</option>
                {branches?.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-3">
            {form.items.map((item, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-[1fr_90px_120px_44px]">
                <select
                  className="input"
                  value={item.item_id}
                  onChange={(event) => {
                    const product = products?.data?.find((entry) => String(entry.item_id) === event.target.value);
                    setItem(index, { item_id: event.target.value, unit_price: product?.price || 0 });
                  }}
                  required
                >
                  <option value="">Select product</option>
                  {products?.data?.map((product) => (
                    <option key={product.item_id} value={product.item_id}>
                      {product.name} - ${Number(product.price).toFixed(2)}
                    </option>
                  ))}
                </select>

                <input className="input" type="number" min="1" value={item.quantity} onChange={(event) => setItem(index, { quantity: Number(event.target.value) })} />
                <input className="input" type="number" min="0" value={item.unit_price} onChange={(event) => setItem(index, { unit_price: Number(event.target.value) })} />

                <button type="button" className="btn-secondary h-10 px-0" onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="btn-secondary" onClick={() => setForm({ ...form, items: [...form.items, { item_id: "", quantity: 1, unit_price: 0 }] })}>
            <Plus size={16} /> Add line
          </button>

          <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.requires_prescription}
                onChange={(event) => setForm({ ...form, requires_prescription: event.target.checked })}
              />
              Lens modification / prescription required
            </label>

            {form.requires_prescription && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["right_eye_sph", "Right SPH"],
                    ["right_eye_cyl", "Right CYL"],
                    ["right_eye_axis", "Right Axis"],
                    ["left_eye_sph", "Left SPH"],
                    ["left_eye_cyl", "Left CYL"],
                    ["left_eye_axis", "Left Axis"],
                    ["ipd_near", "IPD Near"],
                    ["ipd_far", "IPD Far"]
                  ].map(([field, label]) => (
                    <label key={field} className="text-sm font-semibold">
                      {label}
                      <input
                        className="input mt-2"
                        type="number"
                        step="0.01"
                        value={form.prescription[field]}
                        onChange={(event) => setForm({
                          ...form,
                          prescription: { ...form.prescription, [field]: event.target.value }
                        })}
                      />
                    </label>
                  ))}
                </div>
                <label className="block text-sm font-semibold">
                  Lens modification details
                  <textarea
                    className="input mt-2"
                    value={form.lens_modification_notes}
                    onChange={(event) => setForm({
                      ...form,
                      lens_modification_notes: event.target.value,
                      prescription: { ...form.prescription, notes: event.target.value }
                    })}
                    placeholder="Coating, tint, progressive lens, fitting notes, remake details"
                  />
                </label>
              </div>
            )}
          </section>

          <label className="block text-sm font-semibold">
            Notes
            <textarea className="input mt-2" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>

          <button className="btn-primary w-full">Generate order and invoice</button>
        </form>
      </Modal>
    </>
  );
}
