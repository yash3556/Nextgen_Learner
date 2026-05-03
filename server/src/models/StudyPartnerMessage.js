const mongoose = require("mongoose");

const studyPartnerMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

studyPartnerMessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model("StudyPartnerMessage", studyPartnerMessageSchema);
