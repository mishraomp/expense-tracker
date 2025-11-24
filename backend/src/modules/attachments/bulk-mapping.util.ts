import { Logger } from '@nestjs/common';

export interface MappingCandidate {
  recordId: string;
  recordType: 'expense' | 'income';
  confidence: number; // 0-1
  matchedOn: string[]; // e.g., ['filename', 'date', 'amount']
}

export interface Record {
  id: string;
  date: Date;
  amount: number;
  description?: string;
}

/**
 * Mapping heuristic utility for bulk import.
 * Uses filename, date, and amount patterns to suggest record matches.
 */
export class BulkMappingUtil {
  private static readonly logger = new Logger(BulkMappingUtil.name);

  /**
   * Suggests record matches for a given file based on filename, date, amount patterns.
   * Returns candidates sorted by confidence (highest first).
   */
  static suggestMapping(
    filename: string,
    records: Record[],
    recordType: 'expense' | 'income',
  ): MappingCandidate[] {
    const candidates: MappingCandidate[] = [];

    // Extract potential date patterns from filename (YYYY-MM-DD, YYYYMMDD, etc.)
    const datePatterns = this.extractDatePatterns(filename);

    // Extract potential amount patterns from filename (123.45, 123-45, etc.)
    const amountPatterns = this.extractAmountPatterns(filename);

    for (const record of records) {
      const matchedOn: string[] = [];
      let confidence = 0;

      // Match by date (highest weight: 0.5)
      if (datePatterns.some((pattern) => this.isSameDay(pattern, record.date))) {
        matchedOn.push('date');
        confidence += 0.5;
      }

      // Match by amount (medium weight: 0.3)
      if (amountPatterns.some((pattern) => Math.abs(pattern - record.amount) < 0.01)) {
        matchedOn.push('amount');
        confidence += 0.3;
      }

      // Match by description/keywords (low weight: 0.2)
      if (record.description && this.filenameContainsKeywords(filename, record.description)) {
        matchedOn.push('filename');
        confidence += 0.2;
      }

      // Only include candidates with some match
      if (matchedOn.length > 0) {
        candidates.push({
          recordId: record.id,
          recordType,
          confidence,
          matchedOn,
        });
      }
    }

    // Sort by confidence descending
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract date patterns from filename (YYYY-MM-DD, YYYYMMDD, MM-DD-YYYY, etc.)
   */
  private static extractDatePatterns(filename: string): Date[] {
    const dates: Date[] = [];

    // Pattern: YYYY-MM-DD or YYYY/MM/DD
    const iso = filename.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (iso) {
      const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}`);
      if (!isNaN(date.getTime())) dates.push(date);
    }

    // Pattern: YYYYMMDD
    const compact = filename.match(/(\d{4})(\d{2})(\d{2})/);
    if (compact) {
      const date = new Date(`${compact[1]}-${compact[2]}-${compact[3]}`);
      if (!isNaN(date.getTime())) dates.push(date);
    }

    // Pattern: MM-DD-YYYY or MM/DD/YYYY
    const us = filename.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (us) {
      const date = new Date(`${us[3]}-${us[1]}-${us[2]}`);
      if (!isNaN(date.getTime())) dates.push(date);
    }

    return dates;
  }

  /**
   * Extract amount patterns from filename (123.45, 123-45, $123.45, etc.)
   */
  private static extractAmountPatterns(filename: string): number[] {
    const amounts: number[] = [];

    // Pattern: decimal amounts (123.45, $123.45, 123,45)
    const matches = filename.matchAll(/[\$€£]?(\d+)[.,](\d{2})/g);
    for (const match of matches) {
      const amount = parseFloat(`${match[1]}.${match[2]}`);
      if (!isNaN(amount)) amounts.push(amount);
    }

    // Pattern: whole numbers (could be amounts without decimals)
    const wholeMatches = filename.matchAll(/\b(\d{2,})\b/g);
    for (const match of wholeMatches) {
      const amount = parseFloat(match[1]);
      if (!isNaN(amount) && amount > 0) amounts.push(amount);
    }

    return amounts;
  }

  /**
   * Check if two dates are the same day (ignoring time)
   */
  private static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Check if filename contains keywords from description (case-insensitive)
   */
  private static filenameContainsKeywords(filename: string, description: string): boolean {
    const filenameLower = filename.toLowerCase();
    const words = description.toLowerCase().split(/\s+/);

    // Check if filename contains any significant words (>3 chars) from description
    return words.some((word) => word.length > 3 && filenameLower.includes(word));
  }
}
