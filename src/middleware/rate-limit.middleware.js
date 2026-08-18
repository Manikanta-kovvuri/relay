const redis = require("../config/redis");
const { rateLimitRejections } = require("../metrics/metrics");

const WINDOW_SECONDS = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || "60", 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "10", 10);

const rateLimiter = async (req, res, next) => {
  // Use tenantId if authenticated, otherwise use IP
  const identifier = req.user ? `tenant:${req.user.tenantId}` : `ip:${req.ip}`;
  const key = `rate-limit:${identifier}`;

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    if (current > MAX_REQUESTS) {
      rateLimitRejections.inc();
      return res.status(429).json({
        success: false,
        message: "Too Many Requests",
      });
    }

    next();
  } catch (err) {
    console.error("Rate limiter error:", err);
    // Fail open if Redis is down (or handle deliberately)
    // The prompt says: "Handle Redis failure deliberately. Do not silently pretend Redis is working if it is unavailable."
    // Let's fail closed to deliberately handle failure.
    return res.status(503).json({ success: false, message: "Service Unavailable: Rate Limiter Error" });
  }
};

module.exports = rateLimiter;
