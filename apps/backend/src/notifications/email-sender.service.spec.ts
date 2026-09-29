import { EmailSenderService } from './email-sender.service';

describe('EmailSenderService', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const job = {
    accessLogId: 12,
    toEmail: 'owner@example.com',
    recipientName: 'Owner',
    accessLog: {
      direction: 'in' as const,
      createdAt: new Date('2026-09-29T01:00:00Z'),
    },
  };

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.EMAIL_FROM = 'Door Lock <alerts@example.com>';
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });
  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it('sends to the card owner with access-log idempotency and Thai time', async () => {
    await new EmailSenderService().send(job);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Idempotency-Key': 'access/12' }),
      }),
    );
    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body as string,
    );
    expect(body.to).toEqual(['owner@example.com']);
    expect(body.text).toContain('เข้า');
    expect(body.text).toContain('08:00');
  });

  it('treats provider rejection as a retryable failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(new EmailSenderService().send(job)).rejects.toThrow('503');
  });
});
