import { Router } from "express";
import User from "../models/User.js";
import {
  signToken,
  verifyToken,
  generateVerificationToken,
} from "../services/jwt.js";
import { connectDB } from "../services/db.js";
import { emailService } from "../services/emailService.js";

export const authRoutes = Router();

authRoutes.post("/login", async (req, res) => {
  try {
    await connectDB();
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res
        .status(400)
        .json({ error: "Username/Email and password are required" });
    }
    const user = await User.findOne({
      $or: [{ email: identifier }, { name: identifier }],
    }).select("+password");
    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });
    if (!user.isVerified)
      return res
        .status(401)
        .json({ error: "Please verify your email before logging in" });
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });
    const roleForFrontend = user.role === "admin" ? "college_admin" : "student";

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        role: roleForFrontend,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRoutes.post("/register", async (req, res) => {
  try {
    await connectDB();
    const { name, email, college, role, password, confirmPassword } = req.body;
    if (!name || !email || !college || !role || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password !== confirmPassword)
      return res.status(400).json({ error: "Passwords do not match" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    if (!["student", "admin"].includes(role))
      return res.status(400).json({ error: "Invalid role selected" });
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ error: "User with this email already exists" });

    const verificationToken = generateVerificationToken();
    const user = new User({
      name,
      email,
      college,
      role,
      password,
      verificationToken,

      verificationTokenExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes

      isVerified: false,
    });
    await user.save();

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
    const verifyUrl = `${frontendBase}/verify-email?token=${verificationToken}&email=${encodeURIComponent(
      email
    )}`;
    await emailService.sendVerificationEmail(email, name, verifyUrl);
    return res.status(201).json({
      message:
        "Registration successful! Please check your email to verify your account.",
      userId: user._id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRoutes.get("/me", async (req, res) => {
  try {
    await connectDB();
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;
    if (!token)
      return res
        .status(401)
        .json({ error: "No authentication token provided" });
    const payload = verifyToken(token);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const roleForFrontend = user.role === "admin" ? "college_admin" : "student";
    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        role: roleForFrontend,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

// Verify email endpoint (token sent in registration email)
authRoutes.post("/verify", async (req, res) => {
  try {
    await connectDB();
    const { email, token } = req.body as { email: string; token: string };
    if (!email || !token)
      return res.status(400).json({ error: "Email and token are required" });
   const user = await User.findOne({ email }).select("+verificationToken +verificationTokenExpires");
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isVerified) return res.json({ message: "Already verified" });
    if (user.verificationToken !== token)
      return res.status(400).json({ error: "Invalid verification token" });
    if (!user.verificationTokenExpires || user.verificationTokenExpires < new Date())
      return res.status(400).json({ error: "Verification token has expired" });
    user.set({ isVerified: true, verificationToken: undefined, verificationTokenExpires: undefined });
    await user.save();
    return res.json({ message: "Email verified successfully" });
  } catch (e) {
    console.error("Verify email error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Forgot password: issue 6-digit code and email it
authRoutes.post("/forgot-password", async (req, res) => {
  try {
    await connectDB();
    const { email } = req.body as { email: string };
    if (!email) return res.status(400).json({ error: "Email is required" });
    const user = await User.findOne({ email }).select(
      "+resetPasswordToken +resetPasswordExpires"
    );
    if (!user)
      return res
        .status(200)
        .json({ message: "If that email exists, a code has been sent" });

    if (!user.isVerified)
      return res.status(400).json({ error: "Please verify your email before resetting your password." });


    const code = String(Math.floor(100000 + Math.random() * 900000));
    user.set({
      resetPasswordToken: code,
      resetPasswordExpires: new Date(Date.now() + 5 * 60 * 1000),

    });
    await user.save();
    const previewUrl = await emailService.sendResetPasswordEmail(email, code);
    return res.json({ message: "Reset code sent to email", previewUrl });
  } catch (e) {
    console.error("Forgot password error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Verify reset code
authRoutes.post("/verify-reset-code", async (req, res) => {
  try {
    await connectDB();
    const { email, code } = req.body as { email: string; code: string };
    const user = await User.findOne({ email }).select(
      "+resetPasswordToken +resetPasswordExpires"
    );
    if (
      !user ||
      user.resetPasswordToken !== code ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      return res
        .status(400)
        .json({ valid: false, error: "Invalid or expired code" });
    }
    return res.json({ valid: true });
  } catch (e) {
    console.error("Verify reset code error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Reset password
authRoutes.post("/reset-password", async (req, res) => {
  try {
    await connectDB();
    const { email, code, newPassword } = req.body as {
      email: string;
      code: string;
      newPassword: string;
    };
    if (!newPassword || newPassword.length < 6)
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    const user = await User.findOne({ email }).select(
      "+resetPasswordToken +resetPasswordExpires +password"
    );
    if (
      !user ||
      user.resetPasswordToken !== code ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }
    user.set({
      password: newPassword,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
    });
    await user.save();
    return res.json({ message: "Password reset successful" });
  } catch (e) {
    console.error("Reset password error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});
