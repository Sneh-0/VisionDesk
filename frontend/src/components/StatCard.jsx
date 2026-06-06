export default function StatCard({ label, value, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "from-slate-600 to-slate-500 shadow-slate-600/20",
    green: "from-zinc-600 to-zinc-500 shadow-zinc-600/20",
    amber: "from-stone-600 to-stone-500 shadow-stone-600/20",
    red: "from-neutral-700 to-neutral-600 shadow-neutral-700/20"
  };

  return (
    <div className="card group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tones[tone]}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        {Icon && <div className={`rounded-xl bg-gradient-to-br p-2.5 text-white shadow-lg transition duration-200 group-hover:scale-110 ${tones[tone]}`}><Icon size={20} /></div>}
      </div>
    </div>
  );
}
