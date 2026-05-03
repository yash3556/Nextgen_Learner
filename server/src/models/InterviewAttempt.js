const mongoose = require("mongoose");

const scoreSchema = new mongoose.Schema(
  {
    accuracy: { type: Number, default: 0, min: 0, max: 10 },
    logic: { type: Number, default: 0, min: 0, max: 10 },
    communication: { type: Number, default: 0, min: 0, max: 10 }
  },
  { _id: false }
);

const questionLogSchema = new mongoose.Schema(
  {
    questionId: { type: String, default: "" },
    question: { type: String, required: true },
    weakArea: { type: String, default: "" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "easy" },
    answer: { type: String, default: "" },
    hintUsed: { type: Boolean, default: false },
    skipped: { type: Boolean, default: false },
    evaluation: { type: scoreSchema, default: () => ({}) },
    evaluatorNote: { type: String, default: "" }
  },
  { _id: false }
);

const interviewAttemptSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    interview: { type: mongoose.Schema.Types.ObjectId, ref: "MockInterview", default: null, index: true },
    source: { type: String, enum: ["ai_practice", "admin_interview"], default: "ai_practice" },
    role: { type: String, default: "General", trim: true },
    experienceLevel: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    maxQuestions: { type: Number, default: 5, min: 3, max: 10 },
    currentIndex: { type: Number, default: 0 },
    currentQuestionId: { type: String, default: "" },
    currentQuestion: { type: String, default: "" },
    currentWeakArea: { type: String, default: "" },
    currentDifficulty: { type: String, enum: ["easy", "medium", "hard"], default: "easy" },
    hintsUsed: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    questionHistory: { type: [questionLogSchema], default: [] },
    overallScore: { type: Number, default: 0, min: 0, max: 100 },
    strengths: { type: [String], default: [] },
    weakAreas: { type: [String], default: [] },
    improvementSuggestions: { type: [String], default: [] },
    recommendedPracticeTopics: { type: [String], default: [] },
    summary: { type: String, default: "" },
    endedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewAttempt", interviewAttemptSchema);
