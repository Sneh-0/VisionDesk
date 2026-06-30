export default function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900",
    "In Progress": "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-900",
    Ready: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-950 dark:text-brand-200 dark:ring-brand-900",
    Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900"
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${styles[status] || styles.Pending}`}>{status}</span>;
}
