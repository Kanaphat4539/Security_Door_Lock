import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { extractBearer, tokenMatches } from '../auth/auth.constants';
import { AuthService } from '../auth/auth.service';
import { WS_EVENTS, type AccessEventPayload } from './events.types';

/**
 * ส่ง log การเข้า-ออกแบบเรียลไทม์ไปยัง Next.js dashboard
 *
 * cors ต้องเปิดให้ origin ของ frontend (พอร์ต 3000) เพราะ backend อยู่คนละพอร์ต (3001)
 * ค่า WS_CORS_ORIGIN ตั้งได้ผ่าน env เวลา deploy จริง
 */
@WebSocketGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGIN ?? 'http://localhost:3000',
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly authService: AuthService) {}

  @WebSocketServer()
  private server!: Server;

  /**
   * ตรวจ token ตั้งแต่ชั้น handshake ด้วย middleware
   *
   * ⚠️ ต้องกันตรงนี้ ไม่ใช่ใน handleConnection เพราะถ้าปล่อยให้ต่อสำเร็จก่อน
   * แล้วค่อย disconnect จะมีช่องว่างที่ event อาจถูก broadcast ไปหา client
   * ที่ยังไม่ผ่านการตรวจ middleware ปฏิเสธก่อนที่ socket จะเข้า namespace เลย
   *
   * ⚠️ CORS ไม่ได้ทำหน้าที่นี้ — CORS เป็นกลไกที่ *เบราว์เซอร์* บังคับ
   * client ที่ไม่ใช่เบราว์เซอร์ (สคริปต์ Node/python) ไม่สนใจ CORS
   * ด่านนี้คือด่านจริงด่านเดียว
   *
   * รับ credential ได้ 2 แบบ:
   *   1. ตั๋วอายุสั้น (60 วิ) ที่ออกให้ admin ที่ล็อกอินแล้ว ← เบราว์เซอร์ใช้แบบนี้
   *   2. DASHBOARD_TOKEN (static) — สำหรับสคริปต์ทดสอบ/เครื่องมือ dev
   *
   * ฝั่ง client ส่งได้ 2 ทาง:
   *   io(url, { auth: { token } })                       ← แนะนำ
   *   io(url, { extraHeaders: { Authorization: 'Bearer ...' } })
   */
  afterInit(server: Server): void {
    server.use((socket: Socket, next: (err?: Error) => void) => {
      const fromAuth = socket.handshake.auth?.token;
      const fromHeader = extractBearer(socket.handshake.headers.authorization);
      const provided =
        (typeof fromAuth === 'string' ? fromAuth : null) ?? fromHeader;

      if (provided === null) {
        this.reject(socket, next);
        return;
      }

      // static token ตรวจแบบ sync ได้เลย
      if (tokenMatches(provided, process.env.DASHBOARD_TOKEN ?? '')) {
        next();
        return;
      }

      void this.authService
        .verifyWsTicket(provided)
        .then((ok) => (ok ? next() : this.reject(socket, next)))
        .catch(() => this.reject(socket, next));
    });
  }

  private reject(socket: Socket, next: (err?: Error) => void): void {
    this.logger.warn(
      `ปฏิเสธ handshake จาก ${socket.handshake.address} — ตั๋ว/token ไม่ถูกต้องหรือหมดอายุ`,
    );
    next(new Error('unauthorized'));
  }

  handleConnection(client: Socket): void {
    this.logger.log(`dashboard connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`dashboard disconnected: ${client.id}`);
  }

  /**
   * ยิงทุกครั้งที่มีการทาบบัตร ไม่ว่าผลจะเป็น granted หรือ denied
   *
   * ห้ามโยน error ออกไป — ถ้า WebSocket มีปัญหา การเปิดประตูต้องทำงานต่อได้
   * (ตัวตัดสินสิทธิ์ไม่ควรพังเพราะ dashboard ไม่ได้เชื่อมต่อ)
   */
  emitAccess(payload: AccessEventPayload): void {
    try {
      this.server?.emit(WS_EVENTS.ACCESS, payload);
    } catch (err) {
      this.logger.error(`emit ${WS_EVENTS.ACCESS} failed`, err as Error);
    }
  }
}
