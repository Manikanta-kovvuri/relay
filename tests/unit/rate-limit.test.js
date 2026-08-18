const request = require("supertest");
const express = require("express");
const rateLimiter = require("../../src/middleware/rate-limit.middleware");

// Mock Redis
jest.mock("../../src/config/redis", () => {
  let store = {};
  return {
    incr: jest.fn(async (key) => {
      store[key] = (store[key] || 0) + 1;
      return store[key];
    }),
    expire: jest.fn(async () => 1),
    reset: () => { store = {}; },
    on: jest.fn()
  };
});

const redisMock = require("../../src/config/redis");

const app = express();
app.use(express.json());

// Mock Auth
app.use((req, res, next) => {
  req.user = { tenantId: "test-tenant" };
  next();
});

app.get("/api/test", rateLimiter, (req, res) => {
  res.json({ success: true });
});

beforeEach(() => {
  redisMock.reset();
  jest.clearAllMocks();
  process.env.RATE_LIMIT_MAX_REQUESTS = "2";
});

describe("Rate Limiting", () => {
  it("should allow requests under the limit", async () => {
    const res1 = await request(app).get("/api/test");
    expect(res1.status).toBe(200);

    const res2 = await request(app).get("/api/test");
    expect(res2.status).toBe(200);
  });

  it("should block requests over the limit", async () => {
    // Default limit is 10
    for (let i = 0; i < 10; i++) {
      await request(app).get("/api/test");
    }

    const res11 = await request(app).get("/api/test");
    expect(res11.status).toBe(429);
    expect(res11.body.message).toBe("Too Many Requests");
  });
});
