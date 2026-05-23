import { AlertTriangle, ClipboardList, DollarSign, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../services/api";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import OwnerDashboard from "./OwnerDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApi(() => api.get("/dashboard"), []);
  const money = (value) => `$${Number(value || 0).toLocaleString()}`;

  if (user?.role === "owner") {
    return <OwnerDashboard />;
  }

  if (loading) return <div className="card p-6">Loading dashboard...</div>;
  if (error) return <div className="card p-6 text-red-600">{error}</div>;

  return (
    <>
      <PageHeader title="Command center" eyebrow="Today at a glance" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total sales today" value={money(data.cards.total_sales_today)} icon={DollarSign} tone="green" />
        <StatCard label="Total customers" value={data.cards.total_customers} icon={Users} />
        <StatCard label="Pending orders" value={data.cards.pending_orders} icon={ClipboardList} tone="amber" />
        <StatCard label="Low stock alerts" value={data.cards.low_stock_alerts} icon={AlertTriangle} tone="red" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card p-5">
          <h2 className="mb-5 text-lg font-bold">Sales analytics</h2>
          <div className="h-80">
            <ResponsiveContainer>
              <AreaChart data={data.sales_chart}>
                <defs>
                  <linearGradient id="sales" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2474e8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2474e8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#2474e8" fill="url(#sales)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card p-5">
          <h2 className="mb-5 text-lg font-bold">Top-selling products</h2>
          <div className="space-y-4">
            {data.top_products.map((product) => (
              <div key={product.name} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800">
                <div>
                  <div className="font-semibold">{product.name}</div>
                  <div className="text-sm text-slate-500">{product.units} units sold</div>
                </div>
                <div className="font-bold">{money(product.revenue)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="mt-6">
        <DataTable
          columns={[
            { key: "order_id", header: "Order" },
            { key: "customer_name", header: "Customer" },
            { key: "branch_name", header: "Branch" },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "total_amount", header: "Total", render: (row) => money(row.total_amount) }
          ]}
          rows={data.recent_orders}
        />
      </div>
    </>
  );
}
