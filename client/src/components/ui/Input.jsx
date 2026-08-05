import React from "react";

export default function Input({ label, hint, error, as = "input", className = "", ...props }) {
  const sharedClass = `w-full rounded-xl border px-3 py-2 text-sm text-[#1D241F] outline-none transition focus:ring-2 focus:ring-[#2E6A4F]/18 dark:text-[#F3F4F1] ${
    error
      ? "border-[#B84E4E]/80 focus:border-[#B84E4E]"
      : "border-[#D9DED7] bg-white focus:border-[#2E6A4F] dark:border-[#303833] dark:bg-[#202723] dark:focus:border-[#5FA377]"
  }`;

  return (
    <div className="space-y-1.5">
      {label ? <label className="text-sm font-medium text-[#1D241F] dark:text-[#F3F4F1]">{label}</label> : null}
      {as === "textarea" ? (
        <textarea className={`${sharedClass} min-h-[110px] resize-y ${className}`} {...props} />
      ) : (
        <input className={`${sharedClass} ${className}`} {...props} />
      )}
      {hint && !error ? <p className="text-xs text-[#667063] dark:text-[#A4B0A5]">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-[#B84E4E] dark:text-[#D96B6B]">{error}</p> : null}
    </div>
  );
}
