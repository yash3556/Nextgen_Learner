const express = require("express");

const User = require("../models/User");
const { generateAiReply, getSpeakingPrompt, reviewSpeakingAnswer, hasRealtimeAI, getAiProvider } = require("../utils/aiTeacher");
const { buildSkillGapAnalysis } = require("../utils/skillGapAnalysis");

const router = express.Router();

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isAdminFeatureRequest(text) {
  return hasAny(text, [
    "admin",
    "team member",
    "all student progress",
    "all students",
    "live session",
    "zoom",
    "meet link",
    "announcement",
    "announcements",
    "performance analytics",
    "analytics",
    "create task",
    "create homework",
    "interview schedule",
    "manage session",
    "manage sessions",
    "add link",
    "add links"
  ]);
}

function clampNumber(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseStructuredJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (_error) {
    // continue
  }

  const fencedMatches = raw.match(/```(?:json)?\s*([\s\S]*?)```/gi) || [];
  for (const block of fencedMatches) {
    const cleaned = block.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_error) {
      // continue
    }
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = raw.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_error) {
      // continue
    }
  }

  return null;
}

function estimateComplexityFromCode(code) {
  const source = String(code || "");
  const nestedLoopHint =
    /for[\s\S]{0,90}for/.test(source) ||
    /while[\s\S]{0,90}while/.test(source) ||
    /for[\s\S]{0,90}while/.test(source);
  const hasSingleLoop = /\b(for|while)\b/.test(source);
  const hasSort = /\.sort\s*\(|sort\s*\(/i.test(source);
  const hasMapSet = /\b(Map|Set|HashMap|unordered_map|dict)\b/.test(source);
  const hasArrayBuffer = /\[[^\]]*\]|\bvector<|\bArrayList<|\blist\b/i.test(source);

  let time = "O(n)";
  if (nestedLoopHint) time = "O(n^2)";
  else if (hasSort) time = "O(n log n)";
  else if (!hasSingleLoop) time = "O(1)-O(log n)";

  let space = "O(1)";
  if (hasMapSet || hasArrayBuffer) space = "O(n)";

  return { time, space };
}

function buildFallbackCodeCheck(payload) {
  const {
    code,
    userOutput,
    exampleOutput,
    runSummary,
    desiredTotalCases,
    complexity: precomputedComplexity
  } = payload;

  const normalizedCode = String(code || "").trim();
  const totalCases = clampNumber(desiredTotalCases || 10, 3, 20);
  const expected = normalizeWhitespace(exampleOutput);
  const got = normalizeWhitespace(userOutput);
  const hasUserOutput = Boolean(got);
  const sampleMatched = expected && hasUserOutput ? expected === got : false;

  const loopCount = (normalizedCode.match(/\b(for|while)\b/g) || []).length;
  const condCount = (normalizedCode.match(/\b(if|switch)\b/g) || []).length;
  const hasFunction = /\b(function|def|solve|main)\b/.test(normalizedCode);
  const todoLeft = /\b(TODO|todo|pass)\b/.test(normalizedCode);
  const structureScore = [loopCount > 0, condCount > 0, hasFunction, !todoLeft].filter(Boolean).length;

  let passed = 0;
  if (normalizedCode) {
    passed = structureScore + 2 + Math.min(3, loopCount);
    if (sampleMatched) passed += 2;
  }
  if (runSummary?.status === "error") passed = Math.min(passed, 2);
  passed = clampNumber(passed, 0, totalCases);

  const complexity = precomputedComplexity || estimateComplexityFromCode(normalizedCode);
  const ratio = totalCases > 0 ? passed / totalCases : 0;

  let verdict = "wrong";
  if (!normalizedCode) verdict = "wrong";
  else if (hasUserOutput && expected && !sampleMatched) verdict = "wrong";
  else if (ratio >= 0.9 && complexity.time !== "O(n^2)") verdict = "optimized";
  else if (ratio >= 0.85) verdict = "correct";
  else if (ratio >= 0.55) verdict = "partial";
  else verdict = "wrong";
  if (["optimized", "correct"].includes(verdict) && complexity.time === "O(n^2)") verdict = "slow";

  const runtimeMs = clampNumber(20 + normalizedCode.length * (complexity.time === "O(n^2)" ? 2.2 : 1.2), 18, 800);
  const memoryMb = clampNumber(18 + normalizedCode.length / 58 + (complexity.space === "O(n)" ? 7 : 0), 16, 128);

  const mistakes = [];
  if (!normalizedCode) mistakes.push("No solution code was provided.");
  if (runSummary?.status === "error") mistakes.push("Syntax/runtime issue detected while running sample checks.");
  if (hasUserOutput && expected && !sampleMatched) mistakes.push("Output format or values differ from expected sample output.");
  if (todoLeft) mistakes.push("Placeholder logic (TODO/pass) is still present.");
  if (!condCount) mistakes.push("Edge-case guards are missing.");
  if (!mistakes.length && verdict === "slow") mistakes.push("Correct direction, but loop nesting suggests avoidable time cost.");

  const improvements = [];
  if (complexity.time === "O(n^2)") improvements.push("Try a hash-map or two-pointer strategy to reduce quadratic loops.");
  if (!hasFunction) improvements.push("Wrap logic in a dedicated solve function for easier testing.");
  improvements.push("Add tests for boundary values and empty/single-element inputs.");
  improvements.push("Confirm exact output formatting, including spaces and line breaks.");

  const explanationMap = {
    correct: "Your approach appears correct across most checks.",
    wrong: "The solution is not passing enough checks yet.",
    partial: "The solution is partially correct but misses some edge scenarios.",
    optimized: "Strong solution quality and efficient complexity detected.",
    slow: "The logic is mostly correct but appears slower than needed."
  };

  const titleMap = {
    correct: "Correct Solution",
    wrong: "Wrong Answer",
    partial: "Partially Correct",
    optimized: "Optimized but Can Improve",
    slow: "Correct but Slow Solution"
  };

  return {
    verdict,
    title: titleMap[verdict] || "Submission Review",
    explanation: explanationMap[verdict] || "Solution review complete.",
    mistakes,
    improvements,
    complexity,
    testCasesPassed: passed,
    testCasesTotal: totalCases,
    runtimeMs,
    memoryMb,
    hiddenCasesNote: passed >= totalCases ? "All hidden checks look good." : "Some hidden checks are still failing.",
    motivation:
      verdict === "wrong"
        ? "Good try. Keep iterating and test against edge cases."
        : verdict === "partial"
          ? "Almost there. A few targeted fixes can unlock full correctness."
          : "Great work. Keep the momentum."
  };
}

function sanitizeCodeCheckResult(raw, fallback) {
  if (!raw || typeof raw !== "object") return fallback;

  const verdictCandidates = new Set(["correct", "wrong", "partial", "optimized", "slow"]);
  const verdict = verdictCandidates.has(String(raw.verdict || "").toLowerCase())
    ? String(raw.verdict).toLowerCase()
    : fallback.verdict;

  return {
    verdict,
    title: String(raw.title || fallback.title || "Submission Review"),
    explanation: String(raw.explanation || fallback.explanation || ""),
    mistakes: Array.isArray(raw.mistakes)
      ? raw.mistakes.map((item) => String(item)).slice(0, 6)
      : fallback.mistakes,
    improvements: Array.isArray(raw.improvements)
      ? raw.improvements.map((item) => String(item)).slice(0, 6)
      : fallback.improvements,
    complexity:
      raw.complexity && typeof raw.complexity === "object"
        ? {
            time: String(raw.complexity.time || fallback.complexity.time || "O(n)"),
            space: String(raw.complexity.space || fallback.complexity.space || "O(1)")
          }
        : fallback.complexity,
    testCasesPassed: clampNumber(raw.testCasesPassed ?? fallback.testCasesPassed, 0, fallback.testCasesTotal),
    testCasesTotal: clampNumber(raw.testCasesTotal ?? fallback.testCasesTotal, 1, 50),
    runtimeMs: clampNumber(raw.runtimeMs ?? fallback.runtimeMs, 1, 5000),
    memoryMb: clampNumber(raw.memoryMb ?? fallback.memoryMb, 1, 4096),
    hiddenCasesNote: String(raw.hiddenCasesNote || fallback.hiddenCasesNote || ""),
    motivation: String(raw.motivation || fallback.motivation || "")
  };
}

router.get("/status", (req, res) => {
  res.json({
    provider: getAiProvider(),
    realtime: hasRealtimeAI(),
    adminAuthenticated: req.user?.role === "admin"
  });
});

// GET /api/ai/skill-gap
router.get("/skill-gap", async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const analysis = buildSkillGapAnalysis(user);
    return res.json({ analysis });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to build skill gap analysis", error: err?.message });
  }
});

