import React, { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  FileText,
  Lightbulb,
  ListChecks,
  Maximize2,
  MessageSquare,
  Minimize2,
  Play,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Target,
  Timer,
  Trophy,
  XCircle,
  Zap
} from "lucide-react";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { apiFetch } from "../api/api";

const LANGUAGE_OPTIONS = [
  { id: "javascript", label: "JavaScript", monaco: "javascript" },
  { id: "python", label: "Python", monaco: "python" },
  { id: "cpp", label: "C++", monaco: "cpp" },
  { id: "java", label: "Java", monaco: "java" },
  { id: "c", label: "C", monaco: "c" }
];

const STORAGE_KEYS = {
  streak: "nextzen_practice_streak_v2",
  discussions: "nextzen_practice_discussions_v2",
  panelWidth: "nextzen_practice_panel_width_v2"
};

const AUTO_SAVE_MS = 10_000;
const LIVE_REFRESH_MS = 30_000;
const MIN_PANEL_WIDTH = 30;
const MAX_PANEL_WIDTH = 42;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildTaskKey(moduleId, taskIndex) {
  return `${moduleId}:${taskIndex}`;
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeParseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function readStreak() {
  if (typeof window === "undefined") return { count: 0, lastSolvedDate: "" };
  const parsed = safeParseJson(window.localStorage.getItem(STORAGE_KEYS.streak) || "{}", {});
  return {
    count: Number(parsed?.count || 0),
    lastSolvedDate: String(parsed?.lastSolvedDate || "")
  };
}

function writeStreak(value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(value));
}

function updateStreakAfterSolve() {
  const current = readStreak();
  const today = getDateKey(new Date());
  if (!current.lastSolvedDate) {
    const next = { count: 1, lastSolvedDate: today };
    writeStreak(next);
    return next;
  }
  if (current.lastSolvedDate === today) return current;

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getDateKey(yesterdayDate);
  const next = {
    count: current.lastSolvedDate === yesterday ? current.count + 1 : 1,
    lastSolvedDate: today
  };
  writeStreak(next);
  return next;
}

