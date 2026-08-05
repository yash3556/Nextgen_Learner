import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token.trim()) {
      setError("The reset token is missing. Please use the link from your email or paste it here.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const data = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password })
      });

      setMessage(data.message || "Password updated successfully.");
      window.setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (err) {
      setError(err?.message || "Unable to reset password right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-lightBg px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src="/logo.png" alt="WiseGrove Learners Community" className="h-14 w-auto object-contain" />
          <div className="text-left">
            <div className="text-lg font-black tracking-[-0.06em] text-slate-900">WiseGrove</div>
            <div className="text-xs text-slate-600">Learners Community</div>
          </div>
        </div>

        <Card variant="light" className="p-6">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
            <p className="mt-2 text-sm text-slate-600">Choose a strong password and confirm it below.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Reset token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the reset token here"
              autoComplete="off"
            />
            <Input
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />

            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}

            <Button disabled={busy} type="submit" className="w-full">
              {busy ? "Updating password..." : "Update password"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-600">
            Need a fresh link? <Link to="/forgot-password" className="font-semibold text-primary hover:underline">Request again</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
