jest.mock('../../generated/prisma/client', () => ({ PrismaClient: class {} }));

import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EmailDeliveryService } from './email-delivery.service';
import { EmailSenderService } from './email-sender.service';

const prismaMock = {
  emailNotification: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
};
const senderMock = { isConfigured: jest.fn(), send: jest.fn() };
const job = {
  id: 4,
  accessLogId: 12,
  toEmail: 'owner@example.com',
  recipientName: 'Owner',
  status: 'PENDING',
  attempts: 0,
  accessLog: { direction: 'out', createdAt: new Date('2026-09-29T01:00:00Z') },
};

describe('EmailDeliveryService', () => {
  let service: EmailDeliveryService;
  beforeEach(async () => {
    jest.resetAllMocks();
    senderMock.isConfigured.mockReturnValue(true);
    prismaMock.emailNotification.findMany.mockResolvedValue([job]);
    prismaMock.emailNotification.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.emailNotification.update.mockResolvedValue({});
    senderMock.send.mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        EmailDeliveryService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailSenderService, useValue: senderMock },
      ],
    }).compile();
    service = module.get(EmailDeliveryService);
  });

  it('does not claim jobs without email configuration', async () => {
    senderMock.isConfigured.mockReturnValue(false);
    await service.processPending();
    expect(prismaMock.emailNotification.findMany).not.toHaveBeenCalled();
  });

  it('claims a job once and marks it sent after delivery', async () => {
    await service.processPending();
    expect(prismaMock.emailNotification.updateMany).toHaveBeenCalledTimes(1);
    expect(senderMock.send).toHaveBeenCalledWith(job);
    expect(prismaMock.emailNotification.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: expect.objectContaining({ status: 'SENT' }),
    });
  });

  it('does not send a job claimed by another worker', async () => {
    prismaMock.emailNotification.updateMany.mockResolvedValue({ count: 0 });
    await service.processPending();
    expect(senderMock.send).not.toHaveBeenCalled();
  });

  it('requeues a provider failure without throwing into the access path', async () => {
    senderMock.send.mockRejectedValue(new Error('provider down'));
    await expect(service.processPending()).resolves.toBeUndefined();
    expect(prismaMock.emailNotification.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: expect.objectContaining({
        status: 'PENDING',
        lastError: 'provider down',
      }),
    });
  });
});
