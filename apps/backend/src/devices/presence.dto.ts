import { IsBoolean } from 'class-validator';

export class CamPresenceDto {
  @IsBoolean()
  present!: boolean;
}
