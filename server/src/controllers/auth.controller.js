const User = require("../models/User");
const { toTrimmedArray, toStringMaybe } = require("../utils/normalize");
const { comparePassword, hashPassword, sanitizeUser, signAuthToken, signPasswordResetToken, verifyPasswordResetToken } = require("../utils/auth");
const {
  buildExactCaseInsensitiveRegex,
  isStrongEnoughPassword,
  isValidEmail,
  normalizeEmail,
  normalizeText
} = require("../utils/validators");

function buildAuthResponse(user, message) {
  return {
    message,
    token: signAuthToken(user),
    role: user.role,
    user: sanitizeUser(user)
  };
}

async function findUserByIdentifier(identifier) {
  const value = normalizeText(identifier);
  if (!value) return null;

  return User.findOne({
    $or: [{ email: normalizeEmail(value) }, { userId: buildExactCaseInsensitiveRegex(value) }]
  }).select("+password");
}

async function hasIdentityConflict({ email, phone, userId, excludeUserId = null }) {
  const conditions = [];

  if (email) conditions.push({ email: normalizeEmail(email) });
  if (phone) conditions.push({ phone: normalizeText(phone) });
  if (userId) conditions.push({ userId: buildExactCaseInsensitiveRegex(userId) });

  if (!conditions.length) return null;

  const filter = { $or: conditions };
  if (excludeUserId) {
    filter._id = { $ne: excludeUserId };
  }

  return User.findOne(filter);
}

async function register(req, res) {
  try {
    const {
      name,
      email,
      phone,
      userId,
      password,
      college,
      course,
      cgpa,
      technicalSkills,
      nonTechnicalSkills,
      interests,
      strengths,
      weaknesses,
      goals
    } = req.body || {};

    if (!normalizeText(name) || !normalizeText(email) || !normalizeText(phone) || !normalizeText(userId) || !normalizeText(password)) {
      return res.status(400).json({ message: "name, email, phone, userId and password are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const conflict = await hasIdentityConflict({ email, phone, userId });
    if (conflict) {
      return res.status(409).json({ message: "An account with that email, phone, or userId already exists" });
    }

    const user = await User.create({
      name: normalizeText(name),
      email: normalizeEmail(email),
      phone: normalizeText(phone),
      userId: normalizeText(userId),
      password: await hashPassword(password),
      role: "student",
      college: toStringMaybe(college),
      course: toStringMaybe(course),
      cgpa: toStringMaybe(cgpa),
      technicalSkills: toTrimmedArray(technicalSkills),
      nonTechnicalSkills: toTrimmedArray(nonTechnicalSkills),
      interests: toTrimmedArray(interests),
      strengths: toTrimmedArray(strengths),
      weaknesses: toTrimmedArray(weaknesses),
      goals: toTrimmedArray(goals)
    });

    return res.status(201).json(buildAuthResponse(user, "Registered successfully"));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to register", error: error?.message });
  }
}

async function login(req, res) {
  try {
    const { identifier, email, userId, password } = req.body || {};
    const resolvedIdentifier = normalizeText(identifier || email || userId);

    if (!resolvedIdentifier || !normalizeText(password)) {
      return res.status(400).json({ message: "email or userId, and password are required" });
    }

    const user = await findUserByIdentifier(resolvedIdentifier);
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatches = await comparePassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json(buildAuthResponse(user, "Login successful"));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Login failed", error: error?.message });
  }
}

async function requestPasswordReset(req, res) {
  try {
    const identifier = normalizeText(req.body?.identifier || req.body?.email || req.body?.userId);
    if (!identifier) {
      return res.status(400).json({ message: "Please enter your email or user ID." });
    }

    const user = await User.findOne({
      $or: [{ email: normalizeEmail(identifier) }, { userId: buildExactCaseInsensitiveRegex(identifier) }]
    });

    if (!user) {
      return res.status(200).json({
        message: "If an account exists for that email or user ID, reset instructions are ready."
      });
    }

    const resetToken = signPasswordResetToken(user);
    const baseFrontEndUrl = normalizeText(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
    const resetUrl = `${baseFrontEndUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    return res.json({
      message: "Password reset link ready. Use it to create a new password.",
      resetToken,
      resetUrl
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to request password reset", error: error?.message });
  }
}

async function resetPassword(req, res) {
  try {
    const token = normalizeText(req.body?.token);
    const password = String(req.body?.password ?? "");

    if (!token) {
      return res.status(400).json({ message: "Password reset token is required." });
    }

    if (!password || !isStrongEnoughPassword(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const payload = verifyPasswordResetToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(404).json({ message: "This reset link is no longer valid." });
    }

    user.password = await hashPassword(password);
    await user.save();

    return res.json({
      message: "Password updated successfully. You can sign in with your new password."
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(400).json({ message: "This reset link is invalid or has expired." });
  }
}

async function logout(req, res) {
  return res.json({ message: "Logged out" });
}

async function getMe(req, res) {
  return res.json({ user: sanitizeUser(req.user) });
}

async function updateMe(req, res) {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const nextName = normalizeText(req.body?.name);
    const nextEmail = normalizeEmail(req.body?.email);
    const nextPhone = normalizeText(req.body?.phone);
    const nextUserId = normalizeText(req.body?.userId || user.userId);

    if (!nextName || !nextEmail || !nextPhone || !nextUserId) {
      return res.status(400).json({ message: "name, email, phone and userId are required" });
    }

    if (!isValidEmail(nextEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const conflict = await hasIdentityConflict({
      email: nextEmail,
      phone: nextPhone,
      userId: nextUserId,
      excludeUserId: user._id
    });

    if (conflict) {
      return res.status(409).json({ message: "That email, phone, or userId is already in use." });
    }

    user.name = nextName;
    user.email = nextEmail;
    user.phone = nextPhone;
    user.userId = nextUserId;
    user.college = toStringMaybe(req.body?.college);
    user.course = toStringMaybe(req.body?.course);
    user.cgpa = toStringMaybe(req.body?.cgpa);
    user.technicalSkills = toTrimmedArray(req.body?.technicalSkills);
    user.nonTechnicalSkills = toTrimmedArray(req.body?.nonTechnicalSkills);
    user.interests = toTrimmedArray(req.body?.interests);
    user.strengths = toTrimmedArray(req.body?.strengths);
    user.weaknesses = toTrimmedArray(req.body?.weaknesses);
    user.goals = toTrimmedArray(req.body?.goals);
    // Social links
    user.headline = toStringMaybe(req.body?.headline);
    user.githubUrl = toStringMaybe(req.body?.githubUrl);
    user.linkedinUrl = toStringMaybe(req.body?.linkedinUrl);
    user.portfolioUrl = toStringMaybe(req.body?.portfolioUrl);

    if (normalizeText(req.body?.password)) {
      if (!isStrongEnoughPassword(req.body.password)) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      user.password = await hashPassword(req.body.password);
    }

    await user.save();

    return res.json({
      message: "Profile updated",
      user: sanitizeUser(user)
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Failed to update profile", error: error?.message });
  }
}

module.exports = { getMe, login, logout, register, updateMe, requestPasswordReset, resetPassword };
