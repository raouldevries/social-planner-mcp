/**
 * Email Service Tests — sendFeedbackReplyEmail
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must use vi.hoisted so the fn is available when vi.mock is hoisted
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

// Config is already mocked by global setup, but we need SMTP fields
vi.mock('../config', () => ({
  config: {
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    SMTP_USER: '',
    SMTP_PASS: '',
    EMAIL_FROM: 'noreply@planner.app',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

import { sendFeedbackReplyEmail, type FeedbackReplyEmailData } from './email.service';

describe('sendFeedbackReplyEmail', () => {
  const baseData: FeedbackReplyEmailData = {
    recipientEmail: 'user@example.com',
    recipientName: 'Test User',
    replyAuthorName: 'Admin Person',
    feedbackContent: 'Something is broken on the calendar page',
    replyContent: 'Thanks for reporting, we are looking into it',
    feedbackUrl: 'http://localhost:5173/feedback',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });
  });

  it('should call sendEmail with correct to, subject, html, and text', async () => {
    await sendFeedbackReplyEmail(baseData);

    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe('user@example.com');
    expect(call.subject).toBe('Admin Person replied to your feedback');
    expect(call.html).toBeDefined();
    expect(call.text).toBeDefined();
  });

  it('should include recipient name, author name, and content in HTML', async () => {
    await sendFeedbackReplyEmail(baseData);

    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toContain('Test User');
    expect(call.html).toContain('Admin Person');
    expect(call.html).toContain('Something is broken on the calendar page');
    expect(call.html).toContain('Thanks for reporting, we are looking into it');
    expect(call.html).toContain('http://localhost:5173/feedback');
  });

  it('should include content in plain text version', async () => {
    await sendFeedbackReplyEmail(baseData);

    const call = mockSendMail.mock.calls[0][0];
    expect(call.text).toContain('Admin Person');
    expect(call.text).toContain('Something is broken on the calendar page');
    expect(call.text).toContain('Thanks for reporting, we are looking into it');
    expect(call.text).toContain('http://localhost:5173/feedback');
  });

  it('should HTML-escape user-controlled values', async () => {
    const maliciousData: FeedbackReplyEmailData = {
      ...baseData,
      recipientName: '<script>alert("xss")</script>',
      replyAuthorName: '<img onerror="alert(1)" src=x>',
      feedbackContent: 'Test & "quotes" <tags>',
      replyContent: 'Reply with <b>html</b> & "stuff"',
    };

    await sendFeedbackReplyEmail(maliciousData);

    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).not.toContain('<script>');
    expect(call.html).not.toContain('<img onerror');
    expect(call.html).toContain('&lt;script&gt;');
    expect(call.html).toContain('&lt;img onerror=');
    expect(call.html).toContain('Test &amp; &quot;quotes&quot; &lt;tags&gt;');
  });

  it('should truncate content fields to 200 chars', async () => {
    const longContent = 'A'.repeat(250);
    const data: FeedbackReplyEmailData = {
      ...baseData,
      feedbackContent: longContent,
      replyContent: longContent,
    };

    await sendFeedbackReplyEmail(data);

    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toContain('A'.repeat(200) + '...');
    expect(call.html).not.toContain('A'.repeat(201));
  });

  it('should return boolean from sendEmail', async () => {
    const result = await sendFeedbackReplyEmail(baseData);
    expect(typeof result).toBe('boolean');
  });
});
