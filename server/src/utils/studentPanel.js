const { pickDeterministic, toYYYYMMDD } = require("./date");

const PRACTICE_LIBRARY = {
  dsa: [
    { id: "dsa-arrays", title: "Two Sum Variants", difficulty: "Easy", topic: "Arrays", link: "https://leetcode.com/problemset/" },
    { id: "dsa-window", title: "Sliding Window Warmup", difficulty: "Medium", topic: "Strings", link: "https://leetcode.com/problemset/" },
    { id: "dsa-binary", title: "Binary Search Patterns", difficulty: "Medium", topic: "Search", link: "https://leetcode.com/problemset/" },
    { id: "dsa-stack", title: "Monotonic Stack Basics", difficulty: "Medium", topic: "Stack", link: "https://leetcode.com/problemset/" },
    { id: "dsa-graphs", title: "BFS Traversal Sprint", difficulty: "Medium", topic: "Graphs", link: "https://leetcode.com/problemset/" },
    { id: "dsa-dp", title: "1D DP Intro", difficulty: "Hard", topic: "Dynamic Programming", link: "https://leetcode.com/problemset/" }
  ],
  mcq: [
    { id: "mcq-os", title: "Operating Systems Quiz", topic: "OS", questions: 15 },
    { id: "mcq-dbms", title: "DBMS Concept Drill", topic: "DBMS", questions: 12 },
    { id: "mcq-cn", title: "Computer Networks Quick Test", topic: "CN", questions: 10 },
    { id: "mcq-js", title: "JavaScript Interview MCQs", topic: "JavaScript", questions: 14 },
    { id: "mcq-python", title: "Python Foundations MCQs", topic: "Python", questions: 12 }
  ],
  mockTests: [
    { id: "mock-aptitude", title: "Aptitude Sprint", duration: 30, questions: 25, focus: "Reasoning + Quant" },
    { id: "mock-core", title: "Core CS Mixed Test", duration: 45, questions: 35, focus: "OS + DBMS + CN" },
    { id: "mock-dsa", title: "DSA Timed Set", duration: 60, questions: 3, focus: "Coding Problems" }
  ]
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildPracticeZone(user) {
  const interests = (user?.interests || []).map((item) => String(item).toLowerCase());
  const mode = user?.learningMode || "deep";
  const seed = `${user?._id || "student"}:${mode}:${interests.join(",")}`;

  const dsaProblems = pickDeterministic(PRACTICE_LIBRARY.dsa, `${seed}:dsa`, 3);
  const mcqs = pickDeterministic(PRACTICE_LIBRARY.mcq, `${seed}:mcq`, 3);
  const mockTests = pickDeterministic(PRACTICE_LIBRARY.mockTests, `${seed}:mock`, 2);

  return {
    mode,
    recommendation:
      mode === "fast"
        ? "Fast learner mode keeps the queue short and momentum high."
        : mode === "practical"
          ? "Practical learner mode prioritizes projects, tests, and applied drills."
          : "Deep learner mode leans into spaced practice and fuller concept review.",
    dsaProblems,
    mcqs,
    mockTests
  };
}

function buildWeeklyChart(dailyTaskDocs) {
  const end = new Date();
  const chart = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(end);
    date.setDate(end.getDate() - i);
    const key = toYYYYMMDD(date);
    const doc = dailyTaskDocs.find((item) => item.date === key);
    const total = (doc?.tasks || []).length;
    const completed = (doc?.tasks || []).filter((task) => task.completed).length;
    chart.push({
      date: key,
      label: key.slice(5),
      completed,
      total,
      percent: total ? Math.round((completed / total) * 100) : 0
    });
  }

  return chart;
}

function calculateStreak(dailyTaskDocs) {
  const completedDates = new Set(
    (dailyTaskDocs || [])
      .filter((doc) => (doc.tasks || []).some((task) => task.completed))
      .map((doc) => doc.date)
  );

  let streak = 0;
  const cursor = new Date();

  while (completedDates.has(toYYYYMMDD(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildSkillImprovement(dailyTaskDocs, taskSubmissions, user) {
  const counts = new Map();

  (dailyTaskDocs || []).forEach((doc) => {
    (doc.tasks || []).forEach((task) => {
      if (!task.completed) return;
      const key = String(task.focusArea || "general").toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  if (taskSubmissions?.length) {
    counts.set("projects", (counts.get("projects") || 0) + taskSubmissions.length);
  }

  if (!counts.size) {
    (user?.interests || []).slice(0, 3).forEach((interest) => counts.set(String(interest).toLowerCase(), 1));
  }

  return [...counts.entries()]
    .map(([skill, count]) => ({
      skill,
      improvement: clamp(count * 12, 8, 96)
    }))
    .sort((a, b) => b.improvement - a.improvement)
    .slice(0, 5);
}

function buildBadges({ streak, xpPoints, projectCount, submissionCount, attendedInterviews }) {
  const badges = [];

  if (streak >= 3) badges.push({ id: "streak", label: "Consistency Streak", tone: "emerald" });
  if (xpPoints >= 120) badges.push({ id: "xp", label: "Momentum Builder", tone: "primary" });
  if (submissionCount >= 1) badges.push({ id: "submitter", label: "Task Finisher", tone: "amber" });
  if (projectCount >= 1) badges.push({ id: "project", label: "Project Shipper", tone: "cyan" });
  if (attendedInterviews >= 1) badges.push({ id: "interview", label: "Interview Ready", tone: "rose" });

  return badges;
}

module.exports = {
  buildBadges,
  buildPracticeZone,
  buildSkillImprovement,
  buildWeeklyChart,
  calculateStreak
};
