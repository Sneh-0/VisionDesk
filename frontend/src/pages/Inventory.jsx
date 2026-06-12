import { useState } from "react";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import SearchBar from "../components/SearchBar";
import api from "../services/api";
import { useApi } from "../hooks/useApi";

export default function Inventory() {
  const [q, setQ] = useState("");
  const [txQ, setTxQ] = useState("");
  const { data, loading } = useApi(() => api.get("/inventory", { params: { q } }), [q]);
  const { data: transactions } = useApi(() => api.get("/inventory/transactions", { params: { q: txQ } }), [txQ]);

  return (
    <>
      <PageHeader title="Inventory" eyebrow="Branch Stock Levels" />
      {loading ? <div className="card p-6">Loading inventory...</div> : (
        <>
          <div className="mb-3 flex justify-end"><SearchBar value={q} onChange={setQ} placeholder="Search inventory" /></div>
          <DataTable
          columns={[
            { key: "branch_name", header: "Branch" },
            { key: "name", header: "Item" },
            { key: "sku", header: "SKU" },
            { key: "brand", header: "Brand" },
            { key: "quantity", header: "Stock" },
            { key: "reorder_level", header: "Reorder" },
            { key: "alert", header: "Alert", render: (row) => row.quantity <= row.reorder_level ? <span className="font-bold text-red-600">Low stock</span> : "Healthy" }
          ]}
          rows={data || []}
          />
        </>
      )}
      <h2 className="mb-3 mt-8 text-lg font-bold">Stock transaction history</h2>
      <div className="mb-3 flex justify-end"><SearchBar value={txQ} onChange={setTxQ} placeholder="Search transactions" /></div>
      <DataTable
        columns={[
          { key: "created_at", header: "Date", render: (row) => new Date(row.created_at).toLocaleString() },
          { key: "branch_name", header: "Branch" },
          { key: "item_name", header: "Item" },
          { key: "transaction_type", header: "Type" },
          { key: "quantity_change", header: "Qty" },
          { key: "reference", header: "Reference" }
        ]}
        rows={transactions || []}
      />
    </>
  );
}
