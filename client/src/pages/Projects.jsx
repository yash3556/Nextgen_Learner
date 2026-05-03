import React, { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  ExternalLink,
  FileDown,
  FileText,
  FolderKanban,
  GitBranch,
  ImageIcon,
  Mic,
  Plus,
  Square,
  Trash2
} from "lucide-react";
import SectionCard from "../components/ui/SectionCard";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { apiFetch } from "../api/api";
import {
  blobToAttachment,
  FILE_ACCEPT_ATTRIBUTE,
  filesToAttachments,
  formatFileSize,
  getAttachmentCategory
} from "../utils/attachments";

const EMPTY_FORM = {
  title: "",
  summary: "",
  problemStatement: "",
  keyFeatures: "",
  stack: "",
  codeSnippet: "",
  challenges: "",
  outcomes: "",
  githubUrl: "",
  liveUrl: "",
  category: "portfolio",
  status: "planning",
  attachments: []
};

function normalizeHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(raw)) return raw;
  return `https://${raw}`;
}

function toCsv(value) {
  if (!Array.isArray(value)) return "";
  return value.join(", ");
}

function statusTone(status) {
  if (status === "completed") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (status === "in_progress") return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
  if (status === "on_hold") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
}

function formatStatus(status) {
  if (!status) return "Planning";
  return status.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function AttachmentBadge({ attachment, onRemove }) {
  const category = getAttachmentCategory(attachment?.mimeType);
  const Icon = category === "image" ? ImageIcon : category === "audio" ? AudioLines : FileText;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/70">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Icon className="h-3.5 w-3.5" />
            <span className="truncate">{attachment?.name || "Attachment"}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{formatFileSize(attachment?.size)}</p>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={attachment?.dataUrl || "#"}
            download={attachment?.name || "attachment"}
            className="rounded-md border border-slate-200 p-1 text-slate-500 transition hover:bg-white hover:text-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            title="Download"
          >
            <FileDown className="h-3.5 w-3.5" />
          </a>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md border border-rose-200 p-1 text-rose-500 transition hover:bg-rose-50 dark:border-rose-900/70 dark:hover:bg-rose-900/30"
              title="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      {category === "image" && attachment?.dataUrl ? (
        <img src={attachment.dataUrl} alt={attachment.name || "Attachment"} className="mt-2 max-h-24 w-full rounded-lg object-cover" />
      ) : null}
      {category === "audio" && attachment?.dataUrl ? (
        <audio controls src={attachment.dataUrl} className="mt-2 w-full" />
      ) : null}
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);

  const recorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    fetchProjects();
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  async function fetchProjects() {
    try {
      setLoading(true);
      const data = await apiFetch("/api/projects");
      setProjects(data.projects || []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingProject(null);
    setFormData(EMPTY_FORM);
    setError("");
    setShowModal(true);
  }

  function openEditModal(project) {
    setEditingProject(project);
    setFormData({
      title: project?.title || "",
      summary: project?.summary || "",
      problemStatement: project?.problemStatement || "",
      keyFeatures: toCsv(project?.keyFeatures),
      stack: toCsv(project?.stack),
      codeSnippet: project?.codeSnippet || "",
      challenges: project?.challenges || "",
      outcomes: project?.outcomes || "",
      githubUrl: project?.githubUrl || "",
      liveUrl: project?.liveUrl || "",
      category: project?.category || "portfolio",
      status: project?.status || "planning",
      attachments: Array.isArray(project?.attachments)
        ? project.attachments.map((item, index) => ({
            ...item,
            id: item?.id || `${project?._id || "project"}-attachment-${index}`
          }))
        : []
    });
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (recording) {
      stopRecording();
    }
    setShowModal(false);
    setSaving(false);
  }

  async function handleFileUpload(event) {
    const files = event.target.files;
    if (!files?.length) return;

    try {
      const uploaded = await filesToAttachments(files, { existingCount: formData.attachments.length });
      setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, ...uploaded] }));
      setError("");
    } catch (err) {
      setError(err.message || "Could not attach files.");
    } finally {
      event.target.value = "";
    }
  }

  function removeAttachment(id) {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((item) => item.id !== id)
    }));
  }

  async function startRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
        setError("Microphone recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new window.MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event?.data?.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        try {
          const mimeType = recorder.mimeType || "audio/webm";
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const voiceAttachment = await blobToAttachment(blob, {
            filename: `voice-note-${Date.now()}.webm`,
            mimeType
          });
          setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, voiceAttachment] }));
          setError("");
        } catch (err) {
          setError(err.message || "Could not save microphone recording.");
        } finally {
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
          audioChunksRef.current = [];
        }
      };

      recorder.start();
      setRecording(true);
      setError("");
    } catch (err) {
      setError(err?.message || "Microphone permission denied.");
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      title: formData.title.trim(),
      summary: formData.summary.trim(),
      problemStatement: formData.problemStatement.trim(),
      keyFeatures: formData.keyFeatures.split(",").map((item) => item.trim()).filter(Boolean),
      stack: formData.stack.split(",").map((item) => item.trim()).filter(Boolean),
      codeSnippet: formData.codeSnippet,
      challenges: formData.challenges.trim(),
      outcomes: formData.outcomes.trim(),
      githubUrl: normalizeHttpUrl(formData.githubUrl),
      liveUrl: normalizeHttpUrl(formData.liveUrl),
      category: formData.category,
      status: formData.status,
      attachments: formData.attachments
    };

    try {
      setSaving(true);
      setError("");

      if (editingProject) {
        await apiFetch(`/api/project/${editingProject._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/api/project", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      setShowModal(false);
      setEditingProject(null);
      setFormData(EMPTY_FORM);
      await fetchProjects();
    } catch (err) {
      setError(err.message || "Could not save project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(projectId) {
    if (!window.confirm("Delete this project?")) return;
    try {
      await apiFetch(`/api/project/${projectId}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((project) => project._id !== projectId));
      setError("");
    } catch (err) {
      setError(err.message || "Could not delete project.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-300">Projects</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">Project Workspace</h1>
        </section>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-blue-50/70 to-cyan-50/80 p-5 shadow-soft dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Projects</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">Project Workspace</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-700 dark:text-slate-300">
              Edit the full project story: problem, code, links, screenshots, docs, and voice notes in one place.
            </p>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/25 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <SectionCard title="Project Board" subtitle="Track each build with complete details and downloadable proof artifacts.">
        {!projects.length ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects added"
            description="Create your first project and keep everything editable in one workspace."
            action={<Button onClick={openCreateModal}>Create Project</Button>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project._id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(project.status)}`}>
                      {formatStatus(project.status)}
                    </span>
                    <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{project.title}</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    {project.category || "portfolio"}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{project.summary}</p>

                {project.problemStatement ? (
                  <p className="mt-2 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{project.problemStatement}</p>
                ) : null}

                {Array.isArray(project.keyFeatures) && project.keyFeatures.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {project.keyFeatures.slice(0, 4).map((feature) => (
                      <span key={feature} className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200">
                        {feature}
                      </span>
                    ))}
                  </div>
                ) : null}

                {Array.isArray(project.stack) && project.stack.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {project.stack.slice(0, 6).map((tech) => (
                      <span key={tech} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        {tech}
                      </span>
                    ))}
                  </div>
                ) : null}

                {project.codeSnippet ? (
                  <pre className="mt-3 max-h-28 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {project.codeSnippet}
                  </pre>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {project.githubUrl ? (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <GitBranch className="h-3.5 w-3.5" />
                      Code
                    </a>
                  ) : null}
                  {project.liveUrl ? (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Live
                    </a>
                  ) : null}
                </div>

                {Array.isArray(project.attachments) && project.attachments.length ? (
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Attachments ({project.attachments.length})
                    </p>
                    {project.attachments.slice(0, 2).map((attachment) => (
                      <AttachmentBadge key={attachment.id || attachment.name} attachment={attachment} />
                    ))}
                  </div>
                ) : null}

                {Array.isArray(project.feedbacks) && project.feedbacks.length ? (
                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">Mentor feedback</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {project.feedbacks[project.feedbacks.length - 1]?.comment || ""}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <Button variant="ghost" className="flex-1 py-1.5 text-xs" onClick={() => openEditModal(project)}>
                    Edit
                  </Button>
                  <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => handleDelete(project._id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <Modal isOpen={showModal} onClose={closeModal} title={editingProject ? "Edit Project" : "Add New Project"}>
        <form onSubmit={handleSubmit} className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
          <Input
            label="Project title"
            value={formData.title}
            onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Interview Scheduler App"
            required
          />

          <Input
            label="Quick summary"
            as="textarea"
            value={formData.summary}
            onChange={(event) => setFormData((prev) => ({ ...prev, summary: event.target.value }))}
            placeholder="One clear paragraph about what this project does."
            required
          />

          <Input
            label="Problem statement"
            as="textarea"
            value={formData.problemStatement}
            onChange={(event) => setFormData((prev) => ({ ...prev, problemStatement: event.target.value }))}
            placeholder="What problem were you solving?"
          />

          <Input
            label="Key features (comma separated)"
            value={formData.keyFeatures}
            onChange={(event) => setFormData((prev) => ({ ...prev, keyFeatures: event.target.value }))}
            placeholder="Auth, dashboards, notifications"
          />

          <Input
            label="Tech stack (comma separated)"
            value={formData.stack}
            onChange={(event) => setFormData((prev) => ({ ...prev, stack: event.target.value }))}
            placeholder="React, Node.js, MongoDB"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Project code / notes</label>
            <textarea
              value={formData.codeSnippet}
              onChange={(event) => setFormData((prev) => ({ ...prev, codeSnippet: event.target.value }))}
              placeholder="Paste code snippets, pseudocode, or architecture notes."
              className="min-h-[150px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <Input
            label="Challenges"
            as="textarea"
            value={formData.challenges}
            onChange={(event) => setFormData((prev) => ({ ...prev, challenges: event.target.value }))}
            placeholder="Biggest implementation challenge and how you solved it."
          />

          <Input
            label="Outcomes and learning"
            as="textarea"
            value={formData.outcomes}
            onChange={(event) => setFormData((prev) => ({ ...prev, outcomes: event.target.value }))}
            placeholder="Results, metrics, and what you learned."
          />

          <Input
            label="GitHub URL"
            type="url"
            value={formData.githubUrl}
            onChange={(event) => setFormData((prev) => ({ ...prev, githubUrl: event.target.value }))}
            placeholder="https://github.com/username/repo"
          />

          <Input
            label="Live URL"
            type="url"
            value={formData.liveUrl}
            onChange={(event) => setFormData((prev) => ({ ...prev, liveUrl: event.target.value }))}
            placeholder="https://project-demo.com"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
              <select
                value={formData.category}
                onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="portfolio">Portfolio</option>
                <option value="assignment">Assignment</option>
                <option value="internship">Internship</option>
                <option value="open-source">Open Source</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select
                value={formData.status}
                onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Proof files and voice notes</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Upload screenshot/docs/audio or record from mic. Max 6 files, 2 MB each.</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  Upload
                  <input type="file" multiple accept={FILE_ACCEPT_ATTRIBUTE} className="hidden" onChange={handleFileUpload} />
                </label>
                {recording ? (
                  <Button type="button" variant="danger" className="px-3 py-1.5 text-xs" onClick={stopRecording}>
                    <Square className="h-3.5 w-3.5" />
                    Stop Mic
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={startRecording}>
                    <Mic className="h-3.5 w-3.5" />
                    Record Mic
                  </Button>
                )}
              </div>
            </div>

            {formData.attachments.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {formData.attachments.map((attachment) => (
                  <AttachmentBadge key={attachment.id || attachment.name} attachment={attachment} onRemove={() => removeAttachment(attachment.id)} />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">No attachments yet.</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving..." : editingProject ? "Update Project" : "Create Project"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
