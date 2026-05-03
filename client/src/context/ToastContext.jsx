import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CircleCheck, CircleAlert, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const TYPE_STYLES = {
  success: {
    icon: CircleCheck,
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
  },
  error: {
    icon: CircleAlert,
    className: "border-rose-500/25 bg-rose-500/10 text-rose-900 dark:text-rose-200"
  },
  info: {
    icon: Info,
    className: "border-blue-500/25 bg-blue-500/10 text-blue-900 dark:text-blue-200"
  }
};

function ToastViewport({ toasts, onRemove }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
        const Icon = style.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-soft backdrop-blur-xl ${style.className}`}
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-xs opacity-90">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => onRemove(toast.id)}
                className="rounded-lg p-1 opacity-70 transition hover:bg-white/40 hover:opacity-100 dark:hover:bg-slate-900/40"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    ({ title, description = "", type = "info", duration = 2600 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, title, description, type }]);
      window.setTimeout(() => removeToast(id), duration);
      return id;
    },
    [removeToast]
  );

  const value = useMemo(
    () => ({
      notify,
      removeToast
    }),
    [notify, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
