import nodemailer from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private async ensureTransporter(): Promise<void> {
    if (this.transporter) return;

    const hasRealSmtp = !!(
      process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS
    );
    if (hasRealSmtp) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || "587"),
        secure: (process.env.EMAIL_SECURE || "false").toLowerCase() === "true",
        auth: {
          user: process.env.EMAIL_USER as string,
          pass: process.env.EMAIL_PASS as string,
        },
      });
      return;
    }

    // Development fallback using Ethereal
    const testAccount = await nodemailer.createTestAccount();
    this.transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(
      "[Email] Using Ethereal test account. Emails will have preview URLs."
    );
  }

  async sendRegistrationNotification(
    to: string,
    eventTitle: string,
    status: "approved" | "rejected"
  ) {
    const subject = `Registration ${status} - ${eventTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Registration Update</h2>
        <p>Your registration for <strong>${eventTitle}</strong> has been <strong>${status}</strong>.</p>
        ${
          status === "approved"
            ? '<p style="color: #10b981;">Congratulations! You can now attend the event.</p>'
            : '<p style="color: #ef4444;">Unfortunately, your registration was not approved this time.</p>'
        }
        <p>Best regards,<br>Event Management Team</p>
      </div>
    `;

    try {
      await this.ensureTransporter();
      const info = await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM || "noreply@eventmanagement.com",
        to,
        subject,
        html,
      });
      console.log(
        `Email sent to ${to} for ${eventTitle} registration ${status}`
      );
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log(`[Email Preview] ${preview}`);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }

  async sendEventUpdateNotification(
    to: string,
    eventTitle: string,
    changes: any
  ) {
    const subject = `Event Updated - ${eventTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Event Update Notification</h2>
        <p>The event <strong>${eventTitle}</strong> has been updated.</p>
        <p>Please check the event details for the latest information.</p>
        <p>Best regards,<br>Event Management Team</p>
      </div>
    `;

    try {
      await this.ensureTransporter();
      const info = await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM || "noreply@eventmanagement.com",
        to,
        subject,
        html,
      });
      console.log(`Event update email sent to ${to} for ${eventTitle}`);
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log(`[Email Preview] ${preview}`);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }

  async sendNewRegistrationAlert(
    to: string,
    eventTitle: string,
    userName: string
  ) {
    const subject = `New Registration - ${eventTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Registration Alert</h2>
        <p><strong>${userName}</strong> has registered for <strong>${eventTitle}</strong>.</p>
        <p>Please review and approve/reject the registration in the admin dashboard.</p>
        <p>Best regards,<br>Event Management System</p>
      </div>
    `;

    try {
      await this.ensureTransporter();
      const info = await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM || "noreply@eventmanagement.com",
        to,
        subject,
        html,
      });
      console.log(`New registration alert sent to ${to} for ${eventTitle}`);
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log(`[Email Preview] ${preview}`);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }

  async sendNewFeedbackAlert(to: string, eventTitle: string, feedback: string) {
    const subject = `New Feedback - ${eventTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Feedback Received</h2>
        <p>New feedback has been submitted for <strong>${eventTitle}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0;"><em>"${feedback.substring(0, 100)}${
      feedback.length > 100 ? "..." : ""
    }"</em></p>
        </div>
        <p>Please review the complete feedback in the admin dashboard.</p>
        <p>Best regards,<br>Event Management System</p>
      </div>
    `;

    try {
      await this.ensureTransporter();
      const info = await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM || "noreply@eventmanagement.com",
        to,
        subject,
        html,
      });
      console.log(`New feedback alert sent to ${to} for ${eventTitle}`);
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log(`[Email Preview] ${preview}`);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    verificationUrl: string
  ): Promise<string | undefined> {
    const subject = `Verify your email`;
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #6D29C0;">Welcome${name ? `, ${name}` : ""}!</h2>
        <p>Thanks for signing up. Please verify your email by clicking the button below:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${verificationUrl}" target="_blank" style="background: #6D29C0; color: #fff; padding: 12px 18px; border-radius: 6px; text-decoration: none; display: inline-block;">Verify Email</a>
        </div>
        <p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #555; word-break: break-all;">${verificationUrl}</p>
      </div>
    `;

    try {
      await this.ensureTransporter();
      const info = await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM || "noreply@eventmanagement.com",
        to,
        subject,
        html,
      });
      console.log(`Verification email sent to ${to}`);
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) {
        console.log(`[Email Preview] ${preview}`);
        return preview;
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
    }
    return undefined;
  }

  async sendResetPasswordEmail(
    to: string,
    resetCode: string
  ): Promise<string | undefined> {
    const subject = `Password Reset Code`;
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #6D29C0; text-align: center;">Password Reset Request</h2>
        <p>You requested a password reset. Use the code below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #6D29C0;">
            ${resetCode}
          </div>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    try {
      await this.ensureTransporter();
      const info = await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM || "noreply@eventmanagement.com",
        to,
        subject,
        html,
      });
      console.log(`Reset password email sent to ${to}`);
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) {
        console.log(`[Email Preview] ${preview}`);
        return preview;
      }
    } catch (error) {
      console.error("Error sending reset password email:", error);
    }
    return undefined;
  }
}

export const emailService = new EmailService();
