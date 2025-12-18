import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "../storage.js";
import { log } from "../utils/logger.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

export async function getCurrentUser(req, res) {
  if (req.session.isAuthenticated && req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
}

export async function register(req, res) {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    const existingEmail = await storage.getAccountByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") + Date.now().toString().slice(-4);
    const hashedPassword = await bcrypt.hash(password, 10);

    const account = await storage.createAccount({
      email: email.toLowerCase(),
      password: hashedPassword,
      username,
      nickname: name,
    });

    req.session.userId = account._id.toString();
    req.session.isAuthenticated = true;
    req.session.user = {
      id: account._id.toString(),
      email: account.email,
      username: account.username,
      nickname: account.nickname,
      avatarColor: account.avatarColor,
    };

    log(`User registered: ${account.email}`, "auth");
    res.status(201).json({ user: req.session.user });
  } catch (error) {
    log(`Registration error: ${error.message}`, "auth");
    res.status(500).json({ error: "Failed to create account" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const account = await storage.getAccountByEmail(email);
    if (!account) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!account.password) {
      return res.status(401).json({ error: "This account uses Google sign-in. Please use the 'Continue with Google' button." });
    }

    const isValidPassword = await bcrypt.compare(password, account.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.userId = account._id.toString();
    req.session.isAuthenticated = true;
    req.session.user = {
      id: account._id.toString(),
      email: account.email,
      username: account.username,
      nickname: account.nickname,
      avatarColor: account.avatarColor,
    };

    log(`User logged in: ${account.email}`, "auth");
    res.json({ user: req.session.user });
  } catch (error) {
    log(`Login error: ${error.message}`, "auth");
    res.status(500).json({ error: "Login failed" });
  }
}

export function logout(req, res) {
  const email = req.session.user?.email;
  req.session.destroy((err) => {
    if (err) {
      log(`Logout error: ${err.message}`, "auth");
      return res.status(500).json({ error: "Logout failed" });
    }
    log(`User logged out: ${email}`, "auth");
    res.json({ success: true });
  });
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const account = await storage.getAccountByEmail(email);
    if (!account) {
      return res.json({ 
        success: true, 
        message: "If an account with that email exists, an OTP has been sent." 
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await storage.setResetOTP(email, otp, otpExpiry);

    await sendPasswordResetEmail(email, account.nickname, otp);

    log(`Password reset OTP requested for: ${email}`, "auth");
    
    res.json({ 
      success: true, 
      message: "If an account with that email exists, a 6-digit OTP has been sent to your email." 
    });
  } catch (error) {
    log(`Forgot password error: ${error.message}`, "auth");
    res.status(500).json({ error: "Failed to process request" });
  }
}

export async function verifyResetToken(req, res) {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const account = await storage.getAccountByResetOTP(email, otp);
    if (!account) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    res.json({ valid: true, email: account.email });
  } catch (error) {
    log(`Verify reset token error: ${error.message}`, "auth");
    res.status(500).json({ error: "Failed to verify token" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const account = await storage.getAccountByResetOTP(token);
    if (!account) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await storage.updateAccount(account._id.toString(), { password: hashedPassword });
    await storage.clearResetOTP(account._id.toString());

    log(`Password reset completed for: ${account.email}`, "auth");
    
    res.json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    log(`Reset password error: ${error.message}`, "auth");
    res.status(500).json({ error: "Failed to reset password" });
  }
}

export function getSession(req, res) {
  res.json({ userId: req.session.userId });
}

export function handleGoogleCallback(req, res) {
  const account = req.user;
  if (account) {
    req.session.userId = account._id.toString();
    req.session.isAuthenticated = true;
    req.session.user = {
      id: account._id.toString(),
      email: account.email,
      username: account.username,
      nickname: account.nickname,
      avatarColor: account.avatarColor,
    };
    log(`User logged in via Google: ${account.email}`, "auth");
  }
  const frontendUrl = process.env.FRONTEND_URL;
  res.redirect(frontendUrl);
}
