const RAW_OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const OPENAI_KEY = RAW_OPENAI_KEY.startsWith("AIza") ? "" : RAW_OPENAI_KEY;

const GEMINI_URL = (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_KEY = process.env.GEMINI_API_KEY || (RAW_OPENAI_KEY.startsWith("AIza") ? RAW_OPENAI_KEY : "");

function normalizeLowerList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((s) => String(s).toLowerCase());
}

function includesAny(list, keywords) {
  const hay = normalizeLowerList(list).join(" ");
  return keywords.some((keyword) => hay.includes(keyword));
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function countMatches(text, keywords) {
  return keywords.reduce((count, keyword) => (text.includes(keyword) ? count + 1 : count), 0);
}

function dedupeList(list) {
  return [...new Set(list.filter(Boolean))];
}

function getAiProvider() {
  if (OPENAI_KEY) return "openai";
  if (GEMINI_KEY) return "gemini";
  return "fallback";
}

function hasRealtimeAI() {
  return getAiProvider() !== "fallback";
}

function summarizeUser(user) {
  const interests = (user?.interests || []).slice(0, 5).join(", ") || "not specified";
  const technicalSkills = (user?.technicalSkills || []).slice(0, 6).join(", ") || "not specified";
  const nonTechnicalSkills = (user?.nonTechnicalSkills || []).slice(0, 6).join(", ") || "not specified";
  const strengths = (user?.strengths || []).slice(0, 4).join(", ") || "not specified";
  const weaknesses = (user?.weaknesses || []).slice(0, 4).join(", ") || "not specified";
  const goals = (user?.goals || []).slice(0, 4).join(", ") || "not specified";

  return [
    `Name: ${user?.name || "Student"}`,
    `Course: ${user?.course || "not specified"}`,
    `Interests: ${interests}`,
    `Technical skills: ${technicalSkills}`,
    `Non-technical skills: ${nonTechnicalSkills}`,
    `Strengths: ${strengths}`,
    `Weaknesses: ${weaknesses}`,
    `Goals: ${goals}`
  ].join("\n");
}

function buildResponseInput(history = [], latestMessage = "") {
  const cleanedHistory = Array.isArray(history)
    ? history
        .filter((message) => message && (message.role === "user" || message.role === "assistant") && String(message.content || "").trim())
        .slice(-10)
        .map((message) => ({
          role: message.role,
          content: String(message.content || "").trim()
        }))
    : [];

  if (!cleanedHistory.length && latestMessage.trim()) {
    cleanedHistory.push({ role: "user", content: latestMessage.trim() });
  }

  return cleanedHistory;
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string" && part.text.trim()) {
        return part.text.trim();
      }
    }
  }

  return "";
}

