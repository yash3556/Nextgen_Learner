const mongoose = require("mongoose");

const practicePlanSchema = new mongoose.Schema(
  {
    module: { type: mongoose.Schema.Types.ObjectId, ref: "PracticeModule", required: true, index: true },
    assignedTo: { type: String, enum: ["all", "group", "student"], default: "all" },
    targetGroup: { type: String, default: "", trim: true },
    targetStudent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    startsOn: { type: Date, default: () => new Date() },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PracticePlan", practicePlanSchema);
