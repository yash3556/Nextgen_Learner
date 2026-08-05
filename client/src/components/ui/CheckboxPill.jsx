import React from "react";

export default function CheckboxPill({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        checked
          ? "border-transparent bg-[#2E6A4F] text-white shadow-sm tick-pop"
          : "border-[#D9DED7] bg-white/80 text-[#1D241F] hover:bg-[#F2F1EC] dark:border-[#303833] dark:bg-[#202723] dark:text-[#F3F4F1] dark:hover:bg-[#1B211E]"
      }`}
      aria-pressed={checked}
    >
      {label}
    </button>
  );
}

