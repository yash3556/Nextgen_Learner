import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { apiFetch } from "../api/api";

function ProgressLine({ completed, total }) {
  const pct = total ? (completed / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Daily progress</span>
        <span className="font-semibold text-slate-700">{Math.round(pct)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-white/70 bg-slate-100/70">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function focusTone(focusArea) {
  if (focusArea === "communication") return "bg-amber-400/15 border-amber-400/25 text-amber-700";
  if (focusArea === "dsa") return "bg-primary/10 border-primary/20 text-primary";
  if (focusArea === "python") return "bg-cyan-500/10 border-cyan-500/20 text-cyan-700";
  if (focusArea === "web") return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700";
  return "bg-slate-200/60 border-slate-300/60 text-slate-700";
}

function sourceTone(source) {
  if (source === "roadmap") return "bg-primary/10 border-primary/20 text-primary";
  if (source === "user") return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700";
  return "bg-slate-200/60 border-slate-300/60 text-slate-700";
}

function sourceLabel(source) {
  if (source === "roadmap") return "Roadmap step";
  if (source === "user") return "My task";
  return "AI suggestion";
}

function resourceTone(type) {
  if (type === "playlist") return "bg-red-500/10 border-red-500/20 text-red-700";
  if (type === "coach") return "bg-amber-400/15 border-amber-400/25 text-amber-700";
  if (type === "practice") return "bg-primary/10 border-primary/20 text-primary";
  return "bg-cyan-500/10 border-cyan-500/20 text-cyan-700";
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
        active
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-white/70 bg-white/70 text-slate-600 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

const EMPTY_FORM = { title: "", description: "" };

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString();
}

export default function Tasks() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [managedTasks, setManagedTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [recent, setRecent] = useState(null);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const [dataResult, studentDashboardResult] = await Promise.allSettled([
        apiFetch("/api/tasks/today"),
        apiFetch("/api/student/dashboard")
      ]);

      if (dataResult.status === "fulfilled") {
        setTasks(dataResult.value.tasks || []);
        setActiveRoadmap(dataResult.value.activeRoadmap || null);
      } else {
        setTasks([]);
        setActiveRoadmap(null);
      }

      if (studentDashboardResult.status === "fulfilled") {
        setManagedTasks(studentDashboardResult.value.managedTasks || []);
        setAnnouncements(studentDashboardResult.value.announcements || []);
      } else {
        setManagedTasks([]);
        setAnnouncements([]);
      }

      setActionError("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const total = tasks.length;
  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = total - completedCount;
  const personalCount = tasks.filter((task) => task.source === "user").length;
  const roadmapCount = tasks.filter((task) => task.source === "roadmap").length;
  const pct = useMemo(() => (total ? Math.round((completedCount / total) * 100) : 0), [total, completedCount]);
  const filteredTasks = useMemo(() => {
    if (filter === "pending") return tasks.filter((task) => !task.completed);
    if (filter === "completed") return tasks.filter((task) => task.completed);
    if (filter === "roadmap") return tasks.filter((task) => task.source === "roadmap");
    if (filter === "mine") return tasks.filter((task) => task.source === "user");
    if (filter === "ai") return tasks.filter((task) => task.source === "generated");
    return tasks;
  }, [filter, tasks]);

  async function toggle(task) {
    const nextCompleted = !task.completed;
    setRecent(task.id);
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, completed: nextCompleted } : item)));

    try {
      const data = await apiFetch("/api/tasks/today/complete", {
        method: "POST",
        body: JSON.stringify({ taskId: task.id, completed: nextCompleted })
      });
      setTasks(data.tasks || []);
      setActiveRoadmap(data.activeRoadmap || null);
      setActionError("");
      setTimeout(() => setRecent(null), 500);
    } catch {
      setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, completed: task.completed } : item)));
      setActionError("Could not update that task right now.");
      setRecent(null);
    }
  }

  async function addTask(event) {
    event.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();

    if (!title) {
      setFormError("Please add a task title.");
      return;
    }

    setSavingTask(true);
    setFormError("");

    try {
      const data = await apiFetch("/api/tasks/today", {
        method: "POST",
        body: JSON.stringify({ title, description })
      });
      setTasks(data.tasks || []);
      setActiveRoadmap(data.activeRoadmap || null);
      setForm(EMPTY_FORM);
      setActionError("");
    } catch (err) {
      setFormError(err?.message || "Could not add your task.");
    } finally {
      setSavingTask(false);
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setEditForm({
      title: task.title || "",
      description: task.description || ""
    });
    setEditError("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm(EMPTY_FORM);
    setEditError("");
  }

  async function saveEdit(taskId) {
    const title = editForm.title.trim();
    const description = editForm.description.trim();

    if (!title) {
      setEditError("Please add a task title.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const data = await apiFetch(`/api/tasks/today/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        body: JSON.stringify({ title, description })
      });
      setTasks(data.tasks || []);
      setActiveRoadmap(data.activeRoadmap || null);
      setActionError("");
      cancelEdit();
    } catch (err) {
      setEditError(err?.message || "Could not save changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteTask(task) {
    if (!task || task.source === "roadmap" || deletingId) return;

    setDeletingId(task.id);
    try {
      const data = await apiFetch(`/api/tasks/today/${encodeURIComponent(task.id)}`, {
        method: "DELETE"
      });
      setTasks(data.tasks || []);
      setActiveRoadmap(data.activeRoadmap || null);
      setActionError("");
      if (editingId === task.id) cancelEdit();
    } catch (err) {
      setActionError(err?.message || "Could not delete this task.");
    } finally {
      setDeletingId("");
    }
  }

  function openResource(resource) {
    if (!resource?.url) return;
    if (resource.url.startsWith("/")) {
      navigate(resource.url);
      return;
    }
    window.open(resource.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Daily Tasks</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your roadmap step, AI suggestions, and your own tasks now live in one place.
          </p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          {pct}% completed
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card variant="light">
          {activeRoadmap ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Active roadmap</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Day {activeRoadmap.day} of {activeRoadmap.totalDays}
                  </div>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {activeRoadmap.title}
                </span>
              </div>

              <div className="space-y-2">
                {(activeRoadmap.taskTexts || []).map((taskText, index) => (
                  <div key={`${activeRoadmap.id}-${index}`} className="rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm font-semibold text-slate-800">
                    {taskText}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="ghost"
                  onClick={() => navigate(activeRoadmap.id === "custom" ? "/roadmaps/custom" : `/roadmaps/${activeRoadmap.id}`)}
                >
                  Open roadmap
                </Button>
                <Button variant="ghost" onClick={load}>
                  Refresh tasks
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">No roadmap linked yet</div>
                <div className="mt-1 text-sm text-slate-600">
                  Choose a roadmap and use it in Daily Tasks so your current learning step shows up here automatically.
                </div>
              </div>
              <Button onClick={() => navigate("/roadmaps")}>Choose a roadmap</Button>
            </div>
          )}
        </Card>

        <Card variant="light">
          <form className="space-y-4" onSubmit={addTask}>
            <div>
              <div className="text-sm font-semibold text-slate-900">Add your own task</div>
              <div className="mt-1 text-sm text-slate-600">
                Add a personal goal for today and edit it anytime.
              </div>
            </div>

            <Input
              label="Task title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Example: Revise array questions"
            />

            <Input
              as="textarea"
              label="Details"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Optional notes, links, or what you want to finish today..."
              hint="You can keep it short. Even one sentence is enough."
            />

            {formError ? <div className="text-sm font-medium text-red-600">{formError}</div> : null}

            <Button type="submit" disabled={savingTask}>
              {savingTask ? "Adding..." : "Add task"}
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card variant="light">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Admin Managed Tasks</div>
              <div className="mt-1 text-sm text-slate-600">
                These are tasks or schedules assigned by admins for all students or for your group.
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-700">
              {managedTasks.length} active
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {managedTasks.length ? (
              managedTasks.map((task) => (
                <div key={task._id} className="rounded-2xl border border-white/70 bg-white/65 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{task.title}</div>
                      <div className="mt-2 text-sm text-slate-600">Deadline: {formatDate(task.deadline)}</div>
                    </div>
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                      {task.assignedTo === "group" ? `Group: ${task.targetGroup || "custom"}` : "All Students"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/70 bg-white/55 px-4 py-4 text-sm text-slate-500">
                No admin-managed tasks are assigned to you right now.
              </div>
            )}
          </div>
        </Card>

        <Card variant="light">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Admin Links And Updates</div>
              <div className="mt-1 text-sm text-slate-600">
                Live sessions, interview links, and updates posted by admins.
              </div>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              {announcements.length} updates
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {announcements.length ? (
              announcements.map((announcement) => (
                <div key={announcement._id} className="rounded-2xl border border-white/70 bg-white/65 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold text-slate-900">{announcement.title}</div>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {announcement.type}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {formatDate(announcement.createdAt)} by {announcement.createdBy?.name || announcement.createdBy?.userId || "Admin"}
                  </div>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => window.open(announcement.link, "_blank", "noopener,noreferrer")}
                    >
                      Open Link
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/70 bg-white/55 px-4 py-4 text-sm text-slate-500">
                No admin updates available yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-10 w-full rounded-2xl" />
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <ProgressLine completed={completedCount} total={total} />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-3xl border border-primary/20 bg-primary/10 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Total</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{total}</div>
              </div>
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Completed</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{completedCount}</div>
              </div>
              <div className="rounded-3xl border border-amber-400/25 bg-amber-400/15 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Pending</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{pendingCount}</div>
              </div>
              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">My tasks</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{personalCount}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                All
              </FilterChip>
              <FilterChip active={filter === "pending"} onClick={() => setFilter("pending")}>
                Pending
              </FilterChip>
              <FilterChip active={filter === "completed"} onClick={() => setFilter("completed")}>
                Completed
              </FilterChip>
              <FilterChip active={filter === "roadmap"} onClick={() => setFilter("roadmap")}>
                Roadmap
              </FilterChip>
              <FilterChip active={filter === "mine"} onClick={() => setFilter("mine")}>
                Mine
              </FilterChip>
              <FilterChip active={filter === "ai"} onClick={() => setFilter("ai")}>
                AI
              </FilterChip>
              <div className="ml-auto text-xs text-slate-500">
                {roadmapCount} roadmap-linked today
              </div>
            </div>

            {actionError ? <div className="text-sm font-medium text-red-600">{actionError}</div> : null}

            {filteredTasks.length ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {filteredTasks.map((task) => {
                  const isEditing = editingId === task.id;

                  return (
                    <div
                      key={task.id}
                      className={`rounded-3xl border border-white/70 bg-white/45 px-4 py-4 shadow-soft transition ${
                        recent === task.id ? "tick-pop" : ""
                      } ${task.completed ? "opacity-80" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${sourceTone(task.source)}`}>
                              {sourceLabel(task.source)}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${focusTone(task.focusArea)}`}>
                              {task.focusArea || "general"}
                            </span>
                            {task.coachMode === "speaking" ? (
                              <span className="rounded-full border border-amber-400/25 bg-amber-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                                AI feedback ready
                              </span>
                            ) : null}
                          </div>

                          {isEditing ? (
                            <div className="mt-3 space-y-3">
                              <Input
                                label="Task title"
                                value={editForm.title}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                              />
                              <Input
                                as="textarea"
                                label="Details"
                                value={editForm.description}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                                placeholder="Optional notes..."
                              />
                              {editError ? <div className="text-sm font-medium text-red-600">{editError}</div> : null}
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" onClick={() => saveEdit(task.id)} disabled={savingEdit}>
                                  {savingEdit ? "Saving..." : "Save"}
                                </Button>
                                <Button type="button" variant="ghost" onClick={cancelEdit} disabled={savingEdit}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className={`mt-3 font-bold ${task.completed ? "text-slate-500 line-through" : "text-slate-900"}`}>
                                {task.title}
                              </div>
                              {task.description ? (
                                <div className={`mt-1 text-sm ${task.completed ? "text-slate-400" : "text-slate-600"}`}>
                                  {task.description}
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => toggle(task)}
                            className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                              task.completed
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                                : "border-white/70 bg-white/70 text-slate-700 hover:bg-white"
                            }`}
                          >
                            {task.completed ? "Completed" : "Mark done"}
                          </button>
                          {!isEditing ? (
                            <button
                              type="button"
                              onClick={() => startEdit(task)}
                              className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                            >
                              Edit
                            </button>
                          ) : null}
                          {!isEditing && task.source !== "roadmap" ? (
                            <button
                              type="button"
                              onClick={() => deleteTask(task)}
                              disabled={deletingId === task.id}
                              className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/15 disabled:opacity-60"
                            >
                              {deletingId === task.id ? "Deleting..." : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {!isEditing && task.resources?.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {task.resources.map((resource, index) => (
                            <button
                              key={`${task.id}-${resource.label}-${index}`}
                              type="button"
                              onClick={() => openResource(resource)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 ${resourceTone(resource.type)}`}
                            >
                              {resource.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-white/70 bg-white/50 px-4 py-5 text-sm text-slate-600">
                No tasks match this filter right now. Try another view or add one above.
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Tip: edit roadmap or AI tasks too if you want the wording to match your study plan.
              </div>
              <Button variant="ghost" onClick={load}>
                Refresh
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
