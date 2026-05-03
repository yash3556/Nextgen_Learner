const mongoose = require("mongoose");

const taskSubmissionSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    submissionLink: { type: String, required: true, trim: true },
    notes: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["submitted", "reviewed", "needs_work"],
      default: "submitted"
    },
    feedback: { type: String, default: "", trim: true },
    score: { type: Number, default: 0, min: 0, max: 100 },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

taskSubmissionSchema.index({ task: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("TaskSubmission", taskSubmissionSchema);
