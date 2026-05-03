const Announcement = require("../models/Announcement");
const DailyTask = require("../models/DailyTask");
const Task = require("../models/Task");
const User = require("../models/User");
const MockInterview = require("../models/MockInterview");
const PracticeModule = require("../models/PracticeModule");
const PracticePlan = require("../models/PracticePlan");
const StudentProject = require("../models/StudentProject");
const { hashPassword, sanitizeUser } = require("../utils/auth");
const {
  buildExactCaseInsensitiveRegex,
  isStrongEnoughPassword,
  isValidEmail,
  isValidUrl,
  normalizeEmail,
  normalizeHttpUrl,
  normalizeText
} = require("../utils/validators");

const ANNOUNCEMENT_TYPES = new Set(["announcement", "live", "task", "interview"]);
const TASK_ASSIGNMENTS = new Set(["all", "group", "student"]);

function sanitizePracticeTasks(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((task) => {
      if (typeof task === "string") {
        const title = normalizeText(task);
        return title ? { title, estimatedMinutes: 25 } : null;
      }

      const title = normalizeText(task?.title);
      if (!title) return null;

      const estimatedMinutesRaw = Number(task?.estimatedMinutes);
      const estimatedMinutes = Number.isFinite(estimatedMinutesRaw)
        ? Math.max(5, Math.min(90, Math.round(estimatedMinutesRaw)))
        : 25;

      return {
        title,
        description: normalizeText(task?.description),
        hint: normalizeText(task?.hint),
        questionLink: normalizeHttpUrl(task?.questionLink),
        estimatedMinutes
      };
    })
    .filter(Boolean);
}

function formatAnnouncement(announcement) {
  return {
    _id: announcement._id,
    title: announcement.title,
    type: announcement.type,
    description: announcement.description,
    link: announcement.link,
    scheduledFor: announcement.scheduledFor,
    assignedTo: announcement.assignedTo,
    targetGroup: announcement.targetGroup,
    targetStudent: announcement.targetStudent
      ? {
          _id: announcement.targetStudent._id || announcement.targetStudent,
          name: announcement.targetStudent.name,
          userId: announcement.targetStudent.userId
        }
      : null,
    createdAt: announcement.createdAt,
    createdBy: announcement.createdBy
      ? {
          _id: announcement.createdBy._id,
          name: announcement.createdBy.name,
          userId: announcement.createdBy.userId
        }
      : null
  };
}

