import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHomePathForRole } from "../utils/auth";

export default function RequireAuth({ allowedRoles = [] }) {
  const { user, loading, serverUnavailable } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="skeleton h-10 rounded-xl mb-3" />
          <div className="skeleton h-10 rounded-xl mb-3" />
          <div className="skeleton h-10 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user && serverUnavailable) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-[28px] border border-amber-400/25 bg-white/85 p-6 text-center shadow-soft">
          <div className="text-lg font-bold text-slate-900">Reconnecting to the server</div>
          <div className="mt-3 text-sm leading-6 text-slate-600">
            The backend on `http://localhost:5000` is not reachable right now. This usually happens while the server is
            restarting. Keep the backend running and this page should recover automatically.
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomePathForRole(user.role)} replace />;
  }
  return <Outlet />;
}

