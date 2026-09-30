import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

/**
 * แก้ได้เฉพาะ name กับ isActive
 * ตั้งใจไม่ให้แก้ uid เพราะ AccessLog อ้างอิงบัตรใบเดิมอยู่
 * ถ้าเปลี่ยนบัตรให้ลบผู้ใช้แล้วสร้างใหม่ ประวัติเดิมจะยังอยู่ (userId เป็น null)
 */
export class UpdateUserDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 191)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 64)
  dashboardUsername?: string | null;
}
