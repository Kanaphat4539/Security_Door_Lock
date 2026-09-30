import { Module } from '@nestjs/common';

import { EmailDeliveryService } from './email-delivery.service';
import { EmailSenderService } from './email-sender.service';
import { NotificationSettingsController } from './notification-settings.controller';
import { NotificationSettingsService } from './notification-settings.service';

@Module({
  controllers: [NotificationSettingsController],
  providers: [
    NotificationSettingsService,
    EmailSenderService,
    EmailDeliveryService,
  ],
})
export class NotificationsModule {}
