const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    deadline: { type: Date, required: true },
    assignedTo: { type: String, enum: ["all", "group", "student"], required: true },
    targetGroup: { type: String, default: "", trim: true },
    targetStudent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
