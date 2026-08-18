const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Notification = require("../../src/models/notification.model");

// Mock Kafka
jest.mock("../../src/config/kafka", () => ({
  producer: { connect: jest.fn(), send: jest.fn() }
}));

// Mock Redis
jest.mock("../../src/config/redis", () => ({
  status: "ready",
  quit: jest.fn(),
  on: jest.fn()
}));

const authRoutes = require("../../src/api/auth.routes");
const notificationRoutes = require("../../src/api/notification.routes");
const redis = require("../../src/config/redis");

let mongoServer;
const app = express();
app.use(express.json());

// Mock auth middleware for testing
jest.mock("../../src/middleware/auth.middleware", () => ({
  authMiddleware: (req, res, next) => {
    req.user = { tenantId: "test-tenant", role: "USER" };
    next();
  },
  rbacMiddleware: () => (req, res, next) => next()
}));

// Mock rate limiter
jest.mock("../../src/middleware/rate-limit.middleware", () => (req, res, next) => next());

app.use("/api/notifications", notificationRoutes);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "relay_test_api" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  await redis.quit();
});

afterEach(async () => {
  await Notification.deleteMany();
});

describe("API Idempotency", () => {
  it("should return 200 with existing ID for duplicate requestId", async () => {
    const existing = await Notification.create({
      requestId: "req-123",
      tenantId: "test-tenant",
      channel: "EMAIL",
      status: "QUEUED"
    });

    const res = await request(app)
      .post("/api/notifications/send")
      .send({
        requestId: "req-123",
        to: "test@test.com",
        message: "Hello",
        channel: "EMAIL"
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBe(existing._id.toString());
    expect(res.body.message).toBe("Duplicate request ignored");
  });
});
