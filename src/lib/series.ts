/**
 * Deterministic synthetic market series (§3, §13).
 *
 * There is no market data feed. Every point is generated from a seed derived
 * from the ticker, so a symbol's chart is identical on every render and across
 * reloads — a chart that jittered on re-render would look broken rather than
 * fictional.
 */
import type { Symbol } from './types';

export type RangeId = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX';

export const RANGES: RangeId[] = ['1D', '5D', '1M', '3M', '6M', '1Y', '5Y', 'MAX'];

interface RangeSpec {
  /** Number of points to plot. */
  points: number;
  /** Spacing between points, in ms. */
  stepMs: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const RANGE_SPECS: Record<RangeId, RangeSpec> = {
  '1D': { points: 78, stepMs: 5 * MINUTE },
  '5D': { points: 65, stepMs: 30 * MINUTE },
  '1M': { points: 22, stepMs: DAY },
  '3M': { points: 64, stepMs: DAY },
  '6M': { points: 128, stepMs: DAY },
  '1Y': { points: 52, stepMs: 7 * DAY },
  '5Y': { points: 60, stepMs: 30 * DAY },
  MAX: { points: 120, stepMs: 30 * DAY },
};

/** FNV-1a, so a ticker maps to a stable 32-bit seed. */
function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — small, fast, and stable across engines. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export interface PricePoint {
  t: number;
  price: number;
}

/**
 * A random walk that is pinned to the symbol's current quote at the right edge,
 * so the chart always ends at the price shown in the header.
 */
export function priceSeries(
  symbol: Symbol,
  range: RangeId,
  now = Date.now(),
): PricePoint[] {
  const { points, stepMs } = RANGE_SPECS[range];
  const random = rng(seedFrom(`${symbol.ticker}:${range}`));

  // Longer ranges drift further; volatility scales with the square root of the
  // horizon, which is the usual convention and keeps 5Y from looking flat.
  const horizonDays = (points * stepMs) / DAY;
  const volatility = 0.012 * Math.sqrt(Math.max(1, horizonDays));

  const walk: number[] = [];
  let value = 0;
  for (let i = 0; i < points; i += 1) {
    value += (random() - 0.5) * volatility;
    walk.push(value);
  }

  // Rebase so the final point is exactly the quoted price, and the whole series
  // stays positive.
  const last = walk[walk.length - 1];
  const startPrice = symbol.last - symbol.change;
  return walk.map((step, i) => {
    const progress = points === 1 ? 1 : i / (points - 1);
    const trend = startPrice + (symbol.last - startPrice) * progress;
    const price = Math.max(0.01, trend * (1 + (step - last * progress)));
    return {
      t: now - (points - 1 - i) * stepMs,
      price: i === points - 1 ? symbol.last : price,
    };
  });
}

export interface VolumePoint {
  t: number;
  /** Message count in this bucket. */
  messages: number;
  bullish: number;
  bearish: number;
}

/**
 * Bucket real messages by time. Unlike price, this is not synthetic — it counts
 * the posts actually in state, so the chart moves when the viewer posts.
 */
export function messageVolumeSeries(
  timestamps: { t: number; sentiment?: 'bullish' | 'bearish' }[],
  buckets: number,
  bucketMs: number,
  now = Date.now(),
): VolumePoint[] {
  const series: VolumePoint[] = [];
  const end = Math.ceil(now / bucketMs) * bucketMs;
  for (let i = buckets - 1; i >= 0; i -= 1) {
    series.push({ t: end - i * bucketMs, messages: 0, bullish: 0, bearish: 0 });
  }
  for (const item of timestamps) {
    const index = series.findIndex(
      (b) => item.t > b.t - bucketMs && item.t <= b.t,
    );
    if (index === -1) continue;
    series[index].messages += 1;
    if (item.sentiment === 'bullish') series[index].bullish += 1;
    if (item.sentiment === 'bearish') series[index].bearish += 1;
  }
  return series;
}

/**
 * Baseline chatter for a symbol, used to flag an unusual-volume spike (§4).
 * Returns null when there is not enough history to compare against.
 */
export function chatterSpike(series: VolumePoint[]): number | null {
  if (series.length < 3) return null;
  const history = series.slice(0, -1);
  const total = history.reduce((sum, b) => sum + b.messages, 0);
  if (total === 0) return null;
  const baseline = total / history.length;
  return series[series.length - 1].messages / baseline;
}

export interface SymbolStats {
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  marketCap: number;
  dayLow: number;
  dayHigh: number;
  yearLow: number;
  yearHigh: number;
  peRatio: number | null;
  earningsAt: number;
}

/** Fictional fundamentals, stable per ticker. */
export function symbolStats(symbol: Symbol, now = Date.now()): SymbolStats {
  const random = rng(seedFrom(`${symbol.ticker}:stats`));
  const previousClose = symbol.last - symbol.change;
  const open = previousClose * (1 + (random() - 0.5) * 0.02);
  const dayLow = Math.min(open, symbol.last) * (1 - random() * 0.03);
  const dayHigh = Math.max(open, symbol.last) * (1 + random() * 0.03);
  return {
    open,
    high: dayHigh,
    low: dayLow,
    previousClose,
    volume: Math.round(1_000_000 + random() * 90_000_000),
    marketCap: Math.round(symbol.last * (1e7 + random() * 4e9)),
    dayLow,
    dayHigh,
    yearLow: symbol.last * (0.35 + random() * 0.3),
    yearHigh: symbol.last * (1.2 + random() * 1.4),
    peRatio: symbol.assetClass === 'crypto' ? null : Math.round((8 + random() * 180) * 10) / 10,
    earningsAt: now + Math.round(1 + random() * 60) * DAY,
  };
}

export type Session = 'pre-market' | 'open' | 'after-hours' | 'closed';

/** Market session from the clock, US equity hours in UTC-ish terms. */
export function marketSession(now = Date.now()): Session {
  const date = new Date(now);
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return 'closed';
  // Treat 13:30–20:00 UTC as the regular session (09:30–16:00 ET).
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  if (minutes >= 8 * 60 && minutes < 13 * 60 + 30) return 'pre-market';
  if (minutes >= 13 * 60 + 30 && minutes < 20 * 60) return 'open';
  if (minutes >= 20 * 60 && minutes < 24 * 60) return 'after-hours';
  return 'closed';
}
