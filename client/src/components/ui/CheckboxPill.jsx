import React from "react";

export default function CheckboxPill({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        checked
          ? "bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-glow tick-pop"
          : "bg-white/60 text-slate-700 border-white/70 hover:bg-white/80"
      }`}
      aria-pressed={checked}
    >
      {label}
    </button>
  );
}

