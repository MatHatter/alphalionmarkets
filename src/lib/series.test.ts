import { describe, expect, it } from 'vitest';
import {
  RANGES,
  chatterSpike,
  marketSession,
  messageVolumeSeries,
  priceSeries,
  symbolStats,
} from './series';
import type { Symbol } from './types';

const SYMBOL: Symbol = {
  ticker: 'LION',
  name: 'Alpha Lion Holdings',
  assetClass: 'equity',
  last: 42.18,
  change: 3.11,
  changePercent: 7.96,
  watchers: 128_400,
};

const NOW = Date.UTC(2026, 0, 15, 15, 0, 0);

describe('priceSeries', () => {
  it('is deterministic for a ticker and range', () => {
    expect(priceSeries(SYMBOL, '1M', NOW)).toEqual(priceSeries(SYMBOL, '1M', NOW));
  });

  it('differs between ranges', () => {
    const a = priceSeries(SYMBOL, '1M', NOW).map((p) => p.price);
    const b = priceSeries(SYMBOL, '1Y', NOW).map((p) => p.price);
    expect(a).not.toEqual(b);
  });

  it('differs between tickers', () => {
    const other = { ...SYMBOL, ticker: 'MOON' };
    expect(priceSeries(SYMBOL, '1M', NOW).map((p) => p.price)).not.toEqual(
      priceSeries(other, '1M', NOW).map((p) => p.price),
    );
  });

  it('ends at the quoted price so the chart matches the header', () => {
    for (const range of RANGES) {
      const series = priceSeries(SYMBOL, range, NOW);
      expect(series[series.length - 1].price).toBe(SYMBOL.last);
    }
  });

  it('keeps every price positive', () => {
    for (const range of RANGES) {
      expect(priceSeries(SYMBOL, range, NOW).every((p) => p.price > 0)).toBe(true);
    }
  });

  it('returns strictly increasing timestamps ending now', () => {
    const series = priceSeries(SYMBOL, '5D', NOW);
    expect(series[series.length - 1].t).toBe(NOW);
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i].t).toBeGreaterThan(series[i - 1].t);
    }
  });

  it('handles a penny stock without going negative', () => {
    const penny = { ...SYMBOL, ticker: 'BAGZ', last: 0.87, change: -0.09 };
    expect(priceSeries(penny, 'MAX', NOW).every((p) => p.price > 0)).toBe(true);
  });
});

describe('messageVolumeSeries', () => {
  const HOUR = 3_600_000;

  it('returns the requested number of buckets', () => {
    expect(messageVolumeSeries([], 12, 4 * HOUR, NOW)).toHaveLength(12);
  });

  it('counts a message into exactly one bucket', () => {
    const series = messageVolumeSeries(
      [{ t: NOW - 1000, sentiment: 'bullish' }],
      6,
      HOUR,
      NOW,
    );
    expect(series.reduce((sum, b) => sum + b.messages, 0)).toBe(1);
    expect(series.reduce((sum, b) => sum + b.bullish, 0)).toBe(1);
  });

  it('ignores messages older than the window', () => {
    const series = messageVolumeSeries([{ t: NOW - 500 * HOUR }], 6, HOUR, NOW);
    expect(series.every((b) => b.messages === 0)).toBe(true);
  });

  it('separates bullish, bearish and untagged', () => {
    const series = messageVolumeSeries(
      [
        { t: NOW - 1000, sentiment: 'bullish' },
        { t: NOW - 2000, sentiment: 'bearish' },
        { t: NOW - 3000 },
      ],
      4,
      HOUR,
      NOW,
    );
    const totals = series.reduce(
      (acc, b) => ({
        messages: acc.messages + b.messages,
        bullish: acc.bullish + b.bullish,
        bearish: acc.bearish + b.bearish,
      }),
      { messages: 0, bullish: 0, bearish: 0 },
    );
    expect(totals).toEqual({ messages: 3, bullish: 1, bearish: 1 });
  });
});

describe('chatterSpike', () => {
  it('returns null when there is no history', () => {
    expect(chatterSpike([])).toBeNull();
  });

  it('returns null when nothing was posted before the last bucket', () => {
    const series = [
      { t: 1, messages: 0, bullish: 0, bearish: 0 },
      { t: 2, messages: 0, bullish: 0, bearish: 0 },
      { t: 3, messages: 9, bullish: 0, bearish: 0 },
    ];
    expect(chatterSpike(series)).toBeNull();
  });

  it('reports the last bucket as a multiple of the baseline', () => {
    const series = [
      { t: 1, messages: 2, bullish: 0, bearish: 0 },
      { t: 2, messages: 2, bullish: 0, bearish: 0 },
      { t: 3, messages: 6, bullish: 0, bearish: 0 },
    ];
    expect(chatterSpike(series)).toBe(3);
  });
});

describe('symbolStats', () => {
  it('is deterministic per ticker', () => {
    expect(symbolStats(SYMBOL, NOW)).toEqual(symbolStats(SYMBOL, NOW));
  });

  it('keeps the day range around the traded price', () => {
    const stats = symbolStats(SYMBOL, NOW);
    expect(stats.dayLow).toBeLessThanOrEqual(SYMBOL.last);
    expect(stats.dayHigh).toBeGreaterThanOrEqual(SYMBOL.last);
  });

  it('derives previous close from the day change', () => {
    expect(symbolStats(SYMBOL, NOW).previousClose).toBeCloseTo(SYMBOL.last - SYMBOL.change);
  });

  it('omits a P/E for crypto', () => {
    const crypto: Symbol = { ...SYMBOL, ticker: 'BTC.X', assetClass: 'crypto' };
    expect(symbolStats(crypto, NOW).peRatio).toBeNull();
  });

  it('puts earnings in the future', () => {
    expect(symbolStats(SYMBOL, NOW).earningsAt).toBeGreaterThan(NOW);
  });
});

describe('marketSession', () => {
  it('reports the regular session mid-afternoon UTC on a weekday', () => {
    expect(marketSession(Date.UTC(2026, 0, 15, 15, 0))).toBe('open');
  });

  it('reports pre-market before the open', () => {
    expect(marketSession(Date.UTC(2026, 0, 15, 12, 0))).toBe('pre-market');
  });

  it('reports after hours past the close', () => {
    expect(marketSession(Date.UTC(2026, 0, 15, 21, 0))).toBe('after-hours');
  });

  it('reports closed at the weekend', () => {
    expect(marketSession(Date.UTC(2026, 0, 17, 15, 0))).toBe('closed');
  });
});