async function getStudents(req, res) {
  try {
    const students = await User.find({
      $or: [{ role: "student" }, { role: { $exists: false } }, { role: null }]
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    if (!students.length) {
      return res.json({ students: [] });
    }

    const studentIds = students.map((student) => student._id);
    const progressRows = await DailyTask.aggregate([
      { $match: { user: { $in: studentIds } } },
      {
        $project: {
          user: 1,
          completedCount: {
            $size: {
              $filter: {
                input: "$tasks",
                as: "task",
                cond: { $eq: ["$$task.completed", true] }
              }
            }
          },
          totalCount: { $size: "$tasks" }
        }
      },
      {
        $group: {
          _id: "$user",
          tasksCompleted: { $sum: "$completedCount" },
          tasksTotal: { $sum: "$totalCount" }
        }
      }
    ]);

    const progressByUserId = new Map(
      progressRows.map((row) => [
        String(row._id),
        {
          tasksCompleted: Number(row.tasksCompleted || 0),
          tasksTotal: Number(row.tasksTotal || 0)
        }
      ])
    );

    const enrichedStudents = students.map((student) => {
      const stats = progressByUserId.get(String(student._id)) || { tasksCompleted: 0, tasksTotal: 0 };
      const progressPercent = stats.tasksTotal ? Math.round((stats.tasksCompleted / stats.tasksTotal) * 100) : 0;
      return {
        ...student,
        tasksCompleted: stats.tasksCompleted,
        progressPercent
      };
    });

    return res.json({ students: enrichedStudents });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch students", error: error?.message });
  }
}

async function createAnnouncement(req, res) {
  try {
    const title = normalizeText(req.body?.title);
    const type = normalizeText(req.body?.type).toLowerCase();
    const description = normalizeText(req.body?.description);
    const link = normalizeHttpUrl(req.body?.link);
    const assignedTo = normalizeText(req.body?.assignedTo || "all").toLowerCase();
    const targetGroup = normalizeText(req.body?.targetGroup);
    const targetStudent = normalizeText(req.body?.targetStudent);
    const scheduledForRaw = normalizeText(req.body?.scheduledFor);
    const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw) : null;

    if (!title || !type) {
      return res.status(400).json({ message: "title and type are required" });
    }

    if (!ANNOUNCEMENT_TYPES.has(type)) {
      return res.status(400).json({ message: "type must be one of: announcement, live, task, interview" });
    }

    if (!TASK_ASSIGNMENTS.has(assignedTo)) {
      return res.status(400).json({ message: "assignedTo must be one of: all, group, student" });
    }

    if (assignedTo === "group" && !targetGroup) {
      return res.status(400).json({ message: "targetGroup is required when assignedTo is group" });
    }

    if (assignedTo === "student" && !targetStudent) {
      return res.status(400).json({ message: "targetStudent is required when assignedTo is student" });
    }

    if (link && !isValidUrl(link)) {
      return res.status(400).json({ message: "Please provide a valid http or https link" });
    }

    if (type === "live" && !scheduledFor) {
      return res.status(400).json({ message: "scheduledFor is required for live announcements" });
    }

    if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
      return res.status(400).json({ message: "scheduledFor must be a valid date" });
    }

    let targetStudentDoc = null;
    if (assignedTo === "student") {
      targetStudentDoc = await User.findOne({
        $or: [{ _id: targetStudent }, { userId: buildExactCaseInsensitiveRegex(targetStudent) }]
      }).lean();
      if (!targetStudentDoc) {
        return res.status(404).json({ message: "Target student not found" });
      }
    }

    const announcement = await Announcement.create({
      title,
      type,
      description,
      link,
      scheduledFor,
      assignedTo,
      targetGroup,
      targetStudent: targetStudentDoc?._id || null,
      createdBy: req.user._id
    });

    const saved = await Announcement.findById(announcement._id)
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId");
    return res.status(201).json({
      message: "Announcement created",
      announcement: formatAnnouncement(saved)
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to create announcement", error: error?.message });
  }
}

async function createTask(req, res) {
  try {
    const title = normalizeText(req.body?.title);
    const assignedTo = normalizeText(req.body?.assignedTo).toLowerCase();
    const targetGroup = normalizeText(req.body?.targetGroup);
    const targetStudent = normalizeText(req.body?.targetStudent);
    const priority = normalizeText(req.body?.priority || "Medium");
    const deadline = req.body?.deadline ? new Date(req.body.deadline) : null;

    if (!title || !assignedTo || !deadline) {
      return res.status(400).json({ message: "title, deadline and assignedTo are required" });
    }

    if (!TASK_ASSIGNMENTS.has(assignedTo)) {
      return res.status(400).json({ message: "assignedTo must be one of: all, group, student" });
    }

    if (Number.isNaN(deadline.getTime())) {
      return res.status(400).json({ message: "deadline must be a valid date" });
    }

    if (assignedTo === "group" && !targetGroup) {
      return res.status(400).json({ message: "targetGroup is required when assignedTo is group" });
    }

    let targetStudentDoc = null;
    if (assignedTo === "student") {
      if (!targetStudent) {
        return res.status(400).json({ message: "targetStudent is required when assignedTo is student" });
      }

      targetStudentDoc = await User.findOne({
        $or: [{ _id: targetStudent }, { userId: buildExactCaseInsensitiveRegex(targetStudent) }]
      }).lean();

      if (!targetStudentDoc) {
        return res.status(404).json({ message: "Target student not found" });
      }
    }

    const task = await Task.create({
      title,
      deadline,
      assignedTo,
      targetGroup,
      targetStudent: targetStudentDoc?._id || null,
      priority,
      createdBy: req.user._id
    });

    return res.status(201).json({
      message: "Task created",
      task
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to create task", error: error?.message });
  }
}

async function listAdminTasks(req, res) {
  try {
    const tasks = await Task.find()
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId")
      .sort({ deadline: 1, createdAt: -1 })
      .lean();

    return res.json({ tasks });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch tasks", error: error?.message });
  }
}

async function listAnnouncements(req, res) {
  try {
    const announcements = await Announcement.find()
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId")
      .sort({ scheduledFor: 1, createdAt: -1 })
      .lean();

    return res.json({ announcements: announcements.map(formatAnnouncement) });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch announcements", error: error?.message });
  }
}

async function updateAnnouncement(req, res) {
  try {
    const announcementId = normalizeText(req.params?.announcementId);
    if (!announcementId) return res.status(400).json({ message: "announcementId is required" });

    const title = normalizeText(req.body?.title);
    const type = normalizeText(req.body?.type).toLowerCase();
    const description = normalizeText(req.body?.description);
    const link = normalizeHttpUrl(req.body?.link);
    const assignedTo = normalizeText(req.body?.assignedTo || "all").toLowerCase();
    const targetGroup = normalizeText(req.body?.targetGroup);
    const targetStudent = normalizeText(req.body?.targetStudent);
    const scheduledForRaw = normalizeText(req.body?.scheduledFor);
    const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw) : null;

    if (!title || !type) {
      return res.status(400).json({ message: "title and type are required" });
    }

    if (!ANNOUNCEMENT_TYPES.has(type)) {
      return res.status(400).json({ message: "type must be one of: announcement, live, task, interview" });
    }

    if (!TASK_ASSIGNMENTS.has(assignedTo)) {
      return res.status(400).json({ message: "assignedTo must be one of: all, group, student" });
    }

    if (assignedTo === "group" && !targetGroup) {
      return res.status(400).json({ message: "targetGroup is required when assignedTo is group" });
    }

    if (assignedTo === "student" && !targetStudent) {
      return res.status(400).json({ message: "targetStudent is required when assignedTo is student" });
    }

    if (link && !isValidUrl(link)) {
      return res.status(400).json({ message: "Please provide a valid http or https link" });
    }

    if (type === "live" && !scheduledFor) {
      return res.status(400).json({ message: "scheduledFor is required for live announcements" });
    }

    if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
      return res.status(400).json({ message: "scheduledFor must be a valid date" });
    }

    let targetStudentDoc = null;
    if (assignedTo === "student") {
      targetStudentDoc = await User.findOne({
        $or: [{ _id: targetStudent }, { userId: buildExactCaseInsensitiveRegex(targetStudent) }]
      }).lean();
      if (!targetStudentDoc) {
        return res.status(404).json({ message: "Target student not found" });
      }
    }

    const announcement = await Announcement.findByIdAndUpdate(
      announcementId,
      {
        title,
        type,
        description,
        link,
        scheduledFor,
        assignedTo,
        targetGroup: assignedTo === "group" ? targetGroup : "",
        targetStudent: assignedTo === "student" ? targetStudentDoc?._id || null : null
      },
      { new: true }
    )
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId");

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    return res.json({
      message: "Announcement updated",
      announcement: formatAnnouncement(announcement)
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to update announcement", error: error?.message });
  }
}

async function deleteAnnouncement(req, res) {
  try {
    const announcementId = normalizeText(req.params?.announcementId);
    if (!announcementId) return res.status(400).json({ message: "announcementId is required" });

    const announcement = await Announcement.findByIdAndDelete(announcementId);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    return res.json({ message: "Announcement deleted" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to delete announcement", error: error?.message });
  }
}

async function updateTask(req, res) {
  try {
    const taskId = normalizeText(req.params?.taskId);
    if (!taskId) return res.status(400).json({ message: "taskId is required" });

    const title = normalizeText(req.body?.title);
    const assignedTo = normalizeText(req.body?.assignedTo).toLowerCase();
    const targetGroup = normalizeText(req.body?.targetGroup);
    const targetStudent = normalizeText(req.body?.targetStudent);
    const priority = normalizeText(req.body?.priority || "Medium");
    const deadline = req.body?.deadline ? new Date(req.body.deadline) : null;

    if (!title || !assignedTo || !deadline) {
      return res.status(400).json({ message: "title, deadline and assignedTo are required" });
    }

    if (!TASK_ASSIGNMENTS.has(assignedTo)) {
      return res.status(400).json({ message: "assignedTo must be one of: all, group, student" });
    }

    if (Number.isNaN(deadline.getTime())) {
      return res.status(400).json({ message: "deadline must be a valid date" });
    }

    if (assignedTo === "group" && !targetGroup) {
      return res.status(400).json({ message: "targetGroup is required when assignedTo is group" });
    }

    let targetStudentDoc = null;
    if (assignedTo === "student") {
      if (!targetStudent) {
        return res.status(400).json({ message: "targetStudent is required when assignedTo is student" });
      }

      targetStudentDoc = await User.findOne({
        $or: [{ _id: targetStudent }, { userId: buildExactCaseInsensitiveRegex(targetStudent) }]
      }).lean();

      if (!targetStudentDoc) {
        return res.status(404).json({ message: "Target student not found" });
      }
    }

    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        title,
        deadline,
        assignedTo,
        targetGroup,
        targetStudent: targetStudentDoc?._id || null,
        priority
      },
      { new: true }
    )
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json({ message: "Task updated", task });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to update task", error: error?.message });
  }
}

async function deleteTask(req, res) {
  try {
    const taskId = normalizeText(req.params?.taskId);
    if (!taskId) return res.status(400).json({ message: "taskId is required" });

    const task = await Task.findByIdAndDelete(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json({ message: "Task deleted" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to delete task", error: error?.message });
  }
}

async function createAdmin(req, res) {
  try {
    const name = normalizeText(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const phone = normalizeText(req.body?.phone);
    const userId = normalizeText(req.body?.userId);
    const password = normalizeText(req.body?.password);

    if (!name || !email || !phone || !userId || !password) {
      return res.status(400).json({ message: "name, email, phone, userId and password are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const existing = await User.findOne({
      $or: [{ email }, { phone }, { userId: buildExactCaseInsensitiveRegex(userId) }]
    });

    if (existing) {
      return res.status(409).json({ message: "An account with that email, phone, or userId already exists" });
    }

    const admin = await User.create({
      name,
      email,
      phone,
      userId,
      password: await hashPassword(password),
      role: "admin",
      isMainAdmin: false
    });

    return res.status(201).json({
      message: "Admin created successfully",
      admin: sanitizeUser(admin)
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to create admin", error: error?.message });
  }
}

async function getAnalytics(req, res) {
  try {
    const [studentCount, adminCount, announcementCount, managedTaskCount, activeUsers] = await Promise.all([
      User.countDocuments({ $or: [{ role: "student" }, { role: { $exists: false } }, { role: null }] }),
      User.countDocuments({ role: "admin" }),
      Announcement.countDocuments(),
      Task.countDocuments(),
      DailyTask.distinct("user", { updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
    ]);

    const progressRows = await DailyTask.aggregate([
      {
        $project: {
          completedCount: {
            $size: {
              $filter: {
                input: "$tasks",
                as: "task",
                cond: { $eq: ["$$task.completed", true] }
              }
            }
          },
          totalCount: { $size: "$tasks" }
        }
      },
      {
        $group: {
          _id: null,
          completedTasks: { $sum: "$completedCount" },
          totalTasks: { $sum: "$totalCount" }
        }
      }
    ]);

    const progress = progressRows[0] || { completedTasks: 0, totalTasks: 0 };

    return res.json({
      totals: {
        students: studentCount,
        admins: adminCount,
        announcements: announcementCount,
        managedTasks: managedTaskCount
      },
      progress: {
        completedTasks: progress.completedTasks,
        totalTasks: progress.totalTasks,
        completionRate: progress.totalTasks ? Math.round((progress.completedTasks / progress.totalTasks) * 100) : 0
      },
      activity: {
        activeStudentsLast7Days: activeUsers.length
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch analytics", error: error?.message });
  }
}

// ============ MOCK INTERVIEW ADMIN FUNCTIONS ============

async function createMockInterview(req, res) {
  try {
    const title = normalizeText(req.body?.title);
    const role = normalizeText(req.body?.role || "General");
    const difficulty = normalizeText(req.body?.difficulty || "medium").toLowerCase();
    const mode = normalizeText(req.body?.mode || "live").toLowerCase();
    const assignedTo = normalizeText(req.body?.assignedTo || "all").toLowerCase();
    const targetGroup = normalizeText(req.body?.targetGroup);
    const targetStudent = normalizeText(req.body?.targetStudent);
    const interviewerName = normalizeText(req.body?.interviewerName || "AI Interviewer");
    const scheduledForRaw = normalizeText(req.body?.scheduledFor);
    const meetingLink = normalizeHttpUrl(req.body?.meetingLink);

    if (!title || !scheduledForRaw) {
      return res.status(400).json({ message: "title and scheduledFor are required" });
    }

    const scheduledFor = new Date(scheduledForRaw);
    if (Number.isNaN(scheduledFor.getTime())) {
      return res.status(400).json({ message: "scheduledFor must be a valid date" });
    }

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ message: "difficulty must be one of: easy, medium, hard" });
    }

    if (!["ai", "live"].includes(mode)) {
      return res.status(400).json({ message: "mode must be one of: ai, live" });
    }

    if (!["all", "group", "student"].includes(assignedTo)) {
      return res.status(400).json({ message: "assignedTo must be one of: all, group, student" });
    }

    if (assignedTo === "group" && !targetGroup) {
      return res.status(400).json({ message: "targetGroup is required when assignedTo is group" });
    }

    if (meetingLink && !isValidUrl(meetingLink)) {
      return res.status(400).json({ message: "meetingLink must be a valid http or https link" });
    }

    let targetStudentDoc = null;
    if (assignedTo === "student") {
      if (!targetStudent) {
        return res.status(400).json({ message: "targetStudent is required when assignedTo is student" });
      }
      targetStudentDoc = await User.findOne({
        $or: [{ _id: targetStudent }, { userId: buildExactCaseInsensitiveRegex(targetStudent) }]
      }).lean();
      if (!targetStudentDoc) {
        return res.status(404).json({ message: "Target student not found" });
      }
    }

    const interview = await MockInterview.create({
      title,
      role,
      difficulty,
      mode,
      assignedTo,
      targetGroup: assignedTo === "group" ? targetGroup : "",
      targetStudent: targetStudentDoc?._id || null,
      interviewerName,
      scheduledFor,
      meetingLink: meetingLink || "",
      createdBy: req.user._id
    });

    const saved = await MockInterview.findById(interview._id)
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId");

    return res.status(201).json({
      message: "Mock interview created",
      interview: saved
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to create mock interview", error: error?.message });
  }
}

async function listMockInterviews(req, res) {
  try {
    const interviews = await MockInterview.find()
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId")
      .sort({ scheduledFor: -1, createdAt: -1 })
      .lean();

    return res.json({ interviews });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch mock interviews", error: error?.message });
  }
}

async function updateMockInterview(req, res) {
  try {
    const interviewId = normalizeText(req.params?.interviewId);
    if (!interviewId) return res.status(400).json({ message: "interviewId is required" });

    const body = req.body || {};
    const title = normalizeText(body.title);
    const role = normalizeText(body.role);
    const difficulty = normalizeText(body.difficulty).toLowerCase();
    const mode = normalizeText(body.mode).toLowerCase();
    const assignedTo = normalizeText(body.assignedTo).toLowerCase();
    const targetGroup = normalizeText(body.targetGroup);
    const interviewerName = normalizeText(body.interviewerName);
    const scheduledForRaw = normalizeText(body.scheduledFor);
    const hasMeetingLink = Object.prototype.hasOwnProperty.call(body, "meetingLink");
    const meetingLink = hasMeetingLink ? normalizeHttpUrl(body.meetingLink) : "";
    const status = normalizeText(body.status).toLowerCase();
    const hasSummary = Object.prototype.hasOwnProperty.call(body, "summary");
    const summary = hasSummary ? normalizeText(body.summary) : "";
    const hasFeedback = Object.prototype.hasOwnProperty.call(body, "feedback");
    const feedback = hasFeedback ? normalizeText(body.feedback) : "";
    const hasManualFeedback = Object.prototype.hasOwnProperty.call(body, "manualFeedback");
    const manualFeedback = hasManualFeedback ? normalizeText(body.manualFeedback) : "";

    const updateData = {};
    if (title) updateData.title = title;
    if (role) updateData.role = role;
    if (difficulty && ["easy", "medium", "hard"].includes(difficulty)) updateData.difficulty = difficulty;
    if (mode && ["ai", "live"].includes(mode)) updateData.mode = mode;
    if (assignedTo && ["all", "group", "student"].includes(assignedTo)) updateData.assignedTo = assignedTo;
    if (targetGroup) updateData.targetGroup = targetGroup;
    if (interviewerName) updateData.interviewerName = interviewerName;
    if (scheduledForRaw) {
      const scheduledFor = new Date(scheduledForRaw);
      if (!Number.isNaN(scheduledFor.getTime())) {
        updateData.scheduledFor = scheduledFor;
      }
    }
    if (hasMeetingLink) {
      if (meetingLink && !isValidUrl(meetingLink)) {
        return res.status(400).json({ message: "meetingLink must be a valid http or https link" });
      }
      updateData.meetingLink = meetingLink;
    }
    if (status && ["scheduled", "completed", "pending"].includes(status)) updateData.status = status;
    if (hasSummary) updateData.summary = summary;
    if (hasFeedback) updateData.feedback = feedback;
    if (hasManualFeedback) updateData.manualFeedback = manualFeedback;

    const interview = await MockInterview.findByIdAndUpdate(interviewId, updateData, { new: true })
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId");

    if (!interview) {
      return res.status(404).json({ message: "Mock interview not found" });
    }

    return res.json({ message: "Mock interview updated", interview });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to update mock interview", error: error?.message });
  }
}

async function deleteMockInterview(req, res) {
  try {
    const interviewId = normalizeText(req.params?.interviewId);
    if (!interviewId) return res.status(400).json({ message: "interviewId is required" });

    const interview = await MockInterview.findByIdAndDelete(interviewId);
    if (!interview) {
      return res.status(404).json({ message: "Mock interview not found" });
    }

    return res.json({ message: "Mock interview deleted" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to delete mock interview", error: error?.message });
  }
}

// ============ PRACTICE MODULE ADMIN FUNCTIONS ============

async function createPracticeModule(req, res) {
  try {
    const skillName = normalizeText(req.body?.skillName);
    const subtopic = normalizeText(req.body?.subtopic);
    const difficulty = normalizeText(req.body?.difficulty || "medium").toLowerCase();
    const tasks = sanitizePracticeTasks(req.body?.tasks || []);

    if (!skillName || !subtopic) {
      return res.status(400).json({ message: "skillName and subtopic are required" });
    }

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ message: "difficulty must be one of: easy, medium, hard" });
    }

    const invalidTask = tasks.find((task) => task.questionLink && !isValidUrl(task.questionLink));
    if (invalidTask) {
      return res.status(400).json({ message: `Invalid question link for task "${invalidTask.title}"` });
    }

    const module = await PracticeModule.create({
      skillName,
      subtopic,
      difficulty,
      tasks,
      createdBy: req.user._id
    });

    const saved = await PracticeModule.findById(module._id)
      .populate("createdBy", "name userId");

    return res.status(201).json({
      message: "Practice module created",
      module: saved
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to create practice module", error: error?.message });
  }
}

async function listPracticeModules(req, res) {
  try {
    const modules = await PracticeModule.find({ isActive: true })
      .populate("createdBy", "name userId")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ modules });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch practice modules", error: error?.message });
  }
}

async function updatePracticeModule(req, res) {
  try {
    const moduleId = normalizeText(req.params?.moduleId);
    if (!moduleId) return res.status(400).json({ message: "moduleId is required" });

    const skillName = normalizeText(req.body?.skillName);
    const subtopic = normalizeText(req.body?.subtopic);
    const difficulty = normalizeText(req.body?.difficulty)?.toLowerCase();
    const tasks = req.body?.tasks;
    const isActive = req.body?.isActive;

    const updateData = {};
    if (skillName) updateData.skillName = skillName;
    if (subtopic) updateData.subtopic = subtopic;
    if (difficulty && ["easy", "medium", "hard"].includes(difficulty)) updateData.difficulty = difficulty;
    if (tasks) {
      const normalizedTasks = sanitizePracticeTasks(tasks);
      const invalidTask = normalizedTasks.find((task) => task.questionLink && !isValidUrl(task.questionLink));
      if (invalidTask) {
        return res.status(400).json({ message: `Invalid question link for task "${invalidTask.title}"` });
      }
      updateData.tasks = normalizedTasks;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const module = await PracticeModule.findByIdAndUpdate(moduleId, updateData, { new: true })
      .populate("createdBy", "name userId");

    if (!module) {
      return res.status(404).json({ message: "Practice module not found" });
    }

    return res.json({ message: "Practice module updated", module });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to update practice module", error: error?.message });
  }
}

async function deletePracticeModule(req, res) {
  try {
    const moduleId = normalizeText(req.params?.moduleId);
    if (!moduleId) return res.status(400).json({ message: "moduleId is required" });

    // Soft delete - just mark as inactive
    const module = await PracticeModule.findByIdAndUpdate(moduleId, { isActive: false }, { new: true });
    if (!module) {
      return res.status(404).json({ message: "Practice module not found" });
    }

    return res.json({ message: "Practice module deleted" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to delete practice module", error: error?.message });
  }
}

// ============ PRACTICE PLAN ADMIN FUNCTIONS ============

async function createPracticePlan(req, res) {
  try {
    const moduleId = normalizeText(req.body?.moduleId);
    const assignedTo = normalizeText(req.body?.assignedTo || "all").toLowerCase();
    const targetGroup = normalizeText(req.body?.targetGroup);
    const targetStudent = normalizeText(req.body?.targetStudent);
    const startsOnRaw = normalizeText(req.body?.startsOn);

    if (!moduleId) {
      return res.status(400).json({ message: "moduleId is required" });
    }

    if (!["all", "group", "student"].includes(assignedTo)) {
      return res.status(400).json({ message: "assignedTo must be one of: all, group, student" });
    }

    const moduleDoc = await PracticeModule.findById(moduleId).lean();
    if (!moduleDoc) {
      return res.status(404).json({ message: "Practice module not found" });
    }

    let targetStudentDoc = null;
    if (assignedTo === "student") {
      if (!targetStudent) {
        return res.status(400).json({ message: "targetStudent is required when assignedTo is student" });
      }
      targetStudentDoc = await User.findOne({
        $or: [{ _id: targetStudent }, { userId: buildExactCaseInsensitiveRegex(targetStudent) }]
      }).lean();
      if (!targetStudentDoc) {
        return res.status(404).json({ message: "Target student not found" });
      }
    }

    const plan = await PracticePlan.create({
      module: moduleDoc._id,
      assignedTo,
      targetGroup: assignedTo === "group" ? targetGroup : "",
      targetStudent: targetStudentDoc?._id || null,
      startsOn: startsOnRaw ? new Date(startsOnRaw) : new Date(),
      createdBy: req.user._id
    });

    const saved = await PracticePlan.findById(plan._id)
      .populate("module")
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId");

    return res.status(201).json({
      message: "Practice plan created",
      plan: saved
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to create practice plan", error: error?.message });
  }
}

async function listPracticePlans(req, res) {
  try {
    const plans = await PracticePlan.find({ isActive: true })
      .populate("module")
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ plans });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch practice plans", error: error?.message });
  }
}

async function deletePracticePlan(req, res) {
  try {
    const planId = normalizeText(req.params?.planId);
    if (!planId) return res.status(400).json({ message: "planId is required" });

    const plan = await PracticePlan.findByIdAndUpdate(planId, { isActive: false }, { new: true });
    if (!plan) {
      return res.status(404).json({ message: "Practice plan not found" });
    }

    return res.json({ message: "Practice plan deleted" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to delete practice plan", error: error?.message });
  }
}

// ============ STUDENT PROJECT ADMIN FUNCTIONS ============

async function listStudentProjects(req, res) {
  try {
    const studentId = normalizeText(req.query?.studentId);
    const filter = studentId ? { student: studentId } : {};

    const projects = await StudentProject.find(filter)
      .populate("student", "name userId email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ projects });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch student projects", error: error?.message });
  }
}

async function updateStudentProject(req, res) {
  try {
    const projectId = normalizeText(req.params?.projectId);
    if (!projectId) return res.status(400).json({ message: "projectId is required" });

    const title = normalizeText(req.body?.title);
    const summary = normalizeText(req.body?.summary);
    const stack = req.body?.stack;
    const hasCodeSnippet = Object.prototype.hasOwnProperty.call(req.body || {}, "codeSnippet");
    const codeSnippet = hasCodeSnippet ? String(req.body?.codeSnippet || "") : "";
    const githubUrl = normalizeText(req.body?.githubUrl);
    const liveUrl = normalizeText(req.body?.liveUrl);
    const category = normalizeText(req.body?.category);
    const feedback = req.body?.feedback;

    const updateData = {};
    if (title) updateData.title = title;
    if (summary) updateData.summary = summary;
    if (stack) updateData.stack = stack;
    if (hasCodeSnippet) updateData.codeSnippet = codeSnippet;
    if (githubUrl !== undefined) updateData.githubUrl = githubUrl;
    if (liveUrl !== undefined) updateData.liveUrl = liveUrl;
    if (category) updateData.category = category;
    if (feedback) {
      const newFeedback = {
        authorName: req.user?.name || "Admin",
        comment: feedback,
        createdAt: new Date()
      };
      const project = await StudentProject.findById(projectId).lean();
      if (project) {
        updateData.feedbacks = [...(project.feedbacks || []), newFeedback];
      }
    }

    const project = await StudentProject.findByIdAndUpdate(projectId, updateData, { new: true })
      .populate("student", "name userId email");

    if (!project) {
      return res.status(404).json({ message: "Student project not found" });
    }

    return res.json({ message: "Student project updated", project });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to update student project", error: error?.message });
  }
}

async function deleteStudentProject(req, res) {
  try {
    const projectId = normalizeText(req.params?.projectId);
    if (!projectId) return res.status(400).json({ message: "projectId is required" });

    const project = await StudentProject.findByIdAndDelete(projectId);
    if (!project) {
      return res.status(404).json({ message: "Student project not found" });
    }

    return res.json({ message: "Student project deleted" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to delete student project", error: error?.message });
  }
}

module.exports = {
  createAdmin,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  createTask,
  deleteTask,
  getAnalytics,
  getStudents,
  listAnnouncements,
  listAdminTasks,
  updateTask,
  // New endpoints
  createMockInterview,
  listMockInterviews,
  updateMockInterview,
  deleteMockInterview,
  createPracticeModule,
  listPracticeModules,
  updatePracticeModule,
  deletePracticeModule,
  createPracticePlan,
  listPracticePlans,
  deletePracticePlan,
  listStudentProjects,
  updateStudentProject,
  deleteStudentProject
};
