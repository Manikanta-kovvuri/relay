const client = require("prom-client");

const sentCounter = new client.Counter({
  name: "notifications_sent_total",
  help: "Total sent notifications",
  labelNames: ["channel"],
});

const failedCounter = new client.Counter({
  name: "notifications_failed_total",
  help: "Total failed notifications",
  labelNames: ["channel", "reason"],
});

const retryCounter = new client.Counter({
  name: "notifications_retry_total",
  help: "Total retries",
  labelNames: ["channel"],
});

const queueCounter = new client.Gauge({
  name: "notifications_processing",
  help: "Currently processing jobs",
});

const rateLimitRejections = new client.Counter({
  name: "rate_limit_rejections_total",
  help: "Total requests rejected due to rate limiting",
});

module.exports = {
  sentCounter,
  failedCounter,
  retryCounter,
  queueCounter,
  rateLimitRejections,
  client,
};