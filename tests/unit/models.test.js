const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../../src/models/user.model");
const Notification = require("../../src/models/notification.model");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "relay_test" });
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

describe("Data Models", () => {
  it("should create a User successfully", async () => {
    const user = await User.create({
      username: "testuser",
      password: "hashedpassword",
      tenantId: "tenant1",
      role: "USER"
    });
    expect(user._id).toBeDefined();
    expect(user.tenantId).toBe("tenant1");
  });

  it("should enforce uniqueness on tenantId + requestId for Notifications", async () => {
    await Notification.create({
      requestId: "req123",
      tenantId: "tenant1",
      channel: "EMAIL",
      to: "test@example.com"
    });

    await expect(Notification.create({
      requestId: "req123",
      tenantId: "tenant1",
      channel: "SMS",
      to: "12345"
    })).rejects.toThrow(); // Should fail due to uniqueness constraint

    // But should succeed for a different tenant
    const diffTenant = await Notification.create({
      requestId: "req123",
      tenantId: "tenant2",
      channel: "SMS",
      to: "12345"
    });
    expect(diffTenant._id).toBeDefined();
  });
});
