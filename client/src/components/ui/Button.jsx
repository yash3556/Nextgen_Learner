import React from "react";

export default function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#2E6A4F]/20 disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary:
      "bg-[#2E6A4F] text-white shadow-sm hover:-translate-y-0.5 hover:bg-[#255840] dark:bg-[#5FA377] dark:hover:bg-[#73BE8D]",
    secondary:
      "border border-[#D9DED7] bg-[#F2F1EC] text-[#1D241F] shadow-sm hover:-translate-y-0.5 hover:bg-[#E9E7E1] dark:border-[#303833] dark:bg-[#1B211E] dark:text-[#F3F4F1] dark:hover:bg-[#202723]",
    ghost:
      "border border-[#D9DED7] bg-white text-[#1D241F] hover:-translate-y-0.5 hover:bg-[#F2F1EC] dark:border-[#303833] dark:bg-[#202723] dark:text-[#F3F4F1] dark:hover:bg-[#1B211E]",
    danger:
      "border border-[#E7C7C7] bg-[#F7EFEF] text-[#B84E4E] hover:bg-[#F3E4E4] dark:border-[#5A3A3A] dark:bg-[#2A1D1D] dark:text-[#D96B6B]"
  };

  return (
    <button type={type} className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
