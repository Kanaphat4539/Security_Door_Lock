import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { PresenceEventPayload } from '../src/events/events.types';

jest.mock('../src/auth/auth.service', () => ({
  AuthService: class AuthService {},
}));

import { TokenAuthGuard } from '../src/auth/token-auth.guard';
import { AuthService } from '../src/auth/auth.service';
import { DevicesModule } from '../src/devices/devices.module';
import { EventsGateway } from '../src/events/events.gateway';
import { EventsModule } from '../src/events/events.module';

describe('CAM presence (e2e)', () => {
  let app: INestApplication<App>;
  const deviceToken = 'isolated-test-device-token';
  const dashboardToken = 'isolated-test-dashboard-token';
  const guardToken = 'isolated-test-guard-session';
  const emitPresence = jest.fn<void, [PresenceEventPayload]>();

  beforeAll(async () => {
    process.env.DEVICE_TOKEN = deviceToken;
    process.env.DASHBOARD_TOKEN = dashboardToken;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EventsModule, DevicesModule],
      providers: [
        {
          provide: AuthService,
          useValue: {
            verifyWsTicket: jest.fn(),
            verifySession: jest
              .fn()
              .mockImplementation((token: string) =>
                Promise.resolve(
                  token === guardToken
                    ? { sub: 10, username: 'test-guard', role: 'GUARD' }
                    : null,
                ),
              ),
          },
        },
        {
          provide: TokenAuthGuard,
          useFactory: (reflector: Reflector, auth: AuthService) =>
            new TokenAuthGuard(reflector, auth),
          inject: [Reflector, AuthService],
        },
      ],
    })
      .overrideProvider(EventsGateway)
      .useValue({ emitPresence })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalGuards(app.get(TokenAuthGuard));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    delete process.env.DEVICE_TOKEN;
    delete process.env.DASHBOARD_TOKEN;
  });

  beforeEach(() => emitPresence.mockClear());

  it('rejects a presence report without authentication', async () => {
    await request(app.getHttpServer())
      .post('/devices/cam/presence')
      .send({ present: true })
      .expect(401);
  });

  it('accepts the isolated device token and emits first report', async () => {
    const response = await request(app.getHttpServer())
      .post('/devices/cam/presence')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ present: true })
      .expect(201);

    const payload = response.body as PresenceEventPayload;
    expect(payload.present).toBe(true);
    expect(Number.isNaN(Date.parse(payload.reportedAt))).toBe(false);
    expect(emitPresence).toHaveBeenCalledWith(response.body);
  });

  it('rejects non-boolean presence payloads', async () => {
    await request(app.getHttpServer())
      .post('/devices/cam/presence')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ present: 'true' })
      .expect(400);
  });

  it('deduplicates repeated states and emits both transitions', async () => {
    const report = (present: boolean) =>
      request(app.getHttpServer())
        .post('/devices/cam/presence')
        .set('Authorization', `Bearer ${deviceToken}`)
        .send({ present });

    await report(false).expect(201);
    await report(false).expect(201);
    await report(true).expect(201);
    await report(true).expect(201);
    expect(emitPresence).toHaveBeenCalledTimes(2);
    expect(emitPresence.mock.calls.map(([payload]) => payload.present)).toEqual(
      [false, true],
    );
  });

  it('lets an authenticated dashboard read the last reported state', async () => {
    await request(app.getHttpServer())
      .get('/devices/cam/presence')
      .set('Authorization', `Bearer ${dashboardToken}`)
      .expect(200)
      .expect((response) => {
        const payload = response.body as PresenceEventPayload;
        expect(payload.present).toBe(true);
        expect(Number.isNaN(Date.parse(payload.reportedAt))).toBe(false);
      });
  });

  it('allows GUARD to read presence but not submit device reports', async () => {
    await request(app.getHttpServer())
      .get('/devices/cam/presence')
      .set('Authorization', `Bearer ${guardToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/devices/cam/presence')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ present: false })
      .expect(403);
  });
});
