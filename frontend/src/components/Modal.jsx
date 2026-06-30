import { X } from "lucide-react";

export default function Modal({ title, open, isOpen, onClose, children }) {
  if (!(open || isOpen)) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-slate-950/55 px-3 py-3 backdrop-blur-sm sm:place-items-center sm:px-4">
      <div className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/60 sm:px-5">
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
