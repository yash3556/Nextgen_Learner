const mongoose = require("mongoose");

const scoresSchema = new mongoose.Schema(
  {
    accuracy: { type: Number, default: 0, min: 0, max: 10 },
    logic: { type: Number, default: 0, min: 0, max: 10 },
    communication: { type: Number, default: 0, min: 0, max: 10 }
  },
  { _id: false }
);

const mockInterviewSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    title: { type: String, required: true, trim: true },
    role: { type: String, default: "General", trim: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    mode: { type: String, enum: ["ai", "live"], default: "live" },
    assignedTo: { type: String, enum: ["all", "group", "student"], default: "all" },
    targetGroup: { type: String, default: "", trim: true },
    targetStudent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    interviewerName: { type: String, default: "AI Interviewer", trim: true },
    scheduledFor: { type: Date, required: true },
    meetingLink: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["scheduled", "completed", "pending"],
      default: "scheduled"
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    summary: { type: String, default: "", trim: true },
    feedback: { type: String, default: "", trim: true },
    manualFeedback: { type: String, default: "", trim: true },
    suggestedPracticeTasks: { type: [String], default: [] },
    scores: { type: scoresSchema, default: () => ({}) },
    reminderSentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MockInterview", mockInterviewSchema);
