const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["announcement", "live", "task", "interview"],
      default: "announcement"
    },
    description: { type: String, default: "", trim: true },
    link: { type: String, default: "", trim: true },
    scheduledFor: { type: Date, default: null },
    assignedTo: { type: String, enum: ["all", "group", "student"], default: "all" },
    targetGroup: { type: String, default: "", trim: true },
    targetStudent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
