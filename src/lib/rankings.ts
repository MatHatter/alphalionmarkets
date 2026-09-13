/** Rankings and discovery (§4). */
import type { Message, State, Symbol, User } from './types';
import { likeCount, sentimentSplit, type SentimentSplit } from './streams';

export type Timeframe = '1h' | '24h' | '7d';

export const TIMEFRAMES: Timeframe[] = ['1h', '24h', '7d'];

const HOUR = 3_600_000;

export const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1h': HOUR,
  '24h': 24 * HOUR,
  '7d': 7 * 24 * HOUR,
};

/**
 * Visible, undeleted messages inside the window. The window is bounded at both
 * ends: a message timestamped after `now` is not in "the last hour", and
 * without the upper bound one would count in every timeframe.
 */
export function messagesInWindow(
  state: State,
  timeframe: Timeframe,
  now = Date.now(),
): Message[] {
  const cutoff = now - TIMEFRAME_MS[timeframe];
  return Object.values(state.messages).filter(
    (m) =>
      !m.deleted &&
      m.createdAt >= cutoff &&
      m.createdAt <= now &&
      !state.blockedUsers.includes(m.authorId) &&
      !state.mutedUsers.includes(m.authorId),
  );
}

export interface TickerRanking {
  ticker: string;
  symbol: Symbol | undefined;
  mentions: number;
  split: SentimentSplit;
  /** Mentions relative to the symbol's own baseline rate. Null without history. */
  spike: number | null;
}

/**
 * Group messages by ticker and score each one. The baseline for the spike is
 * the symbol's rate over the *previous* window of the same length, so "unusual"
 * means unusual for that ticker rather than loud in absolute terms.
 */
export function rankTickers(
  state: State,
  timeframe: Timeframe,
  now = Date.now(),
): TickerRanking[] {
  const windowMs = TIMEFRAME_MS[timeframe];
  const current = messagesInWindow(state, timeframe, now);

  const priorStart = now - 2 * windowMs;
  const priorEnd = now - windowMs;
  const prior = Object.values(state.messages).filter(
    (m) =>
      !m.deleted &&
      m.createdAt >= priorStart &&
      m.createdAt < priorEnd &&
      !state.blockedUsers.includes(m.authorId) &&
      !state.mutedUsers.includes(m.authorId),
  );

  const priorCounts = new Map<string, number>();
  for (const message of prior) {
    for (const ticker of message.symbols) {
      priorCounts.set(ticker, (priorCounts.get(ticker) ?? 0) + 1);
    }
  }

  const grouped = new Map<string, Message[]>();
  for (const message of current) {
    for (const ticker of message.symbols) {
      const bucket = grouped.get(ticker);
      if (bucket) bucket.push(message);
      else grouped.set(ticker, [message]);
    }
  }

  return [...grouped.entries()]
    .map(([ticker, messages]) => {
      const baseline = priorCounts.get(ticker) ?? 0;
      return {
        ticker,
        symbol: state.symbols[ticker],
        mentions: messages.length,
        split: sentimentSplit(messages),
        spike: baseline === 0 ? null : messages.length / baseline,
      };
    })
    .sort((a, b) => b.mentions - a.mentions || a.ticker.localeCompare(b.ticker));
}

export type MoverKind = 'gainers' | 'losers' | 'active' | 'watched';

/** Market-wide symbol lists, independent of what anyone posted. */
export function rankSymbols(
  state: State,
  kind: MoverKind,
  limit = 5,
): Symbol[] {
  const all = Object.values(state.symbols);
  switch (kind) {
    case 'gainers':
      return [...all]
        .filter((s) => s.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, limit);
    case 'losers':
      return [...all]
        .filter((s) => s.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, limit);
    case 'active':
    case 'watched':
      return [...all].sort((a, b) => b.watchers - a.watchers).slice(0, limit);
  }
}

/**
 * Tickers ranked by how one-sided their sentiment is. Only tickers with enough
 * tagged messages qualify, so a single post cannot top the board at 100%.
 */
export function sentimentLeaders(
  state: State,
  timeframe: Timeframe,
  direction: 'bullish' | 'bearish',
  minimumTagged = 2,
  limit = 5,
  now = Date.now(),
): TickerRanking[] {
  return rankTickers(state, timeframe, now)
    .filter(
      (t) =>
        t.split.bullishShare !== null &&
        t.split.bullish + t.split.bearish >= minimumTagged,
    )
    .sort((a, b) =>
      direction === 'bullish'
        ? b.split.bullishShare! - a.split.bullishShare!
        : a.split.bullishShare! - b.split.bullishShare!,
    )
    .slice(0, limit);
}

export interface HashtagRanking {
  tag: string;
  uses: number;
}

export function trendingHashtags(
  state: State,
  timeframe: Timeframe,
  limit = 6,
  now = Date.now(),
): HashtagRanking[] {
  const counts = new Map<string, number>();
  for (const message of messagesInWindow(state, timeframe, now)) {
    for (const tag of message.hashtags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, uses]) => ({ tag, uses }))
    .sort((a, b) => b.uses - a.uses || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export interface SuggestedUser {
  user: User;
  messages: number;
  likes: number;
}

/**
 * Who to follow: active authors the viewer does not already follow, ranked by
 * the engagement they earned in the window.
 */
export function suggestedUsers(
  state: State,
  timeframe: Timeframe,
  limit = 3,
  now = Date.now(),
): SuggestedUser[] {
  const stats = new Map<string, { messages: number; likes: number }>();
  for (const message of messagesInWindow(state, timeframe, now)) {
    const entry = stats.get(message.authorId) ?? { messages: 0, likes: 0 };
    entry.messages += 1;
    entry.likes += likeCount(message);
    stats.set(message.authorId, entry);
  }

  return [...stats.entries()]
    .filter(
      ([userId]) =>
        userId !== state.viewerId &&
        !state.followedUsers.includes(userId) &&
        !state.blockedUsers.includes(userId) &&
        state.users[userId],
    )
    .map(([userId, entry]) => ({ user: state.users[userId], ...entry }))
    .sort((a, b) => b.likes - a.likes || b.messages - a.messages)
    .slice(0, limit);
}

/** Tickers whose chatter most exceeds their own prior-window baseline. */
export function chatterSpikes(
  state: State,
  timeframe: Timeframe,
  limit = 5,
  now = Date.now(),
): TickerRanking[] {
  return rankTickers(state, timeframe, now)
    .filter((t) => t.spike !== null && t.spike > 1)
    .sort((a, b) => b.spike! - a.spike!)
    .slice(0, limit);
}
