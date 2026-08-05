import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { apiFetch } from "../api/api";
import { useAuth } from "../context/AuthContext";

function splitList(value) {
  return String(value || "")
    .split(/[,|\n]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function MetricCard({ label, value, tone = "primary" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
      : tone === "amber"
        ? "border-amber-400/25 bg-amber-400/15 text-amber-700"
        : "border-primary/20 bg-primary/10 text-primary";

  return (
    <div className={`rounded-3xl border px-4 py-4 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const className =
    status === "Known"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
      : status === "Partial"
        ? "border-amber-400/25 bg-amber-400/15 text-amber-700"
        : "border-rose-400/25 bg-rose-400/10 text-rose-700";

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${className}`}>{status}</span>;
}

function ChipGroup({ items, emptyLabel }) {
  if (!items.length) {
    return <div className="text-sm text-slate-500">{emptyLabel}</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700">
          {item}
        </span>
      ))}
    </div>
  );
}

function Section({ title, subtitle, children, actions = null }) {
  return (
    <Card variant="light">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  userId: "",
  password: "",
  college: "",
  course: "",
  cgpa: "",
  technicalSkills: "",
  nonTechnicalSkills: "",
  interests: "",
  strengths: "",
  weaknesses: "",
  goals: "",
  // Social links
  githubUrl: "",
  linkedinUrl: "",
  portfolioUrl: "",
  headline: ""
};

function createAnalysisPrompt(analysis) {
  if (!analysis) return "";

  const skills = Array.isArray(analysis.currentSkills) && analysis.currentSkills.length ? analysis.currentSkills.join(", ") : "not specified";
  return `Give me a sharper action plan for this skill gap analysis.\nGoal: ${analysis.goal}\nCurrent skills: ${skills}\nSummary: ${analysis.summary}`;
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      userId: user?.userId || "",
      password: "",
      college: user?.college || "",
      course: user?.course || "",
      cgpa: user?.cgpa || "",
      technicalSkills: joinList(user?.technicalSkills),
      nonTechnicalSkills: joinList(user?.nonTechnicalSkills),
      interests: joinList(user?.interests),
      strengths: joinList(user?.strengths),
      weaknesses: joinList(user?.weaknesses),
      goals: joinList(user?.goals),
      // Social links
      githubUrl: user?.githubUrl || "",
      linkedinUrl: user?.linkedinUrl || "",
      portfolioUrl: user?.portfolioUrl || "",
      headline: user?.headline || ""
    });
  }, [user]);

  useEffect(() => {
    let alive = true;

    async function loadSkillGap() {
      if (!user?._id) {
        if (alive) setAnalysis(null);
        return;
      }

      if (alive) {
        setAnalysisLoading(true);
        setAnalysisError("");
      }

      try {
        const data = await apiFetch("/api/ai/skill-gap");
        if (!alive) return;
        setAnalysis(data.analysis || null);
      } catch (err) {
        if (!alive) return;
        setAnalysis(null);
        setAnalysisError(err?.message || "Could not load the skill gap analysis.");
      } finally {
        if (alive) setAnalysisLoading(false);
      }
    }

    loadSkillGap();

    return () => {
      alive = false;
    };
  }, [user]);

  const profileStats = useMemo(() => {
    const filledFields = [
      user?.name,
      user?.email,
      user?.phone,
      user?.college,
      user?.course,
      user?.cgpa,
      ...(user?.technicalSkills || []),
      ...(user?.nonTechnicalSkills || []),
      ...(user?.interests || []),
      ...(user?.strengths || []),
      ...(user?.weaknesses || []),
      ...(user?.goals || [])
    ].filter(Boolean).length;

    const baseFields = 12;
    const completion = Math.min(100, Math.round((filledFields / baseFields) * 100));

    return {
      completion,
      interests: (user?.interests || []).length,
      strengths: (user?.strengths || []).length,
      focusAreas: [...(user?.technicalSkills || []), ...(user?.nonTechnicalSkills || [])].length
    };
  }, [user]);

  const nextMove = useMemo(() => {
    const weaknesses = (user?.weaknesses || []).map((item) => String(item).toLowerCase());
    const interests = (user?.interests || []).map((item) => String(item).toLowerCase());

    if (weaknesses.some((item) => item.includes("communication"))) {
      return "Open AI Teacher and practice one speaking answer today.";
    }

    if (interests.some((item) => item.includes("dsa"))) {
      return "Use your roadmap to pull one DSA step into today's tasks.";
    }

    if (interests.some((item) => item.includes("python"))) {
      return "Create one Python task for today and ask AI Teacher to explain the concept simply.";
    }

    return "Refresh your tasks and choose one small win you can finish today.";
  }, [user]);

  const analysisPrompt = useMemo(() => createAnalysisPrompt(analysis), [analysis]);

  async function refreshAnalysis() {
    setAnalysisLoading(true);
    setAnalysisError("");

    try {
      const data = await apiFetch("/api/ai/skill-gap");
      setAnalysis(data.analysis || null);
    } catch (err) {
      setAnalysis(null);
      setAnalysisError(err?.message || "Could not refresh the skill gap analysis.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiFetch("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          password: form.password || undefined,
          technicalSkills: splitList(form.technicalSkills),
          nonTechnicalSkills: splitList(form.nonTechnicalSkills),
          interests: splitList(form.interests),
          strengths: splitList(form.strengths),
          weaknesses: splitList(form.weaknesses),
          goals: splitList(form.goals),
          // Social links
          githubUrl: form.githubUrl || undefined,
          linkedinUrl: form.linkedinUrl || undefined,
          portfolioUrl: form.portfolioUrl || undefined,
          headline: form.headline || undefined
        })
      });

      setUser(data.user || null);
      setEditing(false);
      setSuccess("Profile updated successfully.");
      setForm((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      setError(err?.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditing(false);
    setError("");
    setSuccess("");
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      userId: user?.userId || "",
      password: "",
      college: user?.college || "",
      course: user?.course || "",
      cgpa: user?.cgpa || "",
      technicalSkills: joinList(user?.technicalSkills),
      nonTechnicalSkills: joinList(user?.nonTechnicalSkills),
      interests: joinList(user?.interests),
      strengths: joinList(user?.strengths),
      weaknesses: joinList(user?.weaknesses),
      goals: joinList(user?.goals),
      // Social links
      githubUrl: user?.githubUrl || "",
      linkedinUrl: user?.linkedinUrl || "",
      portfolioUrl: user?.portfolioUrl || "",
      headline: user?.headline || ""
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Profile</h1>
          <p className="mt-2 text-sm text-slate-600">
            This is the learner profile that shapes your roadmaps, tasks, and AI coaching.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={() => navigate("/tasks")}>
            Open Tasks
          </Button>
          <Button variant="ghost" onClick={() => navigate("/roadmaps")}>
            Open Roadmaps
          </Button>
          <Button onClick={() => setEditing(true)} disabled={editing}>
            {editing ? "Editing profile" : "Edit profile"}
          </Button>
        </div>
      </div>

      {error && !editing ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      ) : null}
      {success && !editing ? (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-white shadow-glow">
                {user?.name ? user.name.slice(0, 1).toUpperCase() : "S"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-primary">Learner Identity</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{user?.name || "Student"}</div>
                <div className="mt-1 text-sm text-slate-600">{user?.course || "Course not added yet"}</div>
                <div className="mt-2 text-sm text-slate-500">
                  {user?.college || "College not added"} {user?.cgpa ? `• CGPA ${user.cgpa}` : ""}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-primary/20 bg-primary/10 px-4 py-3 text-primary">
              <div className="text-xs font-semibold uppercase tracking-[0.16em]">Profile strength</div>
              <div className="mt-2 text-3xl font-bold">{profileStats.completion}%</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard label="Focus Areas" value={profileStats.focusAreas} />
            <MetricCard label="Interests" value={profileStats.interests} tone="emerald" />
            <MetricCard label="Strengths" value={profileStats.strengths} tone="amber" />
          </div>

          <div className="mt-5 rounded-3xl border border-white/70 bg-white/55 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next best move</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{nextMove}</div>
          </div>
        </Card>

        <Section title="Contact Snapshot" subtitle="The basics your account currently uses.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/70 bg-white/50 px-4 py-3">
              <div className="text-xs font-semibold text-slate-500">Email</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{user?.email || "Add your email"}</div>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/50 px-4 py-3">
              <div className="text-xs font-semibold text-slate-500">User ID</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{user?.userId || "Add your user ID"}</div>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/50 px-4 py-3">
              <div className="text-xs font-semibold text-slate-500">Phone</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{user?.phone || "Add your phone"}</div>
            </div>
          </div>
        </Section>
      </div>

      {editing ? (
        <form className="space-y-5" onSubmit={saveProfile}>
          <Section title="Edit Basics" subtitle="Update your core identity and study details.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              <Input label="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              <Input label="Phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
              <Input label="User ID" value={form.userId} onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))} />
              <Input label="New Password" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
              <Input label="College" value={form.college} onChange={(event) => setForm((prev) => ({ ...prev, college: event.target.value }))} />
              <Input label="Course" value={form.course} onChange={(event) => setForm((prev) => ({ ...prev, course: event.target.value }))} />
              <Input label="CGPA" value={form.cgpa} onChange={(event) => setForm((prev) => ({ ...prev, cgpa: event.target.value }))} />
            </div>
          </Section>

          <Section title="Edit Social Links" subtitle="Add your professional links for portfolio and networking.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Headline"
                value={form.headline}
                onChange={(event) => setForm((prev) => ({ ...prev, headline: event.target.value }))}
                placeholder="e.g., Full Stack Developer | Open to work"
              />
              <Input
                label="GitHub URL"
                type="url"
                value={form.githubUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, githubUrl: event.target.value }))}
                placeholder="https://github.com/username"
              />
              <Input
                label="LinkedIn URL"
                type="url"
                value={form.linkedinUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, linkedinUrl: event.target.value }))}
                placeholder="https://linkedin.com/in/username"
              />
              <Input
                label="Portfolio URL"
                type="url"
                value={form.portfolioUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, portfolioUrl: event.target.value }))}
                placeholder="https://myportfolio.com"
              />
            </div>
          </Section>

          <Section title="Edit Skills And Goals" subtitle="Comma or new line separated values work here too.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                as="textarea"
                label="Technical skills"
                value={form.technicalSkills}
                onChange={(event) => setForm((prev) => ({ ...prev, technicalSkills: event.target.value }))}
              />
              <Input
                as="textarea"
                label="Non-technical skills"
                value={form.nonTechnicalSkills}
                onChange={(event) => setForm((prev) => ({ ...prev, nonTechnicalSkills: event.target.value }))}
              />
              <Input
                as="textarea"
                label="Interests"
                value={form.interests}
                onChange={(event) => setForm((prev) => ({ ...prev, interests: event.target.value }))}
              />
              <Input
                as="textarea"
                label="Strengths"
                value={form.strengths}
                onChange={(event) => setForm((prev) => ({ ...prev, strengths: event.target.value }))}
              />
              <Input
                as="textarea"
                label="Weaknesses"
                value={form.weaknesses}
                onChange={(event) => setForm((prev) => ({ ...prev, weaknesses: event.target.value }))}
              />
              <Input
                as="textarea"
                label="Goals"
                value={form.goals}
                onChange={(event) => setForm((prev) => ({ ...prev, goals: event.target.value }))}
              />
            </div>

            {error ? <div className="mt-4 text-sm font-medium text-red-600">{error}</div> : null}
            {success ? <div className="mt-4 text-sm font-medium text-emerald-700">{success}</div> : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save profile"}
              </Button>
              <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
            </div>
          </Section>
        </form>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="space-y-5 xl:col-span-7">
              <Section title="Learning Focus" subtitle="These are the areas WiseGrove can build on right away.">
                <div className="space-y-5">
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Technical skills</div>
                    <ChipGroup items={user?.technicalSkills || []} emptyLabel="Add technical skills to sharpen roadmaps." />
                  </div>
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Non-technical skills</div>
                    <ChipGroup items={user?.nonTechnicalSkills || []} emptyLabel="Add non-technical skills to improve your learner profile." />
                  </div>
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Interests</div>
                    <ChipGroup items={user?.interests || []} emptyLabel="Add interests so your tasks and roadmaps feel more personal." />
                  </div>
                </div>
              </Section>

              <Section title="Growth Map" subtitle="What is already working well, and what you want to improve next.">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Strengths</div>
                    <ChipGroup items={user?.strengths || []} emptyLabel="Add strengths to show what you can build from." />
                  </div>
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Weaknesses</div>
                    <ChipGroup items={user?.weaknesses || []} emptyLabel="Add weaknesses so AI Teacher can focus its coaching." />
                  </div>
                </div>
              </Section>
            </div>

            <div className="space-y-5 xl:col-span-5">
              <Section title="Goals" subtitle="These goals shape the tasks you see each day.">
                <ChipGroup items={user?.goals || []} emptyLabel="Add goals to drive better daily tasks." />
              </Section>

              <Section title="Social Links" subtitle="Your professional presence on the web.">
                <div className="space-y-3">
                  {user?.headline && (
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                      <div className="text-xs font-semibold text-slate-500">Headline</div>
                      <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">{user.headline}</div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {user?.githubUrl && (
                      <a
                        href={user.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                      </a>
                    )}
                    {user?.linkedinUrl && (
                      <a
                        href={user.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                        LinkedIn
                      </a>
                    )}
                    {user?.portfolioUrl && (
                      <a
                        href={user.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        Portfolio
                      </a>
                    )}
                    {!user?.githubUrl && !user?.linkedinUrl && !user?.portfolioUrl && (
                      <div className="text-sm text-slate-500">No social links added yet.</div>
                    )}
                  </div>
                </div>
              </Section>

              <Section title="Quick Actions" subtitle="Jump straight into the most useful next screen.">
                <div className="flex flex-col gap-3">
                  <Button onClick={() => navigate("/ai-teacher")}>Practice With AI Teacher</Button>
                  <Button variant="ghost" onClick={() => navigate("/tasks")}>
                    Review Daily Tasks
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/roadmaps")}>
                    Explore Roadmaps
                  </Button>
                </div>
              </Section>
            </div>
          </div>

          <Section
            title="Skill Gap Analysis"
            subtitle="A tailored plan based on your saved goals, skills, strengths, and weak spots."
            actions={
              <>
                <Button variant="ghost" onClick={refreshAnalysis} disabled={analysisLoading}>
                  {analysisLoading ? "Refreshing..." : "Refresh"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/ai-teacher?prompt=${encodeURIComponent(analysisPrompt)}`)}
                  disabled={!analysisPrompt}
                >
                  Discuss With AI
                </Button>
              </>
            }
          >
            {analysisLoading ? (
              <div className="space-y-4">
                <div className="skeleton h-24 rounded-3xl" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="skeleton h-40 rounded-3xl" />
                  <div className="skeleton h-40 rounded-3xl" />
                </div>
                <div className="skeleton h-52 rounded-3xl" />
              </div>
            ) : analysisError ? (
              <div className="rounded-3xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-700">{analysisError}</div>
            ) : analysis ? (
              <div className="space-y-6">
                <div className="rounded-[28px] border border-primary/15 bg-primary/5 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Primary goal</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{analysis.goal}</div>
                  <div className="mt-3 text-sm leading-6 text-slate-700">{analysis.summary}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(analysis.currentSkills || []).length ? (
                      analysis.currentSkills.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">Add current skills to make this analysis more exact.</span>
                    )}
                  </div>
                </div>

                {analysis.missingProfileData?.length ? (
                  <div className="rounded-3xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-800">
                    Add a clearer goal and a few current skills in your profile to sharpen this analysis even more.
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                  {[
                    { label: "Fundamentals", items: analysis.missingSkills?.fundamentals || [] },
                    { label: "Tools / Technologies", items: analysis.missingSkills?.tools || [] },
                    { label: "Practical / Projects", items: analysis.missingSkills?.practical || [] },
                    { label: "Communication / Soft Skills", items: analysis.missingSkills?.communication || [] }
                  ].map((group) => (
                    <div key={group.label} className="rounded-3xl border border-white/70 bg-white/55 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{group.label}</div>
                      <div className="mt-3 space-y-2">
                        {group.items.length ? (
                          group.items.map((item) => (
                            <div key={item} className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-medium text-slate-700">
                              {item}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-slate-500">This area looks healthier right now.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <div className="rounded-3xl border border-white/70 bg-white/55 p-5">
                    <div className="text-sm font-semibold text-slate-900">Weak Areas</div>
                    <div className="mt-1 text-sm text-slate-600">These are the friction points most likely slowing you down.</div>
                    <div className="mt-4 space-y-3">
                      {(analysis.weakAreas || []).map((area) => (
                        <div key={area.title} className="rounded-3xl border border-white/70 bg-white/75 p-4">
                          <div className="text-sm font-semibold text-slate-900">{area.title}</div>
                          <div className="mt-2 text-sm text-slate-600">Why weak: {area.why}</div>
                          <div className="mt-2 text-sm font-medium text-slate-800">Improve: {area.improve}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-3xl border border-white/70 bg-white/55 p-5">
                      <div className="text-sm font-semibold text-slate-900">Industry-Required Skills</div>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">General expectations</div>
                          <div className="mt-3 space-y-2">
                            {(analysis.industryRequiredSkills?.general || []).map((item) => (
                              <div key={item} className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-700">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Role-specific</div>
                          <div className="mt-3 space-y-2">
                            {(analysis.industryRequiredSkills?.roleSpecific || []).map((item) => (
                              <div key={item} className="rounded-2xl border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-slate-700">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/70 bg-white/55 p-5">
                      <div className="text-sm font-semibold text-slate-900">Learning Priority Order</div>
                      <div className="mt-4 space-y-3">
                        {(analysis.learningPriority || []).map((item, index) => (
                          <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                              {index + 1}
                            </div>
                            <div className="text-sm font-medium text-slate-700">{item}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-5">
                    <div className="rounded-3xl border border-white/70 bg-white/55 p-5">
                      <div className="text-sm font-semibold text-slate-900">Clear Improvement Plan</div>

                      <div className="mt-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Define success</div>
                        <div className="mt-3 space-y-2">
                          {(analysis.improvementPlan?.successTargets || []).map((item) => (
                            <div key={item} className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-700">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Skill mapping</div>
                        <div className="mt-3 space-y-3">
                          {(analysis.improvementPlan?.skillMapping || []).map((item) => (
                            <div
                              key={item.skill}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3"
                            >
                              <div className="text-sm font-semibold text-slate-800">{item.skill}</div>
                              <StatusBadge status={item.status} />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">First focus area</div>
                        <div className="mt-2 text-lg font-bold text-slate-900">{analysis.improvementPlan?.firstFocusArea?.title}</div>
                        <div className="mt-2 text-sm text-slate-700">{analysis.improvementPlan?.firstFocusArea?.reason}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-3xl border border-white/70 bg-white/55 p-5">
                      <div className="text-sm font-semibold text-slate-900">Mini Project</div>
                      <div className="mt-2 text-lg font-bold text-slate-900">{analysis.improvementPlan?.miniProject?.title}</div>
                      <div className="mt-2 text-sm text-slate-600">{analysis.improvementPlan?.miniProject?.description}</div>

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Features</div>
                          <div className="mt-3 space-y-2">
                            {(analysis.improvementPlan?.miniProject?.features || []).map((item) => (
                              <div key={item} className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-700">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tech stack</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(analysis.improvementPlan?.miniProject?.techStack || []).map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/70 bg-white/55 p-5">
                      <div className="text-sm font-semibold text-slate-900">Weekly Plan</div>
                      <div className="mt-4 space-y-2">
                        {(analysis.improvementPlan?.weeklyPlan || []).map((item) => (
                          <div key={item} className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-700">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/70 bg-white/55 p-5">
                      <div className="text-sm font-semibold text-slate-900">Final Advice</div>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Mistakes to avoid</div>
                          <div className="mt-3 space-y-2">
                            {(analysis.finalAdvice?.mistakesToAvoid || []).map((item) => (
                              <div key={item} className="rounded-2xl border border-amber-400/25 bg-amber-400/15 px-3 py-2 text-sm text-amber-800">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Practical tips</div>
                          <div className="mt-3 space-y-2">
                            {(analysis.finalAdvice?.practicalTips || []).map((item) => (
                              <div key={item} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">No analysis available yet.</div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
