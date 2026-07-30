import { IsOptional, IsString, Length } from 'class-validator';

/**
 * NOTE: this DTO is not currently used by the replace() handler, which binds the checksum via
 * @Body('checksum') directly instead — decorating these fields currently has no effect on the
 * generated request schema for that endpoint.
 */
export class ReplaceAttachmentDto {
  /**
   * Optional SHA-256 checksum of the replacement file. Allows 64-128 chars via @Length here,
   * while upload-attachment.dto.ts requires exactly 64 for the same kind of value — both
   * represent a SHA-256 hash but validate inconsistently.
   */
  @IsOptional()
  @IsString()
  @Length(64, 128)
  checksum?: string;
}
