import { Injectable, Logger } from '@nestjs/common';

import type { AccessAttempt } from '../access/access.types';

export const DEFAULT_LINE_ICONS = {
  user: 'https://img.icons8.com/ios-glyphs/64/374151/user--v1.png',
  uid: 'https://img.icons8.com/ios/64/374151/identification-documents.png',
  entry: 'https://img.icons8.com/ios/64/374151/right.png',
  exit: 'https://img.icons8.com/ios/64/374151/exit.png',
  clock: 'https://img.icons8.com/material-outlined/64/374151/alarm-clock.png',
};

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
   * คืนค่า URL ของไอคอนต่าง ๆ
   * สามารถ override ผ่าน env `LINE_ICON_BASE_URL` ได้ (เช่น ชี้ไปที่ CDN หรือ server ตัวเอง)
   */
  getIcons(): {
    user: string;
    uid: string;
    entry: string;
    exit: string;
    clock: string;
  } {
    const base = process.env.LINE_ICON_BASE_URL?.trim();
    if (base) {
      const cleanBase = base.replace(/\/+$/, '');
      return {
        user: `${cleanBase}/user.png`,
        uid: `${cleanBase}/uid.png`,
        entry: `${cleanBase}/entry.png`,
        exit: `${cleanBase}/exit.png`,
        clock: `${cleanBase}/clock.png`,
      };
    }
    return DEFAULT_LINE_ICONS;
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
   * สร้างโครงสร้าง LINE Flex Message Bubble ให้สวยงามตรงตาม Mockup (FlexDoorlock)
   */
  buildFlexMessage(attempt: AccessAttempt): Record<string, unknown> {
    const isGranted = attempt.status === 'granted';
    const directionText =
      attempt.direction === 'in' ? 'ขาเข้า (Entry)' : 'ขาออก (Exit)';
    const statusTitle = isGranted ? 'อนุญาตให้ผ่านประตู' : 'ไม่อนุญาตให้เข้า';
    const statusBadge = isGranted ? 'GRANTED' : 'DENIED';
    const headerBgColor = isGranted ? '#20B561' : '#DA4034';
    const badgeSymbol = isGranted ? '✓' : '✕';
    const userName = attempt.userName || 'ไม่พบข้อมูลในระบบ';

    const icons = this.getIcons();
    const directionIcon =
      attempt.direction === 'in' ? icons.entry : icons.exit;

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
          paddingBottom: '16px',
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
                  color: '#FFFFFF',
                  size: 'xs',
                },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: statusTitle,
                  weight: 'bold',
                  size: 'xl',
                  color: '#FFFFFF',
                  flex: 1,
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  width: '28px',
                  height: '28px',
                  cornerRadius: '100px',
                  backgroundColor: '#FFFFFF',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flex: 0,
                  contents: [
                    {
                      type: 'text',
                      text: badgeSymbol,
                      color: headerBgColor,
                      size: 'sm',
                      weight: 'bold',
                      align: 'center',
                      gravity: 'center',
                    },
                  ],
                },
              ],
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FFFFFF',
          paddingAll: '20px',
          spacing: 'lg',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              alignItems: 'center',
              spacing: 'md',
              contents: [
                {
                  type: 'image',
                  url: icons.user,
                  size: '34px',
                  aspectRatio: '1:1',
                  aspectMode: 'fit',
                  flex: 0,
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'none',
                  contents: [
                    {
                      type: 'text',
                      text: 'ผู้ใช้งาน',
                      size: 'xs',
                      color: '#6B7280',
                    },
                    {
                      type: 'text',
                      text: userName,
                      size: 'md',
                      weight: 'bold',
                      color: '#111827',
                      wrap: true,
                    },
                  ],
                },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              alignItems: 'center',
              spacing: 'md',
              contents: [
                {
                  type: 'image',
                  url: icons.uid,
                  size: '34px',
                  aspectRatio: '1:1',
                  aspectMode: 'fit',
                  flex: 0,
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'none',
                  contents: [
                    {
                      type: 'text',
                      text: 'รหัส UID',
                      size: 'xs',
                      color: '#6B7280',
                    },
                    {
                      type: 'text',
                      text: attempt.uid,
                      size: 'md',
                      weight: 'bold',
                      color: '#111827',
                      wrap: true,
                    },
                  ],
                },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              alignItems: 'center',
              spacing: 'md',
              contents: [
                {
                  type: 'image',
                  url: directionIcon,
                  size: '34px',
                  aspectRatio: '1:1',
                  aspectMode: 'fit',
                  flex: 0,
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'none',
                  contents: [
                    {
                      type: 'text',
                      text: 'ทิศทาง',
                      size: 'xs',
                      color: '#6B7280',
                    },
                    {
                      type: 'text',
                      text: directionText,
                      size: 'md',
                      weight: 'bold',
                      color: '#111827',
                      wrap: true,
                    },
                  ],
                },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              alignItems: 'center',
              spacing: 'md',
              contents: [
                {
                  type: 'image',
                  url: icons.clock,
                  size: '34px',
                  aspectRatio: '1:1',
                  aspectMode: 'fit',
                  flex: 0,
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'none',
                  contents: [
                    {
                      type: 'text',
                      text: 'เวลา',
                      size: 'xs',
                      color: '#6B7280',
                    },
                    {
                      type: 'text',
                      text: timeStr,
                      size: 'md',
                      weight: 'bold',
                      color: '#111827',
                      wrap: true,
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
          backgroundColor: '#ECEFF2',
          paddingAll: '12px',
          paddingStart: '20px',
          contents: [
            {
              type: 'text',
              text: 'IoT Smart Door Lock System.',
              size: 'xxs',
              color: '#8E95A0',
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
