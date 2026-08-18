const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["ADMIN", "OWNER", "USER"], default: "USER" },
  tenantId: { type: String, required: true },
}, { timestamps: true });

// Add index on tenantId for faster queries
userSchema.index({ tenantId: 1 });

module.exports = mongoose.model("User", userSchema);
