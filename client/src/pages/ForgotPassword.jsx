import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const data = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier })
      });

      setMessage(data.message || "A reset link is ready.");

      if (data.resetToken) {
        window.setTimeout(() => {
          navigate(`/reset-password?token=${encodeURIComponent(data.resetToken)}`);
        }, 700);
      }
    } catch (err) {
      setError(err?.message || "Unable to request a reset link right now.");
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
            <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
            <p className="mt-2 text-sm text-slate-600">Enter your email or user ID and we’ll prepare a secure reset link for you.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Email or User ID"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or Nextgen2026"
              autoComplete="username"
            />

            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}

            <Button disabled={busy} type="submit" className="w-full">
              {busy ? "Preparing reset link..." : "Send reset link"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-600">
            Remembered your password? <Link to="/login" className="font-semibold text-primary hover:underline">Back to login</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
