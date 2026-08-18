const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  tenantId: { type: String, required: true },
  userId: { type: String },
  to: { type: String },
  message: { type: String }, // Can be overridden by template
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
  channel: { type: String, enum: ["EMAIL", "SMS", "PUSH"], required: true },
  status: {
    type: String,
    enum: ['QUEUED', 'PROCESSING', 'SENT', 'RETRYING', 'RETRY_PUBLISHING', 'FAILED', 'SKIPPED', 'DLQ'],
    default: 'QUEUED'
  },
  retryCount: { type: Number, default: 0 },
  failureReason: { type: String },
  retryClaimedAt: { type: Date },
  retryClaimId: { type: String }
}, { timestamps: true });

// Idempotency: Uniqueness on tenantId + requestId
notificationSchema.index({ tenantId: 1, requestId: 1 }, { unique: true });

// Index for finding notifications by status (e.g. for metrics or debugging)
notificationSchema.index({ status: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
