import { Injectable } from '@nestjs/common';

export interface OwnerEmailJob {
  accessLogId: number;
  toEmail: string;
  recipientName: string;
  accessLog: { direction: 'in' | 'out'; createdAt: Date };
}

@Injectable()
export class EmailSenderService {
  isConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  }

  async send(job: OwnerEmailJob): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from)
      throw new Error('ยังไม่ได้ตั้ง RESEND_API_KEY และ EMAIL_FROM');

    const action = job.accessLog.direction === 'in' ? 'เข้า' : 'ออก';
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
      timeStyle: 'short',
      hourCycle: 'h23',
    }).format(job.accessLog.createdAt);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `access/${job.accessLogId}`,
      },
      body: JSON.stringify({
        from,
        to: [job.toEmail],
        subject: `แจ้งเตือนการใช้บัตร ${action}ประตู`,
        text: `สวัสดี ${job.recipientName}\nบัตร RFID ของคุณถูกใช้${action}ประตูเมื่อ ${time} (เวลาไทย)\nหากไม่ใช่คุณ กรุณาติดต่อผู้ดูแลระบบ`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new Error(`Email provider responded ${response.status}`);
  }
}
