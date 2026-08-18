const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const authRoutes = require("../../src/api/auth.routes");
const { authMiddleware, rbacMiddleware } = require("../../src/middleware/auth.middleware");

let mongoServer;
const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/protected", authMiddleware, rbacMiddleware(["ADMIN"]), (req, res) => {
  res.json({ success: true, user: req.user });
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "relay_test_auth" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

describe("Auth & RBAC", () => {
  it("should register a user and fallback privileged roles to USER", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "hacker", password: "pwd", tenantId: "t1", role: "ADMIN" });

    expect(res.status).toBe(201);

    // Login to verify the assigned role
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "hacker", password: "pwd" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();

    // Verify role is USER not ADMIN
    const protectedRes = await request(app)
      .get("/api/protected")
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(protectedRes.status).toBe(403);
  });
});
