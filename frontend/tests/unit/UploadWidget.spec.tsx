import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UploadWidget } from '../../src/features/attachments/UploadWidget';

describe('UploadWidget', () => {
  it('renders file selection button', () => {
    render(<UploadWidget recordType="expense" recordId="test-id" />);
    expect(screen.getByRole('button', { name: /Select files to upload/i })).toBeInTheDocument();
  });

  it('displays upload info with limits', () => {
    render(<UploadWidget recordType="expense" recordId="test-id" />);
    expect(screen.getByText(/Max 5 files, up to 5MB each/i)).toBeInTheDocument();
  });
});
