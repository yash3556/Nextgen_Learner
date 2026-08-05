import React, { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Flame,
  Goal,
  MessageCircle,
  Percent,
  Trophy
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api/api";
import Button from "../components/ui/Button";
import SectionCard from "../components/ui/SectionCard";
import StatCard from "../components/ui/StatCard";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import BarChart from "../components/ui/BarChart";
import ThemeToggle from "../components/ui/ThemeToggle";
import { useToast } from "../context/ToastContext";

const DEFAULT_TASKS = [
  { id: "1", title: "Complete React hooks practice", completed: true },
  { id: "2", title: "Review one DSA pattern", completed: false },
  { id: "3", title: "Post one learning update in community", completed: false },
  { id: "4", title: "Practice mock interview question 3", completed: false }
];

const DEFAULT_SESSIONS = [];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function motivationalText(progress) {
  if (progress >= 85) return "You are in a strong flow. Keep this momentum for one more focused sprint.";
  if (progress >= 60) return "You are building consistency. One more completed task will push you ahead.";
  return "Start small and stay steady. Progress compounds every day.";
}

function buildWeeklySeries(progressPercent) {
  const base = Math.max(progressPercent - 24, 18);
  return DAYS.map((label, index) => {
    const variation = (index % 2 === 0 ? 6 : -4) + index * 3;
    const value = Math.min(100, Math.max(12, base + variation));
    return { label, value };
  });
}

function BadgePill({ title, tone }) {
  const toneClasses = {
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
    purple: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClasses[tone] || toneClasses.blue}`}>
      <Trophy className="h-3.5 w-3.5" />
      {title}
    </div>
  );
}

function TaskItem({ task, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(task)}
      className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-500/40 dark:hover:bg-slate-900"
    >
      <div
        className={`mt-0.5 h-5 w-5 rounded-md border transition ${
          task.completed
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
        }`}
      >
        {task.completed ? <CheckCircle2 className="h-4 w-4 p-0.5" /> : null}
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${task.completed ? "text-slate-500 line-through dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
          {task.title}
        </p>
      </div>
    </button>
  );
}

function SessionCard({ session, onJoin }) {
  const hasLink = Boolean(session.link);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{session.title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{session.date} at {session.time}</p>
          {hasLink ? (
            <p className="mt-1 break-all text-xs text-blue-600 dark:text-blue-300">{session.link}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Link will be added by admin.</p>
          )}
        </div>
        <CalendarClock className="h-4 w-4 text-violet-600 dark:text-violet-300" />
      </div>
      <Button className="mt-4 w-full" onClick={() => onJoin(session)} disabled={!hasLink}>
        {hasLink ? "Join Now" : "No Link Yet"}
      </Button>
    </article>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [sessions, setSessions] = useState(DEFAULT_SESSIONS);
  const [weeklyProgress, setWeeklyProgress] = useState(buildWeeklySeries(74));

  const completedCount = useMemo(() => tasks.filter((task) => task.completed).length, [tasks]);
  const progressPercent = useMemo(() => {
    if (!tasks.length) return 0;
    return Math.round((completedCount / tasks.length) * 100);
  }, [tasks.length, completedCount]);
  const streak = useMemo(() => Math.max(1, Math.min(21, Math.round(progressPercent / 5) + 2)), [progressPercent]);
  const interviewScore = useMemo(() => {
    if (!tasks.length) return 0;
    return Math.max(0, Math.min(100, Math.round(progressPercent * 0.9)));
  }, [progressPercent, tasks.length]);
  const badges = useMemo(() => {
    const nextBadges = [];
    if (progressPercent >= 35) nextBadges.push({ id: "b1", title: "Momentum Builder", tone: "blue" });
    if (progressPercent >= 60) nextBadges.push({ id: "b2", title: "Consistency Spark", tone: "purple" });
    if (progressPercent >= 80) nextBadges.push({ id: "b3", title: "Weekly Win", tone: "emerald" });
    return nextBadges;
  }, [progressPercent]);

  useEffect(() => {
    let alive = true;

    async function hydrate() {
      setLoading(true);
      try {
        const [todayResult, studentResult, weekResult] = await Promise.allSettled([
          apiFetch("/api/tasks/today"),
          apiFetch("/api/student/dashboard"),
          apiFetch("/api/tasks/week")
        ]);

        if (!alive) return;

        if (todayResult.status === "fulfilled" && Array.isArray(todayResult.value.tasks) && todayResult.value.tasks.length) {
          setTasks(
            todayResult.value.tasks.map((task, index) => ({
              id: task.id || `task-${index}`,
              title: task.title || `Task ${index + 1}`,
              completed: Boolean(task.completed)
            }))
          );
        }

        if (studentResult.status === "fulfilled" && Array.isArray(studentResult.value.announcements)) {
          const liveSessions = studentResult.value.announcements
            .filter((item) => item?.type === "live")
            .slice(0, 3)
            .map((item, index) => ({
              id: item._id || `live-${index}`,
              title: item.title || "Live Session",
              date: item.scheduledFor ? new Date(item.scheduledFor).toLocaleDateString() : "Upcoming",
              time: item.scheduledFor
                ? new Date(item.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "TBA",
              link: item.link || ""
            }));

          setSessions(liveSessions);
        }

        if (weekResult.status === "fulfilled") {
          const completed = Number(weekResult.value.completed || 0);
          const total = Number(weekResult.value.total || 0);
          const weeklyPercent = total > 0 ? Math.round((completed / total) * 100) : progressPercent;
          setWeeklyProgress(buildWeeklySeries(weeklyPercent || 45));
        }
      } catch {
        // keep default mock state
      } finally {
        if (alive) {
          window.setTimeout(() => {
            if (alive) setLoading(false);
          }, 450);
        }
      }
    }

    hydrate();

    return () => {
      alive = false;
    };
  }, [progressPercent]);

  async function handleToggleTask(task) {
    const nextCompleted = !task.completed;
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, completed: nextCompleted } : item)));

    notify({
      type: nextCompleted ? "success" : "info",
      title: nextCompleted ? "Task marked complete" : "Task marked pending",
      description: task.title
    });

    try {
      await apiFetch("/api/tasks/today/complete", {
        method: "POST",
        body: JSON.stringify({ taskId: task.id, completed: nextCompleted })
      });
    } catch {
      setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, completed: task.completed } : item)));
      notify({
        type: "error",
        title: "Could not update task",
        description: "Please try again."
      });
    }
  }

  function handleJoinSession(session) {
    notify({
      type: "info",
      title: "Opening live session",
      description: session.title
    });
    window.open(session.link, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6 pb-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-300">Welcome back, {user?.name || "Learner"}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">Student Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{motivationalText(progressPercent)}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:max-w-sm">
          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-200">Momentum</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{streak} days</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-3 dark:border-violet-500/30 dark:bg-violet-500/10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">Progress</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{progressPercent}%</p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Progress %" value={`${progressPercent}%`} icon={Percent} tone="blue" hint="This week" />
          <StatCard label="Tasks Completed" value={`${completedCount}/${tasks.length}`} icon={ClipboardCheck} tone="emerald" hint="Today" />
          <StatCard label="Learning Score" value={`${interviewScore}%`} icon={Goal} tone="purple" hint="From completion" />
          <StatCard label="Daily Streak" value={`${streak} days`} icon={Flame} tone="amber" hint="Momentum" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Today's Tasks" subtitle="Mark tasks complete to keep your momentum high.">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-14" />
              ))}
            </div>
          ) : tasks.length ? (
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={handleToggleTask} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              title="No tasks for today"
              description="Add your first task and start your streak."
            />
          )}
        </SectionCard>

        <SectionCard title="Upcoming Live Sessions" subtitle="Join events and stay in sync with your cohort.">
          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((item) => (
                <Skeleton key={item} className="h-36" />
              ))}
            </div>
          ) : sessions.length ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} onJoin={handleJoinSession} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="No live sessions yet"
              description="New sessions will appear here when mentors schedule them."
            />
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Weekly Progress"
          subtitle="Track daily momentum across the week."
          action={<span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">{progressPercent}% avg</span>}
        >
          {loading ? <Skeleton className="h-52" /> : <BarChart data={weeklyProgress} tone="blue" />}
        </SectionCard>

        <SectionCard title="Momentum" subtitle="Progress-based badges that reflect your current streak and consistency.">
          {loading ? (
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-12" />
              ))}
            </div>
          ) : badges.length ? (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <BadgePill key={badge.id} title={badge.title} tone={badge.tone} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Trophy}
              title="No momentum badges yet"
              description="Finish more daily tasks to unlock your first badge."
            />
          )}
        </SectionCard>
      </div>

      <button
        type="button"
        onClick={() => {
          notify({
            type: "info",
            title: "Launching AI Assistant",
            description: "Opening chat support."
          });
          window.location.href = "/ai-teacher";
        }}
        className="fixed bottom-24 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl lg:bottom-8 lg:right-8"
      >
        <Bot className="h-4 w-4" />
        AI Assistant
      </button>

      <div className="hidden lg:block">
        <SectionCard className="!p-4" title="Quick Inspiration" subtitle="Small wins daily create big outcomes over time.">
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-3 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
            <MessageCircle className="h-4 w-4" />
            One complete task every day can transform your next 90 days.
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

