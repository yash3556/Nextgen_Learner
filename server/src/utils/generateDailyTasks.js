const { toYYYYMMDD, pickDeterministic } = require("./date");
const { getActiveRoadmapContext } = require("./roadmaps");

function normalizeLowerList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((s) => String(s).toLowerCase());
}

function includesAny(list, keywords) {
  const hay = normalizeLowerList(list).join(" ");
  return keywords.some((k) => hay.includes(k));
}

function buildResources({ focusArea, coachMode }) {
  const resources = [];

  if (focusArea === "communication") {
    resources.push({
      label: "Open speaking playlist search",
      url: "https://www.youtube.com/results?search_query=english+speaking+practice+playlist",
      type: "playlist"
    });
  }

  if (focusArea === "dsa") {
    resources.push({
      label: "Open DSA playlist search",
      url: "https://www.youtube.com/results?search_query=dsa+beginner+playlist",
      type: "playlist"
    });
    resources.push({
      label: "Practice problem set",
      url: "https://leetcode.com/problemset/",
      type: "practice"
    });
  }

  if (focusArea === "python") {
    resources.push({
      label: "Open Python playlist search",
      url: "https://www.youtube.com/results?search_query=python+beginner+playlist",
      type: "playlist"
    });
    resources.push({
      label: "Python tutorial reference",
      url: "https://docs.python.org/3/tutorial/",
      type: "guide"
    });
  }

  if (focusArea === "web") {
    resources.push({
      label: "Open web dev playlist search",
      url: "https://www.youtube.com/results?search_query=web+development+beginner+playlist",
      type: "playlist"
    });
    resources.push({
      label: "MDN learning path",
      url: "https://developer.mozilla.org/en-US/docs/Learn",
      type: "guide"
    });
  }

  if (coachMode === "speaking") {
    resources.push({
      label: "Practice with AI Teacher",
      url: "/ai-teacher?mode=speaking&topic=communication",
      type: "coach"
    });
  }

  return resources;
}

function inferTaskMetadata(task) {
  const text = `${task.title || ""} ${task.description || ""}`.toLowerCase();

  if (/(communication|speak|presentation|sentence|clarity|pace)/.test(text)) {
    return {
      focusArea: "communication",
      coachMode: "speaking"
    };
  }

  if (/(dsa|problem|editorial|array|binary search|sliding window|cpp|c\+\+)/.test(text)) {
    return {
      focusArea: "dsa",
      coachMode: ""
    };
  }

  if (/(python|loop|function|readable)/.test(text)) {
    return {
      focusArea: "python",
      coachMode: ""
    };
  }

  if (/(web|react|javascript|html|css|frontend)/.test(text)) {
    return {
      focusArea: "web",
      coachMode: ""
    };
  }

  return {
    focusArea: "general",
    coachMode: ""
  };
}

function buildAiHelpUrl(topic, roadmapTitle, taskText) {
  const params = new URLSearchParams();

  if (topic === "communication") {
    params.set("mode", "speaking");
    params.set("topic", "communication");
  } else {
    params.set("topic", topic || "general");
  }

  params.set(
    "prompt",
    `Help me learn this ${roadmapTitle || "roadmap"} step: ${taskText}. Teach it simply, give me one practice task, and tell me the common mistake to avoid.`
  );

  return `/ai-teacher?${params.toString()}`;
}

function dedupeResources(resources) {
  const seen = new Set();
  return resources.filter((resource) => {
    const key = `${resource.type || "resource"}:${resource.url || ""}:${resource.label || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildRoadmapResources(roadmapContext, taskText, meta) {
  const playlistQuery = [roadmapContext.title, `Day ${roadmapContext.day}`, taskText, "tutorial playlist"]
    .filter(Boolean)
    .join(" ");

  return dedupeResources([
    {
      label: "Open roadmap playlist",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(playlistQuery)}`,
      type: "playlist"
    },
    {
      label: "Ask AI about this step",
      url: buildAiHelpUrl(roadmapContext.topic, roadmapContext.title, `Day ${roadmapContext.day}: ${taskText}`),
      type: "coach"
    },
    ...buildResources(meta)
  ]);
}

function enrichTasksForUser(tasks) {
  return (tasks || []).map((task, index) => {
    const meta = inferTaskMetadata(task);
    const resources = Array.isArray(task.resources) && task.resources.length
      ? task.resources
      : buildResources(meta);

    return {
      id: task.id || `task-${index + 1}`,
      title: task.title || "Task",
      description: task.description || "",
      completed: Boolean(task.completed),
      source: task.source || "generated",
      roadmapId: task.roadmapId || "",
      roadmapDay: Number(task.roadmapDay || 0),
      focusArea: task.focusArea || meta.focusArea,
      coachMode: task.coachMode || meta.coachMode,
      resources
    };
  });
}

