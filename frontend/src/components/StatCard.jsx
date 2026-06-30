export default function StatCard({ label, value, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: { bar: "bg-brand-600", chip: "bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300" },
    green: { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300" },
    amber: { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300" },
    red: { bar: "bg-rose-500", chip: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300" }
  };
  const t = tones[tone] || tones.blue;

  return (
    <div className="card group relative overflow-hidden p-5 transition duration-150 hover:shadow-glow">
      <div className={`absolute inset-y-0 left-0 w-1 ${t.bar}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        {Icon && <div className={`rounded-xl p-2.5 transition duration-150 group-hover:scale-105 ${t.chip}`}><Icon size={20} /></div>}
      </div>
    </div>
  );
}
