import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AccessLogsModule } from './modules/access-logs/access-logs.module';
import { HardwareModule } from './modules/hardware/hardware.module';
import { AppGateway } from './gateways/app/app.gateway';

@Module({
  imports: [UsersModule, AccessLogsModule, HardwareModule],
  controllers: [AppController],
  providers: [AppService, AppGateway],
})
export class AppModule {}