function buildTaskPool(user) {
  const pool = [];
  const weaknesses = user?.weaknesses || [];
  const interests = user?.interests || [];
  const goals = user?.goals || [];

  if (includesAny(weaknesses, ["communication", "speak", "presentation"])) {
    pool.push({
      title: "Speak for 2 minutes",
      description: "Record yourself, answer one prompt, and notice one place where your clarity can improve."
    });
    pool.push({
      title: "Learn 5 speaking sentences",
      description: "Write 5 short sentences about your day and practice saying them smoothly with confidence."
    });
  }

  if (includesAny(interests, ["dsa", "cpp", "c++", "cobol"])) {
    pool.push({
      title: "Solve 2 DSA problems",
      description: "Pick 1 easy and 1 medium problem. Solve them, then review the pattern behind each solution."
    });
  }

  if (includesAny(interests, ["python"])) {
    pool.push({
      title: "Do 3 Python exercises",
      description: "Practice loops and functions with small problems. Keep each answer clean and readable."
    });
  }

  if (includesAny(interests, ["web", "react", "javascript"])) {
    pool.push({
      title: "Build one small web section",
      description: "Create a tiny UI section with HTML, CSS, and JavaScript or React to sharpen your builder mindset."
    });
  }

  if (Array.isArray(goals) && goals.length) {
    const firstGoal = goals[0];
    pool.push({
      title: "Work on your goal",
      description: `Spend 20 focused minutes moving forward on: ${firstGoal}`
    });
  }

  pool.push({
    title: "Quick review and plan",
    description: "Review yesterday's notes for 5 minutes, then choose the next best action for tomorrow."
  });

  return pool;
}

function buildRoadmapTasks(user, date = toYYYYMMDD(new Date())) {
  const roadmapContext = getActiveRoadmapContext(user?.activeRoadmap, date);
  if (!roadmapContext) return [];

  return roadmapContext.taskTexts.map((taskText, index) => {
    const meta = inferTaskMetadata({
      title: taskText,
      description: roadmapContext.title
    });

    return {
      id: `roadmap-${roadmapContext.id || "custom"}-day-${roadmapContext.day}-${index + 1}`,
      title: taskText,
      description: `Today's roadmap focus from ${roadmapContext.title} (Day ${roadmapContext.day} of ${roadmapContext.totalDays}).`,
      completed: false,
      source: "roadmap",
      roadmapId: roadmapContext.id || "custom",
      roadmapDay: roadmapContext.day,
      focusArea: meta.focusArea,
      coachMode: meta.coachMode,
      resources: buildRoadmapResources(roadmapContext, taskText, meta)
    };
  });
}

function syncTasksForToday(tasks, user, date = toYYYYMMDD(new Date())) {
  const normalizedTasks = enrichTasksForUser(tasks);
  const roadmapTasks = buildRoadmapTasks(user, date);

  if (!roadmapTasks.length) {
    return normalizedTasks;
  }

  const existingRoadmapTasks = new Map(
    normalizedTasks
      .filter((task) => task.source === "roadmap")
      .map((task) => [task.id, task])
  );

  const mergedRoadmapTasks = roadmapTasks.map((task) => {
    const existing = existingRoadmapTasks.get(task.id);
    if (!existing) return task;

    return {
      ...task,
      title: existing.title || task.title,
      description: existing.description || task.description,
      completed: Boolean(existing.completed),
      focusArea: existing.focusArea || task.focusArea,
      coachMode: existing.coachMode || task.coachMode,
      resources: Array.isArray(existing.resources) && existing.resources.length ? existing.resources : task.resources
    };
  });

  const nonRoadmapTasks = normalizedTasks.filter((task) => task.source !== "roadmap");
  return [...mergedRoadmapTasks, ...nonRoadmapTasks];
}

function generateDailyTasks(user, date = toYYYYMMDD(new Date())) {
  const pool = buildTaskPool(user);
  const roadmapTasks = buildRoadmapTasks(user, date);
  const seed = `${user?._id || user?.id || "anon"}:${date}`;
  const generatedTarget = roadmapTasks.length ? 4 : 5;

  const chosen = pickDeterministic(pool, seed, generatedTarget).map((task, index) => ({
    id: `generated-${index + 1}`,
    title: task.title,
    description: task.description,
    completed: false,
    source: "generated"
  }));

  return syncTasksForToday(chosen, user, date);
}

module.exports = { generateDailyTasks, enrichTasksForUser, syncTasksForToday };
