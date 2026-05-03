const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();
  if (!secret) {
    throw new Error("Missing JWT_SECRET in environment");
  }
  return secret;
}

function getSaltRounds() {
  const parsed = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  if (Number.isFinite(parsed) && parsed >= 8) return parsed;
  return 12;
}

async function hashPassword(password) {
  return bcrypt.hash(String(password || ""), getSaltRounds());
}

async function comparePassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(password || ""), hash);
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      userId: user.userId,
      isMainAdmin: Boolean(user.isMainAdmin)
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function sanitizeUser(user) {
  if (!user) return null;
  const plain = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete plain.password;
  delete plain.__v;
  return plain;
}

module.exports = {
  comparePassword,
  hashPassword,
  sanitizeUser,
  signAuthToken,
  verifyAuthToken
};
