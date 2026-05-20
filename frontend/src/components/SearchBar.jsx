import { Search } from "lucide-react";

export default function SearchBar({ value, onChange, placeholder = "Search" }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
      <input className="input pl-10" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}
