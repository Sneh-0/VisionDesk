import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { DollarSign, ShoppingBag, AlertTriangle, TrendingUp } from "lucide-react";
import api from "../services/api";
import { useApi } from "../hooks/useApi";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";

const COLORS = ["#2474e8", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function OwnerDashboard() {
  const { data, loading, error } = useApi(() => api.get("/dashboard/owner"), []);
  const money = (value) => `$${Number(value || 0).toLocaleString()}`;

  if (loading) return <div className="card p-6">Loading owner reports...</div>;
  if (error) return <div className="card p-6 text-red-600">{error}</div>;

  return (
    <>
      <PageHeader title="Executive Overview" eyebrow="All Branches Analytics" />
      
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        <StatCard label="Total Revenue (All Time)" value={money(data.stats.total_revenue)} icon={DollarSign} tone="green" />
        <StatCard label="Total Orders Processed" value={data.stats.total_orders} icon={ShoppingBag} tone="blue" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card p-5">
          <h2 className="mb-5 text-lg font-bold">Branch Performance</h2>
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={data.branch_performance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="branch_name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_sales" name="Sales ($)" fill="#2474e8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="order_count" name="Orders" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-5 text-lg font-bold">Sales Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.branch_performance}
                  dataKey="total_sales"
                  nameKey="branch_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {data.branch_performance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-5 text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Critical Stock Alerts (Across Network)
          </h2>
          <DataTable
            columns={[
              { key: "branch_name", header: "Branch" },
              { key: "item_name", header: "Product" },
              { key: "stock_level", header: "In Stock" },
              { key: "reorder_level", header: "Limit" }
            ]}
            rows={data.low_stock}
          />
        </section>

        <section className="card p-5">
          <h2 className="mb-5 text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Recent Global Orders
          </h2>
          <DataTable
            columns={[
              { key: "order_id", header: "ID" },
              { key: "branch_name", header: "Branch" },
              { key: "customer_name", header: "Customer" },
              { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
              { key: "total_amount", header: "Amount", render: (row) => money(row.total_amount) }
            ]}
            rows={data.recent_orders}
          />
        </section>
      </div>
    </>
  );
}
