import nodemailer from "nodemailer";
import { getPlatformSettings } from "@/lib/platform";
import { decrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";

async function sendMail(opts: { to: string; subject: string; text: string; html: string }) {
  const settings = await getPlatformSettings();

  if (!settings.smtpHost || !settings.smtpPort || !settings.smtpFromAddress) {
    logger.warn(
      { to: opts.to, subject: opts.subject },
      "Platform SMTP is not configured, email not sent",
    );
    return { sent: false as const };
  }

  const transport = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: settings.smtpUser
      ? {
          user: settings.smtpUser,
          pass: settings.smtpPasswordEncrypted
            ? decrypt(settings.smtpPasswordEncrypted)
            : undefined,
        }
      : undefined,
  });

  await transport.sendMail({
    from: settings.smtpFromAddress,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });

  return { sent: true as const };
}

export function sendInviteEmail(to: string, name: string, acceptUrl: string) {
  return sendMail({
    to,
    subject: "You've been invited to CoreBudget",
    text: `Hi ${name},\n\nYou've been invited to join CoreBudget. Complete your account setup:\n${acceptUrl}\n\nThis link expires in 7 days.`,
    html: `<p>Hi ${name},</p><p>You've been invited to join CoreBudget. Complete your account setup:</p><p><a href="${acceptUrl}">${acceptUrl}</a></p><p>This link expires in 7 days.</p>`,
  });
}

export function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  return sendMail({
    to,
    subject: "Reset your CoreBudget password",
    text: `Hi ${name},\n\nAn administrator has requested a password reset for your account:\n${resetUrl}\n\nThis link expires in 1 hour and can only be used once.`,
    html: `<p>Hi ${name},</p><p>An administrator has requested a password reset for your account:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour and can only be used once.</p>`,
  });
}
