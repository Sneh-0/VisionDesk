import { X } from "lucide-react";

export default function Modal({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/40 px-4">
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn-secondary h-9 w-9 px-0" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
