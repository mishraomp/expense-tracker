interface TaxSummaryDisplayProps {
  /** Base amount before taxes */
  amount: number;
  /** Whether GST is applicable */
  gstApplicable?: boolean;
  /** Whether PST is applicable */
  pstApplicable?: boolean;
  /** Optional custom GST rate (default 5%) */
  gstRate?: number;
  /** Optional custom PST rate (default 7%) */
  pstRate?: number;
  /** Whether to show detailed breakdown or compact format */
  compact?: boolean;
}

/**
 * Display tax summary with amounts.
 * Shows subtotal, tax breakdown, and total with taxes.
 */
export default function TaxSummaryDisplay({
  amount,
  gstApplicable = false,
  pstApplicable = false,
  gstRate = 0.05,
  pstRate = 0.07,
  compact = false,
}: TaxSummaryDisplayProps) {
  const gstAmount = gstApplicable ? amount * gstRate : 0;
  const pstAmount = pstApplicable ? amount * pstRate : 0;
  const totalTax = gstAmount + pstAmount;
  const totalWithTax = amount + totalTax;

  // Don't render if no taxes apply
  if (!gstApplicable && !pstApplicable) {
    return null;
  }

  if (compact) {
    return (
      <span className="text-success fw-semibold">
        ${totalWithTax.toFixed(2)}
        {totalTax > 0 && (
          <small className="ms-1 text-muted fw-normal">(+${totalTax.toFixed(2)} tax)</small>
        )}
      </span>
    );
  }

  return (
    <div className="alert alert-info small py-2 px-2 mb-0">
      <div className="d-flex justify-content-between mb-1">
        <span>Subtotal:</span>
        <span>${amount.toFixed(2)}</span>
      </div>
      {gstApplicable && (
        <div className="d-flex justify-content-between mb-1">
          <span>GST ({(gstRate * 100).toFixed(0)}%):</span>
          <span>${gstAmount.toFixed(2)}</span>
        </div>
      )}
      {pstApplicable && (
        <div className="d-flex justify-content-between mb-1">
          <span>PST ({(pstRate * 100).toFixed(0)}%):</span>
          <span>${pstAmount.toFixed(2)}</span>
        </div>
      )}
      <div className="border-top pt-1 d-flex justify-content-between">
        <span className="fw-bold">Total:</span>
        <span className="fw-bold text-success">${totalWithTax.toFixed(2)}</span>
      </div>
    </div>
  );
}
