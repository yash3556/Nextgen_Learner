import React, { useEffect, useState } from "react";
import { Calendar, Clock, ExternalLink, Mic, Video } from "lucide-react";
import SectionCard from "../components/ui/SectionCard";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { apiFetch } from "../api/api";

export default function MockInterview() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestForm, setRequestForm] = useState({
    role: "General",
    preferredAt: "",
    notes: ""
  });
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    fetchInterviews();
  }, []);

  async function fetchInterviews() {
    try {
      setLoading(true);
      const data = await apiFetch("/api/mock-interviews");
      setInterviews(data.interviews || []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load mock interviews.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest(event) {
    event.preventDefault();
    try {
      setRequesting(true);
      setError("");
      setRequestMessage("");

      await apiFetch("/api/student/interview-request", {
        method: "POST",
        body: JSON.stringify({
          role: requestForm.role,
          preferredAt: requestForm.preferredAt || undefined,
          notes: requestForm.notes || undefined
        })
      });

      setRequestForm({ role: "General", preferredAt: "", notes: "" });
      setRequestMessage("Interview request submitted. Admin will review and publish a slot.");
    } catch (err) {
      setError(err.message || "Could not submit interview request.");
    } finally {
      setRequesting(false);
    }
  }

  function formatDate(value) {
    if (!value) return "TBD";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "TBD";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getDifficultyColor(difficulty) {
    if (difficulty === "easy") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    if (difficulty === "hard") return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  }

  function getStatusColor(status) {
    if (status === "completed") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    if (status === "scheduled") return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
    if (status === "pending") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-300">Mock Interview</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">Interview Simulation Lab</h1>
        </section>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 md:p-6">
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-300">Mock Interview</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">Interview Simulation Lab</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Practice technical and behavioral rounds in realistic sessions and request a slot directly.</p>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/25 dark:text-rose-200">
          {error}
        </div>
      ) : null}
      {requestMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/25 dark:text-emerald-200">
          {requestMessage}
        </div>
      ) : null}

      <SectionCard title="Request a Mock Interview" subtitle="Submit your preferred role and timing.">
        <form onSubmit={submitRequest} className="grid gap-3 md:grid-cols-2">
          <Input
            label="Role"
            value={requestForm.role}
            onChange={(event) => setRequestForm((prev) => ({ ...prev, role: event.target.value }))}
            placeholder="Frontend Developer"
          />
          <Input
            label="Preferred date & time"
            type="datetime-local"
            value={requestForm.preferredAt}
            onChange={(event) => setRequestForm((prev) => ({ ...prev, preferredAt: event.target.value }))}
          />
          <div className="md:col-span-2">
            <Input
              label="Notes"
              as="textarea"
              value={requestForm.notes}
              onChange={(event) => setRequestForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Mention interview goals, topics, or any constraints."
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={requesting}>
              {requesting ? "Submitting..." : "Request Slot"}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Upcoming Interview Slots" subtitle="Join your published mock interview sessions.">
        {!interviews.length ? (
          <EmptyState icon={Mic} title="No mock sessions scheduled" description="New slots will appear when mentors publish the schedule." />
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => (
              <article
                key={interview._id}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 md:flex-row md:items-center"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{interview.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getDifficultyColor(interview.difficulty)}`}>
                      {interview.difficulty || "medium"}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(interview.status)}`}>
                      {interview.status || "scheduled"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(interview.scheduledFor)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      {interview.mode === "ai" ? "AI Interviewer" : interview.interviewerName || "Live Interviewer"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {interview.role || "General"}
                    </span>
                  </div>
                </div>
                {interview.meetingLink ? (
                  <a
                    href={interview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Join Meeting
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
