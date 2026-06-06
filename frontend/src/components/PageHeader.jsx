export default function PageHeader({ title, eyebrow, actions }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">{eyebrow}</p>}
        <h1 className="break-words text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}
