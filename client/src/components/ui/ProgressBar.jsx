import React from "react";

export default function ProgressBar({ value, max = 4 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Progress</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100/70 border border-white/70 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

