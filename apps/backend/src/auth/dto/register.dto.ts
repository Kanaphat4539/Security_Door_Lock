import { IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 64)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z A-Z 0-9 _ . - เท่านั้น',
  })
  username!: string;

  @IsString()
  @Length(8, 200, { message: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' })
  password!: string;

  @IsString()
  @Length(1, 200)
  inviteCode!: string;
}
