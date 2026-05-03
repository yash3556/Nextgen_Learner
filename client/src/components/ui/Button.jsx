import React from "react";

export default function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40 disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary:
      "bg-blue-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400",
    secondary:
      "bg-violet-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400",
    ghost:
      "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
    danger:
      "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
  };

  return (
    <button type={type} className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
