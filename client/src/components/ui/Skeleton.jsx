import React from "react";

export default function Skeleton({ className = "" }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-200/80 dark:bg-slate-800/90 ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-600/30" />
    </div>
  );
}
