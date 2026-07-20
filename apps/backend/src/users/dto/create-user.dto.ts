import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  /**
   * UID ของบัตร RFID — hex ล้วน ไม่มีตัวคั่น
   * normalize เป็นตัวพิมพ์ใหญ่ตั้งแต่ชั้น DTO เพื่อให้ค้นหาเจอเสมอ
   * (AccessService ก็ normalize แบบเดียวกันตอนตรวจสิทธิ์)
   */
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(4, 32)
  @Matches(/^[0-9A-F]+$/, {
    message: 'uid ต้องเป็น hex (0-9, A-F) เท่านั้น ไม่มีเว้นวรรคหรือขีดคั่น',
  })
  uid!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 191)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
