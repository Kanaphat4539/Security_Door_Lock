import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HardwareService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.hardwareDevice.findMany({
      orderBy: { lastSeen: 'desc' },
    });
  }

  async findOne(id: string) {
    const device = await this.prisma.hardwareDevice.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  async create(data: { name: string; type: string; ipAddress?: string }) {
    return this.prisma.hardwareDevice.create({ data });
  }

  async updatePing(id: string, ipAddress?: string) {
    return this.prisma.hardwareDevice.update({
      where: { id },
      data: {
        status: 'ONLINE',
        lastSeen: new Date(),
        ...(ipAddress && { ipAddress }),
      },
    });
  }
}
