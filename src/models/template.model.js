const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  name: { type: String, required: true },
  channel: { type: String, enum: ["EMAIL", "SMS", "PUSH"], required: true },
  subject: { type: String },
  body: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

// Index for multi-tenant query
templateSchema.index({ tenantId: 1 });

module.exports = mongoose.model("Template", templateSchema);
