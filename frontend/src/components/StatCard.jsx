export default function StatCard({ label, value, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
    red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200"
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        {Icon && <div className={`rounded-lg p-2 ${tones[tone]}`}><Icon size={20} /></div>}
      </div>
    </div>
  );
}
