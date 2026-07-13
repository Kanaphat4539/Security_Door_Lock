import { Controller, Get, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccessLogsService } from './access-logs.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('access-logs')
export class AccessLogsController {
  constructor(private readonly accessLogsService: AccessLogsService) {}

  @Get()
  async findAll() {
    return this.accessLogsService.findAll();
  }

  @Post('scan')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: '../../uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async processScan(
    @Body('uid') uid: string,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const photoUrl = image ? `/uploads/${image.filename}` : undefined;
    return this.accessLogsService.processScan(uid, photoUrl);
  }
}
