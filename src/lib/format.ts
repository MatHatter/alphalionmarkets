/** Display formatting helpers. */

export function relativeTime(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function absoluteTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

const UNITS: { limit: number; divisor: number; suffix: string }[] = [
  { limit: 1e12, divisor: 1e12, suffix: 'T' },
  { limit: 1e9, divisor: 1e9, suffix: 'B' },
  { limit: 1e6, divisor: 1e6, suffix: 'M' },
  { limit: 1e3, divisor: 1e3, suffix: 'K' },
];

export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const magnitude = Math.abs(value);
  if (magnitude < 1000) return `${sign}${Math.round(magnitude)}`;
  for (const unit of UNITS) {
    if (magnitude >= unit.limit) {
      const scaled = magnitude / unit.divisor;
      // One decimal below 10 (9.4M), none above (94M) — keeps the width steady.
      return `${sign}${scaled.toFixed(scaled < 10 ? 1 : 0)}${unit.suffix}`;
    }
  }
  return `${sign}${magnitude}`;
}

/** "1 post" / "2 posts". Pass a plural when it is not just an -s. */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function signedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function price(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Coarse "time remaining" label, e.g. "19h left" → returns "19h". */
export function durationUntil(target: number, now = Date.now()): string {
  const ms = Math.max(0, target - now);
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
