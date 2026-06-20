/**
 * Social Planner - Email Service
 *
 * Handles sending transactional emails.
 * Uses Resend SDK in production (better deliverability with Outlook/Microsoft).
 * Falls back to nodemailer SMTP for local development (MailHog at http://localhost:8025).
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../lib/logger';

// ============================================
// TRANSPORT SETUP
// ============================================

const useResend = !!config.RESEND_API_KEY;
const resend = useResend ? new Resend(config.RESEND_API_KEY) : null;

// Nodemailer fallback for local dev (MailHog)
const smtpTransporter =
  !useResend && config.SMTP_HOST
    ? nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth:
          config.SMTP_USER && config.SMTP_PASS
            ? {
                user: config.SMTP_USER,
                pass: config.SMTP_PASS,
              }
            : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 30000,
      })
    : null;

if (useResend) {
  logger.info('Email service: using Resend SDK');
} else if (smtpTransporter) {
  logger.info({ host: config.SMTP_HOST, port: config.SMTP_PORT }, 'Email service: using SMTP');
} else {
  logger.warn('Email service: no email transport configured');
}

// ============================================
// TYPES
// ============================================

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface ReviewRequestEmailData {
  recipientEmail: string;
  recipientName?: string;
  senderName: string;
  postPreview: string;
  reviewUrl: string;
  message?: string;
}

export interface CollaboratorEmailData {
  recipientEmail: string;
  recipientName: string;
  addedByName: string;
  postPreview: string;
  postUrl: string;
}

export interface FeedbackReplyEmailData {
  recipientEmail: string;
  recipientName: string;
  replyAuthorName: string;
  feedbackContent: string;
  replyContent: string;
  feedbackUrl: string;
}

export interface InvitationEmailData {
  recipientEmail: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}

// ============================================
// EMAIL SENDING
// ============================================

/**
 * Send an email using Resend (production) or SMTP (development)
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const from = `Social Planner <${config.EMAIL_FROM}>`;

  // Resend SDK
  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.text && { text: options.text }),
      });

      if (error) {
        logger.error({ error, to: options.to }, 'Resend: failed to send email');
        return false;
      }

      logger.info({ to: options.to }, 'Email sent via Resend');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage, to: options.to }, 'Resend: failed to send email');
      return false;
    }
  }

  // SMTP fallback
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info({ messageId: info.messageId, to: options.to }, 'Email sent via SMTP');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage, to: options.to }, 'SMTP: failed to send email');
      return false;
    }
  }

  logger.warn({ to: options.to }, 'Email not sent - no transport configured');
  return false;
}

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Send a review request email with a share link
 */
interface EmailLayoutOptions {
  title: string;
  styles: string;
  content: string;
}

/**
 * Shared HTML scaffold for every transactional email. The doctype, <head>,
 * card/header wrapper and footer are identical across all templates; only the
 * title, <style> rules and inner content differ. Output is byte-for-byte
 * identical to the previous inline templates (locked by golden snapshots).
 */
function renderEmailLayout(opts: EmailLayoutOptions): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
  <style>${opts.styles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <span class="logo">Social Planner</span>
      </div>${opts.content}
    </div>

    <div class="footer">
      <p>Sent via <a href="${config.FRONTEND_URL}">Social Planner</a></p>
    </div>
  </div>
</body>
</html>
`;
}

export async function sendReviewRequestEmail(data: ReviewRequestEmailData): Promise<boolean> {
  const { recipientEmail, recipientName, senderName, postPreview, reviewUrl, message } = data;

  const greeting = recipientName ? `Hi ${recipientName}` : 'Hi';
  const truncatedPreview =
    postPreview.length > 150 ? postPreview.substring(0, 150) + '...' : postPreview;

  const html = renderEmailLayout({
    title: `Review Request`,
    styles: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      margin-bottom: 24px;
    }
    .logo {
      font-size: 20px;
      font-weight: 600;
      color: #6366f1;
      text-decoration: none;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 16px 0;
    }
    p {
      margin: 0 0 16px 0;
    }
    .message-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      border-left: 4px solid #6366f1;
    }
    .message-box p {
      margin: 0;
      font-style: italic;
      color: #4b5563;
    }
    .preview-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .preview-label {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .preview-text {
      color: #374151;
      margin: 0;
    }
    .button {
      display: inline-block;
      background: #6366f1;
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      margin-top: 8px;
    }
    .button:hover {
      background: #4f46e5;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      color: #9ca3af;
      font-size: 14px;
    }
    .footer a {
      color: #6b7280;
    }
  `,
    content: `

      <h1>Review Request</h1>

      <p>${greeting},</p>

      <p><strong>${senderName}</strong> has requested your feedback on a social media post.</p>

      ${
        message
          ? `
      <div class="message-box">
        <p>"${message}"</p>
      </div>
      `
          : ''
      }

      <div class="preview-box">
        <div class="preview-label">Post Preview</div>
        <p class="preview-text">${truncatedPreview}</p>
      </div>

      <p>Click the button below to view the full post and leave your comments:</p>

      <a href="${reviewUrl}" class="button">Review Post</a>

      <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
        This link will expire in 30 days. If you have any questions, please contact ${senderName} directly.
      </p>`,
  });

  const text = `
${greeting},

${senderName} has requested your feedback on a social media post.

${message ? `Message from ${senderName}:\n"${message}"\n\n` : ''}
Post Preview:
${truncatedPreview}

Click the link below to view the full post and leave your comments:
${reviewUrl}

This link will expire in 30 days.

---
Sent via Social Planner
`;

  return sendEmail({
    to: recipientEmail,
    subject: `${senderName} requested your review`,
    html,
    text,
  });
}

