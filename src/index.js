const express = require("express");
const pino = require("pino");
const helmet = require("helmet");

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true }
  }
});

const connectDB = require("./config/db");
const routes = require("./api/notification.routes");
const authRoutes = require("./api/auth.routes");
const { client } = require("./metrics/metrics");

const app = express();
app.use(helmet());
app.use(express.json());

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api", routes);

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.send(await client.register.metrics());
});

app.get("/health", (req, res) => res.json({ status: "ok", liveness: true }));

const redis = require("./config/redis");
const { producer } = require("./config/kafka");

app.get("/ready", async (req, res) => {
  try {
    const mongoState = require("mongoose").connection.readyState;
    if (mongoState !== 1) throw new Error("MongoDB not connected");
    if (redis.status !== "ready") throw new Error("Redis not connected");

    // Check Kafka connectivity
    if (producer && !producer.isConnected) {
      throw new Error("Kafka not connected");
    }

    res.json({ status: "ok", readiness: true });
  } catch (err) {
    res.status(503).json({ status: "error", message: err.message });
  }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, async () => {
    logger.info(`🚀 API Server running on port ${PORT}`);
    if (producer) {
      try {
        await producer.connect();
        logger.info("🟢 Kafka Producer connected");
      } catch (err) {
        logger.error({ err }, "Failed to connect to Kafka");
      }
    }
  });
}

module.exports = app;
