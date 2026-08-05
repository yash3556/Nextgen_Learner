import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle({ compact = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-xl border border-[#D9DED7] bg-white px-3 py-2 text-sm font-semibold text-[#1D241F] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F2F1EC] dark:border-[#303833] dark:bg-[#202723] dark:text-[#F3F4F1] dark:hover:bg-[#1B211E]"
      aria-label="Toggle dark mode"
    >
      {isDark ? <Sun className="h-4 w-4 text-[#C68A2D]" /> : <Moon className="h-4 w-4 text-[#2E6A4F]" />}
      {compact ? null : <span>{isDark ? "Light" : "Dark"}</span>}
    </button>
  );
}
