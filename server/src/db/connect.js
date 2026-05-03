const mongoose = require("mongoose");

let connectPromise = null;

mongoose.connection.on("disconnected", () => {
  connectPromise = null;
});

function getMongoOptions() {
  const options = {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000),
    connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 10000)
  };

  const family = Number(process.env.MONGODB_IP_FAMILY || 4);
  if (!Number.isNaN(family) && family > 0) {
    options.family = family;
  }

  if (process.env.MONGODB_DB_NAME) {
    options.dbName = process.env.MONGODB_DB_NAME;
  }

  return options;
}

function buildMongoErrorMessage(error) {
  const message = String(error?.message || "");
  const lines = ["Failed to connect to MongoDB."];

  if (message.includes("tlsv1 alert internal error") || String(error?.code || "").includes("ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR")) {
    lines.push("Atlas rejected the TLS handshake.");
    lines.push("Check that your Atlas IP access list allows your current network, use a full connection string with a database name, and try forcing IPv4 with MONGODB_IP_FAMILY=4.");
    lines.push("If the same URI works elsewhere but fails on this machine, test once with Node.js 20 LTS to rule out a local TLS/OpenSSL compatibility issue.");
  } else if (message.includes("querySrv")) {
    lines.push("DNS SRV lookup failed. Verify the cluster hostname and your internet/DNS settings.");
  } else {
    lines.push(message || "Unknown MongoDB connection error.");
  }

  return lines.join(" ");
}

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectPromise) return connectPromise;

  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in environment");
  }

  mongoose.set("strictQuery", true);

  connectPromise = mongoose
    .connect(MONGODB_URI, getMongoOptions())
    .then((instance) => instance.connection)
    .catch((error) => {
      connectPromise = null;
      const wrapped = new Error(buildMongoErrorMessage(error));
      wrapped.cause = error;
      throw wrapped;
    });

  return connectPromise;
}

function getMongoClientPromise() {
  return connectMongo().then(() => mongoose.connection.getClient());
}

module.exports = { connectMongo, getMongoClientPromise, getMongoOptions };
