jest.mock('../../generated/prisma/client', () => ({ PrismaClient: class {} }));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationSettingsService } from './notification-settings.service';

const prismaMock = {
  admin: { findUnique: jest.fn() },
  user: { update: jest.fn() },
};

describe('NotificationSettingsService', () => {
  let service: NotificationSettingsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        NotificationSettingsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(NotificationSettingsService);
  });

  it('returns the linked card owner settings for the signed-in account', async () => {
    prismaMock.admin.findUnique.mockResolvedValue({
      cardOwner: {
        id: 7,
        name: 'Owner',
        email: 'owner@example.com',
        emailNotificationsEnabled: true,
        uid: 'A1B2C3D4',
        isActive: true,
      },
    });

    await expect(service.get(3)).resolves.toEqual({
      linked: true,
      name: 'Owner',
      email: 'owner@example.com',
      enabled: true,
      uid: 'A1B2C3D4',
      isActive: true,
    });
    expect(prismaMock.admin.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
      include: { cardOwner: true },
    });
  });

  it('does not claim an unlinked account has notification settings', async () => {
    prismaMock.admin.findUnique.mockResolvedValue({ cardOwner: null });
    await expect(service.get(3)).resolves.toEqual({
      linked: false,
      name: null,
      email: null,
      enabled: false,
      uid: null,
      isActive: null,
    });
  });

  it('updates only the card linked to the signed-in account', async () => {
    prismaMock.admin.findUnique.mockResolvedValue({
      cardOwner: {
        id: 7,
        name: 'Owner',
        email: 'owner@example.com',
        emailNotificationsEnabled: false,
      },
    });
    prismaMock.user.update.mockResolvedValue({
      id: 7,
      name: 'Owner',
      email: 'owner@example.com',
      emailNotificationsEnabled: true,
    });

    await expect(service.update(3, true)).resolves.toMatchObject({
      enabled: true,
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { emailNotificationsEnabled: true },
    });
  });

  it('rejects enabling without an owner email', async () => {
    prismaMock.admin.findUnique.mockResolvedValue({
      cardOwner: {
        id: 7,
        name: 'Owner',
        email: null,
        emailNotificationsEnabled: false,
      },
    });
    await expect(service.update(3, true)).rejects.toThrow(BadRequestException);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rejects changes for an unlinked account', async () => {
    prismaMock.admin.findUnique.mockResolvedValue({ cardOwner: null });
    await expect(service.update(3, true)).rejects.toThrow(NotFoundException);
  });
});
