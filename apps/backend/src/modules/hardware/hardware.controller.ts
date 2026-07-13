import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { HardwareService } from './hardware.service';

@Controller('hardware')
export class HardwareController {
  constructor(private readonly hardwareService: HardwareService) {}

  @Get()
  async findAll() {
    return this.hardwareService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.hardwareService.findOne(id);
  }

  @Post()
  async create(@Body() data: { name: string; type: string; ipAddress?: string }) {
    return this.hardwareService.create(data);
  }

  @Put(':id/ping')
  async updatePing(@Param('id') id: string, @Body('ipAddress') ipAddress?: string) {
    return this.hardwareService.updatePing(id, ipAddress);
  }
}
