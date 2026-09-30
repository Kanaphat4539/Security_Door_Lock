import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { EmailSenderService } from './email-sender.service';

const POLL_MS = 5_000;
const LEASE_MS = 60_000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class EmailDeliveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailDeliveryService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: EmailSenderService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.processPending(), POLL_MS);
    this.timer.unref();
    void this.processPending();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async processPending(): Promise<void> {
    if (this.running || !this.sender.isConfigured()) return;
    this.running = true;
    try {
      const now = new Date();
      const eligible = {
        OR: [
          { status: 'PENDING' as const, nextAttemptAt: { lte: now } },
          {
            status: 'SENDING' as const,
            lockedAt: { lte: new Date(now.getTime() - LEASE_MS) },
          },
        ],
      };
      const jobs = await this.prisma.emailNotification.findMany({
        where: eligible,
        include: {
          accessLog: { select: { direction: true, createdAt: true } },
        },
        orderBy: { id: 'asc' },
        take: 20,
      });

      for (const job of jobs) {
        const claim = await this.prisma.emailNotification.updateMany({
          where: { id: job.id, ...eligible },
          data: {
            status: 'SENDING',
            lockedAt: new Date(),
            attempts: { increment: 1 },
          },
        });
        if (claim.count === 0) continue;

        try {
          await this.sender.send(job);
          await this.prisma.emailNotification.update({
            where: { id: job.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              lockedAt: null,
              lastError: null,
            },
          });
        } catch (error) {
          const attempts = job.attempts + 1;
          const message =
            error instanceof Error ? error.message : String(error);
          await this.prisma.emailNotification.update({
            where: { id: job.id },
            data: {
              status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
              nextAttemptAt: new Date(
                Date.now() + Math.min(60_000 * 2 ** (attempts - 1), 900_000),
              ),
              lockedAt: null,
              lastError: message.slice(0, 500),
            },
          });
          this.logger.warn(
            `Email notification ${job.id} failed (attempt ${attempts})`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Email queue polling failed: ${(error as Error).message}`,
      );
    } finally {
      this.running = false;
    }
  }
}
