const User = require("../models/User");
const { hashPassword } = require("../utils/auth");

async function ensureDefaultAdmin() {
  const userId = String(process.env.MAIN_ADMIN_USER_ID || "Nextgen2026").trim();
  const password = String(process.env.MAIN_ADMIN_PASSWORD || "Nextgen2026").trim();
  const email = String(process.env.MAIN_ADMIN_EMAIL || "nextgen2026@nextzen.local").trim().toLowerCase();
  const phone = String(process.env.MAIN_ADMIN_PHONE || "0000000000").trim();

  let admin = await User.findOne({ userId });

  if (!admin) {
    admin = await User.create({
      name: "Main Admin",
      email,
      phone,
      userId,
      password: await hashPassword(password),
      role: "admin",
      isMainAdmin: true
    });

    return admin;
  }

  let changed = false;

  if (admin.role !== "admin") {
    admin.role = "admin";
    changed = true;
  }

  if (!admin.isMainAdmin) {
    admin.isMainAdmin = true;
    changed = true;
  }

  if (!admin.password) {
    admin.password = await hashPassword(password);
    changed = true;
  }

  if (changed) {
    await admin.save();
  }

  return admin;
}

module.exports = { ensureDefaultAdmin };
