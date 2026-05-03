
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BookOpen, CalendarPlus, ExternalLink, FolderKanban, LogOut, Mail, Mic, Search, Shield, Target, Trash2, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api/api";
import { adminNavigation } from "../config/navigation";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import SectionCard from "../components/ui/SectionCard";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import BarChart from "../components/ui/BarChart";
import ThemeToggle from "../components/ui/ThemeToggle";
import { useToast } from "../context/ToastContext";

function badgeTone(status) {
  if (status === "Active") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
  if (status === "At Risk") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
  return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200";
}

function formatDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? value || "Not set" : date.toLocaleString();
}

function normalizeHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(raw)) return raw;
  return `https://${raw}`;
}

function formatAudience(assignedTo, targetGroup, targetStudentLabel) {
  if (assignedTo === "group") return `Group: ${targetGroup || "Custom group"}`;
  if (assignedTo === "student") return `Student: ${targetStudentLabel || "Selected student"}`;
  return "All students";
}

function mapAdminTask(task, index = 0) {
  return {
    id: task?._id || `task-${index}`,
    backendId: task?._id || `task-${index}`,
    title: task?.title || `Task ${index + 1}`,
    dueDate: task?.deadline || "",
    priority: task?.priority || "Medium",
    assignedTo: task?.assignedTo || "all",
    targetGroup: task?.targetGroup || "",
    targetStudentId: task?.targetStudent?._id || "",
    targetStudentLabel: task?.targetStudent?.name || task?.targetStudent?.userId || ""
  };
}

function mapAnnouncement(announcement, index = 0) {
  return {
    id: announcement?._id || `ann-${index}`,
    backendId: announcement?._id || `ann-${index}`,
    message: announcement?.title || "Platform update",
    type: announcement?.type || "announcement",
    description: announcement?.description || "",
    link: announcement?.link || "",
    scheduledFor: announcement?.scheduledFor || "",
    assignedTo: announcement?.assignedTo || "all",
    targetGroup: announcement?.targetGroup || "",
    targetStudentId: announcement?.targetStudent?._id || "",
    targetStudentLabel: announcement?.targetStudent?.name || announcement?.targetStudent?.userId || "",
    target: formatAudience(
      announcement?.assignedTo || "all",
      announcement?.targetGroup || "",
      announcement?.targetStudent?.name || announcement?.targetStudent?.userId || ""
    ),
    createdAt: formatDate(announcement?.createdAt || "")
  };
}

function mapSession(announcement, index = 0) {
  return {
    id: announcement?._id || `session-${index}`,
    backendId: announcement?._id || `session-${index}`,
    title: announcement?.title || "Live Session",
    type: announcement?.type || "live",
    description: announcement?.description || "",
    date: announcement?.scheduledFor || announcement?.createdAt || "",
    link: announcement?.link || "",
    assignedTo: announcement?.assignedTo || "all",
    targetGroup: announcement?.targetGroup || "",
    targetStudentId: announcement?.targetStudent?._id || "",
    targetStudentLabel: announcement?.targetStudent?.name || announcement?.targetStudent?.userId || "",
    target: formatAudience(
      announcement?.assignedTo || "all",
      announcement?.targetGroup || "",
      announcement?.targetStudent?.name || announcement?.targetStudent?.userId || ""
    )
  };
}

