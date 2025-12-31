import { Test, TestingModule } from '@nestjs/testing';
import { TaxCalculationService } from '../tax-calculation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/client.js';

describe('TaxCalculationService', () => {
  let service: TaxCalculationService;
  let prismaService: PrismaService;

  const mockTaxRates = {
    id: 'test-id',
    gstRate: new Decimal('5.00'),
    pstRate: new Decimal('7.00'),
    isDefault: true,
    region: null,
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxCalculationService,
        {
          provide: PrismaService,
          useValue: {
            tax_defaults: {
              findFirst: jest.fn(),
            },
            expense: {
              update: jest.fn(),
            },
            expenseItem: {
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaxCalculationService>(TaxCalculationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('calculateLineTaxes', () => {
    it('should calculate taxes correctly with both taxes applicable', () => {
      const result = service.calculateLineTaxes(100, true, true, mockTaxRates);

      expect(result.gstApplicable).toBe(true);
      expect(result.pstApplicable).toBe(true);
      expect(result.gstAmount).toEqual(new Decimal('5.00'));
      expect(result.pstAmount).toEqual(new Decimal('7.00'));
      expect(result.totalTaxAmount).toEqual(new Decimal('12.00'));
      expect(result.lineSubtotal).toEqual(new Decimal('100'));
    });

    it('should calculate only GST when pst is not applicable', () => {
      const result = service.calculateLineTaxes(100, true, false, mockTaxRates);

      expect(result.gstAmount).toEqual(new Decimal('5.00'));
      expect(result.pstAmount).toEqual(new Decimal('0'));
      expect(result.totalTaxAmount).toEqual(new Decimal('5.00'));
    });

    it('should calculate only PST when gst is not applicable', () => {
      const result = service.calculateLineTaxes(100, false, true, mockTaxRates);

      expect(result.gstAmount).toEqual(new Decimal('0'));
      expect(result.pstAmount).toEqual(new Decimal('7.00'));
      expect(result.totalTaxAmount).toEqual(new Decimal('7.00'));
    });

    it('should return zero taxes when both are not applicable', () => {
      const result = service.calculateLineTaxes(100, false, false, mockTaxRates);

      expect(result.gstAmount).toEqual(new Decimal('0'));
      expect(result.pstAmount).toEqual(new Decimal('0'));
      expect(result.totalTaxAmount).toEqual(new Decimal('0'));
    });

    it('should handle decimal amounts with proper rounding', () => {
      const result = service.calculateLineTaxes(33.33, true, true, mockTaxRates);

      // GST: 33.33 * 0.05 = 1.6665 → 1.67 (2 decimal places)
      // PST: 33.33 * 0.07 = 2.3331 → 2.33 (2 decimal places)
      expect(result.gstAmount).toEqual(new Decimal('1.67'));
      expect(result.pstAmount).toEqual(new Decimal('2.33'));
    });

    it('should accept numeric or Decimal input', () => {
      const numResult = service.calculateLineTaxes(100, true, true, mockTaxRates);
      const decimalResult = service.calculateLineTaxes(new Decimal('100'), true, true, mockTaxRates);

      expect(numResult.gstAmount).toEqual(decimalResult.gstAmount);
      expect(numResult.totalTaxAmount).toEqual(decimalResult.totalTaxAmount);
    });
  });

  describe('calculateExpenseTaxes', () => {
    it('should aggregate taxes from multiple line items', () => {
      const items = [
        { id: 'item-1', amount: 100, gstApplicable: true, pstApplicable: true },
        { id: 'item-2', amount: 50, gstApplicable: true, pstApplicable: false },
        { id: 'item-3', amount: 75, gstApplicable: false, pstApplicable: true },
      ];

      const result = service.calculateExpenseTaxes('expense-1', items, mockTaxRates);

      // Subtotal: 100 + 50 + 75 = 225
      expect(result.subtotal).toEqual(new Decimal('225'));

      // GST: (100 * 0.05) + (50 * 0.05) = 5 + 2.5 = 7.50
      expect(result.gstAmount).toEqual(new Decimal('7.50'));

      // PST: (100 * 0.07) + (75 * 0.07) = 7 + 5.25 = 12.25
      expect(result.pstAmount).toEqual(new Decimal('12.25'));

      // Total tax: 7.50 + 12.25 = 19.75
      expect(result.totalTaxAmount).toEqual(new Decimal('19.75'));

      // Total with tax: 225 + 19.75 = 244.75
      expect(result.totalWithTax).toEqual(new Decimal('244.75'));
    });

    it('should store individual item tax calculations', () => {
      const items = [
        { id: 'item-1', amount: 100, gstApplicable: true, pstApplicable: true },
        { id: 'item-2', amount: 50, gstApplicable: false, pstApplicable: false },
      ];

      const result = service.calculateExpenseTaxes('expense-1', items, mockTaxRates);

      const item1Tax = result.itemTaxes.get('item-1');
      expect(item1Tax).toBeDefined();
      expect(item1Tax?.gstAmount).toEqual(new Decimal('5.00'));
      expect(item1Tax?.pstAmount).toEqual(new Decimal('7.00'));

      const item2Tax = result.itemTaxes.get('item-2');
      expect(item2Tax).toBeDefined();
      expect(item2Tax?.gstAmount).toEqual(new Decimal('0'));
      expect(item2Tax?.pstAmount).toEqual(new Decimal('0'));
    });

    it('should handle empty items array', () => {
      const result = service.calculateExpenseTaxes('expense-1', [], mockTaxRates);

      expect(result.subtotal).toEqual(new Decimal('0'));
      expect(result.gstAmount).toEqual(new Decimal('0'));
      expect(result.pstAmount).toEqual(new Decimal('0'));
      expect(result.totalTaxAmount).toEqual(new Decimal('0'));
      expect(result.totalWithTax).toEqual(new Decimal('0'));
    });

    it('should generate item IDs if not provided', () => {
      const items = [
        { amount: 100, gstApplicable: true, pstApplicable: true },
        { amount: 50, gstApplicable: true, pstApplicable: false },
      ];

      const result = service.calculateExpenseTaxes('expense-1', items, mockTaxRates);

      expect(result.itemTaxes.has('item-0')).toBe(true);
      expect(result.itemTaxes.has('item-1')).toBe(true);
    });
  });

  describe('getSystemDefaults', () => {
    it('should return system defaults from database if found', async () => {
      const mockDefaults = {
        id: 'default-id',
        gst_rate: new Decimal('5.00'),
        pst_rate: new Decimal('7.00'),
        is_default: true,
        region: null,
        user_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(prismaService.tax_defaults, 'findFirst').mockResolvedValue(mockDefaults);

      const result = await service.getSystemDefaults();

      expect(result.gstRate).toEqual(new Decimal('5.00'));
      expect(result.pstRate).toEqual(new Decimal('7.00'));
      expect(result.isDefault).toBe(true);
    });

    it('should return hardcoded defaults if not found in database', async () => {
      jest.spyOn(prismaService.tax_defaults, 'findFirst').mockResolvedValue(null);

      const result = await service.getSystemDefaults();

      expect(result.gstRate).toEqual(new Decimal('5.00'));
      expect(result.pstRate).toEqual(new Decimal('7.00'));
      expect(result.isDefault).toBe(true);
    });
  });

  describe('validateTaxFlags', () => {
    it('should not throw for valid boolean flags', () => {
      expect(() => service.validateTaxFlags(true, false)).not.toThrow();
      expect(() => service.validateTaxFlags(false, true)).not.toThrow();
    });

    it('should throw for non-boolean gstApplicable', () => {
      expect(() => service.validateTaxFlags('true', true)).toThrow();
      expect(() => service.validateTaxFlags(1, true)).toThrow();
      expect(() => service.validateTaxFlags(null, true)).toThrow();
    });

    it('should throw for non-boolean pstApplicable', () => {
      expect(() => service.validateTaxFlags(true, 'true')).toThrow();
      expect(() => service.validateTaxFlags(true, 0)).toThrow();
    });
  });

  describe('validateAmount', () => {
    it('should not throw for positive amounts', () => {
      expect(() => service.validateAmount(100)).not.toThrow();
      expect(() => service.validateAmount(0.01)).not.toThrow();
      expect(() => service.validateAmount(new Decimal('100.50'))).not.toThrow();
    });

    it('should throw for zero amount', () => {
      expect(() => service.validateAmount(0)).toThrow();
      expect(() => service.validateAmount('0')).toThrow();
    });

    it('should throw for negative amounts', () => {
      expect(() => service.validateAmount(-100)).toThrow();
      expect(() => service.validateAmount('-50.50')).toThrow();
    });
  });
});
