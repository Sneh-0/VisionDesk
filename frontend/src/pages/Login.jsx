import { Eye } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "owner@visiondesk.com", password: "owner123" });
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      push("Welcome back to Visondesk");
      navigate("/dashboard");
    } catch (error) {
      push(error.response?.data?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-950 text-white lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between px-8 py-10 lg:px-14">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-sm font-bold text-slate-950">VD</div>
          <div>
            <div className="text-xl font-bold">Visondesk</div>
            <div className="text-sm text-slate-400">Optical Store Management System</div>
          </div>
        </div>
        <div className="max-w-2xl py-20">
          <p className="mb-4 text-sm font-semibold text-brand-100">Modern optical retail operations</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Customers, prescriptions, stock, and sales in one calm workspace.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">Run multi-branch optical stores with inventory control, invoice workflows, prescription history, supplier records, and sales analytics.</p>
        </div>
        <div className="text-sm text-slate-500">Demo: owner / branch admin / staff accounts are separated by role</div>
      </section>
      <section className="grid place-items-center bg-slate-50 px-6 text-slate-950 dark:bg-slate-900 dark:text-white">
        <form onSubmit={submit} className="card w-full max-w-md p-6">
          <div className="mb-6">
            <div className="mb-3 inline-flex rounded-lg bg-brand-50 p-2 text-brand-700"><Eye size={22} /></div>
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Secure JWT authentication with role-based access.</p>
          </div>
          <label className="mb-4 block text-sm font-semibold">
            Email
            <input className="input mt-2" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </label>
          <label className="mb-6 block text-sm font-semibold">
            Password
            <input className="input mt-2" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </label>
          <button className="btn-primary w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        </form>
      </section>
    </div>
  );
}
