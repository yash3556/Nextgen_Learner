const mongoose = require("mongoose");

const proofFileSchema = new mongoose.Schema(
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

const practiceTaskSubmissionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: "PracticeModule", required: true, index: true },
    taskIndex: { type: Number, required: true, min: 0 },
    language: { type: String, default: "javascript", trim: true },
    code: { type: String, default: "" },
    answerLink: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    proofFiles: { type: [proofFileSchema], default: [] },
    completionMethod: { type: String, enum: ["none", "link", "proof", "link_and_proof"], default: "none" },
    status: { type: String, enum: ["in_progress", "done"], default: "in_progress" },
    submittedAt: { type: Date, default: () => new Date() }
  },
  { timestamps: true }
);

practiceTaskSubmissionSchema.index({ student: 1, module: 1, taskIndex: 1 }, { unique: true });

module.exports = mongoose.model("PracticeTaskSubmission", practiceTaskSubmissionSchema);
