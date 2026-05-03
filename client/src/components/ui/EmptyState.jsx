import React from "react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-6 text-center dark:border-slate-700 dark:bg-slate-900/60">
      {Icon ? (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