/**
 * Send a collaborator added email notification
 */
export async function sendCollaboratorAddedEmail(data: CollaboratorEmailData): Promise<boolean> {
  const { recipientEmail, recipientName, addedByName, postPreview, postUrl } = data;

  const truncatedPreview =
    postPreview.length > 150 ? postPreview.substring(0, 150) + '...' : postPreview;

  const html = renderEmailLayout({
    title: `Added as Collaborator`,
    styles: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      margin-bottom: 24px;
    }
    .logo {
      font-size: 20px;
      font-weight: 600;
      color: #6366f1;
      text-decoration: none;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 16px 0;
    }
    p {
      margin: 0 0 16px 0;
    }
    .preview-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .preview-label {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .preview-text {
      color: #374151;
      margin: 0;
    }
    .button {
      display: inline-block;
      background: #6366f1;
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      margin-top: 8px;
    }
    .button:hover {
      background: #4f46e5;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      color: #9ca3af;
      font-size: 14px;
    }
    .footer a {
      color: #6b7280;
    }
  `,
    content: `

      <h1>Added as Collaborator</h1>

      <p>Hi ${recipientName},</p>

      <p><strong>${addedByName}</strong> added you as a collaborator on a post.</p>

      <div class="preview-box">
        <div class="preview-label">Post Preview</div>
        <p class="preview-text">${truncatedPreview}</p>
      </div>

      <p>Click the button below to view the post:</p>

      <a href="${postUrl}" class="button">View Post</a>`,
  });

  const text = `
Hi ${recipientName},

${addedByName} added you as a collaborator on a post.

Post Preview:
${truncatedPreview}

Click the link below to view the post:
${postUrl}

---
Sent via Social Planner
`;

  return sendEmail({
    to: recipientEmail,
    subject: `${addedByName} added you as a collaborator`,
    html,
    text,
  });
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = renderEmailLayout({
    title: `Reset Your Password`,
    styles: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      margin-bottom: 24px;
    }
    .logo {
      font-size: 20px;
      font-weight: 600;
      color: #6366f1;
      text-decoration: none;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 16px 0;
    }
    p {
      margin: 0 0 16px 0;
    }
    .button {
      display: inline-block;
      background: #6366f1;
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      margin-top: 8px;
    }
    .button:hover {
      background: #4f46e5;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      color: #9ca3af;
      font-size: 14px;
    }
    .footer a {
      color: #6b7280;
    }
    .note {
      margin-top: 24px;
      font-size: 14px;
      color: #6b7280;
    }
  `,
    content: `

      <h1>Reset Your Password</h1>

      <p>Hi,</p>

      <p>We received a request to reset your password. Click the button below to choose a new password:</p>

      <a href="${resetUrl}" class="button">Reset Password</a>

      <p class="note">
        This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>`,
  });

  const text = `
Hi,

We received a request to reset your password for Social Planner.

Click the link below to choose a new password:
${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

---
Sent via Social Planner
`;

  return sendEmail({
    to: email,
    subject: 'Reset your Social Planner password',
    html,
    text,
  });
}

