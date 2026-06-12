import { ArrowLeft, Banknote, CreditCard, QrCode, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import api from "../services/api";
import { useApi } from "../hooks/useApi";
import { useToast } from "../context/ToastContext";

const methods = [
  {
    id: "cash",
    label: "Cash",
    icon: Banknote,
    description: "Collect the amount at the counter and mark the invoice paid."
  },
  {
    id: "card",
    label: "Card",
    icon: CreditCard,
    description: "Use the card terminal and complete the transaction."
  },
  {
    id: "upi",
    label: "UPI",
    icon: QrCode,
    description: "Send the customer to the UPI app or QR payment flow."
  }
];

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function PaymentMethod() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const { data: invoice, loading, error } = useApi(() => api.get(`/invoices/${invoiceId}`), [invoiceId]);
  const [selectedMethod, setSelectedMethod] = useState("cash");
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [saving, setSaving] = useState(false);

  const availablePoints = Number(invoice?.loyalty_points_available || 0);
  const payableAmount = Number(invoice?.payable_amount ?? invoice?.total_amount ?? 0);
  const loyaltyRate = useMemo(() => {
    if (!useLoyalty || loyaltyPoints <= 0) return 0;
    return Math.min(loyaltyPoints / 100, 100);
  }, [loyaltyPoints, useLoyalty]);
  const loyaltyDiscount = useMemo(() => {
    if (!useLoyalty) return 0;
    const grossDiscount = payableAmount * (loyaltyRate / 100);
    return Math.min(grossDiscount, payableAmount);
  }, [loyaltyRate, payableAmount, useLoyalty]);
  const netPayable = Math.max(payableAmount - loyaltyDiscount, 0);
  const maxRedeemablePoints = Math.max(0, Math.floor(Math.min(availablePoints, payableAmount * 100)));

  const savePayment = async (event) => {
    event.preventDefault();

    const confirmed = window.confirm("Payment complete?");
    if (!confirmed) return;

    setSaving(true);
    try {
      await api.patch(`/invoices/${invoiceId}/payment`, {
        payment_method: selectedMethod,
        loyalty_points: useLoyalty ? loyaltyPoints : 0
      });
      push("Payment recorded");
      navigate("/orders", { replace: true });
    } catch (requestError) {
      push(requestError.response?.data?.message || "Unable to record payment", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card p-6">Loading payment options...</div>;
  }

  if (error || !invoice) {
    return <div className="card p-6 text-red-600">{error || "Invoice not found"}</div>;
  }

  return (
    <>
      <PageHeader
        title="Payment method"
        eyebrow="Choose how this invoice should be settled"
        actions={<button className="btn-secondary" onClick={() => navigate("/orders")}><ArrowLeft size={17} /> Back to orders</button>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="card space-y-5 p-6">
          <div className="rounded-2xl bg-gradient-to-br from-slate-100 via-white to-zinc-100 p-5 dark:from-slate-800/50 dark:via-slate-950 dark:to-zinc-800/40">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Invoice {invoice.invoice_number}</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{invoice.customer_name}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{invoice.branch_name}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Amount due</p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{money(netPayable)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {methods.map(({ id, label, icon: Icon, description }) => {
              const active = selectedMethod === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedMethod(id)}
                  className={`rounded-2xl border p-4 text-left transition ${active ? "border-slate-400 bg-slate-100 shadow-md shadow-slate-700/10 dark:border-slate-500 dark:bg-slate-800/60" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-900/80"}`}
                >
                  <div className="mb-4 inline-flex rounded-xl bg-white p-2 text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200">
                    <Icon size={18} />
                  </div>
                  <p className="text-sm font-bold text-slate-950 dark:text-white">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck size={18} />
              </div>
              <div className="flex-1">
                <label className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={useLoyalty}
                    onChange={(event) => {
                      setUseLoyalty(event.target.checked);
                      if (!event.target.checked) {
                        setLoyaltyPoints(0);
                      }
                    }}
                  />
                  Use loyalty points as an optional discount
                </label>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Available points: {availablePoints}. They will reduce the payable amount before the selected payment method is completed.
                </p>

                {useLoyalty && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold">
                      Points to redeem
                      <input
                        className="input mt-2"
                        type="number"
                        min="0"
                        max={maxRedeemablePoints}
                        value={loyaltyPoints}
                        onChange={(event) => setLoyaltyPoints(Number(event.target.value))}
                      />
                    </label>
                    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      <p>Discount rate: {loyaltyRate.toFixed(2)}%</p>
                      <p className="mt-1">Discount: {money(loyaltyDiscount)}</p>
                      <p className="mt-1 font-semibold text-slate-950 dark:text-white">Final payable: {money(netPayable)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Selected method</p>
            <h3 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{methods.find((method) => method.id === selectedMethod)?.label}</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Proceed with the selected payment channel and confirm once the transaction is complete.
            </p>

            <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-900">
              <div className="flex items-center justify-between"><span className="text-slate-500">Gross total</span><span className="font-semibold">{money(invoice.total_amount)}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Loyalty discount</span><span className="font-semibold">-{money(loyaltyDiscount)}</span></div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800"><span className="font-semibold text-slate-900 dark:text-white">Payable now</span><span className="text-lg font-bold text-slate-950 dark:text-white">{money(netPayable)}</span></div>
            </div>
          </div>

          <form className="card p-5" onSubmit={savePayment}>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Confirm the selected payment method to close the invoice.</p>
            <button className="btn-primary mt-5 w-full" disabled={saving}>
              {saving ? "Saving payment..." : `Continue with ${methods.find((method) => method.id === selectedMethod)?.label}`}
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}