// POST /api/ai/chat
router.post("/chat", async (req, res) => {
  try {
    const { message, messages } = req.body || {};
    const userId = req.user?._id;

    const user = await User.findById(userId).lean();
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const normalizedMessage = normalizeText(message);
    const wantsAdminAccess = isAdminFeatureRequest(normalizedMessage);

    if (wantsAdminAccess && req.user?.role !== "admin") {
      return res.json({
        reply: "Access denied. Admin features are only available to admin accounts.",
        adminAuthenticated: false
      });
    }

    const reply = await generateAiReply({
      message,
      history: messages,
      user,
      adminAccess: req.user?.role === "admin"
    });

    return res.json({
      reply,
      adminAuthenticated: req.user?.role === "admin"
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    const message = err?.message || "Failed to chat";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    return res.status(status).json({ message, error: err?.message });
  }
});

// POST /api/ai/code-check
router.post("/code-check", async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const {
      title,
      description,
      constraints,
      exampleInput,
      exampleOutput,
      language,
      code,
      userOutput,
      runSummary,
      desiredTotalCases
    } = req.body || {};

    const safeTitle = String(title || "").trim() || "Practice Problem";
    const safeLanguage = String(language || "javascript").trim().toLowerCase();
    const safeCode = String(code || "");

    const fallback = buildFallbackCodeCheck({
      code: safeCode,
      userOutput,
      exampleOutput,
      runSummary,
      desiredTotalCases
    });

    const prompt = [
      "You are an interview coding judge.",
      "Evaluate the solution and return ONLY valid JSON (no markdown) with keys:",
      "verdict,title,explanation,mistakes,improvements,complexity,testCasesPassed,testCasesTotal,runtimeMs,memoryMb,hiddenCasesNote,motivation",
      "verdict must be one of: correct, wrong, partial, optimized, slow.",
      "Use concise feedback. Mention edge cases and output format correctness.",
      "",
      `Problem Title: ${safeTitle}`,
      `Language: ${safeLanguage}`,
      `Description: ${String(description || "").trim() || "N/A"}`,
      `Constraints: ${String(constraints || "").trim() || "N/A"}`,
      `Example Input: ${String(exampleInput || "").trim() || "N/A"}`,
      `Expected Output: ${String(exampleOutput || "").trim() || "N/A"}`,
      `User Output: ${String(userOutput || "").trim() || "N/A"}`,
      `Code:\n${safeCode || "(empty)"}`,
      `Local baseline (for guidance): ${JSON.stringify(fallback)}`
    ].join("\n");

    let reply = "";
    try {
      reply = await generateAiReply({
        message: prompt,
        history: [],
        user,
        adminAccess: req.user?.role === "admin"
      });
    } catch (_error) {
      reply = "";
    }

    const parsed = parseStructuredJson(reply);
    const check = sanitizeCodeCheckResult(parsed, fallback);

    return res.json({
      check,
      rawReply: reply || ""
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    const message = err?.message || "Failed to check code";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    return res.status(status).json({ message, error: err?.message });
  }
});

// GET /api/ai/speaking/prompt
router.get("/speaking/prompt", async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const topic = String(req.query?.topic || "communication");
    const prompt = await getSpeakingPrompt({ topic, user });
    return res.json({ prompt });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    const message = err?.message || "Failed to get speaking prompt";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    return res.status(status).json({ message, error: err?.message });
  }
});

// POST /api/ai/speaking/review
router.post("/speaking/review", async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const { question, answer, topic } = req.body || {};
    const feedback = await reviewSpeakingAnswer({ question, answer, topic, user });
    return res.json({ feedback });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    const message = err?.message || "Failed to review speaking answer";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    return res.status(status).json({ message, error: err?.message });
  }
});

module.exports = router;

