const mongoose = require("mongoose");

const communityGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    platform: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    link: { type: String, required: true, trim: true },
    assignedTo: { type: String, enum: ["all", "group", "student"], default: "all" },
    targetGroup: { type: String, default: "", trim: true },
    targetStudent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CommunityGroup", communityGroupSchema);
