const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_tests";

router.post("/register", async (req, res) => {
  try {
    const { username, password, tenantId, role } = req.body;

    if (!username || !password || !tenantId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Security: Only allow USER role during normal registration, OWNER/ADMIN must be bootstrapped differently.
    // For this portfolio project, we might allow an initial bootstrap.
    const assignedRole = (role === "ADMIN" || role === "OWNER") ? "USER" : "USER";

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
      tenantId,
      role: assignedRole
    });

    res.status(201).json({ success: true, message: "User created successfully" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "Username already exists" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
