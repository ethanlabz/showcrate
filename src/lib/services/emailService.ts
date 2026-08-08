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

export async function sendWelcomeEmail(to: string, username: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Welcome to Showcrate 🎉',
    html: `
      <h1>Welcome to Showcrate, ${username}!</h1>
      <p>Every project deserves a stage. Start building yours today.</p>
      <p><a href="${config.site.url}/new">Create your first project →</a></p>
    `,
    text: `Welcome to Showcrate, ${username}! Start building at ${config.site.url}/new`,
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
      <h2>You've been invited to collaborate!</h2>
      <p><strong>${opts.inviterName}</strong> has invited you to collaborate on 
      <strong>${opts.projectName}</strong> on Showcrate.</p>
      <p><a href="${acceptUrl}">Accept Invitation →</a></p>
      <p><small>This invitation link expires in 7 days.</small></p>
    `,
    text: `${opts.inviterName} invited you to collaborate on ${opts.projectName}. Accept at: ${acceptUrl}`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Reset your Showcrate password',
    html: `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the link below to proceed:</p>
      <p><a href="${resetUrl}">Reset Password →</a></p>
      <p><small>This link expires in 1 hour. If you didn't request this, ignore this email.</small></p>
    `,
    text: `Reset your Showcrate password: ${resetUrl} (expires in 1 hour)`,
  });
}
