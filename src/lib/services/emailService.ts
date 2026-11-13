/**
 * services/emailService.ts — Resend email service
 *
 * All outbound emails go through this service. Never instantiate Resend
 * directly in routes or other services.
 */
import { Resend } from 'resend';
import { config } from '@/lib/config/unified-config';

// Singleton Resend instance
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(config.email.resendApiKey);
  return _resend;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const { error } = await getResend().emails.send({
    from: config.email.fromEmail,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  if (error) {
    // Log but don't throw — email failures should not block user actions
    console.error('[emailService] Failed to send email:', error.message);
  }
}

// ── Email templates ────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, username: string, confirmUrl?: string): Promise<void> {
  const actionUrl = confirmUrl ?? `${config.site.url}/auth/login`;
  await sendEmail({
    to,
    subject: 'Confirm your email — Showcrate 🎉',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #111;">
        <h1 style="font-size: 22px; font-weight: 600;">Welcome to Showcrate, ${username}!</h1>
        <p style="font-size: 15px; color: #444; line-height: 1.5;">Every project deserves a stage. Please confirm your email address to complete your registration:</p>
        <p style="margin: 25px 0;">
          <a href="${actionUrl}" style="display: inline-block; background: #000000; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">Confirm Email Address →</a>
        </p>
        <p style="font-size: 12px; color: #888;">If you didn't create an account on Showcrate, you can safely ignore this email.</p>
      </div>
    `,
    text: `Welcome to Showcrate, ${username}! Please confirm your email address at: ${actionUrl}`,
  });
}

export async function sendCollaboratorInviteEmail(opts: {
  to: string;
  inviterName: string;
  projectName: string;
  projectOwnerUsername: string;
  projectSlug: string;
  inviteToken: string;
}): Promise<void> {
  const acceptUrl = `${config.site.url}/invite/accept?token=${opts.inviteToken}`;
  await sendEmail({
    to: opts.to,
    subject: `${opts.inviterName} invited you to collaborate on ${opts.projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #111;">
        <h2 style="font-size: 20px; font-weight: 600;">You've been invited to collaborate!</h2>
        <p style="font-size: 15px; color: #444; line-height: 1.5;"><strong>${opts.inviterName}</strong> has invited you to collaborate on <strong>${opts.projectName}</strong> on Showcrate.</p>
        <p style="margin: 25px 0;">
          <a href="${acceptUrl}" style="display: inline-block; background: #000000; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">Accept Invitation →</a>
        </p>
        <p style="font-size: 12px; color: #888;">This invitation link expires in 7 days.</p>
      </div>
    `,
    text: `${opts.inviterName} invited you to collaborate on ${opts.projectName}. Accept at: ${acceptUrl}`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Reset your Showcrate password',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #111;">
        <h2 style="font-size: 20px; font-weight: 600;">Password Reset Request</h2>
        <p style="font-size: 15px; color: #444; line-height: 1.5;">We received a request to reset your password. Click the button below to set a new password:</p>
        <p style="margin: 25px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #000000; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">Reset Password →</a>
        </p>
        <p style="font-size: 12px; color: #888;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
    text: `Reset your Showcrate password: ${resetUrl} (expires in 1 hour)`,
  });
}
