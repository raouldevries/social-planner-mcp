/**
 * Golden / characterization tests for the 5 email template builders.
 *
 * PURPOSE: lock the exact rendered output ({ to, subject, html, text }) of every
 * email template BEFORE refactoring the duplicated HTML scaffold. The snapshots
 * are the behavioural contract — the upcoming `buildEmailTemplate()` extraction
 * must keep every byte identical. Written coverage-first because the existing
 * suite only exercised sendFeedbackReplyEmail (1 of 6 functions), leaving the
 * other templates with zero contract.
 *
 * Determinism: ../config is mocked to fixed values. The one Date input
 * (invitation expiresAt) is formatted with toLocaleDateString('en-US') WITHOUT a
 * timeZone option, so its rendered calendar day depends on the ambient timezone
 * — noon-UTC still rolls to the next day in UTC+12/+13 zones (e.g. Auckland,
 * Fiji). vitest.config.ts pins TZ=UTC (in the main process, before workers fork)
 * so this snapshot is stable on every machine. (The underlying source arguably
 * should pass { timeZone: 'UTC' } so far-east users see the right date, but that
 * changes rendered output — out of scope for this byte-identical refactor.)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted so the mock fn exists when vi.mock is hoisted above the imports.
const { mockSendMail } = vi.hoisted(() => ({
  mockSendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
      verify: vi.fn().mockResolvedValue(true),
    })),
  },
}));

vi.mock('../config', () => ({
  config: {
    RESEND_API_KEY: '', // falsy -> sendEmail uses the SMTP/nodemailer transport
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    SMTP_USER: '',
    SMTP_PASS: '',
    EMAIL_FROM: 'noreply@planner.app',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

import {
  sendReviewRequestEmail,
  sendCollaboratorAddedEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendFeedbackReplyEmail,
  type ReviewRequestEmailData,
  type CollaboratorEmailData,
  type InvitationEmailData,
  type FeedbackReplyEmailData,
} from './email.service';

/** The { to, subject, html, text } handed to the transport by the last send. */
function lastEmail(): Record<string, unknown> {
  const call = mockSendMail.mock.calls.at(-1)?.[0] as Record<string, unknown>;
  return { to: call.to, subject: call.subject, html: call.html, text: call.text };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendMail.mockResolvedValue({ messageId: 'test-id' });
});

describe('email template golden output', () => {
  it('sendReviewRequestEmail', async () => {
    const data: ReviewRequestEmailData = {
      recipientEmail: 'reviewer@example.com',
      recipientName: 'Reviewer Rita',
      senderName: 'Author Alice',
      postPreview: 'Check out our new product launch announcement!',
      reviewUrl: 'http://localhost:5173/review/abc123',
      message: 'Please review by Friday.',
    };
    await sendReviewRequestEmail(data);
    expect(lastEmail()).toMatchSnapshot();
  });

  it('sendCollaboratorAddedEmail', async () => {
    const data: CollaboratorEmailData = {
      recipientEmail: 'collab@example.com',
      recipientName: 'Collab Carol',
      addedByName: 'Owner Oscar',
      postPreview: 'Draft: Q1 marketing roundup',
      postUrl: 'http://localhost:5173/posts/xyz789',
    };
    await sendCollaboratorAddedEmail(data);
    expect(lastEmail()).toMatchSnapshot();
  });

  it('sendPasswordResetEmail', async () => {
    await sendPasswordResetEmail('reset@example.com', 'tok-FIXED-123');
    expect(lastEmail()).toMatchSnapshot();
  });

  it('sendInvitationEmail', async () => {
    const data: InvitationEmailData = {
      recipientEmail: 'invitee@example.com',
      inviterName: 'Inviter Ivan',
      role: 'EDITOR',
      acceptUrl: 'http://localhost:5173/invite/accept?token=inv-123',
      expiresAt: new Date('2026-03-15T12:00:00Z'), // noon UTC: stable calendar day
    };
    await sendInvitationEmail(data);
    expect(lastEmail()).toMatchSnapshot();
  });

  it('sendFeedbackReplyEmail', async () => {
    const data: FeedbackReplyEmailData = {
      recipientEmail: 'user@example.com',
      recipientName: 'Test User',
      replyAuthorName: 'Admin Person',
      feedbackContent: 'Something is broken on the calendar page',
      replyContent: 'Thanks for reporting, we are looking into it',
      feedbackUrl: 'http://localhost:5173/feedback',
    };
    await sendFeedbackReplyEmail(data);
    expect(lastEmail()).toMatchSnapshot();
  });
});
