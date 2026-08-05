import React from "react";

export default function ProgressBar({ value, max = 4 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[#667063]">
        <span>Progress</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-3 rounded-full border border-[#D9DED7] bg-[#F2F1EC] overflow-hidden dark:border-[#303833] dark:bg-[#1B211E]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2E6A4F] to-[#4F8A5B] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

