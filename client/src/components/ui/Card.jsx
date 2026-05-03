import React from "react";

export default function Card({ children, className = "", variant = "light" }) {
  const variants = {
    light: "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900",
    dark: "border-slate-800 bg-slate-900 text-slate-100",
    subtle: "border-slate-200/70 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/60"
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-soft md:p-6 ${variants[variant] || variants.light} ${className}`}>
      {children}
    </div>
  );
}
