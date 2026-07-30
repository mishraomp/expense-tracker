import { Decimal } from '@prisma/client/runtime/client.js';

/**
 * DTO for line-item tax calculation result
 * Contains both applicability flags and calculated amounts
 */
export class TaxCalculationDto {
  /**
   * Whether GST was applied for this calculation.
   */
  gstApplicable: boolean;

  /**
   * Whether PST was applied for this calculation.
   */
  pstApplicable: boolean;

  /**
   * Calculated GST amount (0 if gstApplicable is false).
   */
  gstAmount: Decimal;

  /**
   * Calculated PST amount (0 if pstApplicable is false).
   */
  pstAmount: Decimal;

  /**
   * gstAmount + pstAmount.
   */
  totalTaxAmount: Decimal;

  /**
   * Amount before taxes.
   */
  lineSubtotal: Decimal; // Amount before taxes
}

/**
 * DTO for expense-level tax summary
 * Aggregates all line-item taxes
 */
export class ExpenseTaxSummaryDto {
  /**
   * Expense UUID this summary was computed for.
   */
  expenseId: string;

  /**
   * Sum of all line amounts (pre-tax).
   */
  subtotal: Decimal; // Sum of all line amounts

  /**
   * Total GST across all items.
   */
  gstAmount: Decimal; // Total GST across all items

  /**
   * Total PST across all items.
   */
  pstAmount: Decimal; // Total PST across all items

  /**
   * gstAmount + pstAmount.
   */
  totalTaxAmount: Decimal; // gstAmount + pstAmount

  /**
   * subtotal + totalTaxAmount.
   */
  totalWithTax: Decimal; // subtotal + totalTaxAmount

  /**
   * Per-item tax breakdown, keyed by expense item ID.
   */
  itemTaxes: Map<string, TaxCalculationDto>; // Keyed by expense item ID
}
