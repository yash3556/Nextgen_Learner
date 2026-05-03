function uniqueList(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((item) => String(item || "").trim()).filter(Boolean))];
}

function toLowerText(parts) {
  return parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function includesAny(text, keywords = []) {
  return keywords.some((keyword) => text.includes(String(keyword).toLowerCase()));
}

function toNaturalList(items) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const SIGNAL_MAP = {
  "Algorithmic thinking": ["algorithm", "algorithms", "dsa", "problem solving", "problem-solving"],
  "Problem decomposition": ["problem decomposition", "logic", "structured thinking", "problem solving", "problem-solving"],
  "Data structures basics": ["data structures", "dsa", "array", "arrays", "linked list", "stack", "queue", "tree", "hashing"],
  "Clean code habits": ["clean code", "code quality", "readable code", "refactor", "refactoring"],
  "Debugging step-by-step": ["debug", "debugging", "troubleshooting"],
  "Git / GitHub workflow": ["git", "github", "version control"],
  "Command line / terminal use": ["terminal", "command line", "cli", "powershell", "bash", "shell"],
  "Package manager basics": ["npm", "pip", "pnpm", "yarn"],
  "Editor / workspace habits": ["vscode", "editor", "ide"],
  "Deployment basics": ["deploy", "deployment", "netlify", "vercel", "render", "github pages", "hosting"],
  "Building a complete mini-project": ["project", "portfolio", "app", "website", "api", "mini project", "mini-project"],
  "Breaking a feature into tasks": ["planning", "task breakdown", "feature breakdown", "roadmap"],
  "Connecting front-end and data": ["api", "fetch", "json", "backend", "database", "frontend", "front end", "state"],
  "Writing reusable components": ["component", "components", "reusable", "modular", "react"],
  "Testing and validating work": ["test", "testing", "validation", "debugging", "qa"],
  "Explaining what you built": ["communication", "speaking", "presentation", "project explanation", "explaining"],
  "Writing a short project summary": ["documentation", "summary", "readme"],
  "Answering why this works": ["reasoning", "explain", "conceptual clarity", "theory"],
  "Sharing progress clearly": ["communication", "teamwork", "collaboration", "updates"],
  "Interview readiness": ["interview", "mock interview", "hr", "technical interview"]
};

const GOAL_PROFILES = [
  {
    id: "web",
    label: "web developer",
    detect: ["web", "frontend", "front end", "react", "html", "css", "javascript", "js", "full stack", "fullstack"],
    coreKeywords: ["html", "css", "javascript", "js", "react"],
    roleSpecificSkills: [
      "HTML, CSS, and JavaScript fundamentals",
      "Responsive layout and accessibility basics",
      "Component thinking and state management",
      "Fetching data from APIs and deploying projects"
    ],
    firstFocusArea: {
      title: "HTML, CSS, and JavaScript fundamentals",
      reason: "This gives you the fastest path to shipping something visible and understanding how the browser actually works."
    },
    miniProject: {
      title: "Task Tracker",
      description: "Build a responsive task tracker that lets users add, edit, filter, and save tasks in the browser.",
      features: [
        "Add, edit, and delete tasks",
        "Filter by status or priority",
        "Persist data with local storage",
        "Show one polished mobile-friendly layout",
        "Write a short README with what you built and why"
      ],
      techStack: ["HTML/CSS", "JavaScript", "GitHub", "Netlify or Vercel"]
    }
  },
  {
    id: "backend",
    label: "backend developer",
    detect: ["backend", "back end", "node", "express", "server", "api", "rest", "mongodb", "database"],
    coreKeywords: ["node", "express", "javascript", "js", "python", "java", "api", "server"],
    roleSpecificSkills: [
      "HTTP, REST, and API design basics",
      "Server-side validation and error handling",
      "Data modeling and persistence",
      "Environment variables, testing, and deployment"
    ],
    firstFocusArea: {
      title: "HTTP, APIs, and server-side fundamentals",
      reason: "You need to be comfortable with requests, responses, routing, and data flow before backend tools start feeling natural."
    },
    miniProject: {
      title: "Study Planner API",
      description: "Create a backend service that stores study tasks and exposes clean endpoints for create, read, update, and delete flows.",
      features: [
        "CRUD endpoints for tasks",
        "Input validation and error responses",
        "Simple database or JSON persistence",
        "API testing with Postman",
        "A deployed link or demo instructions"
      ],
      techStack: ["Node.js", "Express", "MongoDB or JSON storage", "Postman", "Render"]
    }
  },
  {
    id: "data",
    label: "data-focused role",
    detect: ["data", "analysis", "analytics", "sql", "pandas", "excel", "machine learning", "ml"],
    coreKeywords: ["python", "sql", "pandas", "excel", "analysis", "analytics"],
    roleSpecificSkills: [
      "Python and SQL for data handling",
      "Cleaning, transforming, and validating datasets",
      "Explaining insights clearly with charts or summaries",
      "Documenting assumptions and results"
    ],
    firstFocusArea: {
      title: "Python, SQL, and data cleaning basics",
      reason: "A strong data workflow starts with loading, cleaning, and understanding data before advanced modeling."
    },
    miniProject: {
      title: "Student Performance Analyzer",
      description: "Analyze a small dataset, answer a few concrete questions, and present the findings in a way another person can understand quickly.",
      features: [
        "Load and clean a CSV dataset",
        "Answer 3 focused analysis questions",
        "Create 2 simple charts",
        "Write a short findings summary",
        "Share a notebook or script with clean steps"
      ],
      techStack: ["Python", "Pandas", "Matplotlib or Seaborn", "Jupyter or script", "GitHub"]
    }
  },
  {
    id: "python",
    label: "Python developer",
    detect: ["python", "automation", "script", "scripting"],
    coreKeywords: ["python"],
    roleSpecificSkills: [
      "Functions, loops, lists, and dictionaries",
      "Working with files, libraries, and packages",
      "Debugging scripts and handling errors",
      "Turning scripts into reusable tools"
    ],
    firstFocusArea: {
      title: "Python functions, lists, loops, and files",
      reason: "These basics let you solve real problems without depending on copy-paste patterns."
    },
    miniProject: {
      title: "Automation Toolkit",
      description: "Build a small Python utility that reads input, processes it, and returns a useful output without manual repetition.",
      features: [
        "Split logic into clear functions",
        "Read and write files",
        "Validate user input",
        "Handle one or two common errors gracefully",
        "Document how to run it"
      ],
      techStack: ["Python", "pip", "CLI or script", "GitHub"]
    }
  },
  {
    id: "communication",
    label: "communication and interview confidence",
    detect: ["communication", "confidence", "speaking", "presentation", "interview", "public speaking"],
    coreKeywords: ["communication", "speaking", "presentation", "interview"],
    roleSpecificSkills: [
      "Self-introduction and project explanation",
      "Structured answers under time pressure",
      "Confident speaking with examples",
      "Clear progress updates and reflective summaries"
    ],
    firstFocusArea: {
      title: "Self-introduction and structured speaking",
      reason: "When your speaking structure becomes repeatable, confidence usually follows much faster."
    },
    miniProject: {
      title: "Interview Answer Vault",
      description: "Create a reusable set of polished answers you can speak naturally for introductions, projects, strengths, and weaknesses.",
      features: [
        "Write a 60-second self-introduction",
        "Prepare one project explanation",
        "Draft strength and weakness answers",
        "Record and review one mock response",
        "Note one improvement after each practice round"
      ],
      techStack: ["AI Teacher", "Notes", "Optional GitHub repo or document"]
    }
  },
  {
    id: "software",
    label: "software engineer",
    detect: ["software engineer", "software developer", "dsa", "leetcode", "algorithms", "problem solving", "problem-solving", "c++", "cpp", "java"],
    coreKeywords: ["c++", "cpp", "java", "python", "javascript", "dsa", "algorithms", "array", "hashing"],
    roleSpecificSkills: [
      "Programming fundamentals and debugging",
      "Data structures, patterns, and complexity awareness",
      "Writing readable code and explaining tradeoffs",
      "Using Git and building small proof-of-work projects"
    ],
    firstFocusArea: {
      title: "Programming basics, arrays, and problem decomposition",
      reason: "This creates the foundation for both coding interviews and real project work without overwhelming you early."
    },
    miniProject: {
      title: "Problem Solving Journal",
      description: "Create a repo where you solve small problems, document the pattern used, and explain what you learned from each solution.",
      features: [
        "Solve 5 small problems by pattern",
        "Add time and space complexity notes",
        "Track one bug or wrong attempt for each",
        "Use one reusable solution template",
        "Write a summary README for the repo"
      ],
      techStack: ["C++ or Python or Java", "GitHub", "Markdown"]
    }
  }
];

function getGoalProfile(user, goalText) {
  const goalHint = toLowerText([goalText, user?.interests, user?.technicalSkills, user?.course, user?.weaknesses]);
  return GOAL_PROFILES.find((profile) => includesAny(goalHint, profile.detect)) || GOAL_PROFILES[GOAL_PROFILES.length - 1];
}

function getPrimaryGoal(user, profile) {
  const goals = uniqueList(user?.goals);
  if (goals.length) return goals[0];
  return `Become stronger for a ${profile.label} path`;
}

function getCurrentSkills(user) {
  const skills = uniqueList([
    ...(user?.technicalSkills || []),
    ...(user?.nonTechnicalSkills || []),
    ...(user?.strengths || [])
  ]);

  if (skills.length) return skills.slice(0, 10);
  return uniqueList(user?.interests || []).slice(0, 6);
}

function getStatus(profile, user, currentSkills) {
  const knownText = toLowerText([
    user?.technicalSkills,
    user?.nonTechnicalSkills,
    user?.strengths,
    currentSkills
  ]);
  const goalText = toLowerText([user?.goals, user?.interests, user?.course]);
  const weaknessText = toLowerText(user?.weaknesses || []);
  const hasWeakCommunication = includesAny(weaknessText, ["communication", "confidence", "speaking", "interview", "presentation"]);

  const coreLanguage =
    includesAny(knownText, profile.coreKeywords) ? "Known" : currentSkills.length || includesAny(goalText, profile.detect) ? "Partial" : "Missing";

  const problemSolving = includesAny(knownText, SIGNAL_MAP["Algorithmic thinking"])
    ? "Known"
    : includesAny(goalText, ["dsa", "leetcode", "algorithms", "problem solving", "problem-solving"])
      ? "Partial"
      : "Missing";

  const git = includesAny(knownText, SIGNAL_MAP["Git / GitHub workflow"]) ? "Known" : currentSkills.length ? "Partial" : "Missing";

  const projectBuilding = includesAny(knownText, SIGNAL_MAP["Building a complete mini-project"])
    ? "Known"
    : currentSkills.length
      ? "Partial"
      : "Missing";

  const communication = includesAny(knownText, SIGNAL_MAP["Explaining what you built"])
    ? "Known"
    : hasWeakCommunication
      ? "Missing"
      : currentSkills.length
        ? "Partial"
        : "Missing";

  return {
    coreLanguage,
    problemSolving,
    git,
    projectBuilding,
    communication
  };
}

function filterSkillItems(items, user, currentSkills) {
  const knownText = toLowerText([
    user?.technicalSkills,
    user?.nonTechnicalSkills,
    user?.strengths,
    currentSkills
  ]);
  const weaknessText = toLowerText(user?.weaknesses || []);

  return items.filter((item) => {
    const signals = SIGNAL_MAP[item];
    if (!signals || !signals.length) return true;
    if (includesAny(weaknessText, signals)) return true;
    return !includesAny(knownText, signals);
  });
}

function buildWeakAreas(statuses, user) {
  const weaknessText = toLowerText(user?.weaknesses || []);
  const areas = [];

  if (includesAny(weaknessText, ["debug", "debugging", "errors", "bugs"])) {
    areas.push({
      title: "Debugging without a system",
      why: "Errors take longer to fix when you jump between guesses instead of isolating the cause.",
      improve: "Use the same order each time: reproduce the issue, inspect inputs, isolate the smallest failing step, fix, and retest."
    });
  }

  if (includesAny(weaknessText, ["consistency", "procrastination", "time management", "discipline"])) {
    areas.push({
      title: "Inconsistent practice rhythm",
      why: "Skills grow slower when learning happens in random bursts instead of short repeatable sessions.",
      improve: "Use 30 to 45 minute build blocks and finish one visible output in each block."
    });
  }

  if (statuses.communication !== "Known") {
    areas.push({
      title: "Weak explanation skills",
      why: "Understanding code is not enough if you cannot explain what you built, why it works, and what tradeoff you chose.",
      improve: "Practice a 2 minute explanation after every project or exercise using problem, solution, and result."
    });
  }

  if (statuses.git !== "Known") {
    areas.push({
      title: "Limited Git experience",
      why: "Without version control habits, your work is harder to track, share, and improve safely.",
      improve: "Use one repo this week, make 5 small commits, and write short commit messages that describe the change."
    });
  }

  if (statuses.projectBuilding !== "Known") {
    areas.push({
      title: "Too many tutorials, not enough building",
      why: "Progress stays theoretical when you watch concepts but do not carry them into a complete working project.",
      improve: "Finish one small app in 2 to 3 days and keep the scope tight enough to deploy or demo."
    });
  }

  if (statuses.problemSolving !== "Known" || statuses.coreLanguage !== "Known") {
    areas.push({
      title: "Coding without structure",
      why: "Code may work once, but it becomes hard to extend when logic is not broken into clean steps and reusable pieces.",
      improve: "Rewrite one small feature using functions or modules, then explain the purpose of each part in one line."
    });
  }

  const seen = new Set();
  return areas.filter((area) => {
    if (seen.has(area.title)) return false;
    seen.add(area.title);
    return true;
  }).slice(0, 4);
}

function buildMissingSkills(profile, user, currentSkills) {
  const fundamentals = [
    "Algorithmic thinking",
    "Problem decomposition",
    "Data structures basics",
    "Clean code habits",
    "Debugging step-by-step"
  ];

  const tools = [
    "Git / GitHub workflow",
    "Command line / terminal use",
    "Package manager basics",
    "Editor / workspace habits",
    "Deployment basics"
  ];

  const practical = [
    "Building a complete mini-project",
    "Breaking a feature into tasks",
    "Connecting front-end and data",
    "Writing reusable components",
    "Testing and validating work"
  ];

  const communication = [
    "Explaining what you built",
    "Writing a short project summary",
    "Answering why this works",
    "Sharing progress clearly",
    "Interview readiness"
  ];

  if (profile.id === "backend") {
    practical.unshift("API design basics");
  }

  if (profile.id === "data") {
    practical.unshift("Cleaning and validating real datasets");
  }

  if (profile.id === "communication") {
    communication.unshift("Structured self-introduction");
  }

  return {
    fundamentals: filterSkillItems(fundamentals, user, currentSkills).slice(0, 5),
    tools: filterSkillItems(tools, user, currentSkills).slice(0, 5),
    practical: filterSkillItems(uniqueList(practical), user, currentSkills).slice(0, 5),
    communication: filterSkillItems(uniqueList(communication), user, currentSkills).slice(0, 5)
  };
}

function buildLearningPriority(profile) {
  return [
    `Learn first: ${profile.firstFocusArea.title}.`,
    "Learn next: Git, terminal use, package workflow, and debugging habits.",
    `Build next: ${profile.miniProject.title}.`,
    "Prepare last: project explanation, resume bullets, and basic interview answers."
  ];
}

function buildSkillMapping(statuses) {
  return [
    { skill: "Core language basics", status: statuses.coreLanguage },
    { skill: "Problem solving", status: statuses.problemSolving },
    { skill: "Git / GitHub", status: statuses.git },
    { skill: "Project building", status: statuses.projectBuilding },
    { skill: "Communication", status: statuses.communication }
  ];
}

function buildWeeklyPlan(profile) {
  return [
    `Day 1: Review ${profile.firstFocusArea.title} and write 10 to 15 lines from memory.`,
    "Day 2: Solve 3 tiny practice problems and explain each answer in plain language.",
    `Day 3: Set up the ${profile.miniProject.title} repo and basic structure.`,
    "Day 4: Build the core feature or main workflow.",
    "Day 5: Fix bugs, clean the code, and improve one weak area.",
    "Day 6: Write the README or project summary and organize commits.",
    "Day 7: Explain the project aloud in 2 minutes and note what still sounds unclear."
  ];
}

function buildFinalAdvice(statuses, profile) {
  const mistakesToAvoid = [];

  if (statuses.coreLanguage !== "Known") {
    mistakesToAvoid.push("Do not jump into advanced tools before your core basics feel repeatable.");
  }

  if (statuses.projectBuilding !== "Known") {
    mistakesToAvoid.push("Do not spend another full week only watching tutorials without shipping something small.");
  }

  if (statuses.git !== "Known") {
    mistakesToAvoid.push("Do not keep all of your work local and untracked.");
  }

  if (statuses.communication !== "Known") {
    mistakesToAvoid.push("Do not avoid explaining your work out loud after building it.");
  }

  if (!mistakesToAvoid.length) {
    mistakesToAvoid.push("Do not stop at code that only works once; make it readable, testable, and explainable.");
  }

  const practicalTips = [
    `Build one small thing every week that matches your ${profile.label} direction.`,
    "End each practice session by writing one win, one mistake, and one next step."
  ];

  if (statuses.communication !== "Known") {
    practicalTips.push("Practice one 60 to 90 second project explanation daily.");
  } else {
    practicalTips.push("Push progress in 3 to 5 small commits so your GitHub history shows clear momentum.");
  }

  return {
    mistakesToAvoid: mistakesToAvoid.slice(0, 4),
    practicalTips: practicalTips.slice(0, 3)
  };
}

function buildSummary(goal, currentSkills, missingProfileData, missingSkills) {
  if (missingProfileData.length) {
    return "This analysis is using a partial learner profile. Add a clearer goal and a few current skills to make the recommendations sharper.";
  }

  const presentSkills = currentSkills.slice(0, 4);
  const gapSignals = [
    missingSkills.fundamentals[0],
    missingSkills.tools[0],
    missingSkills.practical[0]
  ].filter(Boolean);

  return `Your profile points toward ${goal}. You already show traction in ${toNaturalList(presentSkills)}, and the biggest gains now will come from ${toNaturalList(gapSignals)}.`;
}

function buildSkillGapAnalysis(user) {
  const currentSkills = getCurrentSkills(user);
  const missingProfileData = [];

  if (!uniqueList(user?.goals).length) missingProfileData.push("goal");
  if (!currentSkills.length) missingProfileData.push("skills");

  const goalProfile = getGoalProfile(user, uniqueList(user?.goals)[0] || "");
  const goal = getPrimaryGoal(user, goalProfile);
  const statuses = getStatus(goalProfile, user, currentSkills);
  const missingSkills = buildMissingSkills(goalProfile, user, currentSkills);
  const weakAreas = buildWeakAreas(statuses, user);

  return {
    goal,
    currentSkills,
    missingProfileData,
    summary: buildSummary(goal, currentSkills, missingProfileData, missingSkills),
    missingSkills,
    weakAreas,
    industryRequiredSkills: {
      general: [
        "Write code that is easy to read and extend",
        "Use Git and share work publicly",
        "Solve small problems with confidence",
        "Learn from errors and fix bugs methodically",
        "Show proof of work in a portfolio or repo"
      ],
      roleSpecific: goalProfile.roleSpecificSkills
    },
    learningPriority: buildLearningPriority(goalProfile),
    improvementPlan: {
      successTargets: [
        "A working beginner project you can explain clearly",
        "A GitHub repo with clean, meaningful commits",
        'A short answer for "What did you build and why?"'
      ],
      skillMapping: buildSkillMapping(statuses),
      firstFocusArea: goalProfile.firstFocusArea,
      miniProject: goalProfile.miniProject,
      weeklyPlan: buildWeeklyPlan(goalProfile)
    },
    finalAdvice: buildFinalAdvice(statuses, goalProfile)
  };
}

module.exports = {
  buildSkillGapAnalysis
};
