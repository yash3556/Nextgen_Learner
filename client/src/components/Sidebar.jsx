import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LogOut, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api/api";
import { studentNavigation } from "../config/navigation";
import ThemeToggle from "./ui/ThemeToggle";

function isItemActive(pathname, target) {
  if (target === "/student-dashboard") return pathname === target;
  return pathname === target || pathname.startsWith(`${target}/`);
}

export default function Sidebar() {
  const { user, logout: clearAuth } = useAuth();
  const location = useLocation();

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearAuth();
      window.location.href = "/login";
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white/95 px-5 py-6 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 lg:flex lg:flex-col">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-soft">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">NextZen Community</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Student Workspace</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {studentNavigation.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(location.pathname, item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-100"}`} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <ThemeToggle />
        <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name || "Student"}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email || user?.userId || "Learner account"}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

