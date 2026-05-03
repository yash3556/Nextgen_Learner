import React from "react";

export default function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = ""
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {(title || subtitle || action) ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
