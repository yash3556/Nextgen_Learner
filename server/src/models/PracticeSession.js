const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    whatWentWrong: { type: String, default: "", trim: true },
    whatToImprove: { type: String, default: "", trim: true },
    nextPractice: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const taskResultSchema = new mongoose.Schema(
  {
    taskIndex: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    struggled: { type: Boolean, default: false },
    usedHint: { type: Boolean, default: false },
    difficultyRating: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    confidenceLevel: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    accuracy: { type: Number, default: 5, min: 0, max: 10 },
    minutesSpent: { type: Number, default: 25, min: 1, max: 180 },
    feedback: { type: feedbackSchema, default: () => ({}) }
  },
  { _id: false }
);

const practiceSessionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "PracticePlan", default: null, index: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: "PracticeModule", required: true },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    sessionLengthMinutes: { type: Number, default: 25, min: 15, max: 60 },
    currentTaskIndex: { type: Number, default: 0 },
    hintRequestedForCurrent: { type: Boolean, default: false },
    struggledOnCurrent: { type: Boolean, default: false },
    taskResults: { type: [taskResultSchema], default: [] },
    focusModeEnabled: { type: Boolean, default: true },
    xpEarned: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date, default: () => new Date() },
    endedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PracticeSession", practiceSessionSchema);
