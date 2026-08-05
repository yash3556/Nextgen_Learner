import React from "react";

export default function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = ""
}) {
  return (
    <section className={`rounded-2xl border border-[#D9DED7] bg-white p-5 shadow-soft dark:border-[#303833] dark:bg-[#202723] ${className}`}>
      {(title || subtitle || action) ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-semibold text-[#1D241F] dark:text-[#F3F4F1]">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-[#667063] dark:text-[#A4B0A5]">{subtitle}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
