import { Global, Module } from '@nestjs/common';

import { EventsGateway } from './events.gateway';

// Global เพื่อให้ module อื่นยิง event ได้โดยไม่ต้อง import ซ้ำ
// และไม่เกิด circular dependency กับ AccessModule
@Global()
@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
