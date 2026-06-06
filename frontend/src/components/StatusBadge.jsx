export default function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900",
    "In Progress": "bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700",
    Ready: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700",
    Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900"
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${styles[status] || styles.Pending}`}>{status}</span>;
}
