import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByRfid(rfidTag: string) {
    return this.prisma.user.findUnique({
      where: { rfidTag },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async create(data: { name: string; username?: string; password?: string; role?: string; rfidTag?: string; pinCode?: string; faceImage?: string }) {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Partial<{ name: string; username: string; password: string; role: string; rfidTag: string; pinCode: string; faceImage: string }>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
