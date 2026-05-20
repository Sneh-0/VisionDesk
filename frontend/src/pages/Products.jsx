import { Plus } from "lucide-react";
import { useState } from "react";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import SearchBar from "../components/SearchBar";
import api from "../services/api";
import { useApi } from "../hooks/useApi";
import { useToast } from "../context/ToastContext";

const blank = { item_type: "Frame", name: "", sku: "", barcode: "", category: "", brand: "", color: "", price: 0, reorder_level: 5, frame_shape: "", frame_material: "", lens_type: "", lens_power: "" };

export default function Products() {
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const { data, loading, refetch } = useApi(() => api.get(`/products?search=${search}`), [search]);

  const save = async (event) => {
    event.preventDefault();
    await api.post("/products", form);
    push("Product added");
    setOpen(false);
    setForm(blank);
    refetch();
  };

  return (
    <>
      <PageHeader title="Products" eyebrow="Frames, lenses, barcode catalog" actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={17} /> Add product</button>} />
      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Search SKU, barcode, brand" /></div>
      {loading ? <div className="card p-6">Loading products...</div> : (
        <DataTable
          columns={[
            { key: "sku", header: "SKU" },
            { key: "name", header: "Product" },
            { key: "item_type", header: "Type" },
            { key: "brand", header: "Brand" },
            { key: "color", header: "Color" },
            { key: "price", header: "Price", render: (row) => `$${Number(row.price).toFixed(2)}` },
            { key: "reorder_level", header: "Reorder" }
          ]}
          rows={data?.data || []}
        />
      )}
      <Modal title="Add product" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Type<select className="input mt-2" value={form.item_type} onChange={(event) => setForm({ ...form, item_type: event.target.value })}><option>Frame</option><option>Lens</option></select></label>
          {["name", "sku", "barcode", "category", "brand", "color", "price", "reorder_level"].map((field) => (
            <label key={field} className="text-sm font-semibold">{field.replace("_", " ")}<input className="input mt-2" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} required={["name", "sku", "category", "brand"].includes(field)} /></label>
          ))}
          {form.item_type === "Frame" ? (
            <>
              <label className="text-sm font-semibold">Frame shape<input className="input mt-2" value={form.frame_shape} onChange={(event) => setForm({ ...form, frame_shape: event.target.value })} /></label>
              <label className="text-sm font-semibold">Frame material<input className="input mt-2" value={form.frame_material} onChange={(event) => setForm({ ...form, frame_material: event.target.value })} /></label>
            </>
          ) : (
            <>
              <label className="text-sm font-semibold">Lens type<input className="input mt-2" value={form.lens_type} onChange={(event) => setForm({ ...form, lens_type: event.target.value })} /></label>
              <label className="text-sm font-semibold">Lens power<input className="input mt-2" value={form.lens_power} onChange={(event) => setForm({ ...form, lens_power: event.target.value })} /></label>
            </>
          )}
          <button className="btn-primary sm:col-span-2">Save product</button>
        </form>
      </Modal>
    </>
  );
}
