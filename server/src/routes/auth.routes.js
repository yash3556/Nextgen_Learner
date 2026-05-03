const express = require("express");
const { getMe, login, logout, register, updateMe } = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);

module.exports = router;

