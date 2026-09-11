import { describe, expect, it } from 'vitest';
import { createSeedState } from './seed';
import {
  applyFilter,
  countReplies,
  selectReplies,
  selectStream,
  sentimentSplit,
  trendingSymbols,
} from './streams';
import { postMessage, toggleBlockUser, toggleBookmark, toggleMuteUser } from './store';
import type { State } from './types';

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

function seeded(): State {
  return createSeedState(NOW);
}

describe('selectStream', () => {
  it('excludes replies from top-level streams', () => {
    const state = seeded();
    const trending = selectStream(state, { kind: 'trending' }, 'all', NOW);
    expect(trending.every((m) => !m.parentId)).toBe(true);
  });

  it('keeps replies in a profile stream', () => {
    const state = seeded();
    const profile = selectStream(state, { kind: 'user', userId: 'u_doom' }, 'all', NOW);
    expect(profile.some((m) => Boolean(m.parentId))).toBe(true);
  });

  it('orders a symbol stream newest first', () => {
    const state = seeded();
    const stream = selectStream(state, { kind: 'symbol', ticker: 'LION' }, 'all', NOW);
    const times = stream.map((m) => m.createdAt);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('matches a symbol stream case-insensitively', () => {
    const state = seeded();
    const lower = selectStream(state, { kind: 'symbol', ticker: 'lion' }, 'all', NOW);
    const upper = selectStream(state, { kind: 'symbol', ticker: 'LION' }, 'all', NOW);
    expect(lower.map((m) => m.id)).toEqual(upper.map((m) => m.id));
  });

  it('shows only followed users and symbols on home', () => {
    const state = seeded();
    const home = selectStream(state, { kind: 'home' }, 'all', NOW);
    expect(home.length).toBeGreaterThan(0);
    for (const message of home) {
      const followedAuthor =
        state.followedUsers.includes(message.authorId) || message.authorId === state.viewerId;
      const followedSymbol = message.symbols.some((s) => state.followedSymbols.includes(s));
      expect(followedAuthor || followedSymbol).toBe(true);
    }
  });

  it('includes the viewer’s own post on home', () => {
    let state = seeded();
    state = postMessage(state, { body: 'my first take, no tickers' }, NOW);
    const home = selectStream(state, { kind: 'home' }, 'all', NOW);
    expect(home.some((m) => m.authorId === state.viewerId)).toBe(true);
  });

  it('hides muted authors from streams', () => {
    let state = seeded();
    const before = selectStream(state, { kind: 'trending' }, 'all', NOW);
    state = toggleMuteUser(state, 'u_bull');
    const after = selectStream(state, { kind: 'trending' }, 'all', NOW);
    expect(after.length).toBeLessThan(before.length);
    expect(after.some((m) => m.authorId === 'u_bull')).toBe(false);
  });

  it('hides blocked authors from streams', () => {
    let state = toggleBlockUser(seeded(), 'u_doom');
    expect(
      selectStream(state, { kind: 'trending' }, 'all', NOW).some((m) => m.authorId === 'u_doom'),
    ).toBe(false);
  });

  it('excludes deleted messages', () => {
    const state = seeded();
    const id = selectStream(state, { kind: 'trending' }, 'all', NOW)[0].id;
    const withDeleted: State = {
      ...state,
      messages: { ...state.messages, [id]: { ...state.messages[id], deleted: true } },
    };
    expect(
      selectStream(withDeleted, { kind: 'trending' }, 'all', NOW).some((m) => m.id === id),
    ).toBe(false);
  });

  it('returns only bookmarked messages for the saved stream', () => {
    let state = seeded();
    const id = selectStream(state, { kind: 'trending' }, 'all', NOW)[0].id;
    expect(selectStream(state, { kind: 'bookmarks' }, 'all', NOW)).toHaveLength(0);
    state = toggleBookmark(state, id);
    expect(selectStream(state, { kind: 'bookmarks' }, 'all', NOW).map((m) => m.id)).toEqual([id]);
  });

  it('returns nothing for an empty search', () => {
    expect(selectStream(seeded(), { kind: 'search', query: '   ' }, 'all', NOW)).toHaveLength(0);
  });

  it('searches bodies, tickers and handles', () => {
    const state = seeded();
    expect(selectStream(state, { kind: 'search', query: 'backtest' }, 'all', NOW).length).toBeGreaterThan(0);
    expect(selectStream(state, { kind: 'search', query: 'bagz' }, 'all', NOW).length).toBeGreaterThan(0);
  });

  it('ranks trending above strict recency', () => {
    const state = seeded();
    const trending = selectStream(state, { kind: 'trending' }, 'all', NOW);
    const newest = selectStream(state, { kind: 'popular' }, 'all', NOW);
    expect(trending.length).toBe(newest.length);
  });
});

describe('applyFilter', () => {
  it('filters by sentiment', () => {
    const state = seeded();
    const all = selectStream(state, { kind: 'trending' }, 'all', NOW);
    expect(applyFilter(all, 'bullish').every((m) => m.sentiment === 'bullish')).toBe(true);
    expect(applyFilter(all, 'bearish').every((m) => m.sentiment === 'bearish')).toBe(true);
  });

  it('filters to messages carrying a link or a chart', () => {
    const state = seeded();
    const all = selectStream(state, { kind: 'trending' }, 'all', NOW);
    expect(applyFilter(all, 'links').every((m) => Boolean(m.linkPreview))).toBe(true);
    expect(applyFilter(all, 'charts').every((m) => m.images.length > 0)).toBe(true);
  });

  it('does not mutate the input array', () => {
    const state = seeded();
    const all = selectStream(state, { kind: 'trending' }, 'all', NOW);
    const order = all.map((m) => m.id);
    applyFilter(all, 'top');
    expect(all.map((m) => m.id)).toEqual(order);
  });
});

describe('replies', () => {
  it('reads oldest first', () => {
    const state = seeded();
    const parent = selectStream(state, { kind: 'trending' }, 'all', NOW).find(
      (m) => countReplies(state, m.id) > 1,
    )!;
    const times = selectReplies(state, parent.id).map((m) => m.createdAt);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe('sentimentSplit', () => {
  it('reports null share when nothing is tagged', () => {
    expect(sentimentSplit([]).bullishShare).toBeNull();
  });

  it('computes the bullish share of tagged messages only', () => {
    const state = seeded();
    const messages = Object.values(state.messages);
    const split = sentimentSplit(messages);
    expect(split.bullishShare).toBeCloseTo(split.bullish / (split.bullish + split.bearish));
  });
});

describe('trendingSymbols', () => {
  it('ranks by mention count within the window', () => {
    const trending = trendingSymbols(seeded(), 8, 24 * 3_600_000, NOW);
    const counts = trending.map((t) => t.mentions);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('excludes mentions older than the window', () => {
    const all = trendingSymbols(seeded(), 20, 24 * 3_600_000, NOW);
    const narrow = trendingSymbols(seeded(), 20, 1 * 3_600_000, NOW);
    expect(narrow.length).toBeLessThan(all.length);
  });

  it('honours the limit', () => {
    expect(trendingSymbols(seeded(), 2, 24 * 3_600_000, NOW)).toHaveLength(2);
  });
});
