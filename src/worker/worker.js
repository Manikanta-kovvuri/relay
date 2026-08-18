const express = require("express");
const connectDB = require("../config/db");
const Notification = require("../models/notification.model");
const Template = require("../models/template.model");
const UserPreference = require("../models/preference.model");
const { consumer, producer } = require("../config/kafka");
const { ProviderFactory } = require("../services/providers");
const pino = require("pino");

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true }
  }
});

const {
  sentCounter,
  failedCounter,
  retryCounter,
  queueCounter,
  client,
} = require("../metrics/metrics");

const app = express();
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.send(await client.register.metrics());
});

// Health/Readiness Endpoints
app.get("/health", (req, res) => res.json({ status: "ok", liveness: true }));

const redis = require("../config/redis");

app.get("/ready", async (req, res) => {
  try {
    const mongoState = require("mongoose").connection.readyState;
    if (mongoState !== 1) throw new Error("MongoDB not connected");
    if (redis.status !== "ready") throw new Error("Redis not connected");

    if (producer && !producer.isConnected) {
      throw new Error("Kafka not connected");
    }

    res.json({ status: "ok", readiness: true });
  } catch (err) {
    res.status(503).json({ status: "error", message: err.message });
  }
});

// Let app listen only when executed directly

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = parseInt(process.env.BACKOFF_BASE_MS || "5000", 10);

function interpolate(templateString, variables) {
  if (!variables || !templateString) return templateString;
  return templateString.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
}

async function handleMessage({ topic, message }) {
  const payload = JSON.parse(message.value.toString());
  const { id, variables } = payload;

  queueCounter.inc();

  const notif = await Notification.findById(id);
  if (!notif) {
    logger.warn({ id }, "Notification not found in DB");
    queueCounter.dec();
    return;
  }

  if (["SENT", "DLQ", "SKIPPED"].includes(notif.status)) {
    logger.info({ id, status: notif.status }, "Notification already in terminal state");
    queueCounter.dec();
    return;
  }

  try {
    notif.status = "PROCESSING";
    await notif.save();

    if (notif.userId) {
      const prefs = await UserPreference.findOne({ tenantId: notif.tenantId, userId: notif.userId });
      if (prefs && prefs.channels && prefs.channels[notif.channel.toLowerCase()] === false) {
        logger.info({ id, userId: notif.userId, channel: notif.channel }, "Notification skipped due to user preference");
        notif.status = "SKIPPED";
        await notif.save();
        queueCounter.dec();
        return;
      }
    }

    let finalMessage = notif.message;
    if (notif.templateId) {
      const template = await Template.findOne({ _id: notif.templateId, tenantId: notif.tenantId });
      if (template && template.active) {
        finalMessage = interpolate(template.body, variables);
      }
    }

    const provider = ProviderFactory.getProvider(notif.channel);
    await provider.send({ ...notif.toObject(), message: finalMessage });

    notif.status = "SENT";
    await notif.save();
    sentCounter.inc({ channel: notif.channel });
    logger.info({ id, tenantId: notif.tenantId, channel: notif.channel }, "Notification sent successfully");

  } catch (err) {
    notif.attempt += 1;
    notif.failureReason = err.message;

    if (notif.attempt > MAX_RETRIES) {
      notif.status = "DLQ";
      await notif.save();
      failedCounter.inc({ channel: notif.channel, reason: "Max retries exceeded" });

      if (producer) {
        await producer.send({
          topic: "notifications-dlq",
          messages: [{ value: JSON.stringify({ id: notif._id }) }],
        });
      }
      logger.error({ id, tenantId: notif.tenantId, reason: err.message }, "Max retries exceeded, sent to DLQ");
    } else {
      notif.status = "RETRYING";
      await notif.save();
      retryCounter.inc({ channel: notif.channel });
      logger.info({ id, tenantId: notif.tenantId, channel: notif.channel }, "Notification failed, scheduled for retry");
    }
  }

  queueCounter.dec();
}

async function startWorker() {
  await connectDB();

  if (producer && consumer) {
    await producer.connect();
    await consumer.connect();

    await consumer.subscribe({ topic: "notifications" });
    await consumer.subscribe({ topic: "notifications-retry" });

    logger.info("Worker listening to Kafka topics...");

    await consumer.run({
      eachMessage: handleMessage,
    });
  } else {
    logger.warn("Kafka not configured, running in worker-only mode (testing)");
  }
}

// Background DB Poller for Exponential Backoff (Scheduler)
let schedulerInterval;

function startScheduler() {
  schedulerInterval = setInterval(async () => {
    if (!producer) return;
    try {
      const now = new Date();
      // Recover abandoned claims (e.g., worker crashed during RETRY_PUBLISHING)
      const claimTimeoutMs = 30000; // 30 seconds
      const abandonedCutoff = new Date(now.getTime() - claimTimeoutMs);

      await Notification.updateMany(
        { status: "RETRY_PUBLISHING", retryClaimedAt: { $lt: abandonedCutoff } },
        { status: "RETRYING", $unset: { retryClaimedAt: 1, retryClaimId: 1 } }
      );

      const retrying = await Notification.find({ status: "RETRYING" }).limit(50);
      const workerId = `worker-${process.pid}-${Math.random().toString(36).substr(2, 5)}`;

      for (const notif of retrying) {
        const delayMs = BACKOFF_BASE_MS * Math.pow(2, notif.attempt - 1);
        const readyTime = new Date(notif.updatedAt.getTime() + delayMs);

        if (now.getTime() >= readyTime.getTime()) {
          // Atomic claim
          const claimed = await Notification.findOneAndUpdate(
            { _id: notif._id, status: "RETRYING" },
            {
              status: "RETRY_PUBLISHING",
              retryClaimedAt: now,
              retryClaimId: workerId
            },
            { new: true }
          );

          if (claimed) {
            try {
              await producer.send({
                topic: "notifications-retry",
                messages: [{ value: JSON.stringify({ id: claimed._id }) }]
              });

              claimed.status = "QUEUED";
              await claimed.save();
              logger.info({ id: claimed._id, attempt: claimed.attempt }, "Scheduled retry pushed to Kafka");
            } catch (pubErr) {
              // Publish failed, release claim
              logger.error({ id: claimed._id, err: pubErr }, "Failed to publish retry to Kafka, releasing claim");
              claimed.status = "RETRYING";
              claimed.retryClaimedAt = undefined;
              claimed.retryClaimId = undefined;
              await claimed.save();
            }
          }
        }
      }
    } catch (err) {
      logger.error("Scheduler error", err);
    }
  }, 5000);
}

let server;

if (require.main === module) {
  server = app.listen(4000, () => {
    logger.info("Worker metrics and health running on port 4000");
  });
  startScheduler();
  startWorker();
}

function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }
}

async function stopWorker() {
  if (server) {
    server.close();
  }
  if (producer) {
    await producer.disconnect();
  }
  if (consumer) {
    await consumer.disconnect();
  }
}

module.exports = { app, startWorker, interpolate, handleMessage, startScheduler, stopScheduler, stopWorker };
