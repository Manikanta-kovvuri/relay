const mongoose = require("mongoose");

const userPreferenceSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  userId: { type: String, required: true },
  channels: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  }
}, { timestamps: true });

// Uniqueness per tenant + user
userPreferenceSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("UserPreference", userPreferenceSchema);
