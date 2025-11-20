export function toYYYYMMDD(input: string | Date): string {
  if (!input) return '';

  let d: Date;
  if (typeof input === 'string') {
    // If string is YYYY-MM-DD, parse as local date to avoid timezone shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, day] = input.split('-').map((s) => parseInt(s, 10));
      d = new Date(y, m - 1, day);
    } else {
      // Accept full ISO strings with or without time
      d = new Date(input);
    }
  } else {
    d = input;
  }

  // Format as yyyy-mm-dd using local date components
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
