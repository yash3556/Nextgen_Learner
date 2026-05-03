const Announcement = require("../models/Announcement");
const Task = require("../models/Task");
const MockInterview = require("../models/MockInterview");
const PracticeModule = require("../models/PracticeModule");
const PracticePlan = require("../models/PracticePlan");
const PracticeTaskSubmission = require("../models/PracticeTaskSubmission");
const StudentProject = require("../models/StudentProject");
const CommunityGroup = require("../models/CommunityGroup");
const { sanitizeUser } = require("../utils/auth");
const { buildExactCaseInsensitiveRegex, isValidUrl, normalizeHttpUrl, normalizeText } = require("../utils/validators");

const MAX_UPLOAD_FILES = 6;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "audio/webm",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg"
]);

function sanitizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, 30);
}

function normalizeProjectStatus(value) {
  const status = normalizeText(value).toLowerCase();
  if (["planning", "in_progress", "completed", "on_hold"].includes(status)) return status;
  return "planning";
}

function sanitizeDataUrl(value) {
  const dataUrl = String(value || "").trim();
  if (!dataUrl.startsWith("data:")) return "";
  return dataUrl;
}

function sanitizeUploadedFiles(rawFiles, { label = "files" } = {}) {
  if (rawFiles === undefined) return [];
  if (!Array.isArray(rawFiles)) {
    throw new Error(`${label} must be an array`);
  }
  if (rawFiles.length > MAX_UPLOAD_FILES) {
    throw new Error(`You can upload up to ${MAX_UPLOAD_FILES} files`);
  }

  return rawFiles.map((rawFile, index) => {
    const name = normalizeText(rawFile?.name) || `file-${index + 1}`;
    const mimeType = normalizeText(rawFile?.mimeType || rawFile?.type).toLowerCase();
    const size = Number(rawFile?.size);
    const dataUrl = sanitizeDataUrl(rawFile?.dataUrl);
    const uploadedAtRaw = normalizeText(rawFile?.uploadedAt);
    const uploadedAt = uploadedAtRaw ? new Date(uploadedAtRaw) : new Date();

    if (!mimeType || !ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
      throw new Error(`Unsupported file type for "${name}"`);
    }

    if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
      throw new Error(`"${name}" is too large. Max size is 2 MB`);
    }

    if (!dataUrl || !dataUrl.startsWith(`data:${mimeType};base64,`)) {
      throw new Error(`"${name}" has invalid file data`);
    }

    return {
      id: normalizeText(rawFile?.id) || `${Date.now()}-${index}-${Math.random().toString(16).slice(2, 8)}`,
      name,
      mimeType,
      size: Math.round(size),
      dataUrl,
      uploadedAt: Number.isNaN(uploadedAt.getTime()) ? new Date() : uploadedAt
    };
  });
}

