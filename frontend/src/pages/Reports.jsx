import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DataTable from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import api from "../services/api";
import { useApi } from "../hooks/useApi";

export default function Reports() {
  const { data: report, loading } = useApi(() => api.get("/reports/sales"), []);
  const { data: branches } = useApi(() => api.get("/branches/analytics"), []);
  const branchSales = report?.branch_sales || [];
  const productSales = report?.product_sales_by_branch || [];

  return (
    <>
      <PageHeader title="Reports" eyebrow="Financial & Operational Reports" />
      <section className="card mb-6 p-5">
        <h2 className="mb-5 text-lg font-bold">Branch sales</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={branchSales.length ? branchSales : branches || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="branch_name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#475569" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      {loading ? <div className="card p-6">Loading reports...</div> : (
        <div className="space-y-6">
          <DataTable
            columns={[
              { key: "branch_name", header: "Branch" },
              { key: "sales", header: "Sales", render: (row) => `$${Number(row.sales).toFixed(2)}` },
              { key: "orders", header: "Orders" },
              { key: "items_sold", header: "Items sold" }
            ]}
            rows={branchSales}
          />
          <DataTable
            columns={[
              { key: "branch_name", header: "Branch" },
              { key: "product_name", header: "Product" },
              { key: "units", header: "Units" },
              { key: "revenue", header: "Revenue", render: (row) => `$${Number(row.revenue).toFixed(2)}` }
            ]}
            rows={productSales}
          />
          <div className="card p-5">
            <h3 className="mb-3 text-base font-bold">Summary</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-sm text-slate-500">Total sales</div>
                <div className="text-xl font-bold">${Number(report?.summary?.total_sales || 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Orders</div>
                <div className="text-xl font-bold">{report?.summary?.total_orders || 0}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Customers</div>
                <div className="text-xl font-bold">{report?.summary?.total_customers || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
