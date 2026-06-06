export default function BrandLogo({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 680 260" role="img" xmlns="http://www.w3.org/2000/svg">
      <title>VisionDesk Logo</title>
      <desc>Logo for VisionDesk inventory and sales management app</desc>

      <rect x="275" y="50" width="100" height="72" rx="8" fill="none" stroke="#4f46e5" strokeWidth="3" />
      <rect x="318" y="122" width="4" height="16" fill="#4f46e5" />
      <rect x="304" y="137" width="32" height="5" rx="2.5" fill="#4f46e5" />

      <rect x="287" y="96" width="10" height="20" rx="2" fill="#6366f1" opacity="0.7" />
      <rect x="301" y="86" width="10" height="30" rx="2" fill="#6366f1" opacity="0.9" />
      <rect x="315" y="79" width="10" height="37" rx="2" fill="#4f46e5" />
      <rect x="329" y="90" width="10" height="26" rx="2" fill="#6366f1" opacity="0.9" />
      <rect x="343" y="83" width="10" height="33" rx="2" fill="#4f46e5" />

      <rect x="283" y="57" width="60" height="3" rx="1.5" fill="#818cf8" opacity="0.5" />

      <path d="M260 86 Q325 28 390 86" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M260 86 Q325 124 390 86" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="325" cy="86" r="10" fill="#4f46e5" />
      <circle cx="328" cy="83" r="3.5" fill="white" opacity="0.9" />

      <text x="340" y="186" textAnchor="middle" className="fill-slate-950 dark:fill-slate-50" fontFamily="'Helvetica Neue', Arial, sans-serif" fontWeight="800" fontSize="44px" letterSpacing="-1">VisionDesk</text>
      <text x="340" y="212" textAnchor="middle" className="fill-slate-700 dark:fill-slate-300" fontFamily="'Helvetica Neue', Arial, sans-serif" fontWeight="500" fontSize="12px" letterSpacing="3">INVENTORY &amp; SALES PLATFORM</text>

      <rect x="240" y="221" width="200" height="3" rx="1.5" fill="#4f46e5" opacity="0.5" />
    </svg>
  );
}
