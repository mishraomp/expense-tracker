import { Decimal } from '@prisma/client/runtime/client.js';

export class TaxDefaultsResponseDto {
  id: string;
  gstRate: Decimal;
  pstRate: Decimal;
  isDefault: boolean;
  region?: string | null;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
