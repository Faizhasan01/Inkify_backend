import { Resend } from "resend";
import { log } from "../utils/logger.js";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(email, nickname, otp) {
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
         <p>We received a request to reset your password for your Inkify account.</p>
          <p>Use the code below to verify your identity:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #3B82F6; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
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
