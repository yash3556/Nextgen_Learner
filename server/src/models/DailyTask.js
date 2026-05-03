const mongoose = require("mongoose");

const taskResourceSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: "resource" }
  },
  { _id: false }
);

const taskItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    completed: { type: Boolean, default: false },
    source: { type: String, default: "generated" },
    roadmapId: { type: String, default: "" },
    roadmapDay: { type: Number, default: 0 },
    focusArea: { type: String, default: "general" },
    coachMode: { type: String, default: "" },
    resources: { type: [taskResourceSchema], default: [] }
  },
  { _id: false }
);

const dailyTaskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    tasks: { type: [taskItemSchema], default: [] }
  },
  { timestamps: true }
);

dailyTaskSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyTask", dailyTaskSchema);

