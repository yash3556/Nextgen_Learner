import React from "react";

export default function Input({ label, hint, error, as = "input", className = "", ...props }) {
  const sharedClass = `w-full rounded-xl border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-400/30 dark:text-slate-100 ${
    error
      ? "border-rose-400/70 focus:border-rose-400"
      : "border-slate-200 bg-white focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-400"
  }`;

  return (
    <div className="space-y-1.5">
      {label ? <label className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</label> : null}
      {as === "textarea" ? (
        <textarea className={`${sharedClass} min-h-[110px] resize-y ${className}`} {...props} />
      ) : (
        <input className={`${sharedClass} ${className}`} {...props} />
      )}
      {hint && !error ? <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}
