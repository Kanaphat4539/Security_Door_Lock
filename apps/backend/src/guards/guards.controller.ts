import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { AdminOnly } from '../auth/auth.constants';
import { GuardsService } from './guards.service';

/**
 * จัดการบัญชีผู้ช่วย (GUARD) และรหัสเชิญ (InviteCode)
 * ทั้ง Controller สงวนไว้สำหรับ ADMIN เท่านั้น
 */
@AdminOnly()
@Controller('guards')
export class GuardsController {
  constructor(private readonly guardsService: GuardsService) {}

  /** ดูรายชื่อ GUARD ทั้งหมด */
  @Get()
  findAll() {
    return this.guardsService.findAll();
  }

  /**
   * ดูรหัสเชิญทั้งหมด (ต้องอยู่ก่อน :id เพื่อไม่ให้ชน path param)
   */
  @Get('invite-codes')
  findAllInviteCodes() {
    return this.guardsService.findAllInviteCodes();
  }

  /** สร้างรหัสเชิญใหม่สำหรับ GUARD */
  @Post('invite-codes')
  createInviteCode(@Body('code') code?: string) {
    return this.guardsService.createInviteCode(code);
  }

  /** ลบ/ยกเลิกรหัสเชิญ */
  @Delete('invite-codes/:id')
  removeInviteCode(@Param('id', ParseIntPipe) id: number) {
    return this.guardsService.removeInviteCode(id);
  }

  /** ดูข้อมูล GUARD คนเดียว */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.guardsService.findOne(id);
  }

  /** ลบบัญชี GUARD */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.guardsService.remove(id);
  }
}