function getCompletionMethod(answerLink, proofFiles) {
  const hasLink = Boolean(normalizeText(answerLink));
  const hasProof = Array.isArray(proofFiles) && proofFiles.length > 0;
  if (hasLink && hasProof) return "link_and_proof";
  if (hasLink) return "link";
  if (hasProof) return "proof";
  return "none";
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

function buildStudentTaskFilter(user) {
  const groups = [user?.course, user?.college].map(normalizeText).filter(Boolean);
  const filters = [{ assignedTo: "all" }, { assignedTo: "student", targetStudent: user?._id }];

  if (groups.length) {
    filters.push({
      assignedTo: "group",
      $or: groups.map((group) => ({
        targetGroup: buildExactCaseInsensitiveRegex(group)
      }))
    });
  }

  return { $or: filters };
}

function buildStudentAnnouncementFilter(user) {
  const groups = [user?.course, user?.college].map(normalizeText).filter(Boolean);
  const filters = [{ assignedTo: "all" }, { assignedTo: "student", targetStudent: user?._id }];

  if (groups.length) {
    filters.push({
      assignedTo: "group",
      $or: groups.map((group) => ({
        targetGroup: buildExactCaseInsensitiveRegex(group)
      }))
    });
  }

  return { $or: filters };
}

async function getStudentDashboard(req, res) {
  try {
    const [announcements, tasks] = await Promise.all([
      Announcement.find(buildStudentAnnouncementFilter(req.user))
        .populate("createdBy", "name userId")
        .populate("targetStudent", "name userId")
        .sort({ scheduledFor: 1, createdAt: -1 })
        .limit(25)
        .lean(),
      Task.find(buildStudentTaskFilter(req.user))
        .populate("targetStudent", "name userId")
        .sort({ deadline: 1, createdAt: -1 })
        .lean()
    ]);

    return res.json({
      user: sanitizeUser(req.user),
      announcements: announcements.map(formatAnnouncement),
      managedTasks: tasks
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to load student dashboard", error: error?.message });
  }
}

async function getAnnouncements(req, res) {
  try {
    const announcements = await Announcement.find(buildStudentAnnouncementFilter(req.user))
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ announcements: announcements.map(formatAnnouncement) });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch announcements", error: error?.message });
  }
}

async function requestMockInterview(req, res) {
  try {
    const role = normalizeText(req.body?.role || "General");
    const notes = normalizeText(req.body?.notes);
    const preferredAtRaw = normalizeText(req.body?.preferredAt);
    const meetingLink = normalizeHttpUrl(req.body?.meetingLink);
    const preferredAt = preferredAtRaw ? new Date(preferredAtRaw) : null;

    if (meetingLink && !isValidUrl(meetingLink)) {
      return res.status(400).json({ message: "Meeting link must be a valid http or https URL" });
    }

    if (preferredAt && Number.isNaN(preferredAt.getTime())) {
      return res.status(400).json({ message: "preferredAt must be a valid date/time" });
    }

    const title = `Interview Request - ${req.user?.name || req.user?.userId || "Student"} (${role || "General"})`;
    const description = notes || "Student requested a mock interview slot.";

    const announcement = await Announcement.create({
      title,
      type: "interview",
      description,
      link: meetingLink,
      scheduledFor: preferredAt,
      assignedTo: "student",
      targetStudent: req.user?._id || null,
      createdBy: req.user?._id
    });

    const saved = await Announcement.findById(announcement._id)
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId")
      .lean();

    return res.status(201).json({
      message: "Mock interview request sent",
      request: formatAnnouncement(saved)
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to send mock interview request", error: error?.message });
  }
}

// ============ STUDENT VIEW FOR ADMIN-CREATED CONTENT ============

function buildStudentFilter(user) {
  const groups = [user?.course, user?.college].map(normalizeText).filter(Boolean);
  const filters = [{ assignedTo: "all" }, { assignedTo: "student", targetStudent: user?._id }];

  if (groups.length) {
    filters.push({
      assignedTo: "group",
      $or: groups.map((group) => ({
        targetGroup: buildExactCaseInsensitiveRegex(group)
      }))
    });
  }

  return { $or: filters };
}

function isObjectIdLike(value) {
  return /^[a-fA-F0-9]{24}$/.test(normalizeText(value));
}

function formatPracticeTaskSubmission(submission) {
  return {
    _id: submission._id,
    moduleId: String(submission.module),
    taskIndex: submission.taskIndex,
    language: submission.language || "javascript",
    code: submission.code || "",
    answerLink: submission.answerLink || "",
    notes: submission.notes || "",
    proofFiles: Array.isArray(submission.proofFiles) ? submission.proofFiles : [],
    completionMethod: submission.completionMethod || "none",
    status: submission.status || "in_progress",
    submittedAt: submission.submittedAt || submission.updatedAt || submission.createdAt
  };
}

async function getMockInterviews(req, res) {
  try {
    const filter = {
      $or: [
        { assignedTo: "all" },
        { assignedTo: "student", targetStudent: req.user?._id }
      ]
    };

    // Add group filter
    const groups = [req.user?.course, req.user?.college].map(normalizeText).filter(Boolean);
    if (groups.length) {
      filter.$or.push({
        assignedTo: "group",
        $or: groups.map((group) => ({
          targetGroup: buildExactCaseInsensitiveRegex(group)
        }))
      });
    }

    const interviews = await MockInterview.find(filter)
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId")
      .sort({ scheduledFor: 1 })
      .lean();

    return res.json({ interviews });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch mock interviews", error: error?.message });
  }
}

async function getPracticeModules(req, res) {
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

async function getPracticePlans(req, res) {
  try {
    const filter = {
      isActive: true,
      $or: [
        { assignedTo: "all" },
        { assignedTo: "student", targetStudent: req.user?._id }
      ]
    };

    // Add group filter
    const groups = [req.user?.course, req.user?.college].map(normalizeText).filter(Boolean);
    if (groups.length) {
      filter.$or.push({
        assignedTo: "group",
        $or: groups.map((group) => ({
          targetGroup: buildExactCaseInsensitiveRegex(group)
        }))
      });
    }

    const plans = await PracticePlan.find(filter)
      .populate("module")
      .populate("createdBy", "name userId")
      .sort({ startsOn: -1 })
      .lean();

    return res.json({ plans });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch practice plans", error: error?.message });
  }
}

async function getPracticeTaskSubmissions(req, res) {
  try {
    const moduleId = normalizeText(req.query?.moduleId);
    if (moduleId && !isObjectIdLike(moduleId)) {
      return res.status(400).json({ message: "moduleId must be a valid id" });
    }

    const filter = { student: req.user?._id };
    if (moduleId) filter.module = moduleId;

    const submissions = await PracticeTaskSubmission.find(filter).sort({ updatedAt: -1 }).lean();
    return res.json({ submissions: submissions.map(formatPracticeTaskSubmission) });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch practice submissions", error: error?.message });
  }
}

async function submitPracticeTaskSubmission(req, res) {
  try {
    const moduleId = normalizeText(req.body?.moduleId);
    const taskIndexRaw = Number(req.body?.taskIndex);
    const taskIndex = Number.isInteger(taskIndexRaw) ? taskIndexRaw : -1;
    const language = normalizeText(req.body?.language || "javascript").toLowerCase();
    const hasCodeField = Object.prototype.hasOwnProperty.call(req.body || {}, "code");
    const code = hasCodeField ? String(req.body?.code || "") : "";
    const answerLink = normalizeHttpUrl(req.body?.answerLink);
    const notes = normalizeText(req.body?.notes);
    const done = req.body?.done !== false;
    const hasAnswerLink = Object.prototype.hasOwnProperty.call(req.body || {}, "answerLink");
    const hasProofFiles = Object.prototype.hasOwnProperty.call(req.body || {}, "proofFiles");
    let proofFiles = [];
    if (hasProofFiles) {
      try {
        proofFiles = sanitizeUploadedFiles(req.body?.proofFiles, { label: "proofFiles" });
      } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
      }
    }

    if (!moduleId || !isObjectIdLike(moduleId)) {
      return res.status(400).json({ message: "moduleId is required" });
    }

    if (taskIndex < 0) {
      return res.status(400).json({ message: "taskIndex must be a non-negative integer" });
    }

    if (answerLink && !isValidUrl(answerLink)) {
      return res.status(400).json({ message: "answerLink must be a valid http or https URL" });
    }

    const moduleDoc = await PracticeModule.findById(moduleId).select("tasks").lean();
    if (!moduleDoc) {
      return res.status(404).json({ message: "Practice module not found" });
    }

    const tasksCount = Array.isArray(moduleDoc.tasks) ? moduleDoc.tasks.length : 0;
    if (taskIndex >= tasksCount) {
      return res.status(400).json({ message: "taskIndex is out of range for this practice module" });
    }

    const existingSubmission = await PracticeTaskSubmission.findOne({
      student: req.user?._id,
      module: moduleDoc._id,
      taskIndex
    }).lean();

    const effectiveAnswerLink = hasAnswerLink ? answerLink : existingSubmission?.answerLink || "";
    const effectiveProofFiles = hasProofFiles
      ? proofFiles
      : Array.isArray(existingSubmission?.proofFiles)
        ? existingSubmission.proofFiles
        : [];
    const effectiveCode = hasCodeField ? code : existingSubmission?.code || "";

    if (done && !effectiveAnswerLink && !effectiveProofFiles.length && !normalizeText(effectiveCode)) {
      return res.status(400).json({ message: "Submit an answer link, code, or upload proof before marking as done" });
    }

    const updateSet = {
      notes,
      language: language || "javascript",
      status: done ? "done" : "in_progress",
      submittedAt: new Date(),
      completionMethod: getCompletionMethod(effectiveAnswerLink, effectiveProofFiles)
    };

    if (hasCodeField) {
      updateSet.code = code;
    } else if (!existingSubmission) {
      updateSet.code = "";
    }

    if (hasAnswerLink) {
      updateSet.answerLink = answerLink;
    } else if (!existingSubmission) {
      updateSet.answerLink = "";
    }

    if (hasProofFiles) {
      updateSet.proofFiles = proofFiles;
    } else if (!existingSubmission) {
      updateSet.proofFiles = [];
    }

    const submission = await PracticeTaskSubmission.findOneAndUpdate(
      {
        student: req.user?._id,
        module: moduleDoc._id,
        taskIndex
      },
      {
        $set: updateSet
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      message: done ? "Practice task marked as done" : "Practice task progress saved",
      submission: formatPracticeTaskSubmission(submission)
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to save practice submission", error: error?.message });
  }
}

// ============ STUDENT PROJECTS ============

async function getMyProjects(req, res) {
  try {
    const projects = await StudentProject.find({ student: req.user?._id })
      .populate("student", "name userId email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ projects });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch projects", error: error?.message });
  }
}

async function createProject(req, res) {
  try {
    const title = normalizeText(req.body?.title);
    const summary = normalizeText(req.body?.summary);
    const problemStatement = normalizeText(req.body?.problemStatement);
    const keyFeatures = sanitizeStringList(req.body?.keyFeatures);
    const stack = sanitizeStringList(req.body?.stack);
    const codeSnippet = String(req.body?.codeSnippet || "");
    const challenges = normalizeText(req.body?.challenges);
    const outcomes = normalizeText(req.body?.outcomes);
    const githubUrl = normalizeHttpUrl(req.body?.githubUrl);
    const liveUrl = normalizeHttpUrl(req.body?.liveUrl);
    const category = normalizeText(req.body?.category || "portfolio");
    const status = normalizeProjectStatus(req.body?.status);
    let attachments = [];
    try {
      attachments = sanitizeUploadedFiles(req.body?.attachments, { label: "attachments" });
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    if (!title || !summary) {
      return res.status(400).json({ message: "title and summary are required" });
    }

    if (githubUrl && !isValidUrl(githubUrl)) {
      return res.status(400).json({ message: "GitHub URL must be a valid http or https URL" });
    }

    if (liveUrl && !isValidUrl(liveUrl)) {
      return res.status(400).json({ message: "Live URL must be a valid http or https URL" });
    }

    const project = await StudentProject.create({
      student: req.user._id,
      title,
      summary,
      problemStatement,
      keyFeatures,
      stack,
      codeSnippet,
      challenges,
      outcomes,
      githubUrl: githubUrl || "",
      liveUrl: liveUrl || "",
      category,
      status,
      attachments
    });

    const saved = await StudentProject.findById(project._id)
      .populate("student", "name userId email");

    return res.status(201).json({
      message: "Project created",
      project: saved
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to create project", error: error?.message });
  }
}

async function updateProject(req, res) {
  try {
    const projectId = normalizeText(req.params?.projectId);
    if (!projectId) return res.status(400).json({ message: "projectId is required" });

    const hasTitle = Object.prototype.hasOwnProperty.call(req.body || {}, "title");
    const hasSummary = Object.prototype.hasOwnProperty.call(req.body || {}, "summary");
    const hasProblemStatement = Object.prototype.hasOwnProperty.call(req.body || {}, "problemStatement");
    const hasKeyFeatures = Object.prototype.hasOwnProperty.call(req.body || {}, "keyFeatures");
    const hasStack = Object.prototype.hasOwnProperty.call(req.body || {}, "stack");
    const hasCodeSnippet = Object.prototype.hasOwnProperty.call(req.body || {}, "codeSnippet");
    const hasChallenges = Object.prototype.hasOwnProperty.call(req.body || {}, "challenges");
    const hasOutcomes = Object.prototype.hasOwnProperty.call(req.body || {}, "outcomes");
    const hasGithubUrl = Object.prototype.hasOwnProperty.call(req.body || {}, "githubUrl");
    const hasLiveUrl = Object.prototype.hasOwnProperty.call(req.body || {}, "liveUrl");
    const hasCategory = Object.prototype.hasOwnProperty.call(req.body || {}, "category");
    const hasStatus = Object.prototype.hasOwnProperty.call(req.body || {}, "status");
    const hasAttachments = Object.prototype.hasOwnProperty.call(req.body || {}, "attachments");

    const title = normalizeText(req.body?.title);
    const summary = normalizeText(req.body?.summary);
    const problemStatement = normalizeText(req.body?.problemStatement);
    const keyFeatures = sanitizeStringList(req.body?.keyFeatures);
    const stack = sanitizeStringList(req.body?.stack);
    const codeSnippet = hasCodeSnippet ? String(req.body?.codeSnippet || "") : "";
    const challenges = normalizeText(req.body?.challenges);
    const outcomes = normalizeText(req.body?.outcomes);
    const githubUrl = normalizeHttpUrl(req.body?.githubUrl);
    const liveUrl = normalizeHttpUrl(req.body?.liveUrl);
    const category = normalizeText(req.body?.category);
    const status = normalizeProjectStatus(req.body?.status);
    let attachments = [];
    if (hasAttachments) {
      try {
        attachments = sanitizeUploadedFiles(req.body?.attachments, { label: "attachments" });
      } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
      }
    }

    // Verify ownership
    const existing = await StudentProject.findById(projectId).lean();
    if (!existing) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (existing.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this project" });
    }

    const updateData = {};
    if (hasTitle && !title) {
      return res.status(400).json({ message: "title cannot be empty" });
    }
    if (hasSummary && !summary) {
      return res.status(400).json({ message: "summary cannot be empty" });
    }
    if (hasTitle) updateData.title = title;
    if (hasSummary) updateData.summary = summary;
    if (hasProblemStatement) updateData.problemStatement = problemStatement;
    if (hasKeyFeatures) updateData.keyFeatures = keyFeatures;
    if (hasStack) updateData.stack = stack;
    if (hasCodeSnippet) updateData.codeSnippet = codeSnippet;
    if (hasChallenges) updateData.challenges = challenges;
    if (hasOutcomes) updateData.outcomes = outcomes;
    if (hasGithubUrl) updateData.githubUrl = githubUrl;
    if (hasLiveUrl) updateData.liveUrl = liveUrl;
    if (hasCategory) updateData.category = category;
    if (hasStatus) updateData.status = status;
    if (hasAttachments) updateData.attachments = attachments;

    if (hasGithubUrl && githubUrl && !isValidUrl(githubUrl)) {
      return res.status(400).json({ message: "GitHub URL must be a valid http or https URL" });
    }

    if (hasLiveUrl && liveUrl && !isValidUrl(liveUrl)) {
      return res.status(400).json({ message: "Live URL must be a valid http or https URL" });
    }

    const project = await StudentProject.findByIdAndUpdate(projectId, updateData, { new: true })
      .populate("student", "name userId email");

    return res.json({ message: "Project updated", project });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to update project", error: error?.message });
  }
}

async function deleteProject(req, res) {
  try {
    const projectId = normalizeText(req.params?.projectId);
    if (!projectId) return res.status(400).json({ message: "projectId is required" });

    // Verify ownership
    const existing = await StudentProject.findById(projectId).lean();
    if (!existing) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (existing.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this project" });
    }

    const project = await StudentProject.findByIdAndDelete(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    return res.json({ message: "Project deleted" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to delete project", error: error?.message });
  }
}

// ============ COMMUNITY GROUPS ============

async function getCommunityGroups(req, res) {
  try {
    const groups = await CommunityGroup.find({ isActive: true })
      .populate("createdBy", "name userId")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ groups });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch community groups", error: error?.message });
  }
}

module.exports = {
  getAnnouncements,
  getStudentDashboard,
  requestMockInterview,
  getMockInterviews,
  getPracticeModules,
  getPracticePlans,
  getPracticeTaskSubmissions,
  submitPracticeTaskSubmission,
  getMyProjects,
  createProject,
  updateProject,
  deleteProject,
  getCommunityGroups
};
