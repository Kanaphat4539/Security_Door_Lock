import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppGateway } from '../../gateways/app/app.gateway';

@Injectable()
export class AccessLogsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AppGateway))
    private appGateway: AppGateway,
  ) {}

  async findAll() {
    return this.prisma.accessLog.findMany({
      orderBy: { timestamp: 'desc' },
      include: { user: true },
    });
  }

  async processScan(uid: string, photoUrl?: string): Promise<'RESP_GRANTED' | 'RESP_DENIED'> {
    let status = 'DENIED';
    let userId = null;
    let userName = 'Unknown';

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { rfidTag: uid },
    });

    if (user) {
      status = 'GRANTED';
      userId = user.id;
      userName = user.name;
    }

    // Save log
    const log = await this.prisma.accessLog.create({
      data: {
        userId,
        status,
        method: 'RFID',
        photoUrl,
      },
      include: {
        user: true,
      }
    });

    // Broadcast to frontend dashboard
    this.appGateway.broadcastNewAccessLog({
      id: log.id,
      userId: log.userId,
      userName: userName,
      uid: uid,
      timestamp: log.timestamp.toISOString(),
      status: log.status,
      doorId: 'Main Door', // Can be parameterized later based on device IP
      imageUrl: log.photoUrl,
    });

    return status === 'GRANTED' ? 'RESP_GRANTED' : 'RESP_DENIED';
  }
}
