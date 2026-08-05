const { randomUUID } = require("crypto");
const express = require("express");

const DailyTask = require("../models/DailyTask");
const User = require("../models/User");
const { toYYYYMMDD } = require("../utils/date");
const { generateDailyTasks, enrichTasksForUser, syncTasksForToday } = require("../utils/generateDailyTasks");
const { getActiveRoadmapContext } = require("../utils/roadmaps");

const router = express.Router();

function sanitizeTaskText(value) {
  return String(value || "").trim();
}

function buildTaskResponse(taskDoc, user, date) {
  return {
    date,
    tasks: taskDoc.tasks || [],
    activeRoadmap: getActiveRoadmapContext(user?.activeRoadmap, date)
  };
}

async function getUser(userId) {
  if (!userId) return null;
  return User.findById(userId).lean();
}

async function getOrCreateTodayTaskDoc(user, date) {
  const userId = user?._id;
  const existing = await DailyTask.findOne({ user: userId, date });

  if (existing) {
    const syncedTasks = syncTasksForToday(existing.tasks || [], user, date);
    const hasChanged = JSON.stringify(existing.tasks) !== JSON.stringify(syncedTasks);

    if (hasChanged) {
      existing.tasks = syncedTasks;
      await existing.save();
    }

    return existing;
  }

  const tasks = generateDailyTasks(user, date);
  return DailyTask.create({ user: userId, date, tasks });
}

function buildEditedTask(task, updates) {
  const nextTask = {
    ...(typeof task?.toObject === "function" ? task.toObject() : task),
    ...updates
  };

  if (nextTask.source !== "roadmap") {
    nextTask.focusArea = "";
    nextTask.coachMode = "";
    nextTask.resources = [];
  }

  return enrichTasksForUser([nextTask])[0];
}

// GET /api/tasks/today
router.get("/today", async (req, res) => {
  try {
    const userId = req.user?._id;
    const date = toYYYYMMDD(new Date());
    const user = await getUser(userId);

    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const taskDoc = await getOrCreateTodayTaskDoc(user, date);
    return res.json(buildTaskResponse(taskDoc, user, date));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to get today tasks", error: err?.message });
  }
});

// POST /api/tasks/today
router.post("/today", async (req, res) => {
  try {
    const userId = req.user?._id;
    const date = toYYYYMMDD(new Date());
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const title = sanitizeTaskText(req.body?.title);
    const description = sanitizeTaskText(req.body?.description);

    if (!title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const taskDoc = await getOrCreateTodayTaskDoc(user, date);
    const newTask = enrichTasksForUser([
      {
        id: `user-${randomUUID()}`,
        title,
        description,
        completed: false,
        source: "user"
      }
    ])[0];

    taskDoc.tasks.push(newTask);
    await taskDoc.save();

    return res.status(201).json(buildTaskResponse(taskDoc, user, date));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to add task", error: err?.message });
  }
});

// PATCH /api/tasks/today/:taskId
router.patch("/today/:taskId", async (req, res) => {
  try {
    const userId = req.user?._id;
    const date = toYYYYMMDD(new Date());
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const taskId = sanitizeTaskText(req.params?.taskId);
    const title = sanitizeTaskText(req.body?.title);
    const description = sanitizeTaskText(req.body?.description);

    if (!taskId) return res.status(400).json({ message: "taskId is required" });
    if (!title) return res.status(400).json({ message: "Task title is required" });

    const taskDoc = await getOrCreateTodayTaskDoc(user, date);
    const idx = taskDoc.tasks.findIndex((task) => task.id === taskId);
    if (idx === -1) return res.status(404).json({ message: "Task not found" });

    taskDoc.tasks[idx] = buildEditedTask(taskDoc.tasks[idx], { title, description });
    await taskDoc.save();

    return res.json(buildTaskResponse(taskDoc, user, date));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to edit task", error: err?.message });
  }
});

// DELETE /api/tasks/today/:taskId
router.delete("/today/:taskId", async (req, res) => {
  try {
    const userId = req.user?._id;
    const date = toYYYYMMDD(new Date());
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const taskId = sanitizeTaskText(req.params?.taskId);
    if (!taskId) return res.status(400).json({ message: "taskId is required" });

    const taskDoc = await getOrCreateTodayTaskDoc(user, date);
    const task = taskDoc.tasks.find((item) => item.id === taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.source === "roadmap") {
      return res.status(400).json({ message: "Roadmap tasks stay synced here. Edit them instead of deleting them." });
    }

    taskDoc.tasks = taskDoc.tasks.filter((item) => item.id !== taskId);
    await taskDoc.save();

    return res.json(buildTaskResponse(taskDoc, user, date));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to delete task", error: err?.message });
  }
});

// POST /api/tasks/today/complete
router.post("/today/complete", async (req, res) => {
  try {
    const userId = req.user?._id;
    const date = toYYYYMMDD(new Date());
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const { taskId, completed } = req.body || {};
    if (!taskId) return res.status(400).json({ message: "taskId is required" });

    const taskDoc = await getOrCreateTodayTaskDoc(user, date);
    const idx = taskDoc.tasks.findIndex((task) => task.id === taskId);
    if (idx === -1) return res.status(404).json({ message: "Task not found" });

    taskDoc.tasks[idx].completed = Boolean(completed);
    await taskDoc.save();

    return res.json(buildTaskResponse(taskDoc, user, date));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to update task", error: err?.message });
  }
});

// GET /api/tasks/week
router.get("/week", async (req, res) => {
  try {
    const userId = req.user?._id;
    const end = new Date();
    const dates = [];

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      dates.push(toYYYYMMDD(d));
    }

    const docs = await DailyTask.find({ user: userId, date: { $in: dates } }).lean();
    const byDate = new Map(docs.map((doc) => [doc.date, doc]));

    const days = dates.map((date) => {
      const doc = byDate.get(date);
      const tasks = Array.isArray(doc?.tasks) ? doc.tasks : [];
      const total = tasks.length;
      const completed = tasks.filter((task) => task.completed).length;

      return {
        date,
        label: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
        total,
        completed,
        percent: total ? Math.round((completed / total) * 100) : 0
      };
    });

    let completed = 0;
    let total = 0;

    days.forEach((day) => {
      total += day.total;
      completed += day.completed;
    });

    return res.json({ completed, total, dates, days });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to get week progress", error: err?.message });
  }
});

module.exports = router;
