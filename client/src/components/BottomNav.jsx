import React from "react";
import { NavLink } from "react-router-dom";
import { studentNavigation } from "../config/navigation";

export default function BottomNav() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        {studentNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `min-w-[82px] rounded-xl px-2 py-2 text-center text-xs font-semibold transition ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`
              }
            >
              <Icon className="mx-auto h-4 w-4" />
              <span className="mt-1 block truncate">{item.label.split(" ")[0]}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
