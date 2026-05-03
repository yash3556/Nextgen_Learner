const mongoose = require("mongoose");

const practiceTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    hint: { type: String, default: "", trim: true },
    questionLink: { type: String, default: "", trim: true },
    estimatedMinutes: { type: Number, default: 25, min: 5, max: 90 }
  },
  { _id: false }
);

const practiceModuleSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true, trim: true },
    subtopic: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    tasks: { type: [practiceTaskSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PracticeModule", practiceModuleSchema);
