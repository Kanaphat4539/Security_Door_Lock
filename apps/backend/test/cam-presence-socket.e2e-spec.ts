jest.mock('../src/auth/auth.service', () => ({ AuthService: class {} }));

import {
  Global,
  Module,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { AuthService } from '../src/auth/auth.service';
import { TokenAuthGuard } from '../src/auth/token-auth.guard';
import { DevicesModule } from '../src/devices/devices.module';
import { EventsModule } from '../src/events/events.module';
import { EventsGateway } from '../src/events/events.gateway';
import type { PresenceEventPayload } from '../src/events/events.types';

// Explicit isolated fixtures; no production environment file or database.
const deviceToken = 'socket-test-device';
const dashboardToken = 'socket-test-dashboard';
const ticket = 'socket-test-ticket';
@Global()
@Module({
  providers: [
    {
      provide: AuthService,
      useValue: {
        verifySession: () => Promise.resolve(null),
        verifyWsTicket: (value: string) => Promise.resolve(value === ticket),
      },
    },
  ],
  exports: [AuthService],
})
class TestAuthModule {}

describe('CAM presence HTTP to authenticated WebSocket (isolated)', () => {
  let app: INestApplication<Server>;
  let baseUrl: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    process.env.DEVICE_TOKEN = deviceToken;
    process.env.DASHBOARD_TOKEN = dashboardToken;
    const module = await Test.createTestingModule({
      imports: [TestAuthModule, EventsModule, DevicesModule],
      providers: [TokenAuthGuard, Reflector],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalGuards(app.get(TokenAuthGuard));
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await app?.close();
    delete process.env.DEVICE_TOKEN;
    delete process.env.DASHBOARD_TOKEN;
  });

  function client(token?: string): Socket {
    const socket = io(baseUrl, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false,
      timeout: 1500,
    });
    sockets.push(socket);
    return socket;
  }

  function nextPresence(socket: Socket): Promise<PresenceEventPayload> {
    return new Promise((resolve, reject) => {
      const onPresence = (payload: PresenceEventPayload) => {
        clearTimeout(timer);
        resolve(payload);
      };
      const timer = setTimeout(() => {
        socket.off('presence', onPresence);
        reject(new Error('Timed out waiting for a real presence event'));
      }, 1500);
      socket.once('presence', onPresence);
    });
  }

  it.each([undefined, deviceToken, 'invalid-test-ticket'])(
    'rejects handshake with %s',
    async (token) => {
      const socket = client(token);
      const outcome = new Promise<string>((resolve) => {
        socket.once('connect', () => resolve('unexpected connection'));
        socket.once('connect_error', (error: Error) => resolve(error.message));
      });
      socket.connect();
      expect(await outcome).toBe('unauthorized');
      socket.disconnect();
    },
  );

  it('publishes true/false transitions and deduplicates identical reports', async () => {
    const socket = client(ticket);
    const connected = new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    socket.connect();
    await connected;
    const emit = jest.spyOn(app.get(EventsGateway), 'emitPresence');
    const firstEvent = nextPresence(socket);
    const first = await request(baseUrl)
      .post('/devices/cam/presence')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ present: true })
      .expect(201);
    const firstPayload = first.body as PresenceEventPayload;
    expect(await firstEvent).toEqual(firstPayload);
    expect(firstPayload.present).toBe(true);
    await request(baseUrl)
      .post('/devices/cam/presence')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ present: true })
      .expect(201, firstPayload);
    expect(emit).toHaveBeenCalledTimes(1);
    const secondEvent = nextPresence(socket);
    const second = await request(baseUrl)
      .post('/devices/cam/presence')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ present: false })
      .expect(201);
    const secondPayload = second.body as PresenceEventPayload;
    expect(await secondEvent).toEqual(secondPayload);
    expect(secondPayload.present).toBe(false);
    await request(baseUrl)
      .get('/devices/cam/presence')
      .set('Authorization', `Bearer ${dashboardToken}`)
      .expect(200, secondPayload);
    await request(baseUrl)
      .get('/devices/cam/presence')
      .set('Authorization', `Bearer ${deviceToken}`)
      .expect(401);
    emit.mockRestore();
    socket.disconnect();
  });
});
