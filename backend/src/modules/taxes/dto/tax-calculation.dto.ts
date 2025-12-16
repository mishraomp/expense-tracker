import { Decimal } from '@prisma/client/runtime/client.js';

/**
 * DTO for line-item tax calculation result
 * Contains both applicability flags and calculated amounts
 */
export class TaxCalculationDto {
  gstApplicable: boolean;
  pstApplicable: boolean;
  gstAmount: Decimal;
  pstAmount: Decimal;
  totalTaxAmount: Decimal;
  lineSubtotal: Decimal; // Amount before taxes
}

/**
 * DTO for expense-level tax summary
 * Aggregates all line-item taxes
 */
export class ExpenseTaxSummaryDto {
  expenseId: string;
  subtotal: Decimal; // Sum of all line amounts
  gstAmount: Decimal; // Total GST across all items
  pstAmount: Decimal; // Total PST across all items
  totalTaxAmount: Decimal; // gstAmount + pstAmount
  totalWithTax: Decimal; // subtotal + totalTaxAmount
  itemTaxes: Map<string, TaxCalculationDto>; // Keyed by expense item ID
}
