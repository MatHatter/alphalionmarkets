import { describe, expect, it } from 'vitest';
import {
  compactNumber,
  durationUntil,
  pluralize,
  relativeTime,
  signedPercent,
} from './format';

describe('compactNumber', () => {
  it('leaves small numbers alone', () => {
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(999)).toBe('999');
  });

  it('scales through K, M, B and T', () => {
    expect(compactNumber(1_500)).toBe('1.5K');
    expect(compactNumber(22_400_000)).toBe('22M');
    expect(compactNumber(1_520_000_000)).toBe('1.5B');
    expect(compactNumber(2_400_000_000_000)).toBe('2.4T');
  });

  it('drops the decimal above ten', () => {
    expect(compactNumber(94_000_000)).toBe('94M');
  });

  it('rounds at the unit boundary rather than truncating', () => {
    expect(compactNumber(22_500_000)).toBe('23M');
  });

  it('handles negatives', () => {
    expect(compactNumber(-1_500)).toBe('-1.5K');
  });

  it('does not produce a bare M for billions', () => {
    expect(compactNumber(152_100_000_000)).not.toMatch(/M$/);
  });
});

describe('pluralize', () => {
  it('uses the singular for exactly one', () => {
    expect(pluralize(1, 'post')).toBe('1 post');
  });

  it('uses the plural otherwise', () => {
    expect(pluralize(0, 'post')).toBe('0 posts');
    expect(pluralize(2, 'post')).toBe('2 posts');
  });

  it('accepts an irregular plural', () => {
    expect(pluralize(2, 'entry', 'entries')).toBe('2 entries');
  });
});

describe('relativeTime', () => {
  const now = Date.UTC(2026, 0, 15, 12, 0, 0);

  it('counts seconds, minutes, hours and days', () => {
    expect(relativeTime(now - 5_000, now)).toBe('5s');
    expect(relativeTime(now - 120_000, now)).toBe('2m');
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe('3h');
    expect(relativeTime(now - 2 * 86_400_000, now)).toBe('2d');
  });

  it('falls back to a date past a week', () => {
    expect(relativeTime(now - 30 * 86_400_000, now)).toMatch(/\w/);
  });

  it('never reports a negative age', () => {
    expect(relativeTime(now + 10_000, now)).toBe('0s');
  });
});

describe('durationUntil', () => {
  const now = Date.UTC(2026, 0, 15, 12, 0, 0);

  it('reports minutes, hours and days remaining', () => {
    expect(durationUntil(now + 30 * 60_000, now)).toBe('30m');
    expect(durationUntil(now + 5 * 3_600_000, now)).toBe('5h');
    expect(durationUntil(now + 3 * 86_400_000, now)).toBe('3d');
  });

  it('clamps a past deadline to zero', () => {
    expect(durationUntil(now - 60_000, now)).toBe('0m');
  });
});

describe('signedPercent', () => {
  it('prefixes a plus for gains only', () => {
    expect(signedPercent(7.956)).toBe('+7.96%');
    expect(signedPercent(-16.21)).toBe('-16.21%');
  });
});
