import React from "react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D9DED7] bg-[#F2F1EC]/90 p-6 text-center dark:border-[#303833] dark:bg-[#1B211E]/80">
      {Icon ? (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2EE] text-[#2E6A4F] dark:bg-[#213229] dark:text-[#74C28F]">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <p className="text-sm font-semibold text-[#1D241F] dark:text-[#F3F4F1]">{title}</p>
      <p className="mt-1 text-sm text-[#667063] dark:text-[#A4B0A5]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
