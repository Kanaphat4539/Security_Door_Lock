import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface NotificationSettings {
  linked: boolean;
  name: string | null;
  email: string | null;
  enabled: boolean;
  uid: string | null;
  isActive: boolean | null;
}

@Injectable()
export class NotificationSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(accountId: number): Promise<NotificationSettings> {
    const account = await this.prisma.admin.findUnique({
      where: { id: accountId },
      include: { cardOwner: true },
    });
    const owner = account?.cardOwner;
    if (!owner)
      return { linked: false, name: null, email: null, enabled: false, uid: null, isActive: null };
    return {
      linked: true,
      name: owner.name,
      email: owner.email,
      enabled: owner.emailNotificationsEnabled,
      uid: owner.uid,
      isActive: owner.isActive,
    };
  }

  async update(
    accountId: number,
    enabled: boolean,
  ): Promise<NotificationSettings> {
    const account = await this.prisma.admin.findUnique({
      where: { id: accountId },
      include: { cardOwner: true },
    });
    const owner = account?.cardOwner;
    if (!owner) throw new NotFoundException('บัญชีนี้ยังไม่ได้ผูกกับบัตร RFID');
    if (enabled && !owner.email) {
      throw new BadRequestException(
        'ยังไม่มีอีเมลเจ้าของบัตร กรุณาให้แอดมินเพิ่มอีเมลก่อน',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: owner.id },
      data: { emailNotificationsEnabled: enabled },
    });
    return {
      linked: true,
      name: updated.name,
      email: updated.email,
      enabled: updated.emailNotificationsEnabled,
      uid: updated.uid,
      isActive: updated.isActive,
    };
  }
}
