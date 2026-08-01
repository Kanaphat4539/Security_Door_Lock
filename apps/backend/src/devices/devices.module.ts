import { Module } from '@nestjs/common';

import { CamRegistryService } from './cam-registry.service';
import { DevicesController } from './devices.controller';
import { ImageFetchService } from './image-fetch.service';

/**
 * รวมสิ่งที่เกี่ยวกับอุปกรณ์ฮาร์ดแวร์ (Design B)
 *   - CamRegistryService: จำ IP ของ CAM
 *   - ImageFetchService : ดึงรูปจาก CAM (AccessModule เรียกใช้)
 *   - DevicesController  : route ให้ CAM รายงาน IP
 */
@Module({
  controllers: [DevicesController],
  providers: [CamRegistryService, ImageFetchService],
  exports: [ImageFetchService, CamRegistryService],
})
export class DevicesModule {}
