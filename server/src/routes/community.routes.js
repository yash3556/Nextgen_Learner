const express = require("express");

const CommunityGroup = require("../models/CommunityGroup");
const User = require("../models/User");
const { requireAdmin, requireAuth, requireStudent } = require("../middleware/requireAuth");
const { buildExactCaseInsensitiveRegex, isValidUrl, normalizeHttpUrl, normalizeText } = require("../utils/validators");

const router = express.Router();

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildGroupMatchers(groupValue) {
  const group = normalizeText(groupValue);
  if (!group) return [];
  return [
    { targetGroup: buildExactCaseInsensitiveRegex(group) },
    { targetGroup: new RegExp(escapeRegex(group), "i") }
  ];
}

function formatGroup(group) {
  return {
    _id: group._id,
    name: group.name,
    platform: group.platform,
    description: group.description,
    link: group.link,
    assignedTo: group.assignedTo,
    targetGroup: group.targetGroup,
    targetStudent: group.targetStudent
      ? {
          _id: group.targetStudent._id || group.targetStudent,
          name: group.targetStudent.name,
          userId: group.targetStudent.userId
        }
      : null,
    isActive: group.isActive,
    createdAt: group.createdAt,
    createdBy: group.createdBy
      ? {
          _id: group.createdBy._id,
          name: group.createdBy.name,
          userId: group.createdBy.userId
        }
      : null
  };
}

function buildStudentGroupFilter(user) {
  const groups = [user?.course, user?.college].map(normalizeText).filter(Boolean);
  const filters = [{ assignedTo: "all" }, { assignedTo: "student", targetStudent: user?._id }];

  if (groups.length) {
    filters.push({
      assignedTo: "group",
      $or: groups.flatMap(buildGroupMatchers)
    });
  }

  return { isActive: true, $or: filters };
}

router.get("/admin/community-groups", requireAuth, requireAdmin, async (req, res) => {
  try {
    const groups = await CommunityGroup.find()
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ groups: groups.map(formatGroup) });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to load community groups", error: error?.message });
  }
});

router.post("/admin/community-groups", requireAuth, requireAdmin, async (req, res) => {
  try {
    const name = normalizeText(req.body?.name);
    const platform = normalizeText(req.body?.platform);
    const description = normalizeText(req.body?.description);
    const link = normalizeHttpUrl(req.body?.link);
    const assignedTo = normalizeText(req.body?.assignedTo || "all").toLowerCase();
    const targetGroup = normalizeText(req.body?.targetGroup);
    const targetStudent = normalizeText(req.body?.targetStudent);

    if (!name || !platform || !link) {
      return res.status(400).json({ message: "name, platform and link are required" });
    }

    if (!isValidUrl(link)) {
      return res.status(400).json({ message: "Please provide a valid group link" });
    }

    if (!["all", "group", "student"].includes(assignedTo)) {
      return res.status(400).json({ message: "assignedTo must be one of: all, group, student" });
    }

    if (assignedTo === "group" && !targetGroup) {
      return res.status(400).json({ message: "targetGroup is required when assignedTo is group" });
    }

    const payload = {
      name,
      platform,
      description,
      link,
      assignedTo,
      targetGroup,
      createdBy: req.user._id
    };

    if (assignedTo === "student") {
      if (!targetStudent) {
        return res.status(400).json({ message: "targetStudent is required when assignedTo is student" });
      }
      const student = await User.findOne({
        $or: [{ _id: targetStudent }, { userId: buildExactCaseInsensitiveRegex(targetStudent) }]
      }).lean();

      if (!student) {
        return res.status(404).json({ message: "Target student not found" });
      }
      payload.targetStudent = student._id;
    }

    const created = await CommunityGroup.create(payload);
    const saved = await CommunityGroup.findById(created._id)
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId");

    return res.status(201).json({ message: "Community group created", group: formatGroup(saved) });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to create community group", error: error?.message });
  }
});

router.patch("/admin/community-groups/:groupId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const groupId = normalizeText(req.params?.groupId);
    if (!groupId) return res.status(400).json({ message: "groupId is required" });

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "name")) updates.name = normalizeText(req.body?.name);
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "platform")) updates.platform = normalizeText(req.body?.platform);
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "description")) updates.description = normalizeText(req.body?.description);
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "link")) {
      const link = normalizeHttpUrl(req.body?.link);
      if (!link || !isValidUrl(link)) {
        return res.status(400).json({ message: "Please provide a valid group link" });
      }
      updates.link = link;
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "isActive")) updates.isActive = Boolean(req.body?.isActive);

    const updated = await CommunityGroup.findByIdAndUpdate(groupId, updates, { new: true })
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId");

    if (!updated) return res.status(404).json({ message: "Group not found" });

    return res.json({ message: "Group updated", group: formatGroup(updated) });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to update group", error: error?.message });
  }
});

router.delete("/admin/community-groups/:groupId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const groupId = normalizeText(req.params?.groupId);
    if (!groupId) return res.status(400).json({ message: "groupId is required" });

    const deleted = await CommunityGroup.findByIdAndDelete(groupId);
    if (!deleted) return res.status(404).json({ message: "Group not found" });

    return res.json({ message: "Group deleted" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to delete group", error: error?.message });
  }
});

router.get("/student/community-groups", requireAuth, requireStudent, async (req, res) => {
  try {
    const groups = await CommunityGroup.find(buildStudentGroupFilter(req.user))
      .populate("createdBy", "name userId")
      .populate("targetStudent", "name userId")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ groups: groups.map(formatGroup) });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to load community groups", error: error?.message });
  }
});

module.exports = router;
