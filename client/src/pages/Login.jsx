import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setAuthToken } from "../api/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { getHomePathForRole } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(getHomePathForRole(user.role), { replace: true });
    }
  }, [navigate, user]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password })
      });
      setAuthToken(data.token);
      setUser(data.user || null);
      navigate(getHomePathForRole(data.role), { replace: true });
    } catch (err) {
      setError(err?.data?.message || err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-lightBg">
      <div className="px-4 py-12 mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="WiseGrove Learners Community" className="h-14 w-auto object-contain" />
              <div>
                <div className="font-bold text-slate-900">Welcome back</div>
                <div className="text-sm text-slate-600">Login to continue your daily improvement.</div>
              </div>
            </div>
          </div>
          <div className="hidden sm:block text-sm text-slate-500">
            New here?{" "}
            <button onClick={() => navigate("/onboarding")} className="text-primary font-semibold hover:underline">
              Get Started
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <Card variant="light" className="h-full">
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Login</h2>
                <p className="text-sm text-slate-600 mt-1">Students and admins use the same login screen. Sign in with your email or user ID and password.</p>
              </div>

              <Input
                label="Email or User ID"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or Nextgen2026"
                autoComplete="username"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />

              {error ? <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium">{error}</div> : null}

              <Button disabled={busy} type="submit" className="w-full">
                {busy ? "Signing in..." : "Sign In"}
              </Button>

              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <button type="button" onClick={() => navigate("/forgot-password")} className="font-semibold text-primary hover:underline">
                  Forgot password?
                </button>
                <span>Admin and student accounts use this same login form.</span>
              </div>
            </form>
          </Card>

          <div className="relative">
            <div className="glass rounded-3xl p-6 border border-white/70 h-full">
              <div className="text-lg font-bold text-slate-900">Your improvement engine</div>
              <div className="mt-3 text-sm text-slate-600">
                We’ll generate a roadmap, daily tasks, and AI teacher suggestions based on your profile.
              </div>

              <div className="mt-6 space-y-3">
                {[
                  { t: "Personalized roadmaps", d: "Predefined and custom paths tailored to you." },
                  { t: "Daily tasks with checklists", d: "Small wins you can complete anytime." },
                  { t: "AI teacher chat (simulated)", d: "Smart suggestions without paid services." }
                ].map((x) => (
                  <div key={x.t} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold">
                      ✓
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{x.t}</div>
                      <div className="text-sm text-slate-600 mt-0.5">{x.d}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7">
                <Button variant="ghost" onClick={() => navigate("/onboarding")} className="w-full">
                  Create your profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

