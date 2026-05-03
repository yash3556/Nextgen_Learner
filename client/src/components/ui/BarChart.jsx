import React from "react";

function getMax(data) {
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  return maxValue > 0 ? maxValue : 1;
}

export default function BarChart({ data, tone = "blue", height = 180 }) {
  const maxValue = getMax(data || []);
  const toneMap = {
    blue: "from-blue-500 to-blue-400",
    purple: "from-violet-500 to-fuchsia-500",
    emerald: "from-emerald-500 to-teal-400"
  };

  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height }}>
        {(data || []).map((item) => {
          const barHeight = (item.value / maxValue) * (height - 24);
          return (
            <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                title={`${item.label}: ${item.value}`}
                className={`w-full rounded-t-xl bg-gradient-to-t ${toneMap[tone] || toneMap.blue} transition-all duration-500`}
                style={{ height: Math.max(barHeight, 8) }}
              />
              <span className="truncate text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
