import { Injectable, Logger } from '@nestjs/common';

import type { AccessAttempt } from '../access/access.types';

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);

  private get token(): string | undefined {
    return process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  }

  private get groupId(): string | undefined {
    return process.env.LINE_GROUP_ID?.trim();
  }

  /**
   * ส่งข้อความ Flex Message แจ้งเตือนการสแกนบัตรไปยัง LINE Bot (น้องจูดี้)
   */
  async notifyAccess(attempt: AccessAttempt): Promise<void> {
    if (!this.token) {
      return;
    }

    try {
      const flexMessage = this.buildFlexMessage(attempt);
      await this.sendMessage(flexMessage);
    } catch (err) {
      this.logger.error(
        `ส่งแจ้งเตือน LINE ไม่สำเร็จ: ${(err as Error).message}`,
      );
    }
  }

  /**
   * สร้างโครงสร้าง LINE Flex Message Bubble ให้สวยงาม
   */
  buildFlexMessage(attempt: AccessAttempt): Record<string, unknown> {
    const isGranted = attempt.status === 'granted';
    const directionText =
      attempt.direction === 'in' ? 'ขาเข้า (Entry)' : 'ขาออก (Exit)';
    const statusText = isGranted
      ? 'อนุญาตให้ผ่านประตู ✅'
      : 'ไม่อนุญาตให้เข้า ❌';
    const statusBadge = isGranted ? 'GRANTED' : 'DENIED';
    const headerBgColor = isGranted ? '#059669' : '#DC2626';
    const badgeColor = isGranted ? '#A7F3D0' : '#FECACA';
    const userName = attempt.userName || 'ไม่พบข้อมูลในระบบ';

    const timeStr = new Date(attempt.createdAt).toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const altText = `🚪 [Security Door Lock] ${statusBadge}: ${userName} (${directionText})`;

    return {
      type: 'flex',
      altText,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: headerBgColor,
          paddingAll: '20px',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: 'SECURITY DOOR LOCK',
                  weight: 'bold',
                  color: '#FFFFFF',
                  size: 'xxs',
                },
                {
                  type: 'text',
                  text: statusBadge,
                  align: 'end',
                  weight: 'bold',
                  color: badgeColor,
                  size: 'xs',
                },
              ],
            },
            {
              type: 'text',
              text: statusText,
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              margin: 'md',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '20px',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'md',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '👤 ผู้ใช้งาน',
                      color: '#888888',
                      size: 'sm',
                      flex: 3,
                    },
                    {
                      type: 'text',
                      text: userName,
                      wrap: true,
                      color: '#111111',
                      size: 'sm',
                      weight: 'bold',
                      flex: 5,
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '💳 รหัส UID',
                      color: '#888888',
                      size: 'sm',
                      flex: 3,
                    },
                    {
                      type: 'text',
                      text: attempt.uid,
                      wrap: true,
                      color: '#333333',
                      size: 'sm',
                      weight: 'bold',
                      flex: 5,
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '📍 ทิศทาง',
                      color: '#888888',
                      size: 'sm',
                      flex: 3,
                    },
                    {
                      type: 'text',
                      text: directionText,
                      wrap: true,
                      color: '#333333',
                      size: 'sm',
                      weight: 'bold',
                      flex: 5,
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '⏰ เวลา',
                      color: '#888888',
                      size: 'sm',
                      flex: 3,
                    },
                    {
                      type: 'text',
                      text: timeStr,
                      wrap: true,
                      color: '#666666',
                      size: 'xs',
                      flex: 5,
                    },
                  ],
                },
              ],
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '10px',
          contents: [
            {
              type: 'text',
              text: 'IoT Smart Door Lock System • น้องจูดี้',
              size: 'xxs',
              color: '#AAAAAA',
              align: 'center',
            },
          ],
        },
      },
    };
  }

  /**
   * ส่งข้อความ (ถ้ามี LINE_GROUP_ID จะ push เข้ากลุ่ม ถ้าไม่มีจะ broadcast)
   */
  async sendMessage(message: Record<string, unknown>): Promise<boolean> {
    if (!this.token) {
      this.logger.warn('ไม่มี LINE_CHANNEL_ACCESS_TOKEN');
      return false;
    }

    const targetGroupId = this.groupId;
    const url = targetGroupId
      ? 'https://api.line.me/v2/bot/message/push'
      : 'https://api.line.me/v2/bot/message/broadcast';

    const payload = targetGroupId
      ? { to: targetGroupId, messages: [message] }
      : { messages: [message] };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `LINE messaging failed (${response.status}): ${errorText}`,
        );
        return false;
      }

      this.logger.log(
        targetGroupId
          ? `ส่ง Flex message เข้ากลุ่ม ${targetGroupId} สำเร็จ`
          : 'ส่ง Flex message แบบ broadcast สำเร็จ',
      );
      return true;
    } catch (err) {
      this.logger.error(`ยิง LINE API ล้มเหลว: ${(err as Error).message}`);
      return false;
    }
  }
}