function mapGroup(group, index = 0) {
  return {
    id: group?._id || `group-${index}`,
    backendId: group?._id || `group-${index}`,
    name: group?.name || "Community Group",
    platform: group?.platform || "WhatsApp",
    description: group?.description || "",
    link: group?.link || "",
    assignedTo: group?.assignedTo || "all",
    targetGroup: group?.targetGroup || "",
    targetStudentId: group?.targetStudent?._id || "",
    targetStudentLabel: group?.targetStudent?.name || group?.targetStudent?.userId || "",
    createdAt: formatDate(group?.createdAt || "")
  };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notify } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [students, setStudents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [communityLinks, setCommunityLinks] = useState([]);
  const [mockInterviews, setMockInterviews] = useState([]);
  const [practiceModules, setPracticeModules] = useState([]);
  const [studentProjects, setStudentProjects] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [apiDown, setApiDown] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [sessionForm, setSessionForm] = useState({ title: "", date: "", link: "" });
  const [taskForm, setTaskForm] = useState({ title: "", dueDate: "", priority: "Medium" });
  const [announcementForm, setAnnouncementForm] = useState({ message: "", link: "", target: "all", group: "" });
  const [groupForm, setGroupForm] = useState({
    name: "",
    platform: "WhatsApp",
    description: "",
    link: "",
    target: "all",
    group: "",
    student: ""
  });
  const [mockForm, setMockForm] = useState({
    title: "",
    role: "General",
    difficulty: "medium",
    date: "",
    link: ""
  });
  const [practiceForm, setPracticeForm] = useState({
    skillName: "",
    subtopic: "",
    difficulty: "medium",
    tasksText: ""
  });
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    phone: "",
    userId: "",
    password: ""
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [editingSessionId, setEditingSessionId] = useState("");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState("");

  async function loadAdminData({ withLoading = true } = {}) {
    if (withLoading) setLoading(true);
    try {
      const [
        analyticsResult,
        studentsResult,
        tasksResult,
        announcementsResult,
        groupsResult,
        mockResult,
        practiceModulesResult,
        projectsResult
      ] = await Promise.allSettled([
        apiFetch("/api/admin/analytics"),
        apiFetch("/api/admin/students"),
        apiFetch("/api/admin/tasks"),
        apiFetch("/api/admin/announcements"),
        apiFetch("/api/admin/community-groups"),
        apiFetch("/api/admin/mock-interviews"),
        apiFetch("/api/admin/practice-modules"),
        apiFetch("/api/admin/student-projects")
      ]);

      const endpointResults = [
        analyticsResult,
        studentsResult,
        tasksResult,
        announcementsResult,
        groupsResult,
        mockResult,
        practiceModulesResult,
        projectsResult
      ];
      setApiDown(endpointResults.every((result) => result.status !== "fulfilled"));

      if (analyticsResult.status === "fulfilled" && analyticsResult.value) {
        setAnalytics(analyticsResult.value);
      }

      if (studentsResult.status === "fulfilled" && Array.isArray(studentsResult.value.students)) {
        setStudents(
          studentsResult.value.students.map((s, index) => {
            const progressRaw = Number(s.progressPercent ?? s.progress ?? 0);
            const progress = Number.isFinite(progressRaw) ? Math.max(0, Math.min(100, Math.round(progressRaw))) : 0;
            const tasksCompleted = Number(s.tasksCompleted || 0);
            return {
              id: s._id || `student-${index}`,
              name: s.name || `Student ${index + 1}`,
              email: s.email || "not-available@example.com",
              progress,
              tasksCompleted,
              status: progress >= 70 ? "Active" : progress >= 35 ? "At Risk" : "Inactive",
              weakAreas: Array.isArray(s.weakAreas) ? s.weakAreas.filter(Boolean) : [],
              timeline: Array.isArray(s.timeline) ? s.timeline.filter(Boolean) : []
            };
          })
        );
      }

      if (tasksResult.status === "fulfilled" && Array.isArray(tasksResult.value.tasks)) {
        setTasks(tasksResult.value.tasks.map(mapAdminTask));
      }

      if (announcementsResult.status === "fulfilled" && Array.isArray(announcementsResult.value.announcements)) {
        const nextAnnouncements = announcementsResult.value.announcements;
        setSessions(nextAnnouncements.filter((item) => item?.type === "live").map(mapSession));
        setAnnouncements(nextAnnouncements.filter((item) => item?.type !== "live").map(mapAnnouncement));
      }

      if (groupsResult.status === "fulfilled" && Array.isArray(groupsResult.value.groups)) {
        setCommunityLinks(groupsResult.value.groups.map(mapGroup));
      }

      if (mockResult.status === "fulfilled" && Array.isArray(mockResult.value.interviews)) {
        setMockInterviews(mockResult.value.interviews);
      }

      if (practiceModulesResult.status === "fulfilled" && Array.isArray(practiceModulesResult.value.modules)) {
        setPracticeModules(practiceModulesResult.value.modules);
      }

      if (projectsResult.status === "fulfilled" && Array.isArray(projectsResult.value.projects)) {
        setStudentProjects(projectsResult.value.projects);
      }
    } finally {
      if (withLoading) {
        window.setTimeout(() => {
          setLoading(false);
        }, 220);
      }
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadAdminData({ withLoading: false });
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  const filteredStudents = useMemo(
    () =>
      students.filter((s) => {
        const matchesSearch = `${s.name} ${s.email}`.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || s.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [students, search, statusFilter]
  );

  const avgProgress = useMemo(
    () => (students.length ? Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length) : 0),
    [students]
  );
  const fallbackActiveUsers = useMemo(() => students.filter((s) => s.status === "Active").length, [students]);
  const fallbackTotalTasksDone = useMemo(() => students.reduce((sum, s) => sum + s.tasksCompleted, 0), [students]);
  const totalStudents = analytics?.totals?.students ?? students.length;
  const activeUsers = analytics?.activity?.activeStudentsLast7Days ?? fallbackActiveUsers;
  const totalTasksDone = analytics?.progress?.completedTasks ?? fallbackTotalTasksDone;
  const completionRate = analytics?.progress?.completionRate ?? avgProgress;
  const adminsTotal = analytics?.totals?.admins ?? 0;
  const managedTasksTotal = analytics?.totals?.managedTasks ?? tasks.length;
  const announcementsTotal = analytics?.totals?.announcements ?? announcements.length;
  const noTaskActivityStudents = useMemo(() => students.filter((s) => Number(s.tasksCompleted || 0) === 0), [students]);
  const lowPerformers = useMemo(() => students.filter((s) => s.progress < 45), [students]);
  const dashboardNavigation = user?.isMainAdmin ? adminNavigation : adminNavigation.filter((item) => item.id !== "admin-access");
  const growthData = useMemo(
    () => [
      { label: "Students", value: Number(totalStudents || 0) },
      { label: "Admins", value: Number(adminsTotal || 0) },
      { label: "Tasks", value: Number(managedTasksTotal || 0) },
      { label: "Updates", value: Number(announcementsTotal || 0) }
    ],
    [totalStudents, adminsTotal, managedTasksTotal, announcementsTotal]
  );
  const engagementData = useMemo(
    () => [
      { label: "Active 7d", value: Number(activeUsers || 0) },
      { label: "Done Tasks", value: Number(totalTasksDone || 0) },
      { label: "Complete %", value: Number(completionRate || 0) }
    ],
    [activeUsers, totalTasksDone, completionRate]
  );

  function goToSection(id) {
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  }

  async function handleLogout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  }

  async function submitSession(event) {
    event.preventDefault();
    if (!sessionForm.title.trim() || !sessionForm.date.trim() || !sessionForm.link.trim()) {
      notify({ type: "error", title: "Missing session details", description: "Please fill title, date, and link." });
      return;
    }

    try {
      const body = {
        title: sessionForm.title.trim(),
        type: "live",
        description: "Live session published by admin",
        link: normalizeHttpUrl(sessionForm.link),
        scheduledFor: sessionForm.date,
        assignedTo: "all"
      };

      const response = editingSessionId
        ? await apiFetch(`/api/admin/announcement/${encodeURIComponent(editingSessionId)}`, {
            method: "PATCH",
            body: JSON.stringify(body)
          })
        : await apiFetch("/api/admin/announcement", {
            method: "POST",
            body: JSON.stringify(body)
          });

      if (response?.announcement) {
        const mapped = mapSession(response.announcement);
        if (editingSessionId) {
          setSessions((prev) => prev.map((item) => ((item.backendId || item.id) === editingSessionId ? mapped : item)));
        } else {
          setSessions((prev) => [mapped, ...prev]);
        }
      }
      setSessionForm({ title: "", date: "", link: "" });
      setEditingSessionId("");
      notify({ type: "success", title: editingSessionId ? "Session updated" : "Session created", description: sessionForm.title.trim() });
    } catch (err) {
      notify({ type: "error", title: editingSessionId ? "Could not update session" : "Could not create session", description: err?.message || "Please try again." });
    }
  }

  function editSession(session) {
    setEditingSessionId(session.backendId || session.id);
    setSessionForm({
      title: session.title || "",
      date: session.date ? new Date(session.date).toISOString().slice(0, 16) : "",
      link: session.link || ""
    });
    goToSection("sessions");
  }

  async function deleteSession(sessionId) {
    try {
      await apiFetch(`/api/admin/announcement/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((session) => (session.backendId || session.id) !== sessionId));
      if (editingSessionId === sessionId) {
        setEditingSessionId("");
        setSessionForm({ title: "", date: "", link: "" });
      }
      notify({ type: "info", title: "Session removed" });
    } catch (err) {
      notify({ type: "error", title: "Could not remove session", description: err?.message || "Please try again." });
    }
  }

  async function submitTask(event) {
    event.preventDefault();
    if (!taskForm.title.trim() || !taskForm.dueDate.trim()) {
      notify({ type: "error", title: "Task details missing", description: "Please add title and due date." });
      return;
    }

    try {
      if (editingTaskId) {
        const existingTask = tasks.find((task) => (task.backendId || task.id) === editingTaskId);
        const response = await apiFetch(`/api/admin/task/${encodeURIComponent(editingTaskId)}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: taskForm.title.trim(),
            deadline: taskForm.dueDate,
            priority: taskForm.priority,
            assignedTo: existingTask?.assignedTo || "all",
            targetGroup: existingTask?.assignedTo === "group" ? existingTask?.targetGroup || "" : "",
            targetStudent: existingTask?.assignedTo === "student" ? existingTask?.targetStudentId || "" : ""
          })
        });

        if (response?.task) {
          const mapped = mapAdminTask(response.task);
          setTasks((prev) => prev.map((task) => ((task.backendId || task.id) === editingTaskId ? mapped : task)));
        }
        setEditingTaskId("");
        notify({ type: "success", title: "Task updated" });
      } else {
        const response = await apiFetch("/api/admin/task", {
          method: "POST",
          body: JSON.stringify({
            title: taskForm.title.trim(),
            deadline: taskForm.dueDate,
            priority: taskForm.priority,
            assignedTo: "all"
          })
        });

        if (response?.task) {
          setTasks((prev) => [mapAdminTask(response.task), ...prev]);
        }
        notify({ type: "success", title: "Task added", description: taskForm.title.trim() });
      }

      setTaskForm({ title: "", dueDate: "", priority: "Medium" });
    } catch (err) {
      notify({ type: "error", title: "Could not save task", description: err?.message || "Please try again." });
    }
  }

  function editTask(task) {
    setEditingTaskId(task.backendId || task.id);
    setTaskForm({ title: task.title, dueDate: task.dueDate, priority: task.priority });
    goToSection("tasks");
  }

  async function deleteTask(taskId) {
    try {
      await apiFetch(`/api/admin/task/${encodeURIComponent(taskId)}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((task) => (task.backendId || task.id) !== taskId));
      notify({ type: "info", title: "Task deleted" });
    } catch (err) {
      notify({ type: "error", title: "Could not delete task", description: err?.message || "Please try again." });
    }
  }

  async function submitAnnouncement(event) {
    event.preventDefault();
    if (!announcementForm.message.trim()) {
      notify({ type: "error", title: "Message required", description: "Please enter an announcement." });
      return;
    }
    if (announcementForm.target === "group" && !announcementForm.group.trim()) {
      notify({ type: "error", title: "Group required", description: "Please enter a group name." });
      return;
    }

    try {
      const body = {
        title: announcementForm.message.trim(),
        type: "announcement",
        description: announcementForm.message.trim(),
        link: normalizeHttpUrl(announcementForm.link),
        assignedTo: announcementForm.target === "group" ? "group" : "all",
        targetGroup: announcementForm.target === "group" ? announcementForm.group.trim() : ""
      };

      const response = editingAnnouncementId
        ? await apiFetch(`/api/admin/announcement/${encodeURIComponent(editingAnnouncementId)}`, {
            method: "PATCH",
            body: JSON.stringify(body)
          })
        : await apiFetch("/api/admin/announcement", {
            method: "POST",
            body: JSON.stringify(body)
          });

      if (response?.announcement) {
        const mapped = mapAnnouncement(response.announcement);
        if (editingAnnouncementId) {
          setAnnouncements((prev) =>
            prev.map((item) => ((item.backendId || item.id) === editingAnnouncementId ? mapped : item))
          );
        } else {
          setAnnouncements((prev) => [mapped, ...prev]);
        }
      }
      setAnnouncementForm({ message: "", link: "", target: "all", group: "" });
      setEditingAnnouncementId("");
      notify({ type: "success", title: editingAnnouncementId ? "Announcement updated" : "Announcement sent" });
    } catch (err) {
      notify({
        type: "error",
        title: editingAnnouncementId ? "Could not update announcement" : "Could not send announcement",
        description: err?.message || "Please try again."
      });
    }
  }

  function editAnnouncement(announcement) {
    setEditingAnnouncementId(announcement.backendId || announcement.id);
    setAnnouncementForm({
      message: announcement.message || "",
      link: announcement.link || "",
      target: announcement.assignedTo === "group" ? "group" : "all",
      group: announcement.targetGroup || ""
    });
    goToSection("announcements");
  }

  async function deleteAnnouncement(announcementId) {
    try {
      await apiFetch(`/api/admin/announcement/${encodeURIComponent(announcementId)}`, { method: "DELETE" });
      setAnnouncements((prev) => prev.filter((ann) => (ann.backendId || ann.id) !== announcementId));
      if (editingAnnouncementId === announcementId) {
        setEditingAnnouncementId("");
        setAnnouncementForm({ message: "", link: "", target: "all", group: "" });
      }
      notify({ type: "info", title: "Announcement removed" });
    } catch (err) {
      notify({ type: "error", title: "Could not remove announcement", description: err?.message || "Please try again." });
    }
  }

  async function submitGroup(event) {
    event.preventDefault();
    if (!groupForm.name.trim() || !groupForm.platform.trim() || !groupForm.link.trim()) {
      notify({ type: "error", title: "Missing link details", description: "Please fill name, platform, and link." });
      return;
    }
    if (groupForm.target === "group" && !groupForm.group.trim()) {
      notify({ type: "error", title: "Group required", description: "Please enter a group name." });
      return;
    }
    if (groupForm.target === "student" && !groupForm.student) {
      notify({ type: "error", title: "Student required", description: "Please choose a student." });
      return;
    }

    try {
      const response = await apiFetch("/api/admin/community-groups", {
        method: "POST",
        body: JSON.stringify({
          name: groupForm.name.trim(),
          platform: groupForm.platform.trim(),
          description: groupForm.description.trim(),
          link: normalizeHttpUrl(groupForm.link),
          assignedTo: groupForm.target === "group" ? "group" : groupForm.target === "student" ? "student" : "all",
          targetGroup: groupForm.target === "group" ? groupForm.group.trim() : "",
          targetStudent: groupForm.target === "student" ? groupForm.student : ""
        })
      });

      if (response?.group) {
        setCommunityLinks((prev) => [mapGroup(response.group), ...prev]);
      }
      setGroupForm({ name: "", platform: "WhatsApp", description: "", link: "", target: "all", group: "", student: "" });
      notify({ type: "success", title: "Community link added" });
    } catch (err) {
      notify({ type: "error", title: "Could not add link", description: err?.message || "Please try again." });
    }
  }

  async function deleteGroup(groupId) {
    try {
      await apiFetch(`/api/admin/community-groups/${encodeURIComponent(groupId)}`, { method: "DELETE" });
      setCommunityLinks((prev) => prev.filter((group) => (group.backendId || group.id) !== groupId));
      notify({ type: "info", title: "Community link removed" });
    } catch (err) {
      notify({ type: "error", title: "Could not remove link", description: err?.message || "Please try again." });
    }
  }

  async function submitMockInterview(event) {
    event.preventDefault();
    if (!mockForm.title.trim() || !mockForm.date.trim()) {
      notify({ type: "error", title: "Missing mock details", description: "Please add title and date/time." });
      return;
    }

    try {
      const response = await apiFetch("/api/admin/mock-interview", {
        method: "POST",
        body: JSON.stringify({
          title: mockForm.title.trim(),
          role: mockForm.role.trim(),
          difficulty: mockForm.difficulty,
          mode: "live",
          scheduledFor: mockForm.date,
          meetingLink: normalizeHttpUrl(mockForm.link),
          assignedTo: "all"
        })
      });

      if (response?.interview) {
        setMockInterviews((prev) => [response.interview, ...prev]);
      }
      setMockForm({ title: "", role: "General", difficulty: "medium", date: "", link: "" });
      notify({ type: "success", title: "Mock interview slot created" });
    } catch (err) {
      notify({ type: "error", title: "Could not create mock slot", description: err?.message || "Please try again." });
    }
  }

  async function deleteMockInterview(interviewId) {
    try {
      await apiFetch(`/api/admin/mock-interview/${encodeURIComponent(interviewId)}`, { method: "DELETE" });
      setMockInterviews((prev) => prev.filter((item) => item._id !== interviewId));
      notify({ type: "info", title: "Mock interview removed" });
    } catch (err) {
      notify({ type: "error", title: "Could not delete mock slot", description: err?.message || "Please try again." });
    }
  }

  async function submitPracticeModule(event) {
    event.preventDefault();
    if (!practiceForm.skillName.trim() || !practiceForm.subtopic.trim()) {
      notify({ type: "error", title: "Missing practice details", description: "Please fill skill and subtopic." });
      return;
    }

    const tasks = practiceForm.tasksText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [titlePart, ...linkParts] = line.split("|");
        return {
          title: String(titlePart || "").trim(),
          questionLink: normalizeHttpUrl(linkParts.join("|")),
          estimatedMinutes: 25
        };
      })
      .filter((task) => task.title);

    try {
      const moduleResponse = await apiFetch("/api/admin/practice-module", {
        method: "POST",
        body: JSON.stringify({
          skillName: practiceForm.skillName.trim(),
          subtopic: practiceForm.subtopic.trim(),
          difficulty: practiceForm.difficulty,
          tasks
        })
      });

      const moduleId = moduleResponse?.module?._id;
      if (moduleId) {
        await apiFetch("/api/admin/practice-plan", {
          method: "POST",
          body: JSON.stringify({
            moduleId,
            assignedTo: "all",
            startsOn: new Date().toISOString()
          })
        });
      }

      if (moduleResponse?.module) {
        setPracticeModules((prev) => [moduleResponse.module, ...prev]);
      }
      setPracticeForm({ skillName: "", subtopic: "", difficulty: "medium", tasksText: "" });
      notify({ type: "success", title: "Practice module published", description: "It is now visible in student practice." });
    } catch (err) {
      notify({ type: "error", title: "Could not publish practice", description: err?.message || "Please try again." });
    }
  }

  async function deletePracticeModule(moduleId) {
    try {
      await apiFetch(`/api/admin/practice-module/${encodeURIComponent(moduleId)}`, { method: "DELETE" });
      setPracticeModules((prev) => prev.filter((module) => module._id !== moduleId));
      notify({ type: "info", title: "Practice module removed" });
    } catch (err) {
      notify({ type: "error", title: "Could not remove module", description: err?.message || "Please try again." });
    }
  }

  async function submitAdminAccount(event) {
    event.preventDefault();

    if (!user?.isMainAdmin) {
      notify({ type: "error", title: "Main admin permission required", description: "Only the main admin can create new admin accounts." });
      return;
    }

    const payload = {
      name: adminForm.name.trim(),
      email: adminForm.email.trim(),
      phone: adminForm.phone.trim(),
      userId: adminForm.userId.trim(),
      password: adminForm.password.trim()
    };

    if (!payload.name || !payload.email || !payload.phone || !payload.userId || !payload.password) {
      notify({ type: "error", title: "Missing details", description: "Please fill name, email, phone, user ID, and password." });
      return;
    }

    if (payload.password.length < 8) {
      notify({ type: "error", title: "Weak password", description: "Password must be at least 8 characters long." });
      return;
    }

    try {
      setCreatingAdmin(true);
      await apiFetch("/api/create-admin", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setAdminForm({ name: "", email: "", phone: "", userId: "", password: "" });
      notify({
        type: "success",
        title: "Admin created",
        description: `${payload.userId} can now log in from the same login page.`
      });
    } catch (err) {
      notify({ type: "error", title: "Could not create admin", description: err?.message || "Please try again." });
    } finally {
      setCreatingAdmin(false);
    }
  }

  return (
    <div className="min-h-screen bg-lightBg dark:bg-darkBg">
      <aside className="animate-rise-in fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white/95 px-5 py-6 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 lg:flex lg:flex-col">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-soft">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Admin Control</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Community Ops</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {dashboardNavigation.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goToSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <ThemeToggle />
          <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name || "Admin"}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email || user?.userId || "Administrator"}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="relative overflow-hidden px-4 pb-10 pt-5 sm:px-6 lg:pl-80 lg:pr-8 lg:pt-6">
        <div className="animate-drift pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_55%),radial-gradient(circle_at_top_left,rgba(147,51,234,0.10),transparent_45%)]" />

        <section id="overview" className="animate-rise-in mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-300">Admin Dashboard</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">Community Control Center</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Monitor students, manage tasks and sessions, and keep everyone engaged.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                onClick={async () => {
                  await loadAdminData({ withLoading: false });
                  notify({ type: "info", title: "Dashboard refreshed" });
                }}
              >
                Refresh
              </Button>
            </div>
          </div>

          {apiDown ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Backend API is not reachable. Start the server (`cd server && npm run dev`) to load live dashboard data.
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              [0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-32" />)
            ) : (
              <>
                <div className="animate-rise-in" style={{ animationDelay: "60ms" }}>
                  <StatCard label="Total Students" value={totalStudents} icon={UserRound} tone="blue" hint="Registered" />
                </div>
                <div className="animate-rise-in" style={{ animationDelay: "120ms" }}>
                  <StatCard label="Active Users" value={activeUsers} icon={Shield} tone="emerald" hint="Last 7 days" />
                </div>
                <div className="animate-rise-in" style={{ animationDelay: "180ms" }}>
                  <StatCard label="Completion Rate" value={`${completionRate}%`} icon={AlertTriangle} tone="purple" hint="All daily tasks" />
                </div>
                <div className="animate-rise-in" style={{ animationDelay: "240ms" }}>
                  <StatCard label="Tasks Completed" value={totalTasksDone} icon={CalendarPlus} tone="amber" hint="Total done" />
                </div>
              </>
            )}
          </div>
        </section>

        <section id="students" className="space-y-6">
          <SectionCard title="Student Table" subtitle="Search and filter learner performance in real time.">
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or email"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="At Risk">At Risk</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {loading ? (
              <div className="space-y-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-14" />)}</div>
            ) : filteredStudents.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                      <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Progress</th>
                      <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Tasks</th>
                      <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                      <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b border-slate-100 dark:border-slate-800/70">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{student.email}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="w-40">
                            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{student.progress}%</div>
                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                              <div className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600" style={{ width: `${student.progress}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{student.tasksCompleted}</td>
                        <td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeTone(student.status)}`}>{student.status}</span></td>
                        <td className="px-3 py-3"><Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setSelectedStudent(student)}>View Profile</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={Search} title="No students found" description="Try another search term or filter." />
            )}
          </SectionCard>
        </section>

        <section id="tasks" className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title={editingTaskId ? "Edit Task" : "Task Management"} subtitle="Add, edit, and delete assignment tasks.">
            <form className="space-y-3" onSubmit={submitTask}>
              <Input label="Task title" value={taskForm.title} onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="e.g. Build profile dashboard" />
              <Input label="Due date" type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Priority</label>
                <select value={taskForm.priority} onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingTaskId ? "Save Task" : "Add Task"}</Button>
                {editingTaskId ? <Button type="button" variant="ghost" onClick={() => { setEditingTaskId(""); setTaskForm({ title: "", dueDate: "", priority: "Medium" }); }}>Cancel</Button> : null}
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Task List" subtitle="Current managed tasks on platform.">
            {tasks.length ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due: {formatDate(task.dueDate)}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatAudience(task.assignedTo, task.targetGroup, task.targetStudentLabel)}</p>
                      </div>
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">{task.priority}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => editTask(task)}>Edit</Button>
                      <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deleteTask(task.backendId || task.id)}>Delete</Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={CalendarPlus} title="No tasks created" description="Create your first managed task." />
            )}
          </SectionCard>
        </section>

        <section id="sessions" className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title={editingSessionId ? "Edit Session" : "Session Management"} subtitle="Create upcoming live sessions for students.">
            <form className="space-y-3" onSubmit={submitSession}>
              <Input label="Session title" value={sessionForm.title} onChange={(event) => setSessionForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="e.g. React State Deep Dive" />
              <Input label="Date and time" type="datetime-local" value={sessionForm.date} onChange={(event) => setSessionForm((prev) => ({ ...prev, date: event.target.value }))} />
              <Input label="Meeting link" value={sessionForm.link} onChange={(event) => setSessionForm((prev) => ({ ...prev, link: event.target.value }))} placeholder="https://meet.google.com/..." />
              <div className="flex gap-2">
                <Button type="submit">{editingSessionId ? "Save Session" : "Create Session"}</Button>
                {editingSessionId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditingSessionId("");
                      setSessionForm({ title: "", date: "", link: "" });
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Upcoming Sessions" subtitle="Students can join these scheduled sessions.">
            {sessions.length ? (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <article key={session.id} className="rounded-xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{session.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(session.date)}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{session.target}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {session.link ? (
                          <Button className="px-3 py-1.5 text-xs" onClick={() => window.open(session.link, "_blank", "noopener,noreferrer")}>Join Link</Button>
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">No link</span>
                        )}
                        <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => editSession(session)}>
                          Edit
                        </Button>
                        <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deleteSession(session.backendId || session.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={CalendarPlus} title="No sessions yet" description="Use the form to create one." />
            )}
          </SectionCard>
        </section>

        <section id="announcements" className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title={editingAnnouncementId ? "Edit Announcement" : "Announcement System"} subtitle="Broadcast updates to all users or groups.">
            <form className="space-y-3" onSubmit={submitAnnouncement}>
              <Input as="textarea" label="Message" value={announcementForm.message} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, message: event.target.value }))} placeholder="Write your announcement..." />
              <Input label="Optional link" value={announcementForm.link} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, link: event.target.value }))} placeholder="https://docs.google.com/... or https://chat.whatsapp.com/..." />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Target</label>
                <select value={announcementForm.target} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, target: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="all">All users</option>
                  <option value="group">Specific group</option>
                </select>
              </div>
              {announcementForm.target === "group" ? <Input label="Group name" value={announcementForm.group} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, group: event.target.value }))} placeholder="e.g. Frontend Cohort A" /> : null}
              <div className="flex gap-2">
                <Button type="submit"><Mail className="h-4 w-4" />{editingAnnouncementId ? "Save Announcement" : "Send Announcement"}</Button>
                {editingAnnouncementId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditingAnnouncementId("");
                      setAnnouncementForm({ message: "", link: "", target: "all", group: "" });
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Recent Announcements" subtitle="Latest messages sent to students.">
            {announcements.length ? (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <article key={ann.id} className="rounded-xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{ann.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">{ann.type}</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{ann.target}</span>
                      <span>{ann.createdAt}</span>
                    </div>
                    {ann.link ? (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => window.open(ann.link, "_blank", "noopener,noreferrer")}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open Link
                          </Button>
                          <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => editAnnouncement(ann)}>
                            Edit
                          </Button>
                          <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deleteAnnouncement(ann.backendId || ann.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => editAnnouncement(ann)}>
                          Edit
                        </Button>
                        <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deleteAnnouncement(ann.backendId || ann.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={Mail} title="No announcements" description="Announcements sent from the form will show here." />
            )}
          </SectionCard>
        </section>

        <section id="groups" className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Community Link Manager" subtitle="Add WhatsApp or other community links for students.">
            <form className="space-y-3" onSubmit={submitGroup}>
              <Input label="Name" value={groupForm.name} onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="e.g. Frontend WhatsApp Cohort" />
              <Input label="Platform" value={groupForm.platform} onChange={(event) => setGroupForm((prev) => ({ ...prev, platform: event.target.value }))} placeholder="WhatsApp / Discord / Telegram / Meet" />
              <Input label="Description" value={groupForm.description} onChange={(event) => setGroupForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="What students will use this group for" />
              <Input label="Join link" value={groupForm.link} onChange={(event) => setGroupForm((prev) => ({ ...prev, link: event.target.value }))} placeholder="https://chat.whatsapp.com/..." />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Target</label>
                <select value={groupForm.target} onChange={(event) => setGroupForm((prev) => ({ ...prev, target: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="all">All students</option>
                  <option value="group">Specific group</option>
                  <option value="student">Specific student</option>
                </select>
              </div>
              {groupForm.target === "group" ? <Input label="Group name" value={groupForm.group} onChange={(event) => setGroupForm((prev) => ({ ...prev, group: event.target.value }))} placeholder="e.g. DSA Sprint Batch" /> : null}
              {groupForm.target === "student" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Student</label>
                  <select value={groupForm.student} onChange={(event) => setGroupForm((prev) => ({ ...prev, student: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    <option value="">Select student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>{student.name} ({student.email})</option>
                    ))}
                  </select>
                </div>
              ) : null}
              <Button type="submit">Publish Community Link</Button>
            </form>
          </SectionCard>

          <SectionCard title="Published Links" subtitle="These links appear in the student community panel.">
            {communityLinks.length ? (
              <div className="space-y-3">
                {communityLinks.map((group) => (
                  <article key={group.id} className="rounded-xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{group.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{group.platform} • {formatAudience(group.assignedTo, group.targetGroup, group.targetStudentLabel)}</p>
                        {group.description ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{group.description}</p> : null}
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{group.createdAt}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => window.open(group.link, "_blank", "noopener,noreferrer")}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </Button>
                        <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deleteGroup(group.backendId || group.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={Mail} title="No community links yet" description="Add your first WhatsApp or community link." />
            )}
          </SectionCard>
        </section>

        <section id="mock-slots" className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Mock Interview Slots" subtitle="Publish mock interview sessions for students.">
            <form className="space-y-3" onSubmit={submitMockInterview}>
              <Input label="Title" value={mockForm.title} onChange={(event) => setMockForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="e.g. Frontend Developer Mock Round" />
              <Input label="Role" value={mockForm.role} onChange={(event) => setMockForm((prev) => ({ ...prev, role: event.target.value }))} placeholder="e.g. React Developer" />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Difficulty</label>
                <select value={mockForm.difficulty} onChange={(event) => setMockForm((prev) => ({ ...prev, difficulty: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="hard">hard</option>
                </select>
              </div>
              <Input label="Date and time" type="datetime-local" value={mockForm.date} onChange={(event) => setMockForm((prev) => ({ ...prev, date: event.target.value }))} />
              <Input label="Meeting link" value={mockForm.link} onChange={(event) => setMockForm((prev) => ({ ...prev, link: event.target.value }))} placeholder="https://meet.google.com/..." />
              <Button type="submit">Publish Mock Slot</Button>
            </form>
          </SectionCard>

          <SectionCard title="Published Mock Slots" subtitle="Students can see these on the mock interview page.">
            {mockInterviews.length ? (
              <div className="space-y-3">
                {mockInterviews.map((interview) => (
                  <article key={interview._id} className="rounded-xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{interview.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{interview.role || "General"} • {interview.difficulty || "medium"}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(interview.scheduledFor)}</p>
                      </div>
                      <div className="flex gap-2">
                        {interview.meetingLink ? (
                          <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => window.open(interview.meetingLink, "_blank", "noopener,noreferrer")}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open
                          </Button>
                        ) : null}
                        <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deleteMockInterview(interview._id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={Mic} title="No mock slots published" description="Create a slot to make it visible in student mock interview." />
            )}
          </SectionCard>
        </section>

        <section id="practice-builder" className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Practice Module Publisher" subtitle="Create practice modules and auto-assign to all students.">
            <form className="space-y-3" onSubmit={submitPracticeModule}>
              <Input label="Skill name" value={practiceForm.skillName} onChange={(event) => setPracticeForm((prev) => ({ ...prev, skillName: event.target.value }))} placeholder="e.g. Data Structures" />
              <Input label="Subtopic" value={practiceForm.subtopic} onChange={(event) => setPracticeForm((prev) => ({ ...prev, subtopic: event.target.value }))} placeholder="e.g. Arrays and Two Pointers" />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Difficulty</label>
                <select value={practiceForm.difficulty} onChange={(event) => setPracticeForm((prev) => ({ ...prev, difficulty: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="hard">hard</option>
                </select>
              </div>
              <Input
                as="textarea"
                label="Tasks (one per line)"
                hint='Use "Task title | question-link" format when you want to attach a coding question URL.'
                value={practiceForm.tasksText}
                onChange={(event) => setPracticeForm((prev) => ({ ...prev, tasksText: event.target.value }))}
                placeholder={"Two Sum practice | leetcode.com/problems/two-sum/\nSliding window warmup | https://leetcode.com/problemset/"}
              />
              <Button type="submit">Publish Practice Module</Button>
            </form>
          </SectionCard>

          <SectionCard title="Published Practice Modules" subtitle="Students will see these in the practice page.">
            {practiceModules.length ? (
              <div className="space-y-3">
                {practiceModules.map((module) => (
                  <article key={module._id} className="rounded-xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{module.skillName}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{module.subtopic} • {module.difficulty}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{module.tasks?.length || 0} tasks</p>
                      </div>
                      <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deletePracticeModule(module._id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={Target} title="No practice modules yet" description="Publish a practice module to populate student practice." />
            )}
          </SectionCard>
        </section>

        <section id="project-reviews" className="mt-6">
          <SectionCard title="Student Projects" subtitle="Recent projects submitted by students.">
            {studentProjects.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {studentProjects.slice(0, 8).map((project) => (
                  <article key={project._id} className="rounded-xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{project.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{project.student?.name || project.student?.userId || "Student"} • {project.category || "portfolio"}</p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{project.summary}</p>
                      </div>
                      <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {project.githubUrl ? (
                        <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => window.open(project.githubUrl, "_blank", "noopener,noreferrer")}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Code
                        </Button>
                      ) : null}
                      {project.liveUrl ? (
                        <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => window.open(project.liveUrl, "_blank", "noopener,noreferrer")}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Live
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={BookOpen} title="No student projects yet" description="Student project submissions will appear here." />
            )}
          </SectionCard>
        </section>

        <section id="analytics" className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard title="User Growth" subtitle="Live totals from backend analytics.">
            {growthData.some((item) => item.value > 0) ? (
              <BarChart data={growthData} tone="blue" />
            ) : (
              <EmptyState icon={AlertTriangle} title="No growth data yet" description="As users and content are added, this chart will update." />
            )}
          </SectionCard>
          <SectionCard title="Engagement" subtitle="Active students and completion metrics.">
            {engagementData.some((item) => item.value > 0) ? (
              <BarChart data={engagementData} tone="purple" />
            ) : (
              <EmptyState icon={Target} title="No engagement data yet" description="Complete tasks or add activity to populate this chart." />
            )}
          </SectionCard>
        </section>

        <section id="admin-access" className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard title="Create Admin Login" subtitle="Create login credentials for a new admin.">
            {user?.isMainAdmin ? (
              <form className="space-y-3" onSubmit={submitAdminAccount}>
                <Input label="Full Name" value={adminForm.name} onChange={(event) => setAdminForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="e.g. Priya Verma" />
                <Input label="Email" type="email" value={adminForm.email} onChange={(event) => setAdminForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="admin@example.com" />
                <Input label="Phone" value={adminForm.phone} onChange={(event) => setAdminForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="e.g. 9876543210" />
                <Input label="Admin User ID" value={adminForm.userId} onChange={(event) => setAdminForm((prev) => ({ ...prev, userId: event.target.value }))} placeholder="e.g. admin_priya" />
                <Input label="Temporary Password" type="password" value={adminForm.password} onChange={(event) => setAdminForm((prev) => ({ ...prev, password: event.target.value }))} hint="Minimum 8 characters." autoComplete="new-password" />
                <Button type="submit" disabled={creatingAdmin}>{creatingAdmin ? "Creating..." : "Create Admin Account"}</Button>
              </form>
            ) : (
              <EmptyState icon={Shield} title="Main admin only" description="Only the main admin can create new admin login IDs and passwords." />
            )}
          </SectionCard>

          <SectionCard title="Credential Notes" subtitle="Keep the new account secure.">
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>New admins sign in from the same login page using the Admin User ID and password created here.</p>
              <p>Ask the new admin to change their password from profile after first login.</p>
              <p>Duplicate email, phone, or user ID is blocked automatically.</p>
            </div>
          </SectionCard>
        </section>

        <section id="settings" className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard title="Alerts" subtitle="Students who need intervention.">
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">No Task Activity</p>
                {noTaskActivityStudents.length ? <div className="space-y-2">{noTaskActivityStudents.map((s) => <div key={`inactive-${s.id}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"><p className="font-semibold text-amber-800 dark:text-amber-200">{s.name}</p><p className="text-amber-700/90 dark:text-amber-300">Completed 0 tasks so far</p></div>)}</div> : <EmptyState icon={Shield} title="No zero-task users" description="All listed students have task activity." />}
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Low-Performing Students</p>
                {lowPerformers.length ? <div className="space-y-2">{lowPerformers.map((s) => <div key={`low-${s.id}`} className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-500/30 dark:bg-rose-500/10"><p className="font-semibold text-rose-800 dark:text-rose-200">{s.name}</p><p className="text-rose-700/90 dark:text-rose-300">Progress at {s.progress}%</p></div>)}</div> : <EmptyState icon={Shield} title="No low performers" description="All students are above the risk threshold." />}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Settings" subtitle="Operational preferences.">
            <div className="space-y-3">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"><span className="text-sm font-medium text-slate-800 dark:text-slate-200">Email digest for admins</span><input type="checkbox" className="h-4 w-4 accent-blue-600" defaultChecked /></label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"><span className="text-sm font-medium text-slate-800 dark:text-slate-200">Auto-flag inactive users</span><input type="checkbox" className="h-4 w-4 accent-blue-600" defaultChecked /></label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"><span className="text-sm font-medium text-slate-800 dark:text-slate-200">Enable weekly leaderboards</span><input type="checkbox" className="h-4 w-4 accent-blue-600" /></label>
            </div>
          </SectionCard>
        </section>
      </main>

      <Modal isOpen={Boolean(selectedStudent)} onClose={() => setSelectedStudent(null)} title={selectedStudent ? `${selectedStudent.name} Profile` : "Student Profile"}>
        {selectedStudent ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-700 dark:text-slate-200">Progress</span><span className="font-bold text-slate-900 dark:text-slate-100">{selectedStudent.progress}%</span></div>
              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600" style={{ width: `${selectedStudent.progress}%` }} /></div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Weak Areas</p>
              {selectedStudent.weakAreas?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">{selectedStudent.weakAreas.map((area) => <span key={area} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">{area}</span>)}</div>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No weak areas recorded yet.</p>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Activity Timeline</p>
              {selectedStudent.timeline?.length ? (
                <div className="mt-2 space-y-2">{selectedStudent.timeline.map((event, index) => <div key={`${selectedStudent.id}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{event}</div>)}</div>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No timeline entries yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
