const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    authorName: { type: String, required: true, trim: true },
    comment: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const projectAttachmentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 1 },
    dataUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const studentProjectSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    problemStatement: { type: String, default: "", trim: true },
    keyFeatures: { type: [String], default: [] },
    stack: { type: [String], default: [] },
    codeSnippet: { type: String, default: "" },
    challenges: { type: String, default: "", trim: true },
    outcomes: { type: String, default: "", trim: true },
    githubUrl: { type: String, default: "", trim: true },
    liveUrl: { type: String, default: "", trim: true },
    status: { type: String, enum: ["planning", "in_progress", "completed", "on_hold"], default: "planning" },
    category: { type: String, default: "portfolio", trim: true },
    attachments: { type: [projectAttachmentSchema], default: [] },
    feedbacks: { type: [feedbackSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentProject", studentProjectSchema);
