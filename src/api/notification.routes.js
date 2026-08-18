const express = require("express");
const router = express.Router();
const pino = require("pino");
const logger = pino({ transport: { target: "pino-pretty", options: { colorize: true } } });
const Notification = require("../models/notification.model");
const { producer } = require("../config/kafka");
const { authMiddleware, rbacMiddleware } = require("../middleware/auth.middleware");
const rateLimiter = require("../middleware/rate-limit.middleware");

/* ==============================
   SEND NOTIFICATION
============================== */
router.post("/send", authMiddleware, rbacMiddleware(["USER", "ADMIN", "OWNER"]), rateLimiter, async (req, res) => {
  try {
    const { requestId, to, message, channel } = req.body;
    const tenantId = req.user.tenantId;

    const existing = await Notification.findOne({ tenantId, requestId });

    if (existing) {
      return res.status(200).json({
        success: true,
        id: existing._id,
        message: "Duplicate request ignored"
      });
    }

    const notification = await Notification.create({
      requestId,
      tenantId,
      to,
      message,
      channel
    });

    // ONLY send to Kafka if producer exists (local Docker only)
    if (producer) {
      await producer.connect();
      await producer.send({
        topic: "notifications",
        messages: [
          {
            value: JSON.stringify({
              id: notification._id.toString(),
              requestId: notification.requestId
            })
          }
        ]
      });
    }

    return res.json({ success: true, id: notification._id });

  } catch (err) {
    logger.error({ err }, "Route error in /send");
    return res.status(500).json({ success: false });
  }
});

/* ==============================
   DEBUG ROUTE
============================== */
router.get("/debug", authMiddleware, rbacMiddleware(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const data = await Notification.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Route error in /debug");
    res.status(500).json({ success: false });
  }
});

module.exports = router;