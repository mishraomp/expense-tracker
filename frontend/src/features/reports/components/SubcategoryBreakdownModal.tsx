import React from 'react';
import { SubcategoryBreakdownChart } from './SubcategoryBreakdownChart';
import type { SubcategoryBreakdownItem } from '../types/reports.types';

interface Props {
  isOpen: boolean;
  data: SubcategoryBreakdownItem[];
  month: string | null;
  onClose: () => void;
}

export default function SubcategoryBreakdownModal({ isOpen, data, month, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="modal modal-slide show d-block"
      aria-modal="true"
      role="dialog"
      aria-labelledby="subcategoryBreakdownLabel"
      aria-describedby="pie-desc"
    >
      <div className="modal-dialog modal-fullscreen">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="subcategoryBreakdownLabel">
              Subcategory Breakdown — {month}
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <SubcategoryBreakdownChart data={data} />
          </div>
          <div className="modal-footer">
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
