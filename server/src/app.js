const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const studentRoutes = require("./routes/student.routes");
const tasksRoutes = require("./routes/tasks.routes");
const roadmapsRoutes = require("./routes/roadmaps.routes");
const aiRoutes = require("./routes/ai.routes");
const communityRoutes = require("./routes/community.routes");

const { requireAuth } = require("./middleware/requireAuth");

function createServer() {
  const app = express();

  // Safety headers
  app.use(helmet());

  // Logging (dev-friendly)
  app.use(morgan("dev"));

  // Parse JSON bodies
  app.use(express.json({ limit: "25mb" }));

  const { CLIENT_ORIGIN = "http://localhost:5173" } = process.env;

  app.use(
    cors({
      origin: CLIENT_ORIGIN
    })
  );

  // Health check
  app.get("/api/health", (req, res) => res.json({ ok: true }));

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api", adminRoutes);
  app.use("/api", communityRoutes);
  app.use("/api", studentRoutes);
  app.use("/api/tasks", requireAuth, tasksRoutes);
  app.use("/api/roadmaps", requireAuth, roadmapsRoutes);
  app.use("/api/ai", requireAuth, aiRoutes);

  // Fallback error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Server error", error: err?.message });
  });

  return app;
}

module.exports = { createServer };

