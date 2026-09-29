import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import type { Request } from 'express';

import { SESSION_ADMIN_ID } from '../auth/auth.constants';
import { NotificationSettingsService } from './notification-settings.service';

class UpdateNotificationSettingsDto {
  @IsBoolean()
  enabled!: boolean;
}

type SessionRequest = Request & { [SESSION_ADMIN_ID]?: number };

@Controller('notification-settings')
export class NotificationSettingsController {
  constructor(private readonly settings: NotificationSettingsService) {}

  private accountId(request: SessionRequest): number {
    const id = request[SESSION_ADMIN_ID];
    if (!id) throw new UnauthorizedException('ต้องล็อกอินด้วยบัญชี employee');
    return id;
  }

  @Get()
  get(@Req() request: SessionRequest) {
    return this.settings.get(this.accountId(request));
  }

  @Patch()
  update(
    @Req() request: SessionRequest,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.settings.update(this.accountId(request), dto.enabled);
  }
}
