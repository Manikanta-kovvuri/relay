const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Notification = require("../../src/models/notification.model");
const Template = require("../../src/models/template.model");
const UserPreference = require("../../src/models/preference.model");

// Mock Kafka
jest.mock("../../src/config/kafka", () => ({
  producer: { connect: jest.fn(), send: jest.fn(), disconnect: jest.fn() },
  consumer: { connect: jest.fn(), subscribe: jest.fn(), run: jest.fn(), disconnect: jest.fn() }
}));

// Mock Redis
jest.mock("../../src/config/redis", () => ({
  status: "ready",
  quit: jest.fn(),
  on: jest.fn()
}));

const { interpolate, stopScheduler, stopWorker } = require("../../src/worker/worker");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "relay_test_worker" });
});

const redis = require("../../src/config/redis");

afterAll(async () => {
  stopScheduler();
  await stopWorker();
  await mongoose.disconnect();
  await mongoServer.stop();
  await redis.quit();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

describe("Worker Logic", () => {
  it("should interpolate template variables correctly", () => {
    const template = "Hello {{name}}, your order {{orderId}} is ready.";
    const variables = { name: "Alice", orderId: "999" };
    expect(interpolate(template, variables)).toBe("Hello Alice, your order 999 is ready.");
  });

  describe("handleMessage", () => {
    const { handleMessage } = require("../../src/worker/worker");

    it("should skip if user preference disables the channel", async () => {
      const notif = await Notification.create({
        requestId: "req-pref",
        tenantId: "tenant1",
        userId: "user1",
        channel: "EMAIL",
        to: "test@test.com",
        status: "QUEUED"
      });

      await UserPreference.create({
        tenantId: "tenant1",
        userId: "user1",
        channels: { email: false, sms: true, push: true }
      });

      await handleMessage({
        topic: "notifications",
        message: { value: JSON.stringify({ id: notif._id }) }
      });

      const updated = await Notification.findById(notif._id);
      expect(updated.status).toBe("SKIPPED");
    });
  });
});
