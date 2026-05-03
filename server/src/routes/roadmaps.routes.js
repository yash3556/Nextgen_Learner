const express = require("express");

const DailyTask = require("../models/DailyTask");
const User = require("../models/User");
const { toYYYYMMDD } = require("../utils/date");
const { syncTasksForToday } = require("../utils/generateDailyTasks");
const { generateRoadmapFromIdea } = require("../utils/aiTeacher");
const {
  PREDEFINED_ROADMAPS,
  sanitizeRoadmapInput,
  normalizeRoadmapTasks,
  getActiveRoadmapContext
} = require("../utils/roadmaps");

function normalizeLowerList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((s) => String(s).toLowerCase());
}

function includesAny(list, keywords) {
  const hay = normalizeLowerList(list).join(" ");
  return keywords.some((k) => hay.includes(k));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildSavedRoadmap(rawRoadmap, overrides = {}) {
  const sanitized = sanitizeRoadmapInput(rawRoadmap);
  if (!sanitized) return null;

  return {
    ...sanitized,
    ...overrides,
    tasks: normalizeRoadmapTasks(overrides.tasks || sanitized.tasks || [])
  };
}

function buildCombinedRoadmaps(user) {
  const customRoadmaps = (user?.customRoadmaps || [])
    .map((roadmap) => buildSavedRoadmap(roadmap, { source: "custom" }))
    .filter(Boolean);

  return [...customRoadmaps, ...PREDEFINED_ROADMAPS];
}

function buildActiveRoadmapResponse(user, date = toYYYYMMDD(new Date())) {
  const sanitizedRoadmap = sanitizeRoadmapInput(user?.activeRoadmap);

  return {
    roadmap: sanitizedRoadmap
      ? {
          ...sanitizedRoadmap,
          startedOn: user?.activeRoadmap?.startedOn || date
        }
      : null,
    currentStep: getActiveRoadmapContext(user?.activeRoadmap, date)
  };
}

async function syncTodayTasksForRoadmap(user, date) {
  const taskDoc = await DailyTask.findOne({ user: user?._id, date });
  if (!taskDoc) return;

  const syncedTasks = syncTasksForToday(taskDoc.tasks || [], user, date);
  const hasChanged = JSON.stringify(taskDoc.tasks) !== JSON.stringify(syncedTasks);

  if (hasChanged) {
    taskDoc.tasks = syncedTasks;
    await taskDoc.save();
  }
}

function buildProfileBasedRoadmap(user) {
  const weaknesses = user?.weaknesses || [];
  const interests = user?.interests || [];
  const selected = [];

  if (includesAny(weaknesses, ["communication", "speak", "presentation"])) {
    selected.push(PREDEFINED_ROADMAPS.find((roadmap) => roadmap.id === "communication"));
  }
  if (includesAny(interests, ["dsa", "c++", "cpp"])) {
    selected.push(PREDEFINED_ROADMAPS.find((roadmap) => roadmap.id === "dsa-cpp"));
  }
  if (includesAny(interests, ["python"])) {
    selected.push(PREDEFINED_ROADMAPS.find((roadmap) => roadmap.id === "python"));
  }
  if (includesAny(interests, ["web", "react", "javascript"]) || (user?.course || "").toLowerCase().includes("web")) {
    selected.push(PREDEFINED_ROADMAPS.find((roadmap) => roadmap.id === "web-dev"));
  }

  const cleaned = selected.filter(Boolean);
  const modules = cleaned.length ? cleaned : [PREDEFINED_ROADMAPS.find((roadmap) => roadmap.id === "web-dev")];

  const combinedTasks = [];
  modules.forEach((module) => {
    module.tasks.slice(0, 4).forEach((task) => combinedTasks.push(task));
  });

  const unique = combinedTasks.filter(Boolean).slice(0, 7);
  while (unique.length < 7) unique.push("Practice + review (custom)");

  const durationHint =
    modules.length === 1
      ? modules[0].duration
      : `${modules.length + 2} Weeks (personalized)`;

  return {
    title: "Your Custom Roadmap",
    duration: durationHint,
    difficulty: "Personalized",
    tasks: unique.map((task, index) => {
      const cleanedText = String(task).replace(/^Day\s*\d+:\s*/i, "").trim();
      return `Day ${index + 1}: ${cleanedText}`;
    })
  };
}

const router = express.Router();

// GET /api/roadmaps/predefined
router.get("/predefined", async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    return res.json({
      roadmaps: buildCombinedRoadmaps(user)
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load roadmaps", error: err?.message });
  }
});

// GET /api/roadmaps/active
router.get("/active", async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    return res.json(buildActiveRoadmapResponse(user));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load active roadmap", error: err?.message });
  }
});

// POST /api/roadmaps/active
router.post("/active", async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const roadmap = sanitizeRoadmapInput(req.body?.roadmap);
    if (!roadmap) return res.status(400).json({ message: "A valid roadmap is required" });

    const startedOn = toYYYYMMDD(new Date());
    user.activeRoadmap = {
      ...roadmap,
      startedOn
    };
    await user.save();

    const savedUser = user.toObject();
    await syncTodayTasksForRoadmap(savedUser, startedOn);

    return res.json(buildActiveRoadmapResponse(savedUser, startedOn));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to activate roadmap", error: err?.message });
  }
});

// POST /api/roadmaps/custom
router.post("/custom", async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const idea = String(req.body?.idea || "").trim();
    const aiRoadmap = idea
      ? await generateRoadmapFromIdea({ idea, user: user.toObject() })
      : buildProfileBasedRoadmap(user.toObject());

    const savedRoadmap = buildSavedRoadmap(
      {
        id: `custom-${slugify(aiRoadmap.title || idea || "roadmap")}-${Date.now().toString(36)}`,
        source: "custom",
        idea,
        title: aiRoadmap.title || "Custom Roadmap",
        duration: aiRoadmap.duration || "Personalized",
        difficulty: aiRoadmap.difficulty || "Personalized",
        tasks: aiRoadmap.tasks || []
      },
      { source: "custom", idea }
    );

    if (!savedRoadmap) {
      return res.status(500).json({ message: "Could not build a roadmap from that idea." });
    }

    user.customRoadmaps = [savedRoadmap, ...(user.customRoadmaps || [])].slice(0, 12);
    await user.save();

    return res.status(201).json({
      roadmap: savedRoadmap,
      roadmaps: buildCombinedRoadmaps(user.toObject())
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to generate custom roadmap", error: err?.message });
  }
});

module.exports = router;
