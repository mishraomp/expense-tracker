import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreateTagDto {
  /**
   * Max 50 chars, unique per user (case-insensitive).
   */
  @IsString()
  @MaxLength(50)
  name: string;

  /**
   * Hex color, e.g. #FF5733.
   */
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'colorCode must be a valid hex color (e.g., #FF5733)',
  })
  colorCode?: string;
}
