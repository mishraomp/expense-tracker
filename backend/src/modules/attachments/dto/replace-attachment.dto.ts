import { IsOptional, IsString, Length } from 'class-validator';

export class ReplaceAttachmentDto {
  @IsOptional()
  @IsString()
  @Length(64, 128)
  checksum?: string;
}