/**
 * Send an invitation email to join Social Planner
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
  const { recipientEmail, inviterName, role, acceptUrl, expiresAt } = data;

  const roleDisplay = role === 'EDITOR' ? 'an Editor' : 'a Viewer';
  const expiryDate = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = renderEmailLayout({
    title: `You're Invited to Social Planner`,
    styles: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      margin-bottom: 24px;
    }
    .logo {
      font-size: 20px;
      font-weight: 600;
      color: #6366f1;
      text-decoration: none;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 16px 0;
    }
    p {
      margin: 0 0 16px 0;
    }
    .role-badge {
      display: inline-block;
      background: #eef2ff;
      color: #4f46e5;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 500;
    }
    .button {
      display: inline-block;
      background: #6366f1;
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      margin-top: 8px;
    }
    .button:hover {
      background: #4f46e5;
    }
    .oauth-note {
      margin-top: 16px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
      font-size: 14px;
      color: #6b7280;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      color: #9ca3af;
      font-size: 14px;
    }
    .footer a {
      color: #6b7280;
    }
    .note {
      margin-top: 24px;
      font-size: 14px;
      color: #6b7280;
    }
  `,
    content: `

      <h1>You're Invited!</h1>

      <p>Hi,</p>

      <p><strong>${inviterName}</strong> has invited you to join Social Planner as <span class="role-badge">${roleDisplay}</span>.</p>

      <p>Click the button below to create your account:</p>

      <a href="${acceptUrl}" class="button">Accept Invitation</a>

      <div class="oauth-note">
        You can also sign in with Google or Microsoft using this email address (${recipientEmail}).
      </div>

      <p class="note">
        This invitation expires on ${expiryDate}. If you didn't expect this invitation, you can safely ignore this email.
      </p>`,
  });

  const text = `
Hi,

${inviterName} has invited you to join Social Planner as ${roleDisplay}.

Click the link below to create your account:
${acceptUrl}

You can also sign in with Google or Microsoft using this email address (${recipientEmail}).

This invitation expires on ${expiryDate}.

If you didn't expect this invitation, you can safely ignore this email.

---
Sent via Social Planner
`;

  return sendEmail({
    to: recipientEmail,
    subject: `${inviterName} invited you to Social Planner`,
    html,
    text,
  });
}

/**
 * Send a feedback reply notification email
 */
export async function sendFeedbackReplyEmail(data: FeedbackReplyEmailData): Promise<boolean> {
  const {
    recipientEmail,
    recipientName,
    replyAuthorName,
    feedbackContent,
    replyContent,
    feedbackUrl,
  } = data;

  const escapeHtml = (str: string): string =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

  const truncate = (str: string, max: number): string =>
    str.length > max ? str.substring(0, max) + '...' : str;

  const safeName = escapeHtml(recipientName);
  const safeAuthor = escapeHtml(replyAuthorName);
  const safeFeedback = escapeHtml(truncate(feedbackContent, 200));
  const safeReply = escapeHtml(truncate(replyContent, 200));

  const html = renderEmailLayout({
    title: `New Reply to Your Feedback`,
    styles: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      margin-bottom: 24px;
    }
    .logo {
      font-size: 20px;
      font-weight: 600;
      color: #6366f1;
      text-decoration: none;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 16px 0;
    }
    p {
      margin: 0 0 16px 0;
    }
    .content-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .content-label {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .content-text {
      color: #374151;
      margin: 0;
    }
    .reply-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      border-left: 4px solid #6366f1;
    }
    .button {
      display: inline-block;
      background: #6366f1;
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      margin-top: 8px;
    }
    .button:hover {
      background: #4f46e5;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      color: #9ca3af;
      font-size: 14px;
    }
    .footer a {
      color: #6b7280;
    }
  `,
    content: `

      <h1>New Reply to Your Feedback</h1>

      <p>Hi ${safeName},</p>

      <p><strong>${safeAuthor}</strong> replied to your feedback.</p>

      <div class="content-box">
        <div class="content-label">Your Feedback</div>
        <p class="content-text">${safeFeedback}</p>
      </div>

      <div class="reply-box">
        <div class="content-label">Reply</div>
        <p class="content-text">${safeReply}</p>
      </div>

      <p>Click the button below to view the full conversation:</p>

      <a href="${feedbackUrl}" class="button">View Feedback</a>`,
  });

  const text = `
Hi ${recipientName},

${replyAuthorName} replied to your feedback.

Your Feedback:
${truncate(feedbackContent, 200)}

Reply:
${truncate(replyContent, 200)}

View the full conversation:
${feedbackUrl}

---
Sent via Social Planner
`;

  return sendEmail({
    to: recipientEmail,
    subject: `${replyAuthorName} replied to your feedback`,
    html,
    text,
  });
}

/**
 * Verify the email configuration is working
 */
export async function verifyEmailConfiguration(): Promise<boolean> {
  if (resend) {
    // Resend SDK doesn't need verification - if the API key is valid, it works
    logger.info('Email configuration: Resend SDK active');
    return true;
  }

  if (smtpTransporter) {
    try {
      await smtpTransporter.verify();
      logger.info('Email configuration: SMTP verified');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ error: errorMessage }, 'Email configuration verification failed');
      return false;
    }
  }

  return false;
}
