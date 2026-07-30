export class TagResponseDto {
  /**
   * Tag ID.
   */
  id: string;

  /**
   * Max 50 chars, unique per user (case-insensitive).
   */
  name: string;

  /**
   * Hex color, e.g. #FF5733.
   */
  colorCode: string | null;

  /**
   * Row creation timestamp.
   */
  createdAt: Date;

  /**
   * Row last-updated timestamp.
   */
  updatedAt: Date;
}
