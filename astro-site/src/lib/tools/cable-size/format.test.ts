import { describe, expect, it } from 'vitest';
import { formatCableSize, formatLoadPower, formatMaterial } from './format';

describe('formatLoadPower', () => {
  it('reads the way an electrician would say it', () => {
    expect(formatLoadPower(100)).toBe('100 W');
    expect(formatLoadPower(80)).toBe('80 W');
    expect(formatLoadPower(500)).toBe('500 W');
    expect(formatLoadPower(3000)).toBe('3 kW');
    expect(formatLoadPower(2200)).toBe('2.2 kW');
  });

  it('keeps decimals where they carry information', () => {
    expect(formatLoadPower(0.108)).toBe('0.11 W');
    expect(formatLoadPower(58.5)).toBe('59 W');
    expect(formatLoadPower(Number.NaN)).toBe('—');
  });
});

describe('formatCableSize / formatMaterial', () => {
  it('labels the cable and the metal', () => {
    expect(formatCableSize(4)).toBe('4 mm²');
    expect(formatMaterial('copper')).toBe('Copper');
    expect(formatMaterial('aluminium')).toBe('Aluminium');
  });
});
