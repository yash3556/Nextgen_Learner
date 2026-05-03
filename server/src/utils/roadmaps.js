const { toYYYYMMDD } = require("./date");

const PREDEFINED_ROADMAPS = [
  {
    id: "dsa-cpp",
    source: "predefined",
    title: "DSA with C++",
    duration: "4 Weeks",
    difficulty: "Beginner â†’ Intermediate",
    tasks: [
      "Day 1: Arrays basics and problem warm-up",
      "Day 2: Two pointers & sliding window practice",
      "Day 3: Hashing problems (frequency, lookup)",
      "Day 4: Sorting + binary search patterns",
      "Day 5: Recursion & basic DP mindset",
      "Day 6: Practice set + review mistakes",
      "Day 7: Mock interview + optimize solutions"
    ]
  },
  {
    id: "web-dev",
    source: "predefined",
    title: "Web Development",
    duration: "3 Weeks",
    difficulty: "Beginner",
    tasks: [
      "Day 1: HTML/CSS fundamentals + layout practice",
      "Day 2: JavaScript DOM & events",
      "Day 3: Build a responsive component library",
      "Day 4: Intro to React + state management",
      "Day 5: APIs: fetch, loading, error handling",
      "Day 6: Authentication flow (basic)",
      "Day 7: Capstone mini-project + polish"
    ]
  },
  {
    id: "python",
    source: "predefined",
    title: "Python",
    duration: "2 Weeks",
    difficulty: "Beginner â†’ Intermediate",
    tasks: [
      "Day 1: Variables, loops, and functions",
      "Day 2: Data structures (list, dict, set)",
      "Day 3: File handling + small scripts",
      "Day 4: OOP basics + practice mini-app",
      "Day 5: Error handling + clean code habits",
      "Day 6: Problem-solving set",
      "Day 7: Review + write a summary notebook"
    ]
  },
  {
    id: "communication",
    source: "predefined",
    title: "Communication Skills",
    duration: "2 Weeks",
    difficulty: "Beginner",
    tasks: [
      "Day 1: 2-minute intro practice (record yourself)",
      "Day 2: Storytelling structure (STAR method)",
      "Day 3: Speak with clarity: pace + pauses",
      "Day 4: Q&A drill: answer 3 questions confidently",
      "Day 5: Presentation rehearsal + feedback loop",
      "Day 6: Group discussion prompts practice",
      "Day 7: Final recording + improvement plan"
    ]
  }
];

function sanitizeRoadmapInput(input) {
  if (!input || typeof input !== "object") return null;

  const requestedId = String(input.id || "").trim();
  const predefined = PREDEFINED_ROADMAPS.find((roadmap) => roadmap.id === requestedId);
  if (predefined) {
    return { ...predefined };
  }

  const tasks = Array.isArray(input.tasks)
    ? input.tasks.map((task) => String(task || "").trim()).filter(Boolean).slice(0, 21)
    : [];

  if (!tasks.length) return null;

  const title = String(input.title || "Custom Roadmap").trim() || "Custom Roadmap";

  return {
    id: requestedId || "custom",
    source: String(input.source || "custom").trim() || "custom",
    title: title.slice(0, 120),
    duration: String(input.duration || "Personalized").trim().slice(0, 80) || "Personalized",
    difficulty: String(input.difficulty || "Personalized").trim().slice(0, 80) || "Personalized",
    idea: String(input.idea || "").trim().slice(0, 400),
    tasks
  };
}

function normalizeRoadmapTasks(tasks = []) {
  return tasks
    .map((task, index) => {
      const raw = String(task || "").trim();
      if (!raw) return "";

      if (/^Day\s*\d+\s*:/i.test(raw)) return raw;
      return `Day ${index + 1}: ${raw}`;
    })
    .filter(Boolean);
}

function parseRoadmapTasks(tasks = []) {
  const dayMap = new Map();

  tasks.forEach((task) => {
    const raw = String(task || "").trim();
    if (!raw) return;

    const match = raw.match(/^Day\s*(\d+)\s*:\s*(.*)$/i);
    if (match) {
      const day = Number(match[1]);
      const text = match[2].trim();
      if (!dayMap.has(day)) dayMap.set(day, []);
      dayMap.get(day).push(text || raw);
      return;
    }

    const fallbackDay = dayMap.size + 1;
    if (!dayMap.has(fallbackDay)) dayMap.set(fallbackDay, []);
    dayMap.get(fallbackDay).push(raw);
  });

  return [...dayMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, taskTexts]) => ({
      day,
      taskTexts: taskTexts.filter(Boolean)
    }))
    .filter((entry) => entry.taskTexts.length);
}

function getRoadmapTopic(roadmap) {
  if (roadmap?.id === "communication") return "communication";
  if (roadmap?.id === "dsa-cpp") return "dsa";
  if (roadmap?.id === "python") return "python";
  if (roadmap?.id === "web-dev") return "web";

  const text = `${roadmap?.title || ""} ${(roadmap?.tasks || []).join(" ")}`.toLowerCase();
  if (/(communication|speaking|presentation)/.test(text)) return "communication";
  if (/(dsa|cpp|c\+\+|problem|binary search|array)/.test(text)) return "dsa";
  if (/(python|loop|function)/.test(text)) return "python";
  if (/(web|react|javascript|html|css)/.test(text)) return "web";
  return "general";
}

function getDayOffset(startedOn, date) {
  const start = new Date(`${startedOn}T00:00:00Z`);
  const current = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(current.getTime())) return 0;

  const diffMs = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function getActiveRoadmapContext(activeRoadmap, date = toYYYYMMDD(new Date())) {
  const roadmap = sanitizeRoadmapInput(activeRoadmap);
  if (!roadmap) return null;

  const days = parseRoadmapTasks(roadmap.tasks);
  if (!days.length) return null;

  const startedOn = String(activeRoadmap?.startedOn || date);
  const dayOffset = getDayOffset(startedOn, date);
  const dayEntry = days[Math.min(dayOffset, days.length - 1)];

  return {
    ...roadmap,
    startedOn,
    day: dayEntry.day,
    totalDays: days.length,
    taskTexts: dayEntry.taskTexts,
    topic: getRoadmapTopic(roadmap)
  };
}

module.exports = {
  PREDEFINED_ROADMAPS,
  sanitizeRoadmapInput,
  normalizeRoadmapTasks,
  parseRoadmapTasks,
  getRoadmapTopic,
  getActiveRoadmapContext
};