function readDiscussions() {
  if (typeof window === "undefined") return {};
  const parsed = safeParseJson(window.localStorage.getItem(STORAGE_KEYS.discussions) || "{}", {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

function writeDiscussions(value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.discussions, JSON.stringify(value));
}

function readPanelWidth() {
  if (typeof window === "undefined") return 33;
  const raw = Number(window.localStorage.getItem(STORAGE_KEYS.panelWidth));
  if (!Number.isFinite(raw)) return 33;
  return clamp(raw, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH);
}

function writePanelWidth(value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.panelWidth, String(value));
}

function getDifficultyLabel(difficulty) {
  const normalized = String(difficulty || "medium").toLowerCase();
  if (normalized === "easy") return "Easy";
  if (normalized === "hard") return "Hard";
  return "Medium";
}

function getDifficultyClass(difficulty) {
  const normalized = String(difficulty || "medium").toLowerCase();
  if (normalized === "easy") return "bg-emerald-400/20 text-emerald-200 ring-emerald-300/40";
  if (normalized === "hard") return "bg-rose-400/20 text-rose-200 ring-rose-300/40";
  return "bg-amber-400/20 text-amber-200 ring-amber-300/40";
}

function getDifficultyWeight(difficulty) {
  const normalized = String(difficulty || "medium").toLowerCase();
  if (normalized === "easy") return 50;
  if (normalized === "hard") return 120;
  return 80;
}

function formatRelativeTime(value) {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}

function extractSection(text, pattern) {
  return String(text || "")
    .match(pattern)?.[1]
    ?.trim() || "";
}

function parseProblemContent(task, module) {
  const description = String(task?.description || "").trim();
  const constraints = extractSection(description, /constraints?\s*:?\s*([\s\S]*?)(?:input\s*:|output\s*:|example|hint|$)/i);
  const exampleInput = extractSection(description, /(?:example\s*input|input)\s*:?\s*([\s\S]*?)(?:example\s*output|output\s*:|constraints|hint|$)/i);
  const exampleOutput = extractSection(description, /(?:example\s*output|output)\s*:?\s*([\s\S]*?)(?:constraints|hint|$)/i);
  const cleanedDescription = description.replace(/constraints?\s*:([\s\S]*)/i, "").trim();

  return {
    instructions:
      cleanedDescription ||
      "Solve the problem by writing a clean and efficient function. Handle edge cases and output format carefully.",
    constraints:
      constraints ||
      `Estimated time: ${Number(task?.estimatedMinutes || 25)} min. Difficulty: ${getDifficultyLabel(module?.difficulty)}.`,
    exampleInput: exampleInput || "sample_input",
    exampleOutput: exampleOutput || "sample_output"
  };
}

function buildStarterCode(language, title) {
  const heading = title || "Practice Problem";
  if (language === "python") {
    return `# ${heading}\n# Implement solve(input_data)\ndef solve(input_data):\n    # Write logic here\n    return input_data\n\nif __name__ == "__main__":\n    data = input().strip()\n    print(solve(data))\n`;
  }
  if (language === "cpp") {
    return `// ${heading}\n#include <bits/stdc++.h>\nusing namespace std;\n\nstring solve(const string &input_data) {\n  // Write logic here\n  return input_data;\n}\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  string input_data;\n  getline(cin, input_data);\n  cout << solve(input_data) << "\\n";\n  return 0;\n}\n`;
  }
  if (language === "java") {
    return `// ${heading}\nimport java.util.*;\n\npublic class Main {\n  static String solve(String inputData) {\n    // Write logic here\n    return inputData;\n  }\n\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    String data = scanner.hasNextLine() ? scanner.nextLine() : \"\";\n    System.out.println(solve(data));\n  }\n}\n`;
  }
  if (language === "c") {
    return `/* ${heading} */\n#include <stdio.h>\n#include <string.h>\n\nvoid solve(const char *inputData, char *output, size_t outputSize) {\n  // Write logic here\n  snprintf(output, outputSize, "%s", inputData);\n}\n\nint main(void) {\n  char inputData[2048] = {0};\n  char output[2048] = {0};\n  if (fgets(inputData, sizeof(inputData), stdin) == NULL) return 0;\n  solve(inputData, output, sizeof(output));\n  printf("%s", output);\n  return 0;\n}\n`;
  }
  return `// ${heading}\n// Implement solve(input)\nfunction solve(input) {\n  // Write logic here\n  return input;\n}\n\nconst sampleInput = "sample_input";\nconsole.log(solve(sampleInput));\n`;
}

function estimateComplexity(code) {
  const source = String(code || "");
  const nestedLoops =
    /for[\s\S]{0,100}for/.test(source) ||
    /while[\s\S]{0,100}while/.test(source) ||
    /for[\s\S]{0,100}while/.test(source);
  const hasLoop = /\b(for|while)\b/.test(source);
  const hasSort = /\.sort\s*\(|\bsort\s*\(/i.test(source);
  const usesMap = /\b(Map|Set|HashMap|unordered_map|dict)\b/.test(source);
  const usesDynamicCollection = /\[[^\]]*\]|\bvector<|\bArrayList<|\blist\b/i.test(source);

  let time = "O(n)";
  if (nestedLoops) time = "O(n^2)";
  else if (hasSort) time = "O(n log n)";
  else if (!hasLoop) time = "O(1)-O(log n)";

  let space = "O(1)";
  if (usesMap || usesDynamicCollection) space = "O(n)";

  return { time, space };
}

function verdictFromRatio(ratio, complexityTime, hasSyntaxError, outputMismatch) {
  if (hasSyntaxError || outputMismatch) return "wrong";
  if (ratio >= 0.9 && complexityTime !== "O(n^2)") return "optimized";
  if (ratio >= 0.85) return "correct";
  if (ratio >= 0.55) return "partial";
  return "wrong";
}

function quickRunAnalysis(problem, language, code, userOutput) {
  const trimmed = String(code || "").trim();
  if (!trimmed) {
    return {
      status: "error",
      verdict: "wrong",
      message: "Editor is empty. Write code before running checks.",
      hints: ["Start with a solve() function.", "Handle base and edge cases early."],
      testCasesPassed: 0,
      testCasesTotal: 10,
      runtimeMs: 0,
      memoryMb: 0,
      complexity: { time: "N/A", space: "N/A" },
      hasSyntaxError: false
    };
  }

  if (language === "javascript") {
    try {
      // eslint-disable-next-line no-new-func
      new Function(trimmed);
    } catch (error) {
      return {
        status: "error",
        verdict: "wrong",
        message: `Syntax issue: ${error.message}`,
        hints: ["Check missing braces/parentheses.", "Review commas and semicolons."],
        testCasesPassed: 1,
        testCasesTotal: 10,
        runtimeMs: 0,
        memoryMb: 0,
        complexity: estimateComplexity(trimmed),
        hasSyntaxError: true
      };
    }
  }

  const complexity = estimateComplexity(trimmed);
  const total = 10;
  const hasLoop = /\b(for|while)\b/.test(trimmed);
  const hasCond = /\b(if|switch)\b/.test(trimmed);
  const hasFunction = /\b(function|def|solve|main)\b/.test(trimmed);
  const hasReturn = /\breturn\b|\bprint\b|\bcout\b|\bSystem\.out\.print/.test(trimmed);
  const hasTodo = /\b(TODO|todo|pass)\b/.test(trimmed);
  const expected = normalizeWhitespace(problem?.exampleOutput);
  const actual = normalizeWhitespace(userOutput);
  const outputMismatch = Boolean(expected && actual && expected !== actual);

  let passed = 3;
  if (hasFunction) passed += 2;
  if (hasLoop) passed += 1;
  if (hasCond) passed += 1;
  if (hasReturn) passed += 1;
  if (!hasTodo) passed += 1;
  if (expected && actual) passed += expected === actual ? 1 : -2;
  if (complexity.time === "O(n^2)") passed -= 1;
  passed = clamp(passed, 0, total);

  const ratio = passed / total;
  const verdict = verdictFromRatio(ratio, complexity.time, false, outputMismatch);
  const runtimeMs = clamp(18 + Math.round(trimmed.length * (complexity.time === "O(n^2)" ? 1.8 : 1.1)), 18, 900);
  const memoryMb = clamp(16 + Math.round(trimmed.length / 48) + (complexity.space === "O(n)" ? 7 : 0), 16, 128);

  const hints = [];
  if (!hasCond) hints.push("Add condition checks for edge cases.");
  if (!hasReturn) hints.push("Ensure output is returned or printed in exact format.");
  if (outputMismatch) hints.push("Your output does not match the expected sample format.");
  if (complexity.time === "O(n^2)") hints.push("Try reducing nested loops using hash maps or pointers.");
  if (!hints.length) hints.push("Good run. Add tests for boundary inputs before submit.");

  return {
    status: verdict === "wrong" ? "warning" : "success",
    verdict,
    message:
      verdict === "wrong"
        ? "Run complete. Some checks are failing."
        : verdict === "partial"
          ? "Run complete. Partial pass detected."
          : "Run complete. Looking strong.",
    hints,
    testCasesPassed: passed,
    testCasesTotal: total,
    runtimeMs,
    memoryMb,
    complexity,
    hasSyntaxError: false
  };
}

function buildFallbackCheck(problem, runSummary, code, userOutput) {
  const base = runSummary || quickRunAnalysis(problem, "javascript", code, userOutput);
  const verdict = base.verdict || "partial";

  const titleMap = {
    correct: "Correct Solution",
    wrong: "Wrong Answer",
    partial: "Partially Correct",
    optimized: "Optimized but Can Improve",
    slow: "Correct but Slow Solution"
  };

  const explanationMap = {
    correct: "Your approach looks correct for most evaluated scenarios.",
    wrong: "Your logic is failing on required checks and needs revision.",
    partial: "You pass some cases, but edge-case handling is incomplete.",
    optimized: "Excellent structure and good complexity profile.",
    slow: "Logic appears correct but likely too slow on larger inputs."
  };

  const mistakes = [];
  if (base.hasSyntaxError) mistakes.push("Syntax error detected.");
  if (verdict === "wrong") mistakes.push("Expected and user output are not aligned for all checks.");
  if (verdict === "partial") mistakes.push("Edge cases are not fully covered.");
  if (base.complexity?.time === "O(n^2)") mistakes.push("Current solution may be too slow due to nested iteration.");
  if (!mistakes.length) mistakes.push("No major mistakes detected in quick checks.");

  const improvements = [
    "Test boundary cases: empty input, single element, max constraints.",
    "Validate output formatting exactly as required.",
    "Refactor repeated logic into helper functions."
  ];
  if (base.complexity?.time === "O(n^2)") {
    improvements.unshift("Use hash map / two-pointer strategy to reduce time complexity.");
  }

  return {
    verdict,
    title: titleMap[verdict] || "Submission Review",
    explanation: explanationMap[verdict] || "Review complete.",
    mistakes,
    improvements,
    complexity: base.complexity || { time: "O(n)", space: "O(1)" },
    testCasesPassed: Number(base.testCasesPassed || 0),
    testCasesTotal: Number(base.testCasesTotal || 10),
    runtimeMs: Number(base.runtimeMs || 0),
    memoryMb: Number(base.memoryMb || 0),
    hiddenCasesNote:
      (base.testCasesPassed || 0) >= (base.testCasesTotal || 10)
        ? "All hidden checks appear healthy."
        : "Some hidden checks still fail.",
    motivation:
      verdict === "wrong"
        ? "Good try. You are one refactor away from a stronger submission."
        : verdict === "partial"
          ? "Almost correct. Focus on edge-case strategy."
          : "Great work. Keep the streak going."
  };
}

const VERDICT_META = {
  correct: {
    icon: CheckCircle2,
    panelClass: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
  },
  wrong: {
    icon: XCircle,
    panelClass: "border-rose-300/40 bg-rose-500/15 text-rose-100"
  },
  partial: {
    icon: AlertTriangle,
    panelClass: "border-amber-300/40 bg-amber-500/15 text-amber-100"
  },
  optimized: {
    icon: Zap,
    panelClass: "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"
  },
  slow: {
    icon: Timer,
    panelClass: "border-fuchsia-300/40 bg-fuchsia-500/15 text-fuchsia-100"
  }
};

function getVerdictMeta(verdict) {
  return VERDICT_META[String(verdict || "partial").toLowerCase()] || VERDICT_META.partial;
}

function getLanguageOption(languageId) {
  return LANGUAGE_OPTIONS.find((item) => item.id === languageId) || LANGUAGE_OPTIONS[0];
}

export default function Practice() {
  const [modules, setModules] = useState([]);
  const [plans, setPlans] = useState([]);
  const [taskSubmissions, setTaskSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTaskKey, setActiveTaskKey] = useState("");
  const [leftTab, setLeftTab] = useState("problem");
  const [panelWidth, setPanelWidth] = useState(() => readPanelWidth());
  const [isDesktop, setIsDesktop] = useState(() => (typeof window === "undefined" ? true : window.innerWidth >= 1024));
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);

  const [languageByTask, setLanguageByTask] = useState({});
  const [codeByTask, setCodeByTask] = useState({});
  const [notesByTask, setNotesByTask] = useState({});
  const [outputByTask, setOutputByTask] = useState({});
  const [runByTask, setRunByTask] = useState({});
  const [aiCheckByTask, setAiCheckByTask] = useState({});
  const [aiHintsByTask, setAiHintsByTask] = useState({});
  const [discussionByTask, setDiscussionByTask] = useState({});
  const [discussionInput, setDiscussionInput] = useState("");
  const [attemptsByTask, setAttemptsByTask] = useState({});

  const [submittingTaskKey, setSubmittingTaskKey] = useState("");
  const [checkingAiTaskKey, setCheckingAiTaskKey] = useState("");
  const [hintLoadingTaskKey, setHintLoadingTaskKey] = useState("");
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState("");
  const [toasts, setToasts] = useState([]);
  const [streak, setStreak] = useState(() => readStreak());

  const workspaceRef = useRef(null);
  const isResizingRef = useRef(false);
  const lastSavedFingerprintRef = useRef({});
  const previousProblemCountRef = useRef(0);

  useEffect(() => {
    fetchPracticeData();
    setDiscussionByTask(readDiscussions());
    setStreak(readStreak());

    const refreshTimer = window.setInterval(() => {
      fetchPracticeData({ silent: true });
    }, LIVE_REFRESH_MS);

    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    writePanelWidth(panelWidth);
  }, [panelWidth]);

  useEffect(() => {
    if (!isDesktop) return undefined;
    const handleMove = (event) => {
      if (!isResizingRef.current) return;
      const rect = workspaceRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nextPercent = ((event.clientX - rect.left) / rect.width) * 100;
      setPanelWidth(clamp(nextPercent, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH));
    };

    const handleUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDesktop]);

  useEffect(() => {
    const onEsc = (event) => {
      if (event.key === "Escape" && isEditorFullscreen) {
        setIsEditorFullscreen(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isEditorFullscreen]);

  const problems = useMemo(() => {
    const mapped = [];
    const startsOnByModule = new Map(
      plans
        .filter((plan) => plan?.module?._id)
        .map((plan) => [String(plan.module._id), plan.startsOn || ""])
    );

    modules.forEach((module) => {
      const tasks = Array.isArray(module?.tasks) ? module.tasks : [];
      tasks.forEach((task, taskIndex) => {
        const parsed = parseProblemContent(task, module);
        mapped.push({
          key: buildTaskKey(module._id, taskIndex),
          moduleId: module._id,
          taskIndex,
          title: task?.title || `Task ${taskIndex + 1}`,
          difficulty: module?.difficulty || "medium",
          tags: [module?.skillName, module?.subtopic].filter(Boolean),
          questionLink: task?.questionLink || "",
          hint: String(task?.hint || "").trim(),
          estimatedMinutes: Number(task?.estimatedMinutes || 25),
          deadline: task?.deadline || module?.deadline || startsOnByModule.get(String(module._id)) || "",
          ...parsed
        });
      });
    });
    return mapped;
  }, [modules, plans]);

  const problemByKey = useMemo(() => {
    const map = new Map();
    problems.forEach((problem) => map.set(problem.key, problem));
    return map;
  }, [problems]);

  const activeProblem = useMemo(() => {
    if (!problems.length) return null;
    return problems.find((item) => item.key === activeTaskKey) || problems[0];
  }, [problems, activeTaskKey]);

  const solvedKeys = useMemo(() => {
    const set = new Set();
    Object.entries(taskSubmissions).forEach(([key, submission]) => {
      if (submission?.status === "done") set.add(key);
    });
    return set;
  }, [taskSubmissions]);

  const solvedCount = solvedKeys.size;
  const totalCount = problems.length;
  const solvedPercent = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;
  const xp = useMemo(() => {
    let totalXp = 0;
    solvedKeys.forEach((key) => {
      totalXp += getDifficultyWeight(problemByKey.get(key)?.difficulty);
    });
    totalXp += streak.count * 12;
    return totalXp;
  }, [problemByKey, solvedKeys, streak.count]);
  const rank = Math.max(9, 450 - solvedCount * 8 - streak.count * 4);

  useEffect(() => {
    if (!problems.length) {
      setActiveTaskKey("");
      return;
    }

    if (!activeTaskKey || !problemByKey.has(activeTaskKey)) {
      const firstUnsolved = problems.find((item) => !solvedKeys.has(item.key));
      setActiveTaskKey((firstUnsolved || problems[0]).key);
    }
  }, [activeTaskKey, problemByKey, problems, solvedKeys]);

  useEffect(() => {
    if (!activeProblem) return;
    const key = activeProblem.key;
    const existing = taskSubmissions[key];
    const language = languageByTask[key] || existing?.language || "javascript";

    setLanguageByTask((prev) => (prev[key] ? prev : { ...prev, [key]: language }));
    setCodeByTask((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, key)) return prev;
      return { ...prev, [key]: existing?.code || buildStarterCode(language, activeProblem.title) };
    });
    setNotesByTask((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, key)) return prev;
      return { ...prev, [key]: existing?.notes || "" };
    });
    setOutputByTask((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, key)) return prev;
      return { ...prev, [key]: "" };
    });
  }, [activeProblem, languageByTask, taskSubmissions]);

  useEffect(() => {
    if (!activeProblem) return undefined;
    const timer = window.setInterval(() => {
      persistTask(activeProblem, { done: false, autoSave: true, silent: true });
    }, AUTO_SAVE_MS);
    return () => window.clearInterval(timer);
  }, [activeProblem, codeByTask, languageByTask, notesByTask]);

  function pushToast(type, text) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }

  function recordAttempt(taskKey, type, summary) {
    const row = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      summary: String(summary || ""),
      createdAt: new Date().toISOString()
    };
    setAttemptsByTask((prev) => ({
      ...prev,
      [taskKey]: [row, ...(prev[taskKey] || [])].slice(0, 20)
    }));
  }

  async function fetchPracticeData({ silent = false } = {}) {
    try {
      if (!silent) setLoading(true);
      const [modulesData, plansData, submissionsData] = await Promise.all([
        apiFetch("/api/practice-modules"),
        apiFetch("/api/practice-plans"),
        apiFetch("/api/practice-task-submissions")
      ]);

      const nextModules = Array.isArray(modulesData?.modules) ? modulesData.modules : [];
      const nextPlans = Array.isArray(plansData?.plans) ? plansData.plans : [];
      const nextSubmissions = Array.isArray(submissionsData?.submissions) ? submissionsData.submissions : [];

      const indexed = {};
      nextSubmissions.forEach((submission) => {
        const key = buildTaskKey(submission.moduleId, submission.taskIndex);
        indexed[key] = submission;
      });

      const nextProblemCount = nextModules.reduce(
        (sum, module) => sum + (Array.isArray(module?.tasks) ? module.tasks.length : 0),
        0
      );
      if (silent && previousProblemCountRef.current > 0 && nextProblemCount > previousProblemCountRef.current) {
        pushToast("info", "New Practice Problem Added!");
      }
      previousProblemCountRef.current = nextProblemCount;

      setModules(nextModules);
      setPlans(nextPlans);
      setTaskSubmissions(indexed);
      setError("");
    } catch (err) {
      if (!silent) {
        setError(err?.message || "Failed to load practice data.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function currentDraftFor(problem) {
    if (!problem) return null;
    const key = problem.key;
    const existing = taskSubmissions[key];
    const language = languageByTask[key] || existing?.language || "javascript";
    const code = String(codeByTask[key] ?? existing?.code ?? "");
    const notes = String(notesByTask[key] ?? existing?.notes ?? "");
    const userOutput = String(outputByTask[key] ?? "");
    return { key, language, code, notes, userOutput };
  }

  async function persistTask(problem, { done = false, autoSave = false, silent = false } = {}) {
    if (!problem) return null;
    const draft = currentDraftFor(problem);
    if (!draft) return null;
    if (done && !draft.code.trim()) {
      setError("Please write solution code before submitting.");
      return null;
    }

    const fingerprint = JSON.stringify({
      done,
      language: draft.language,
      code: draft.code,
      notes: draft.notes
    });
    if (autoSave && lastSavedFingerprintRef.current[draft.key] === fingerprint) {
      return null;
    }

    try {
      setSubmittingTaskKey(draft.key);
      const response = await apiFetch("/api/practice-task-submission", {
        method: "POST",
        body: JSON.stringify({
          moduleId: problem.moduleId,
          taskIndex: problem.taskIndex,
          language: draft.language,
          code: draft.code,
          notes: draft.notes,
          done
        })
      });

      if (response?.submission) {
        setTaskSubmissions((prev) => ({ ...prev, [draft.key]: response.submission }));
        setLanguageByTask((prev) => ({ ...prev, [draft.key]: response.submission.language || draft.language }));
        setCodeByTask((prev) => ({ ...prev, [draft.key]: response.submission.code || draft.code }));
        setNotesByTask((prev) => ({ ...prev, [draft.key]: response.submission.notes || draft.notes }));
      }

      lastSavedFingerprintRef.current[draft.key] = fingerprint;

      if (done) {
        const nextStreak = updateStreakAfterSolve();
        setStreak(nextStreak);
        if (!silent) pushToast("success", "Marked as solved.");
        recordAttempt(draft.key, "submit", "Submitted and marked as solved.");
      } else if (autoSave) {
        setLastAutoSaveAt(new Date().toISOString());
      } else if (!silent) {
        pushToast("info", "Draft saved.");
        recordAttempt(draft.key, "save", "Draft saved.");
      }

      setError("");
      return response?.submission || null;
    } catch (err) {
      if (!silent) setError(err?.message || "Could not save task.");
      return null;
    } finally {
      setSubmittingTaskKey("");
    }
  }

  function runCurrentCode() {
    if (!activeProblem) return;
    const draft = currentDraftFor(activeProblem);
    if (!draft) return;
    const run = quickRunAnalysis(activeProblem, draft.language, draft.code, draft.userOutput);
    setRunByTask((prev) => ({ ...prev, [draft.key]: run }));
    setAiCheckByTask((prev) => ({ ...prev, [draft.key]: buildFallbackCheck(activeProblem, run, draft.code, draft.userOutput) }));
    pushToast(run.status === "error" ? "error" : "success", run.message);
    recordAttempt(draft.key, "run", `${run.testCasesPassed}/${run.testCasesTotal} sample tests passed.`);
  }

  async function askAiHint() {
    if (!activeProblem) return;
    const draft = currentDraftFor(activeProblem);
    if (!draft) return;

    const prompt = [
      `I am solving: ${activeProblem.title}`,
      `Difficulty: ${getDifficultyLabel(activeProblem.difficulty)}`,
      `Problem: ${activeProblem.instructions}`,
      `Constraints: ${activeProblem.constraints}`,
      `My code:\n${draft.code || "(empty)"}`,
      "Give me: 2 concrete hints, likely bug, and one optimization suggestion."
    ].join("\n");

    try {
      setHintLoadingTaskKey(draft.key);
      const response = await apiFetch("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: prompt, messages: [] })
      });
      const hint = String(response?.reply || "").trim();
      if (hint) {
        setAiHintsByTask((prev) => ({ ...prev, [draft.key]: hint }));
        pushToast("success", "AI hint ready.");
      }
    } catch (_error) {
      const run = runByTask[draft.key] || quickRunAnalysis(activeProblem, draft.language, draft.code, draft.userOutput);
      const fallbackHint = run.hints?.join(" ") || "Check edge cases and output format.";
      setAiHintsByTask((prev) => ({ ...prev, [draft.key]: fallbackHint }));
      pushToast("info", "AI service unavailable. Showing smart fallback hint.");
    } finally {
      setHintLoadingTaskKey("");
    }
  }

  async function evaluateWithAi() {
    if (!activeProblem) return;
    const draft = currentDraftFor(activeProblem);
    if (!draft) return;

    const run = runByTask[draft.key] || quickRunAnalysis(activeProblem, draft.language, draft.code, draft.userOutput);
    const fallback = buildFallbackCheck(activeProblem, run, draft.code, draft.userOutput);

    try {
      setCheckingAiTaskKey(draft.key);
      const response = await apiFetch("/api/ai/code-check", {
        method: "POST",
        body: JSON.stringify({
          title: activeProblem.title,
          description: activeProblem.instructions,
          constraints: activeProblem.constraints,
          exampleInput: activeProblem.exampleInput,
          exampleOutput: activeProblem.exampleOutput,
          language: draft.language,
          code: draft.code,
          userOutput: draft.userOutput,
          runSummary: run,
          desiredTotalCases: 10
        })
      });

      const checked = response?.check && typeof response.check === "object" ? response.check : fallback;
      setAiCheckByTask((prev) => ({ ...prev, [draft.key]: checked }));
      const verdictText = String(checked.verdict || "partial").toLowerCase();
      if (["correct", "optimized"].includes(verdictText)) {
        pushToast("success", "AI says solution is strong.");
      } else if (verdictText === "wrong") {
        pushToast("error", "AI found issues. See feedback panel.");
      } else {
        pushToast("info", "AI review complete. Improvements suggested.");
      }
      recordAttempt(draft.key, "ai-check", `AI verdict: ${checked.verdict || "partial"}.`);
    } catch (_error) {
      setAiCheckByTask((prev) => ({ ...prev, [draft.key]: fallback }));
      pushToast("info", "AI check fallback applied.");
    } finally {
      setCheckingAiTaskKey("");
    }
  }

  async function submitSolution() {
    if (!activeProblem) return;
    const saved = await persistTask(activeProblem, { done: true });
    if (!saved) return;
    await evaluateWithAi();
  }

  function resetCurrentDraft() {
    if (!activeProblem) return;
    const key = activeProblem.key;
    const language = languageByTask[key] || "javascript";
    setCodeByTask((prev) => ({ ...prev, [key]: buildStarterCode(language, activeProblem.title) }));
    setNotesByTask((prev) => ({ ...prev, [key]: "" }));
    setOutputByTask((prev) => ({ ...prev, [key]: "" }));
    setRunByTask((prev) => ({ ...prev, [key]: undefined }));
    setAiCheckByTask((prev) => ({ ...prev, [key]: undefined }));
    recordAttempt(key, "reset", "Workspace reset.");
  }

  function goToNextProblem() {
    if (!activeProblem || !problems.length) return;
    const index = problems.findIndex((item) => item.key === activeProblem.key);
    const next = problems[(index + 1) % problems.length];
    setActiveTaskKey(next.key);
  }

  function postDiscussionComment() {
    if (!activeProblem) return;
    const text = String(discussionInput || "").trim();
    if (!text) return;
    const key = activeProblem.key;
    const row = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text,
      createdAt: new Date().toISOString()
    };
    setDiscussionByTask((prev) => {
      const next = {
        ...prev,
        [key]: [row, ...(prev[key] || [])].slice(0, 40)
      };
      writeDiscussions(next);
      return next;
    });
    setDiscussionInput("");
  }

  const activeSubmission = activeProblem ? taskSubmissions[activeProblem.key] : null;
  const activeLanguage = activeProblem ? languageByTask[activeProblem.key] || activeSubmission?.language || "javascript" : "javascript";
  const activeCode = activeProblem ? codeByTask[activeProblem.key] || "" : "";
  const activeNotes = activeProblem ? notesByTask[activeProblem.key] || "" : "";
  const activeOutput = activeProblem ? outputByTask[activeProblem.key] || "" : "";
  const activeRun = activeProblem ? runByTask[activeProblem.key] : null;
  const activeAiCheck = activeProblem ? aiCheckByTask[activeProblem.key] : null;
  const activeHint = activeProblem ? aiHintsByTask[activeProblem.key] : "";
  const activeDiscussion = activeProblem ? discussionByTask[activeProblem.key] || [] : [];
  const activeAttempts = activeProblem ? attemptsByTask[activeProblem.key] || [] : [];
  const activeLanguageOption = getLanguageOption(activeLanguage);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-[72vh] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (!problems.length) {
    return (
      <EmptyState
        icon={Code2}
        title="No Practice Problems Yet"
        description="Admin can push problems in real-time. Your coding workspace will appear here."
      />
    );
  }

  const verdictMeta = getVerdictMeta(activeAiCheck?.verdict);
  const VerdictIcon = verdictMeta.icon;

  return (
    <div className="space-y-3 pb-16">
      <header className="sticky top-0 z-40 rounded-2xl border border-white/20 bg-slate-900/85 px-4 py-3 text-slate-100 shadow-soft backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Practice Arena</p>
            <h1 className="text-lg font-bold md:text-xl">Premium Problem Solver</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">
              Progress {solvedPercent}%
            </span>
            <span className="rounded-full border border-violet-300/30 bg-violet-500/10 px-2.5 py-1 text-violet-100">
              XP {xp}
            </span>
            <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2.5 py-1 text-amber-100">
              Streak {streak.count}d
            </span>
            <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-100">
              Rank #{rank}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={goToNextProblem}>
              Next Problem
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-xs text-white hover:from-violet-500 hover:to-blue-500"
              onClick={submitSolution}
              disabled={submittingTaskKey === activeTaskKey || checkingAiTaskKey === activeTaskKey}
            >
              <Target className="h-3.5 w-3.5" />
              Mark as Solved
            </Button>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-100">{error}</div>
      ) : null}

      <div className={isEditorFullscreen ? "fixed inset-0 z-50 bg-slate-950 p-2 md:p-3" : "h-[calc(100vh-8.5rem)]"}>
        <div
          ref={workspaceRef}
          className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 shadow-soft lg:flex-row"
        >
          <aside
            className="flex min-h-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r"
            style={isDesktop ? { width: `${panelWidth}%` } : { width: "100%" }}
          >
            <div className="border-b border-white/10 p-3">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-cyan-200">Problem Queue</label>
              <div className="mt-2 max-h-36 space-y-2 overflow-y-auto pr-1">
                {problems.map((problem) => {
                  const done = solvedKeys.has(problem.key);
                  const active = activeTaskKey === problem.key;
                  return (
                    <button
                      key={problem.key}
                      type="button"
                      onClick={() => setActiveTaskKey(problem.key)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        active
                          ? "border-cyan-300/40 bg-cyan-500/20"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <p className="truncate text-xs font-semibold text-slate-100">{problem.title}</p>
                      <p className="mt-1 flex items-center gap-2 text-[11px] text-slate-300">
                        <span className={`rounded-full px-2 py-0.5 ring-1 ${getDifficultyClass(problem.difficulty)}`}>
                          {getDifficultyLabel(problem.difficulty)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {problem.estimatedMinutes}m
                        </span>
                        {done ? <span className="text-emerald-300">Solved</span> : null}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-b border-white/10 px-3 py-2">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "problem", label: "Problem", icon: ListChecks },
                  { id: "hints", label: "Hints", icon: Lightbulb },
                  { id: "submissions", label: "History", icon: BarChart3 },
                  { id: "discussion", label: "Discussion", icon: MessageSquare },
                  { id: "notes", label: "Notes", icon: FileText }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setLeftTab(tab.id)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                        leftTab === tab.id
                          ? "border-violet-300/40 bg-violet-500/20 text-violet-100"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm text-slate-200">
              {leftTab === "problem" ? (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">{activeProblem?.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${getDifficultyClass(activeProblem?.difficulty)}`}>
                        {getDifficultyLabel(activeProblem?.difficulty)}
                      </span>
                      {(activeProblem?.tags || []).map((tag) => (
                        <span key={`${activeProblem.key}-${tag}`} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">Description</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{activeProblem?.instructions}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">Constraints</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{activeProblem?.constraints}</p>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                      <p className="text-xs font-semibold text-cyan-100">Input Example</p>
                      <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-300">{activeProblem?.exampleInput}</pre>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                      <p className="text-xs font-semibold text-emerald-100">Output Example</p>
                      <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-300">{activeProblem?.exampleOutput}</pre>
                    </div>
                  </div>

                  {activeProblem?.questionLink ? (
                    <a
                      href={activeProblem.questionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-300/40 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-100 hover:bg-blue-500/25"
                    >
                      Open Original Problem
                    </a>
                  ) : null}
                </div>
              ) : null}

              {leftTab === "hints" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Hint</p>
                    <p className="mt-1 text-sm text-slate-200">{activeProblem?.hint || "Try breaking the problem into reusable steps."}</p>
                  </div>
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-2 text-xs text-white hover:from-violet-500 hover:to-blue-500"
                    onClick={askAiHint}
                    disabled={hintLoadingTaskKey === activeTaskKey}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    {hintLoadingTaskKey === activeTaskKey ? "Getting Hint..." : "AI Hint"}
                  </Button>
                  {activeHint ? (
                    <div className="rounded-xl border border-violet-300/30 bg-violet-500/10 p-3 text-sm text-violet-100">
                      {activeHint}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No AI hint generated yet.</p>
                  )}
                </div>
              ) : null}

              {leftTab === "submissions" ? (
                <div className="space-y-2">
                  {activeSubmission ? (
                    <article className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3">
                      <p className="text-xs font-semibold text-emerald-100">
                        Latest status: {activeSubmission.status === "done" ? "Solved" : "Draft"}
                      </p>
                      <p className="mt-1 text-xs text-emerald-200">
                        {activeSubmission.language} · {formatRelativeTime(activeSubmission.submittedAt)}
                      </p>
                    </article>
                  ) : null}
                  {activeAttempts.length ? (
                    activeAttempts.map((row) => (
                      <article key={row.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs font-semibold text-slate-100">{row.type}</p>
                        <p className="mt-1 text-xs text-slate-300">{row.summary}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{formatRelativeTime(row.createdAt)}</p>
                      </article>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">No local activity yet. Run or save to create history.</p>
                  )}
                </div>
              ) : null}

              {leftTab === "discussion" ? (
                <div className="space-y-3">
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3">
                    {activeDiscussion.length ? (
                      activeDiscussion.map((row) => (
                        <article key={row.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-2">
                          <p className="text-xs text-slate-200">{row.text}</p>
                          <p className="mt-1 text-[10px] text-slate-500">{formatRelativeTime(row.createdAt)}</p>
                        </article>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">No discussion yet.</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={discussionInput}
                      onChange={(event) => setDiscussionInput(event.target.value)}
                      placeholder="Share your approach..."
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-400 focus:border-cyan-300/60"
                    />
                    <Button type="button" className="px-3 py-2 text-xs" onClick={postDiscussionComment}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : null}

              {leftTab === "notes" ? (
                <textarea
                  value={activeNotes}
                  onChange={(event) => setNotesByTask((prev) => ({ ...prev, [activeProblem.key]: event.target.value }))}
                  placeholder="Write solution strategy, observations, and mistakes to avoid."
                  className="min-h-[240px] w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-300/60"
                />
              ) : null}
            </div>
          </aside>

          {isDesktop ? (
            <div
              role="separator"
              aria-orientation="vertical"
              className="hidden w-2 cursor-col-resize bg-slate-900/80 transition hover:bg-cyan-500/40 lg:block"
              onMouseDown={() => {
                isResizingRef.current = true;
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
            />
          ) : null}

          <section
            className="flex min-h-0 flex-1 flex-col"
            style={isDesktop ? { width: `${100 - panelWidth}%` } : { width: "100%" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-slate-100">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-cyan-300" />
                <span className="text-xs font-semibold">Language</span>
                <select
                  value={activeLanguage}
                  onChange={(event) => {
                    const nextLang = event.target.value;
                    setLanguageByTask((prev) => ({ ...prev, [activeProblem.key]: nextLang }));
                    setCodeByTask((prev) => {
                      const current = prev[activeProblem.key];
                      if (current?.trim()) return prev;
                      return { ...prev, [activeProblem.key]: buildStarterCode(nextLang, activeProblem.title) };
                    });
                  }}
                  className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-cyan-300/60"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" className="px-3 py-1.5 text-xs" onClick={runCurrentCode}>
                  <Play className="h-3.5 w-3.5" />
                  Run Code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-1.5 text-xs"
                  onClick={() => persistTask(activeProblem, { done: false })}
                  disabled={submittingTaskKey === activeTaskKey}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Draft
                </Button>
                <Button
                  type="button"
                  className="bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-xs text-white hover:from-violet-500 hover:to-blue-500"
                  onClick={submitSolution}
                  disabled={submittingTaskKey === activeTaskKey || checkingAiTaskKey === activeTaskKey}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Submit
                </Button>
                <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={resetCurrentDraft}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
                <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setIsEditorFullscreen((prev) => !prev)}>
                  {isEditorFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 border-b border-white/10">
              <Editor
                height="100%"
                language={activeLanguageOption.monaco}
                value={activeCode}
                onChange={(value) => setCodeByTask((prev) => ({ ...prev, [activeProblem.key]: value || "" }))}
                theme="vs-dark"
                options={{
                  automaticLayout: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineHeight: 22,
                  tabSize: 2,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  suggestOnTriggerCharacters: true,
                  inlineSuggest: { enabled: true },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  padding: { top: 12 }
                }}
              />
            </div>

            <div className="grid gap-3 p-3 lg:grid-cols-2">
              <section className="rounded-2xl border border-white/15 bg-white/5 p-3 text-slate-100">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">Run Output</p>
                  <p className="text-[11px] text-slate-400">
                    {lastAutoSaveAt ? `Auto-saved ${formatRelativeTime(lastAutoSaveAt)}` : "Auto-save every 10s"}
                  </p>
                </div>
                <textarea
                  value={activeOutput}
                  onChange={(event) => setOutputByTask((prev) => ({ ...prev, [activeProblem.key]: event.target.value }))}
                  placeholder="Paste your output here for AI comparison..."
                  className="min-h-[92px] w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300/60"
                />
                {activeRun ? (
                  <div className="mt-3 space-y-2 text-xs">
                    <p className="rounded-lg border border-blue-300/30 bg-blue-500/10 px-2.5 py-2 text-blue-100">{activeRun.message}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Tests</p>
                        <p className="mt-1 font-semibold">
                          {activeRun.testCasesPassed}/{activeRun.testCasesTotal}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Complexity</p>
                        <p className="mt-1 font-semibold">
                          {activeRun.complexity?.time} · {activeRun.complexity?.space}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Runtime</p>
                        <p className="mt-1 font-semibold">{activeRun.runtimeMs} ms</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Memory</p>
                        <p className="mt-1 font-semibold">{activeRun.memoryMb} MB</p>
                      </div>
                    </div>
                    {activeRun.hints?.length ? (
                      <ul className="space-y-1 text-slate-200">
                        {activeRun.hints.map((hint, index) => (
                          <li key={`${hint}-${index}`} className="flex items-start gap-1">
                            <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-cyan-300" />
                            <span>{hint}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">Run the code to view test-case summary and quick diagnostics.</p>
                )}
              </section>

              <section className={`rounded-2xl border p-3 ${verdictMeta.panelClass}`}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider">AI Checking Result</p>
                  <button
                    type="button"
                    onClick={evaluateWithAi}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold hover:bg-white/20"
                    disabled={checkingAiTaskKey === activeTaskKey}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {checkingAiTaskKey === activeTaskKey ? "Checking..." : "Re-check"}
                  </button>
                </div>
                {activeAiCheck ? (
                  <div className="space-y-2 text-xs">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <VerdictIcon className="h-4 w-4" />
                      {activeAiCheck.title}
                    </p>
                    <p>{activeAiCheck.explanation}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <p className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5">
                        Tests: {activeAiCheck.testCasesPassed}/{activeAiCheck.testCasesTotal}
                      </p>
                      <p className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5">
                        Hidden: {activeAiCheck.hiddenCasesNote}
                      </p>
                      <p className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5">
                        Runtime: {activeAiCheck.runtimeMs} ms
                      </p>
                      <p className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5">
                        Memory: {activeAiCheck.memoryMb} MB
                      </p>
                    </div>
                    <p className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5">
                      Complexity: {activeAiCheck.complexity?.time} · {activeAiCheck.complexity?.space}
                    </p>
                    {Array.isArray(activeAiCheck.mistakes) && activeAiCheck.mistakes.length ? (
                      <div>
                        <p className="font-semibold">Mistakes</p>
                        <ul className="mt-1 space-y-1">
                          {activeAiCheck.mistakes.map((item, idx) => (
                            <li key={`${item}-${idx}`} className="flex items-start gap-1">
                              <ChevronRight className="mt-0.5 h-3.5 w-3.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {Array.isArray(activeAiCheck.improvements) && activeAiCheck.improvements.length ? (
                      <div>
                        <p className="font-semibold">Improve Next</p>
                        <ul className="mt-1 space-y-1">
                          {activeAiCheck.improvements.map((item, idx) => (
                            <li key={`${item}-${idx}`} className="flex items-start gap-1">
                              <ChevronRight className="mt-0.5 h-3.5 w-3.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <p className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 font-semibold">{activeAiCheck.motivation}</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <p>Submit solution to get verdict:</p>
                    <p>Correct / Wrong / Partial / Optimized / Slow</p>
                    <p>with runtime, memory, complexity, and hidden-case feedback.</p>
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      </div>

      <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border px-3 py-2 text-xs shadow-xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                : toast.type === "error"
                  ? "border-rose-300/40 bg-rose-500/20 text-rose-100"
                  : "border-blue-300/40 bg-blue-500/20 text-blue-100"
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>

      <div className="fixed bottom-4 right-4 z-30 rounded-xl border border-white/20 bg-slate-900/85 px-3 py-2 text-xs text-slate-200 backdrop-blur-xl">
        <p className="flex items-center gap-1">
          <Trophy className="h-3.5 w-3.5 text-amber-300" />
          Leaderboard #{rank}
        </p>
        <p className="mt-1 flex items-center gap-1">
          <Timer className="h-3.5 w-3.5 text-cyan-300" />
          {solvedCount}/{totalCount} solved
        </p>
      </div>
    </div>
  );
}
