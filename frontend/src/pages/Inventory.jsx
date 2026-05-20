import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import api from "../services/api";
import { useApi } from "../hooks/useApi";

export default function Inventory() {
  const { data, loading } = useApi(() => api.get("/inventory"), []);
  const { data: transactions } = useApi(() => api.get("/inventory/transactions"), []);

  return (
    <>
      <PageHeader title="Inventory" eyebrow="Branch stock and reorder levels" />
      {loading ? <div className="card p-6">Loading inventory...</div> : (
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
      )}
      <h2 className="mb-3 mt-8 text-lg font-bold">Stock transaction history</h2>
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
