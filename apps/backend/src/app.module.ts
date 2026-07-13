import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AccessLogsModule } from './modules/access-logs/access-logs.module';
import { HardwareModule } from './modules/hardware/hardware.module';
import { AuthModule } from './modules/auth/auth.module';
import { GatewaysModule } from './gateways/gateways.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    PrismaModule, 
    GatewaysModule,
    UsersModule, 
    AccessLogsModule, 
    HardwareModule,
    AuthModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