async function requestOpenAI({ instructions, input, text }) {
  if (!OPENAI_KEY) {
    throw new Error("OPENAI_API_KEY is missing. Add it to server/.env to enable real AI Teacher responses.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${OPENAI_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions,
        input,
        text
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error?.message || `OpenAI request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function extractGeminiText(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) {
        return part.text.trim();
      }
    }
  }

  return "";
}

function logAiWarning(context, error) {
  // eslint-disable-next-line no-console
  console.warn(`[AI Teacher] ${context}: ${error?.message || error}`);
}

function buildGeminiContents(input) {
  if (Array.isArray(input)) {
    return input.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: String(message.content || "") }]
    }));
  }

  return [
    {
      role: "user",
      parts: [{ text: String(input || "") }]
    }
  ];
}

async function requestGemini({ instructions, input, jsonSchema }) {
  if (!GEMINI_KEY) {
    throw new Error("GEMINI_API_KEY is missing. Add it to server/.env to enable real AI Teacher responses.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${GEMINI_URL}/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_KEY
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: instructions }]
        },
        contents: buildGeminiContents(input),
        generationConfig: jsonSchema
          ? {
              responseMimeType: "application/json",
              responseJsonSchema: jsonSchema
            }
          : undefined
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error?.message || `Gemini request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function getPromptPool(topic = "communication") {
  const communicationPrompts = [
    {
      id: "intro",
      topic: "communication",
      category: "Self introduction",
      question: "Introduce yourself to a recruiter in about 60 seconds.",
      tip: "Start with who you are, what you are studying, one strength, and what you want next."
    },
    {
      id: "project",
      topic: "communication",
      category: "Project explanation",
      question: "Explain one project you built and why it matters.",
      tip: "Use this structure: problem, what you built, and the result or learning."
    },
    {
      id: "strength",
      topic: "communication",
      category: "Strength question",
      question: "What is one strength you are proud of, and how has it helped you?",
      tip: "Give one clear example instead of staying too general."
    },
    {
      id: "teamwork",
      topic: "communication",
      category: "Team discussion",
      question: "Describe a time you worked with others to solve a problem.",
      tip: "Talk about the situation, your role, and the outcome."
    }
  ];

  const hrInterviewPrompts = [
    {
      id: "hr-self-intro",
      topic: "interview-hr",
      category: "HR interview",
      question: "Tell me about yourself and why this role interests you.",
      tip: "Connect your background, your interests, and what kind of opportunity you want."
    },
    {
      id: "hr-strengths",
      topic: "interview-hr",
      category: "HR interview",
      question: "Why should we hire you for this role?",
      tip: "Pick 2 strengths, support them briefly, and relate them to the company or team."
    },
    {
      id: "hr-weakness",
      topic: "interview-hr",
      category: "HR interview",
      question: "What is one weakness you are actively improving?",
      tip: "Be honest, but end with what you are doing to improve it."
    },
    {
      id: "hr-conflict",
      topic: "interview-hr",
      category: "HR interview",
      question: "Describe a time you handled conflict or disagreement in a team.",
      tip: "Use situation, action, and result. Stay calm and professional."
    }
  ];

  const technicalInterviewPrompts = [
    {
      id: "tech-array",
      topic: "interview-technical",
      category: "Technical interview",
      question: "Explain arrays in simple words and give one real example of when you would use them.",
      tip: "Define the concept, then explain a use case clearly."
    },
    {
      id: "tech-complexity",
      topic: "interview-technical",
      category: "Technical interview",
      question: "How would you explain time complexity to a beginner?",
      tip: "Keep it simple: what it means, why it matters, and one example."
    },
    {
      id: "tech-project-stack",
      topic: "interview-technical",
      category: "Technical interview",
      question: "Pick one project and explain the stack, your contribution, and one technical challenge you solved.",
      tip: "Name the tools you used, your role, and how you solved the problem."
    },
    {
      id: "tech-debug",
      topic: "interview-technical",
      category: "Technical interview",
      question: "Tell me about a bug you fixed and how you approached debugging it.",
      tip: "Show your thinking process, not just the final fix."
    }
  ];

  const nonTechnicalInterviewPrompts = [
    {
      id: "nt-priority",
      topic: "interview-non-technical",
      category: "Non-technical interview",
      question: "How do you manage your time when you have multiple deadlines?",
      tip: "Mention prioritization, planning, and how you stay consistent."
    },
    {
      id: "nt-feedback",
      topic: "interview-non-technical",
      category: "Non-technical interview",
      question: "Describe a time you received feedback and what you changed after it.",
      tip: "Show openness, action, and the improvement you made."
    },
    {
      id: "nt-learning",
      topic: "interview-non-technical",
      category: "Non-technical interview",
      question: "How do you learn a new skill when you are unfamiliar with it?",
      tip: "Share your process clearly: learn, practice, review, and improve."
    },
    {
      id: "nt-pressure",
      topic: "interview-non-technical",
      category: "Non-technical interview",
      question: "Tell me about a stressful situation and how you handled it.",
      tip: "Stay calm, focus on your actions, and share the result."
    }
  ];

  const mixedInterviewPrompts = [
    ...hrInterviewPrompts,
    ...technicalInterviewPrompts,
    ...nonTechnicalInterviewPrompts
  ];

  const pools = {
    communication: communicationPrompts,
    speaking: communicationPrompts,
    interview: mixedInterviewPrompts,
    "interview-hr": hrInterviewPrompts,
    "interview-technical": technicalInterviewPrompts,
    "interview-non-technical": nonTechnicalInterviewPrompts
  };

  return pools[topic] || communicationPrompts;
}

function getFallbackPrompt({ topic, user }) {
  const normalizedTopic = String(topic || "communication");
  const pool = getPromptPool(normalizedTopic);
  const seedText = `${user?._id || user?.id || "anon"}:${normalizedTopic}:${Date.now()}`;
  const total = Array.from(seedText).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const prompt = pool[total % pool.length];

  return {
    ...prompt,
    encouragement:
      normalizedTopic === "communication"
        ? "Speak naturally. Aim for an opening, 2 clear points, and a short finish."
        : "Answer like you are in a real interview: direct answer, one example, and a confident closing line."
  };
}

function buildSampleAnswer({ question, user }) {
  const name = user?.name || "I";
  const course = user?.course || "my course";
  const strengths = user?.strengths || [];
  const technicalSkills = user?.technicalSkills || [];
  const interests = user?.interests || [];
  const firstStrength = strengths[0] || "consistency";
  const firstTechnicalSkill = technicalSkills[0] || interests[0] || "problem-solving";
  const lowerQuestion = String(question || "").toLowerCase();

  if (lowerQuestion.includes("introduce yourself") || lowerQuestion.includes("tell me about yourself")) {
    return `Hello, my name is ${name}. I am currently studying ${course}. I enjoy building my skills step by step, especially in ${firstTechnicalSkill}. One strength I rely on is ${firstStrength}, and I am looking for opportunities where I can learn fast, contribute consistently, and keep improving through real work.`;
  }

  if (lowerQuestion.includes("why should we hire you")) {
    return "You should hire me because I learn quickly, stay consistent, and take feedback seriously. I try to understand the problem clearly, work steadily, and improve my approach when I find a better way. I believe those habits will help me contribute well and grow into the role with confidence.";
  }

  if (lowerQuestion.includes("weakness")) {
    return "One weakness I am improving is that I sometimes spend too long trying to make my answer perfect before I share it. To improve that, I now practice speaking in shorter time limits and focus on being clear first, then refining later. That has already made me more confident and more efficient.";
  }

  if (lowerQuestion.includes("array")) {
    return "An array is a way to store multiple values in a single ordered structure. It is useful when I need quick access by position, like storing marks for different subjects or keeping track of daily temperatures. Arrays are simple, fast to read by index, and often used as a starting point in problem solving.";
  }

  if (lowerQuestion.includes("time complexity")) {
    return "Time complexity describes how the amount of work grows as the input size grows. It helps us compare solutions and understand which one will scale better. For example, a loop through all elements is usually linear, while checking every pair of elements grows much faster.";
  }

  return `A strong answer to this question starts with a direct response, includes one example, and ends with a short takeaway. I would keep it simple, relevant, and aligned with my strengths such as ${firstStrength}.`;
}

function getAnswerFocus({ question, topic }) {
  const lowerQuestion = String(question || "").toLowerCase();
  const normalizedTopic = String(topic || "").toLowerCase();

  if (normalizedTopic === "interview-technical" || hasAny(lowerQuestion, ["array", "time complexity", "bug", "stack", "technical"])) {
    return {
      expectedKeywords: ["because", "for example", "used", "built", "solved", "challenge", "result"],
      improvementHint: "For technical answers, define the idea clearly, explain your approach, and include one example or result."
    };
  }

  if (normalizedTopic === "interview-hr" || hasAny(lowerQuestion, ["hire", "weakness", "strength", "role interests"])) {
    return {
      expectedKeywords: ["strength", "improve", "learn", "role", "team", "because"],
      improvementHint: "For HR answers, connect your strengths, motivation, and growth mindset to the role."
    };
  }

  if (normalizedTopic === "interview-non-technical" || hasAny(lowerQuestion, ["feedback", "stressful", "deadline", "time", "team"])) {
    return {
      expectedKeywords: ["situation", "action", "result", "improve", "learned", "priority"],
      improvementHint: "For non-technical answers, focus on the situation, what you did, and what changed after your action."
    };
  }

  return {
    expectedKeywords: ["because", "for example", "result", "learned"],
    improvementHint: "Try to add one clear reason or example so the answer sounds more complete."
  };
}

function buildSummary({ score, relevanceScore, structureScore, clarityScore }) {
  if (score >= 8 && relevanceScore >= 1.5 && structureScore >= 1.5) {
    return "This answer already sounds solid and relevant. A little more specificity can make it even stronger.";
  }

  if (score <= 4 || relevanceScore < 1) {
    return "Your answer has a base to work from, but it still feels too general for the question. Focus on relevance and one concrete example.";
  }

  if (clarityScore < 1) {
    return "The main idea is there, but the answer needs cleaner wording and better pacing so it is easier to follow.";
  }

  return "Your answer is moving in the right direction. Strengthen it with better structure and one sharper supporting detail.";
}

function fallbackReviewSpeakingAnswer({ question, answer, topic, user }) {
  const text = String(answer || "").trim();
  if (!text) {
    throw new Error("Answer is required.");
  }

  const words = text.split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  const sentences = text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const fillerMatches = lower.match(/\b(um|uh|like|actually|basically|you know)\b/g) || [];
  const focus = getAnswerFocus({ question, topic });
  const keywordMatches = countMatches(lower, focus.expectedKeywords);

  let score = 2;
  let structureScore = 0;
  let relevanceScore = 0;
  let clarityScore = 0;

  const strengths = [];
  const improvements = [];

  if (words.length >= 35 && words.length <= 140) {
    score += 2;
    strengths.push("Your answer length is in a useful range, so it has enough detail without feeling too long.");
  } else if (words.length < 35) {
    improvements.push("Your answer is a little too short. Add one supporting point or small example.");
  } else {
    improvements.push("Your answer is getting long. Tighten it so the main point is easier to follow.");
    score += 1;
  }

  if (sentences.length >= 3) {
    structureScore += 2;
    score += 2;
    strengths.push("You have a clearer structure, which makes the answer easier to understand.");
  } else if (sentences.length === 2) {
    structureScore += 1;
    score += 1;
    improvements.push("Add a clearer middle point so the answer feels more structured.");
  } else {
    improvements.push("Use a simple structure: direct answer, 1-2 supporting points, then a short close.");
  }

  if (keywordMatches >= 2 || hasAny(lower, ["for example", "for instance", "because", "result", "learned"])) {
    relevanceScore += 2;
    score += 2;
    strengths.push("You added explanation or evidence, which makes the answer more convincing.");
  } else if (keywordMatches === 1) {
    relevanceScore += 1;
    score += 1;
    improvements.push("Push the answer a little further with one clearer example or outcome.");
  } else {
    improvements.push(focus.improvementHint);
  }

  if (fillerMatches.length <= 1) {
    clarityScore += 2;
    score += 2;
    strengths.push("Your wording sounds fairly clean, which helps you come across as more confident.");
  } else if (fillerMatches.length <= 3) {
    clarityScore += 1;
    score += 1;
    improvements.push("Reduce filler words so your delivery sounds calmer and more confident.");
  } else {
    improvements.push("There are too many filler words right now. Slow down and pause instead of filling the silence.");
  }

  if (!hasAny(lower, ["i", "my", "we"])) {
    improvements.push("Make the answer more personal by explaining what you did, learned, or handled.");
  } else {
    score += 1;
  }

  if (!strengths.length) {
    strengths.push("You answered the question directly, which is a strong starting habit.");
  }

  const roundedScore = Math.max(1, Math.min(10, Math.round(score)));
  const summary = buildSummary({ score: roundedScore, relevanceScore, structureScore, clarityScore });

  return {
    score: roundedScore,
    summary,
    strengths: dedupeList(strengths).slice(0, 3),
    improvements: dedupeList(improvements).slice(0, 3),
    nextStep:
      roundedScore >= 8
        ? "Try the same answer once more with a stronger closing sentence and steadier pacing."
        : "Try again using this flow: direct answer, 1-2 supporting points, one example, then a confident closing line.",
    sampleAnswer: buildSampleAnswer({ question, user })
  };
}

function fallbackGenerateAiReply({ message, user, adminAccess = false }) {
  const msg = String(message || "").toLowerCase();
  const weaknesses = user?.weaknesses || [];
  const interests = user?.interests || [];
  const wantsAdminRequest = hasAny(msg, [
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

  if (wantsAdminRequest && !adminAccess) {
    return "Please enter Admin ID and Password.";
  }

  if (wantsAdminRequest && adminAccess) {
    return [
      "Admin access verified.",
      "This assistant can help you draft tasks, announcements, interview schedules, or session notes.",
      "Live platform-wide admin data and write actions are not connected in this chat yet, so I will not invent analytics, student progress, or completed actions."
    ].join("\n");
  }

  const wantsCommunicationHelp =
    msg.includes("communication") ||
    msg.includes("speak") ||
    msg.includes("presentation") ||
    includesAny(weaknesses, ["communication", "speak", "presentation"]);

  const wantsDsaCodingHelp =
    msg.includes("dsa") ||
    msg.includes("leetcode") ||
    msg.includes("problem") ||
    includesAny(interests, ["dsa", "cpp", "c++"]);

  const wantsPythonHelp = msg.includes("python") || includesAny(interests, ["python"]);
  const wantsInterviewHelp =
    msg.includes("interview") ||
    msg.includes("hr") ||
    msg.includes("technical question") ||
    msg.includes("non technical");

  const lines = [];
  lines.push("Here is a practical plan you can follow today:");

  if (wantsCommunicationHelp) {
    lines.push("- Speaking drill: answer one prompt for 60-90 seconds using opening, 2 points, and a short conclusion.");
    lines.push("- Record once, replay it, and rewrite one sentence so it sounds clearer and more confident.");
    lines.push("- If you want live feedback, switch to Speaking Practice and I will review your answer.");
  }

  if (wantsInterviewHelp) {
    lines.push("- Interview prep: practice one HR question, one technical question, and one situation-based question.");
    lines.push("- Keep every answer simple: direct answer, brief example, then one takeaway.");
    lines.push("- In Speaking Practice, choose HR, Technical, or Non-Technical interview mode for targeted questions.");
  }

  if (wantsDsaCodingHelp) {
    lines.push("- Coding focus: solve 2 problems, then write a 3-line explanation after each one.");
    lines.push("- If you get stuck, identify the pattern first: two pointers, sliding window, hashing, or binary search.");
  }

  if (wantsPythonHelp && !wantsDsaCodingHelp) {
    lines.push("- Python boost: practice one loop exercise, one function exercise, and explain your logic out loud.");
  }

  if (!wantsCommunicationHelp && !wantsDsaCodingHelp && !wantsPythonHelp && !wantsInterviewHelp) {
    lines.push("- Pick one small action: 20 minutes of focused practice, then a 5-minute review.");
    lines.push("- Tell me the exact topic and I will make the plan sharper.");
  }

  lines.push("Add OPENAI_API_KEY or GEMINI_API_KEY in server/.env when you want this teacher to become fully real-time and question-aware.");

  return lines.join("\n");
}

function buildChatInstructions(user, adminAccess = false) {
  return [
    "You are NextZen AI Teacher, a warm but direct personal mentor for students.",
    "You are inside a student platform with strict access control.",
    "There are only two access levels: Normal Student and Admin / Team Member.",
    "Never assume the user is admin.",
    "Admin access is granted only after correct Admin ID and Password have been verified by the server.",
    'If admin access is not verified and the user asks for admin features, reply exactly: "Please enter Admin ID and Password."',
    "If credentials are invalid, the server will return the denial. Do not override that.",
    "If admin access is not verified, do not provide admin-only data or admin-only actions.",
    "For non-admin users, only help with their own progress, doubts, and roadmap guidance.",
    "If admin access is verified, you may help with admin workflows, but never invent unavailable platform data or claim an action succeeded unless the app explicitly supports it.",
    "Answer the user's actual question, not a generic template.",
    "Be practical, specific, and adaptive to their profile.",
    "If the user asks for interview help, give a natural answer they can actually say aloud.",
    "If they ask how to improve, point out exact issues and concrete next steps.",
    "Keep replies concise but useful.",
    "Do not mention being a template or fallback.",
    `Current verified access level: ${adminAccess ? "Admin / Team Member" : "Normal Student"}`,
    "",
    "Student profile:",
    summarizeUser(user)
  ].join("\n");
}

function buildPromptInstructions(user, topic) {
  const topicLabel = String(topic || "communication");

  return [
    "You generate speaking practice prompts for students.",
    "Return JSON only that matches the supplied schema.",
    "Create one realistic question that the student can answer aloud in 45-90 seconds.",
    "Make it specific, natural, and relevant to the student's background when possible.",
    `Requested topic: ${topicLabel}`,
    "",
    "Student profile:",
    summarizeUser(user)
  ].join("\n");
}

function buildReviewInstructions(user, question, topic) {
  return [
    "You are an interview and communication coach.",
    "Review the student's answer based on the exact question they were asked.",
    "Return JSON only that matches the supplied schema.",
    "Use a 1-10 score realistically. Do not default to the same score each time.",
    "Point out exact strengths and exact improvements from the answer.",
    "Write a natural model answer the student can practice aloud.",
    `Question topic: ${String(topic || "communication")}`,
    `Question: ${String(question || "")}`,
    "",
    "Student profile:",
    summarizeUser(user)
  ].join("\n");
}

function buildRoadmapInstructions(user, idea) {
  return [
    "You create practical learning roadmaps for students.",
    "Return JSON only that matches the supplied schema.",
    "Generate a roadmap the student can realistically start right away.",
    "Make the roadmap specific to the user's idea and profile.",
    "Return exactly 7 day-by-day tasks.",
    "Each task should be concise and actionable.",
    `Roadmap idea: ${String(idea || "").trim()}`,
    "",
    "Student profile:",
    summarizeUser(user)
  ].join("\n");
}

async function generateAiReply({ message, user, history = [], adminAccess = false }) {
  const provider = getAiProvider();
  if (provider === "fallback") {
    return fallbackGenerateAiReply({ message, user, adminAccess });
  }

  try {
    const input = buildResponseInput(history, message);
    const payload =
      provider === "openai"
        ? await requestOpenAI({
            instructions: buildChatInstructions(user, adminAccess),
            input
          })
        : await requestGemini({
            instructions: buildChatInstructions(user, adminAccess),
            input
          });

    const reply = provider === "openai" ? extractOutputText(payload) : extractGeminiText(payload);
    if (!reply) {
      throw new Error("The AI service returned an empty reply.");
    }

    return reply;
  } catch (error) {
    logAiWarning("Chat request failed, using fallback reply", error);
    return fallbackGenerateAiReply({ message, user, adminAccess });
  }
}

async function getSpeakingPrompt({ topic, user }) {
  const provider = getAiProvider();
  if (provider === "fallback") {
    return getFallbackPrompt({ topic, user });
  }

  const schema = {
    type: "object",
    properties: {
      id: { type: "string" },
      topic: { type: "string" },
      category: { type: "string" },
      question: { type: "string" },
      tip: { type: "string" },
      encouragement: { type: "string" }
    },
    required: ["id", "topic", "category", "question", "tip", "encouragement"],
    additionalProperties: false
  };

  try {
    const payload =
      provider === "openai"
        ? await requestOpenAI({
            instructions: buildPromptInstructions(user, topic),
            input: `Create one speaking prompt for topic: ${String(topic || "communication")}. Return JSON only.`,
            text: {
              format: {
                type: "json_schema",
                name: "speaking_prompt",
                strict: true,
                schema
              }
            }
          })
        : await requestGemini({
            instructions: buildPromptInstructions(user, topic),
            input: `Create one speaking prompt for topic: ${String(topic || "communication")}. Return JSON only.`,
            jsonSchema: schema
          });

    const outputText = provider === "openai" ? extractOutputText(payload) : extractGeminiText(payload);
    const parsed = JSON.parse(outputText);

    return {
      id: parsed.id,
      topic: parsed.topic,
      category: parsed.category,
      question: parsed.question,
      tip: parsed.tip,
      encouragement: parsed.encouragement
    };
  } catch (error) {
    logAiWarning("Speaking prompt request failed, using fallback prompt", error);
    return getFallbackPrompt({ topic, user });
  }
}

async function reviewSpeakingAnswer({ question, answer, topic, user }) {
  const provider = getAiProvider();
  if (provider === "fallback") {
    return fallbackReviewSpeakingAnswer({ question, answer, topic, user });
  }

  const schema = {
    type: "object",
    properties: {
      score: { type: "integer" },
      summary: { type: "string" },
      strengths: {
        type: "array",
        items: { type: "string" }
      },
      improvements: {
        type: "array",
        items: { type: "string" }
      },
      nextStep: { type: "string" },
      sampleAnswer: { type: "string" }
    },
    required: ["score", "summary", "strengths", "improvements", "nextStep", "sampleAnswer"],
    additionalProperties: false
  };

  const input = [
    {
      role: "user",
      content: `Review this answer.\n\nQuestion: ${String(question || "")}\n\nAnswer: ${String(answer || "").trim()}`
    }
  ];

  try {
    const payload =
      provider === "openai"
        ? await requestOpenAI({
            instructions: buildReviewInstructions(user, question, topic),
            input,
            text: {
              format: {
                type: "json_schema",
                name: "speaking_review",
                strict: true,
                schema
              }
            }
          })
        : await requestGemini({
            instructions: buildReviewInstructions(user, question, topic),
            input,
            jsonSchema: schema
          });

    const outputText = provider === "openai" ? extractOutputText(payload) : extractGeminiText(payload);
    const parsed = JSON.parse(outputText);

    return {
      score: Math.max(1, Math.min(10, Number(parsed.score) || 1)),
      summary: String(parsed.summary || ""),
      strengths: dedupeList(Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : []).slice(0, 3),
      improvements: dedupeList(Array.isArray(parsed.improvements) ? parsed.improvements.map(String) : []).slice(0, 3),
      nextStep: String(parsed.nextStep || ""),
      sampleAnswer: String(parsed.sampleAnswer || "")
    };
  } catch (error) {
    logAiWarning("Speaking review request failed, using fallback feedback", error);
    return fallbackReviewSpeakingAnswer({ question, answer, topic, user });
  }
}

async function generateRoadmapFromIdea({ idea, user }) {
  const promptIdea = String(idea || "").trim();
  if (!promptIdea) {
    throw new Error("Roadmap idea is required.");
  }

  const provider = getAiProvider();
  if (provider === "fallback") {
    return {
      title: `${promptIdea} Roadmap`,
      duration: "2 Weeks",
      difficulty: "Personalized",
      tasks: [
        `Day 1: Understand the basics of ${promptIdea}`,
        `Day 2: Learn the core concepts and vocabulary of ${promptIdea}`,
        `Day 3: Practice one small hands-on task in ${promptIdea}`,
        `Day 4: Study a real example or mini-project in ${promptIdea}`,
        `Day 5: Solve one challenge related to ${promptIdea}`,
        `Day 6: Review mistakes and strengthen weak areas in ${promptIdea}`,
        `Day 7: Build or explain a small outcome based on ${promptIdea}`
      ]
    };
  }

  const schema = {
    type: "object",
    properties: {
      title: { type: "string" },
      duration: { type: "string" },
      difficulty: { type: "string" },
      tasks: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["title", "duration", "difficulty", "tasks"],
    additionalProperties: false
  };

  const input = `Create a roadmap for this idea: ${promptIdea}. Return JSON only.`;

  try {
    const payload =
      provider === "openai"
        ? await requestOpenAI({
            instructions: buildRoadmapInstructions(user, promptIdea),
            input,
            text: {
              format: {
                type: "json_schema",
                name: "custom_roadmap",
                strict: true,
                schema
              }
            }
          })
        : await requestGemini({
            instructions: buildRoadmapInstructions(user, promptIdea),
            input,
            jsonSchema: schema
          });

    const outputText = provider === "openai" ? extractOutputText(payload) : extractGeminiText(payload);
    const parsed = JSON.parse(outputText);

    return {
      title: String(parsed.title || `${promptIdea} Roadmap`).trim(),
      duration: String(parsed.duration || "Personalized").trim(),
      difficulty: String(parsed.difficulty || "Personalized").trim(),
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(String).filter(Boolean).slice(0, 7) : []
    };
  } catch (error) {
    logAiWarning("Roadmap generation failed, using fallback roadmap", error);
    return {
      title: `${promptIdea} Roadmap`,
      duration: "2 Weeks",
      difficulty: "Personalized",
      tasks: [
        `Day 1: Understand the basics of ${promptIdea}`,
        `Day 2: Learn the core concepts and vocabulary of ${promptIdea}`,
        `Day 3: Practice one small hands-on task in ${promptIdea}`,
        `Day 4: Study a real example or mini-project in ${promptIdea}`,
        `Day 5: Solve one challenge related to ${promptIdea}`,
        `Day 6: Review mistakes and strengthen weak areas in ${promptIdea}`,
        `Day 7: Build or explain a small outcome based on ${promptIdea}`
      ]
    };
  }
}

module.exports = {
  generateAiReply,
  getSpeakingPrompt,
  reviewSpeakingAnswer,
  generateRoadmapFromIdea,
  hasRealtimeAI,
  getAiProvider
};
