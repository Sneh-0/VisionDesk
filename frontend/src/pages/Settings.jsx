import { Building2, ShieldCheck, Users } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import api from "../services/api";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  const { data: branches } = useApi(() => api.get("/branches"), []);
  const { data: analytics } = useApi(() => api.get("/branches/analytics"), []);

  return (
    <>
      <PageHeader title="Settings" eyebrow="Branches, roles, and operating defaults" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Signed in as" value={user?.role_label || user?.role} icon={ShieldCheck} />
        <StatCard label="Branches" value={branches?.length || 0} icon={Building2} tone="green" />
        <StatCard label="Access model" value="Owner / Branch Admin / Staff" icon={Users} tone="amber" />
      </div>
      <DataTable columns={[
        { key: "name", header: "Branch" },
        { key: "code", header: "Code" },
        { key: "address", header: "Address" },
        { key: "phone", header: "Phone" }
      ]} rows={branches || []} />
      <h2 className="mb-3 mt-8 text-lg font-bold">Branch operations</h2>
      <DataTable columns={[
        { key: "name", header: "Branch" },
        { key: "orders", header: "Orders" },
        { key: "stock_units", header: "Stock units" },
        { key: "sales", header: "Sales", render: (row) => `$${Number(row.sales).toFixed(2)}` }
      ]} rows={analytics || []} />
    </>
  );
}
