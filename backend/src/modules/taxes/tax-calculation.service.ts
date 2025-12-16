import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/client.js';
import { TaxCalculationDto, ExpenseTaxSummaryDto } from './dto/tax-calculation.dto';
import { TaxDefaultsResponseDto } from './dto/tax-defaults-response.dto';

/**
 * Service for managing and calculating taxes on expenses
 *
 * Design:
 * - Checkbox-based applicability (gstApplicable, pstApplicable booleans)
 * - System-wide defaults stored in tax_defaults table
 * - Exclusive tax mode: tax on top of subtotal
 * - Per-total rounding: each tax calculated independently, then summed
 *
 * Example (GST 5%, PST 7%):
 *   Subtotal: $100.00
 *   GST (5%): $5.00
 *   PST (7%): $7.00
 *   Total: $112.00
 */
@Injectable()
export class TaxCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get system default tax rates (is_default = true, no region/user_id)
   * Falls back to hardcoded defaults if not found
   */
  async getSystemDefaults(): Promise<TaxDefaultsResponseDto> {
    const defaults = await this.prisma.tax_defaults.findFirst({
      where: {
        is_default: true,
        region: null,
        user_id: null,
      },
    });

    if (!defaults) {
      // Return hardcoded fallback (GST 5%, PST 7%)
      return {
        id: 'system-default',
        gstRate: new Decimal('5.00'),
        pstRate: new Decimal('7.00'),
        isDefault: true,
        region: null,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return this.mapTaxDefaults(defaults);
  }

  /**
   * Get tax rates for a specific user (or system default if not found)
   * Priority: user-specific > system default
   */
  async getTaxRatesForUser(userId: string): Promise<TaxDefaultsResponseDto> {
    // Check for user-specific rates first
    const userRates = await this.prisma.tax_defaults.findFirst({
      where: { user_id: userId },
    });

    if (userRates) {
      return this.mapTaxDefaults(userRates);
    }

    // Fall back to system default
    return this.getSystemDefaults();
  }

  /**
   * Calculate taxes for a single line item
   *
   * @param lineAmount - Line item subtotal (before taxes)
   * @param gstApplicable - Whether GST should be applied
   * @param pstApplicable - Whether PST should be applied
   * @param taxRates - Tax rates to use (from tax_defaults)
   * @returns Calculated tax amounts with applicability flags
   */
  calculateLineTaxes(
    lineAmount: Decimal | number,
    gstApplicable: boolean,
    pstApplicable: boolean,
    taxRates: TaxDefaultsResponseDto,
  ): TaxCalculationDto {
    const amount = new Decimal(lineAmount);

    // Calculate GST (exclusive)
    const gstAmount = gstApplicable
      ? amount.times(taxRates.gstRate).dividedBy(100).toDecimalPlaces(2)
      : new Decimal(0);

    // Calculate PST (exclusive)
    const pstAmount = pstApplicable
      ? amount.times(taxRates.pstRate).dividedBy(100).toDecimalPlaces(2)
      : new Decimal(0);

    // Total tax
    const totalTaxAmount = gstAmount.plus(pstAmount);

    return {
      gstApplicable,
      pstApplicable,
      gstAmount,
      pstAmount,
      totalTaxAmount,
      lineSubtotal: amount,
    };
  }

  /**
   * Calculate taxes for an entire expense with multiple line items
   * Aggregates line-item taxes to expense level
   *
   * @param expenseId - Expense ID (for identification only)
   * @param items - Array of line item data { amount, gstApplicable, pstApplicable }
   * @param taxRates - Tax rates to use
   * @returns Expense-level tax summary
   */
  calculateExpenseTaxes(
    expenseId: string,
    items: Array<{
      id?: string;
      amount: Decimal | number;
      gstApplicable: boolean;
      pstApplicable: boolean;
    }>,
    taxRates: TaxDefaultsResponseDto,
  ): ExpenseTaxSummaryDto {
    const itemTaxes = new Map<string, TaxCalculationDto>();
    let subtotal = new Decimal(0);
    let totalGst = new Decimal(0);
    let totalPst = new Decimal(0);

    // Calculate taxes for each item
    for (const item of items) {
      const itemTax = this.calculateLineTaxes(
        item.amount,
        item.gstApplicable,
        item.pstApplicable,
        taxRates,
      );
      const itemId = item.id || `item-${items.indexOf(item)}`;
      itemTaxes.set(itemId, itemTax);

      // Aggregate
      subtotal = subtotal.plus(itemTax.lineSubtotal);
      totalGst = totalGst.plus(itemTax.gstAmount);
      totalPst = totalPst.plus(itemTax.pstAmount);
    }

    const totalTaxAmount = totalGst.plus(totalPst);
    const totalWithTax = subtotal.plus(totalTaxAmount);

    return {
      expenseId,
      subtotal,
      gstAmount: totalGst,
      pstAmount: totalPst,
      totalTaxAmount,
      totalWithTax,
      itemTaxes,
    };
  }

  /**
   * Apply calculated taxes to an expense and its line items in the database
   * Used to persist tax calculations after user creates/updates expense
   */
  async applyTaxesToExpense(
    expenseId: string,
    expenseTaxSummary: ExpenseTaxSummaryDto,
  ): Promise<void> {
    // Update expense with calculated tax totals
    await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        gstApplicable: expenseTaxSummary.gstAmount.greaterThan(0),
        pstApplicable: expenseTaxSummary.pstAmount.greaterThan(0),
        gstAmount: expenseTaxSummary.gstAmount,
        pstAmount: expenseTaxSummary.pstAmount,
      },
    });

    // Update each line item with its calculated taxes
    const itemUpdates = Array.from(expenseTaxSummary.itemTaxes.entries()).map(([itemId, taxes]) =>
      this.prisma.expenseItem.update({
        where: { id: itemId },
        data: {
          gstApplicable: taxes.gstApplicable,
          pstApplicable: taxes.pstApplicable,
          gstAmount: taxes.gstAmount,
          pstAmount: taxes.pstAmount,
        },
      }),
    );

    // Execute all updates in batch
    if (itemUpdates.length > 0) {
      await this.prisma.$transaction(itemUpdates);
    }
  }

  /**
   * Validate tax applicability flags are boolean
   */
  validateTaxFlags(gstApplicable: unknown, pstApplicable: unknown): void {
    if (typeof gstApplicable !== 'boolean' || typeof pstApplicable !== 'boolean') {
      throw new BadRequestException('Tax applicability flags must be boolean (true/false)');
    }
  }

  /**
   * Validate amounts are positive
   */
  validateAmount(amount: unknown): void {
    const decimal = new Decimal(amount as any);
    if (decimal.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Amount must be positive');
    }
  }

  /**
   * Map database tax_defaults to DTO
   */
  private mapTaxDefaults(dbModel: any): TaxDefaultsResponseDto {
    return {
      id: dbModel.id,
      gstRate: new Decimal(dbModel.gst_rate),
      pstRate: new Decimal(dbModel.pst_rate),
      isDefault: dbModel.is_default,
      region: dbModel.region,
      userId: dbModel.user_id,
      createdAt: dbModel.created_at,
      updatedAt: dbModel.updated_at,
    };
  }
}
