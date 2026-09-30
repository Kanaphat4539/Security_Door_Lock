import { Module } from '@nestjs/common';

import { GuardsController } from './guards.controller';
import { GuardsService } from './guards.service';

@Module({
  controllers: [GuardsController],
  providers: [GuardsService],
  exports: [GuardsService],
})
export class GuardsModule {}
