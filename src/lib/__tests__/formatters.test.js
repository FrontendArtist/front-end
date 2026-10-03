import { formatNoor, formatNoorWithUnit, formatTomanHint, formatPrice } from '../formatters';

describe('Formatters with Noor and Display Hint', () => {
  test('formatNoor formats integers correctly with Persian digits', () => {
    const formatted = formatNoor(250);
    // Persian digits for 250 are ۲۵۰
    expect(formatted).toBe('۲۵۰');
  });

  test('formatNoor formats decimal amounts correctly up to 4 decimal places', () => {
    const formatted = formatNoor(150.25);
    expect(formatted).toContain('۱۵۰');
    expect(formatted).toContain('۲۵');
  });

  test('formatNoorWithUnit attaches Noor unit', () => {
    expect(formatNoorWithUnit(100)).toBe('۱۰۰ نور');
  });

  test('formatTomanHint returns null if rate is missing or invalid', () => {
    expect(formatTomanHint(100, null)).toBeNull();
    expect(formatTomanHint(100, 0)).toBeNull();
    expect(formatTomanHint(100, undefined)).toBeNull();
  });

  test('formatTomanHint calculates and formats approximate Toman amount', () => {
    const hint = formatTomanHint(100, 1000);
    expect(hint).toContain('معادل تقریبی:');
    expect(hint).toContain('۱۰۰');
    expect(hint).toContain('تومان');
  });
});
