import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import BrandLogo from "../components/BrandLogo";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ login_id: "", password: "" });
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(form.login_id, form.password);
      push("Welcome back to VisionDesk");
      navigate("/dashboard");
    } catch (error) {
      push(error.response?.data?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-950 text-white lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative flex min-h-[34rem] flex-col justify-center overflow-hidden bg-slate-950 px-8 py-10 lg:px-14">
        <div className="w-full max-w-xs overflow-hidden rounded-xl border border-white/10 bg-white/95 px-3 shadow-xl shadow-slate-950/20 dark:bg-slate-900/95">
          <BrandLogo className="h-32 w-full" />
        </div>
        <div className="relative mt-10 max-w-xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-300">VisionDesk</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Optical store workspace.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">Manage customers, prescriptions, orders, inventory, and invoices from one place.</p>
        </div>
      </section>
      <section className="grid place-items-center bg-slate-50 px-6 text-slate-950 dark:bg-slate-900 dark:text-white">
        <form onSubmit={submit} className="card w-full max-w-md p-7 shadow-2xl">
          <div className="mb-6">
            <div className="mb-3 inline-flex rounded-xl bg-gradient-to-br from-slate-100 to-zinc-100 p-2.5 text-slate-700"><CheckCircle2 size={22} /></div>
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Use your staff login ID and password.</p>
          </div>
          <label className="mb-4 block text-sm font-semibold">
            Login ID
            <input className="input mt-2" value={form.login_id} onChange={(event) => setForm({ ...form, login_id: event.target.value })} required autoComplete="username" />
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
