import { Resend } from "resend";
import { log } from "../utils/logger.js";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(email, nickname, resetLink) {
  if (!resend) {
    log("Email service not configured - RESEND_API_KEY not set", "email");
    return false;
  }

  try {
    await resend.emails.send({
      from: "Inkify <onboarding@resend.dev>",
      to: email,
      subject: "Reset Your Inkify Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>Hi ${nickname || 'there'},</p>
          <p>We received a request to reset your password for your Inkify account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${resetLink}</p>
          <p style="color: #999; font-size: 12px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    log(`Password reset email sent to: ${email}`, "email");
    return true;
  } catch (error) {
    log(`Failed to send reset email: ${error.message}`, "email");
    return false;
  }
}
