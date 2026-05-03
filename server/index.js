require("dotenv").config();

const { createServer } = require("./src/app");
const { connectMongo } = require("./src/db/connect");
const { ensureDefaultAdmin } = require("./src/seed/ensureDefaultAdmin");

const PORT = process.env.PORT || 5000;

function validateRequiredEnv() {
  const required = ["JWT_SECRET", "MONGODB_URI"];
  const missing = required.filter((key) => !String(process.env[key] || "").trim());

  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }
}

const start = async () => {
  validateRequiredEnv();
  await connectMongo();
  await ensureDefaultAdmin();
  const app = createServer();
  app.locals.mongoReady = true;
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});

