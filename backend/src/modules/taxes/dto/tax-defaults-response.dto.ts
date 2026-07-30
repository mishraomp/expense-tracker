import { Decimal } from '@prisma/client/runtime/client.js';

export class TaxDefaultsResponseDto {
  /**
   * Tax defaults record UUID (or the literal 'system-default' when no DB row exists and hardcoded fallback rates are used).
   */
  id: string;

  /**
   * GST rate as a percentage (e.g. 5.00 means 5%), applied by dividing by 100.
   */
  gstRate: Decimal;

  /**
   * PST rate as a percentage (e.g. 7.00 means 7%), applied by dividing by 100.
   */
  pstRate: Decimal;

  /**
   * Whether this is the system-wide default rate set (no region/user override).
   */
  isDefault: boolean;

  /**
   * Optional region this rate applies to, null/undefined for the system-wide default.
   */
  region?: string | null;

  /**
   * Optional user ID this rate is scoped to, null/undefined for the system-wide default.
   */
  userId?: string | null;

  /**
   * Record creation timestamp.
   */
  createdAt: Date;

  /**
   * Record last-updated timestamp.
   */
  updatedAt: Date;
}
