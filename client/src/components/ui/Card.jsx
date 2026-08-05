import React from "react";

export default function Card({ children, className = "", variant = "light" }) {
  const variants = {
    light: "border-[#D9DED7] bg-white dark:border-[#303833] dark:bg-[#202723]",
    dark: "border-[#303833] bg-[#202723] text-[#F3F4F1]",
    subtle: "border-[#D9DED7] bg-[#F2F1EC]/90 dark:border-[#303833] dark:bg-[#1B211E]/80"
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-soft md:p-6 ${variants[variant] || variants.light} ${className}`}>
      {children}
    </div>
  );
}
