export default function PageHeader({ title, eyebrow, actions }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="mb-1 text-sm font-semibold text-brand-600 dark:text-brand-100">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
