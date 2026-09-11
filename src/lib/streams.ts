/** Stream selectors and filters. See docs/FEATURE-PARITY.md §2. */
import type { Message, State } from './types';

export type StreamId =
  | { kind: 'home' }
  | { kind: 'trending' }
  | { kind: 'popular' }
  | { kind: 'symbol'; ticker: string }
  | { kind: 'watchlist' }
  | { kind: 'hashtag'; tag: string }
  | { kind: 'bookmarks' }
  | { kind: 'user'; userId: string }
  | { kind: 'search'; query: string };

export type StreamFilter = 'all' | 'top' | 'bullish' | 'bearish' | 'links' | 'charts';

/** Replies live under their parent, so top-level streams exclude them. */
function isTopLevel(message: Message): boolean {
  return !message.parentId;
}

/**
 * Blocked authors disappear entirely; muted authors disappear from streams but
 * their permalinks still resolve.
 */
function isVisible(state: State, message: Message): boolean {
  return (
    !state.blockedUsers.includes(message.authorId) &&
    !state.mutedUsers.includes(message.authorId)
  );
}

/** Likes as displayed: seeded headline count plus real likes. */
export function likeCount(message: Message): number {
  return (message.seedLikes ?? 0) + message.likedBy.length;
}

function engagement(message: Message): number {
  return likeCount(message);
}

/**
 * Hotness: engagement decayed by age, so a quiet morning does not leave
 * yesterday's winner pinned to the top of Trending.
 */
function hotness(message: Message, now: number): number {
  const ageHours = Math.max(0, (now - message.createdAt) / 3_600_000);
  return (engagement(message) + 1) / Math.pow(ageHours + 2, 1.5);
}

export function applyFilter(messages: Message[], filter: StreamFilter): Message[] {
  switch (filter) {
    case 'all':
      return messages;
    case 'top':
      return [...messages].sort((a, b) => engagement(b) - engagement(a));
    case 'bullish':
      return messages.filter((m) => m.sentiment === 'bullish');
    case 'bearish':
      return messages.filter((m) => m.sentiment === 'bearish');
    case 'links':
      return messages.filter((m) => Boolean(m.linkPreview));
    case 'charts':
      return messages.filter((m) => m.images.length > 0);
  }
}

function matchesStream(state: State, message: Message, stream: StreamId): boolean {
  switch (stream.kind) {
    case 'home':
      return (
        message.authorId === state.viewerId ||
        state.followedUsers.includes(message.authorId) ||
        message.symbols.some((s) => state.followedSymbols.includes(s))
      );
    case 'trending':
    case 'popular':
      return true;
    case 'symbol':
      return message.symbols.includes(stream.ticker.toUpperCase());
    case 'watchlist':
      return message.symbols.some((s) => state.followedSymbols.includes(s));
    case 'hashtag':
      return message.hashtags.includes(stream.tag.toLowerCase());
    case 'bookmarks':
      return message.bookmarkedBy.includes(state.viewerId);
    case 'user':
      return message.authorId === stream.userId;
    case 'search': {
      const q = stream.query.trim().toLowerCase();
      if (!q) return false;
      const author = state.users[message.authorId];
      return (
        message.body.toLowerCase().includes(q) ||
        message.symbols.some((s) => s.toLowerCase().includes(q)) ||
        message.hashtags.some((h) => h.includes(q)) ||
        (author ? author.handle.toLowerCase().includes(q) : false)
      );
    }
  }
}

export function selectStream(
  state: State,
  stream: StreamId,
  filter: StreamFilter = 'all',
  now = Date.now(),
): Message[] {
  // Bookmarks and profiles are collections the viewer curated or navigated to
  // deliberately, so they keep replies; the ranked streams do not.
  const keepReplies = stream.kind === 'bookmarks' || stream.kind === 'user';

  const matched = Object.values(state.messages).filter(
    (m) =>
      !m.deleted &&
      (keepReplies || isTopLevel(m)) &&
      isVisible(state, m) &&
      matchesStream(state, m, stream),
  );

  const ordered =
    stream.kind === 'trending'
      ? [...matched].sort((a, b) => hotness(b, now) - hotness(a, now))
      : stream.kind === 'popular'
        ? [...matched].sort((a, b) => engagement(b) - engagement(a))
        : [...matched].sort((a, b) => b.createdAt - a.createdAt);

  return applyFilter(ordered, filter);
}

/** Replies to a message, oldest first — a thread reads top to bottom. */
export function selectReplies(state: State, messageId: string): Message[] {
  return Object.values(state.messages)
    .filter((m) => m.parentId === messageId && !m.deleted && isVisible(state, m))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function countReplies(state: State, messageId: string): number {
  return selectReplies(state, messageId).length;
}

export function countReshares(state: State, messageId: string): number {
  return Object.values(state.messages).filter(
    (m) => m.resharedId === messageId && !m.deleted,
  ).length;
}

export interface SentimentSplit {
  bullish: number;
  bearish: number;
  /** Bullish share of tagged messages, 0-1. Null when nothing is tagged. */
  bullishShare: number | null;
}

/** The sentiment gauge's underlying numbers (§3), computed over any message set. */
export function sentimentSplit(messages: Message[]): SentimentSplit {
  const bullish = messages.filter((m) => m.sentiment === 'bullish').length;
  const bearish = messages.filter((m) => m.sentiment === 'bearish').length;
  const tagged = bullish + bearish;
  return { bullish, bearish, bullishShare: tagged ? bullish / tagged : null };
}

/** Most-mentioned tickers over a trailing window, for the trending rail (§4). */
export function trendingSymbols(
  state: State,
  limit = 8,
  windowMs = 24 * 3_600_000,
  now = Date.now(),
): { ticker: string; mentions: number; split: SentimentSplit }[] {
  const recent = Object.values(state.messages).filter(
    (m) => !m.deleted && now - m.createdAt <= windowMs && isVisible(state, m),
  );
  const byTicker = new Map<string, Message[]>();
  for (const message of recent) {
    for (const ticker of message.symbols) {
      const bucket = byTicker.get(ticker);
      if (bucket) bucket.push(message);
      else byTicker.set(ticker, [message]);
    }
  }
  return [...byTicker.entries()]
    .map(([ticker, messages]) => ({
      ticker,
      mentions: messages.length,
      split: sentimentSplit(messages),
    }))
    .sort((a, b) => b.mentions - a.mentions || a.ticker.localeCompare(b.ticker))
    .slice(0, limit);
}
