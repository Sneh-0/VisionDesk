import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DataTable from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import api from "../services/api";
import { useApi } from "../hooks/useApi";

export default function Reports() {
  const { data: sales, loading } = useApi(() => api.get("/reports/sales"), []);
  const { data: branches } = useApi(() => api.get("/branches/analytics"), []);

  return (
    <>
      <PageHeader title="Reports" eyebrow="Sales and branch analytics" />
      <section className="card mb-6 p-5">
        <h2 className="mb-5 text-lg font-bold">Branch sales</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={branches || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#2474e8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      {loading ? <div className="card p-6">Loading reports...</div> : (
        <DataTable columns={[
          { key: "date", header: "Date", render: (row) => new Date(row.date).toLocaleDateString() },
          { key: "branch_name", header: "Branch" },
          { key: "invoices", header: "Invoices" },
          { key: "subtotal", header: "Subtotal", render: (row) => `$${Number(row.subtotal).toFixed(2)}` },
          { key: "tax", header: "Tax", render: (row) => `$${Number(row.tax).toFixed(2)}` },
          { key: "total", header: "Total", render: (row) => `$${Number(row.total).toFixed(2)}` }
        ]} rows={sales || []} />
      )}
    </>
  );
}
