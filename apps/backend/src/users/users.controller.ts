import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { AdminOnly } from '../auth/auth.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

/**
 * ดูข้อมูลผู้ใช้/บัตร: ทั้ง ADMIN และ GUARD (ผู้ช่วย) ดูได้
 * จัดการข้อมูล (เพิ่ม/แก้ไข/ลบ): ADMIN เท่านั้น
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * ต้องประกาศก่อน @Get(':id') ไม่งั้น Nest จะจับ "unassigned-uids"
   * เป็นค่า id แล้ว ParseIntPipe จะโยน 400
   */
  @Get('unassigned-uids')
  findUnassignedUids() {
    return this.usersService.findUnassignedUids();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Get(':id/logs')
  findLogs(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findLogs(id);
  }

  @AdminOnly()
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @AdminOnly()
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @AdminOnly()
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
