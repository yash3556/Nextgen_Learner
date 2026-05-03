const User = require("../models/User");
const { verifyAuthToken } = require("../utils/auth");

function getBearerToken(req) {
  const header = String(req.headers.authorization || "").trim();
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.auth = payload;
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  return next();
}

function requireMainAdmin(req, res, next) {
  if (req.user?.role !== "admin" || !req.user?.isMainAdmin) {
    return res.status(403).json({ message: "Access denied" });
  }

  return next();
}

function requireStudent(req, res, next) {
  if (req.user?.role === "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  return next();
}

module.exports = { requireAdmin, requireAuth, requireMainAdmin, requireStudent };
