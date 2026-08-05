import React from "react";

export default function StatCard({ label, value, icon: Icon, tone = "blue", hint = "" }) {
  const tones = {
    blue: "border-[#D9DED7] bg-[#F2F1EC] text-[#2E6A4F] dark:border-[#303833] dark:bg-[#1B211E] dark:text-[#74C28F]",
    purple: "border-[#D9DED7] bg-[#F2F1EC] text-[#35694F] dark:border-[#303833] dark:bg-[#1B211E] dark:text-[#74C28F]",
    emerald: "border-[#D9DED7] bg-[#F2F1EC] text-[#4F8A5B] dark:border-[#303833] dark:bg-[#1B211E] dark:text-[#6DB783]",
    amber: "border-[#E8D8BA] bg-[#F8F2E9] text-[#C68A2D] dark:border-[#4C4031] dark:bg-[#2A241D] dark:text-[#D6A348]"
  };

  return (
    <article className="rounded-2xl border border-[#D9DED7] bg-white p-4 shadow-soft dark:border-[#303833] dark:bg-[#202723]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667063] dark:text-[#A4B0A5]">{label}</p>
        {Icon ? (
          <div className={`rounded-xl border p-2 ${tones[tone] || tones.blue}`}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <p className="mt-4 text-2xl font-bold text-[#1D241F] dark:text-[#F3F4F1]">{value}</p>
      {hint ? <p className="mt-1 text-sm text-[#667063] dark:text-[#A4B0A5]">{hint}</p> : null}
    </article>
  );
}
