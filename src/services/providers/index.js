class NotificationProvider {
  async send(notification) {
    throw new Error("Method not implemented");
  }
}

class MockEmailProvider extends NotificationProvider {
  async send(notification) {
    if (Math.random() < 0.2) throw new Error("Email provider timeout");
    return { success: true, messageId: `email-${Date.now()}` };
  }
}

class MockSmsProvider extends NotificationProvider {
  async send(notification) {
    if (Math.random() < 0.2) throw new Error("SMS provider timeout");
    return { success: true, messageId: `sms-${Date.now()}` };
  }
}

class MockPushProvider extends NotificationProvider {
  async send(notification) {
    if (Math.random() < 0.2) throw new Error("Push provider timeout");
    return { success: true, messageId: `push-${Date.now()}` };
  }
}

const ProviderFactory = {
  getProvider(channel) {
    switch (channel.toUpperCase()) {
      case "EMAIL": return new MockEmailProvider();
      case "SMS": return new MockSmsProvider();
      case "PUSH": return new MockPushProvider();
      default: throw new Error(`Unsupported channel: ${channel}`);
    }
  }
};

module.exports = { ProviderFactory, MockEmailProvider, MockSmsProvider, MockPushProvider };
