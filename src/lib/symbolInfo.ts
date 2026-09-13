/** Per-symbol editorial content: headlines, related tickers, contributors (§3). */
import type { Message, State, Symbol } from './types';
import { likeCount } from './streams';

export interface Headline {
  id: string;
  source: string;
  title: string;
  hoursAgo: number;
}

/**
 * Fictional headlines. Generic enough to attach to any ticker, because the joke
 * is the shape of financial news rather than any particular company.
 */
const HEADLINE_TEMPLATES: { source: string; title: string; hoursAgo: number }[] = [
  { source: 'Marketwire', title: '{T} shares move on volume; nobody can say why', hoursAgo: 1 },
  { source: 'The Tape', title: 'Analyst raises {T} target to whatever it is now', hoursAgo: 4 },
  { source: 'Quarterly', title: '5 reasons {T} could go up, and 5 identical reasons it could go down', hoursAgo: 9 },
  { source: 'Bloomburger', title: '{T} insiders sell, call it "routine diversification"', hoursAgo: 20 },
  { source: 'Retail Daily', title: 'Is {T} the next {T}? A deep dive that answers nothing', hoursAgo: 31 },
];

export function headlinesFor(ticker: string): Headline[] {
  return HEADLINE_TEMPLATES.map((template, i) => ({
    id: `${ticker}-news-${i}`,
    source: template.source,
    title: template.title.replaceAll('{T}', `$${ticker}`),
    hoursAgo: template.hoursAgo,
  }));
}

/** Other symbols in the same asset class, nearest by price. */
export function relatedSymbols(state: State, ticker: string, limit = 4): Symbol[] {
  const symbol = state.symbols[ticker.toUpperCase()];
  if (!symbol) return [];
  return Object.values(state.symbols)
    .filter((s) => s.ticker !== symbol.ticker && s.assetClass === symbol.assetClass)
    .sort(
      (a, b) =>
        Math.abs(a.last - symbol.last) - Math.abs(b.last - symbol.last) ||
        a.ticker.localeCompare(b.ticker),
    )
    .slice(0, limit);
}

export interface Contributor {
  userId: string;
  messages: number;
  likes: number;
}

/** Most active posters on a ticker, ranked by volume then by likes earned. */
export function topContributors(
  messages: Message[],
  limit = 3,
): Contributor[] {
  const byUser = new Map<string, Contributor>();
  for (const message of messages) {
    const existing = byUser.get(message.authorId);
    if (existing) {
      existing.messages += 1;
      existing.likes += likeCount(message);
    } else {
      byUser.set(message.authorId, {
        userId: message.authorId,
        messages: 1,
        likes: likeCount(message),
      });
    }
  }
  return [...byUser.values()]
    .sort((a, b) => b.messages - a.messages || b.likes - a.likes)
    .slice(0, limit);
}

/** Symbol search for the composer/search typeahead. */
export function searchSymbols(state: State, query: string, limit = 6): Symbol[] {
  const q = query.trim().toUpperCase().replace(/^\$/, '');
  if (!q) return [];
  const all = Object.values(state.symbols);
  const starts = all.filter((s) => s.ticker.startsWith(q));
  const contains = all.filter(
    (s) =>
      !s.ticker.startsWith(q) &&
      (s.ticker.includes(q) || s.name.toUpperCase().includes(q)),
  );
  return [...starts, ...contains].slice(0, limit);
}
