import { describe, expect, it } from 'vitest';
import { createSeedState } from './seed';
import {
  chatterSpikes,
  messagesInWindow,
  rankSymbols,
  rankTickers,
  sentimentLeaders,
  suggestedUsers,
  trendingHashtags,
} from './rankings';
import { postMessage, toggleBlockUser, toggleFollowUser, toggleMuteUser } from './store';

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);
const HOUR = 3_600_000;

describe('messagesInWindow', () => {
  it('narrows as the timeframe shrinks', () => {
    const state = createSeedState(NOW);
    const week = messagesInWindow(state, '7d', NOW).length;
    const day = messagesInWindow(state, '24h', NOW).length;
    const hour = messagesInWindow(state, '1h', NOW).length;
    expect(week).toBeGreaterThanOrEqual(day);
    expect(day).toBeGreaterThanOrEqual(hour);
  });

  it('excludes muted and blocked authors', () => {
    let state = createSeedState(NOW);
    state = toggleMuteUser(state, 'u_bull');
    state = toggleBlockUser(state, 'u_doom');
    const authors = messagesInWindow(state, '7d', NOW).map((m) => m.authorId);
    expect(authors).not.toContain('u_bull');
    expect(authors).not.toContain('u_doom');
  });

  it('excludes messages timestamped after now', () => {
    let state = createSeedState(NOW);
    state = postMessage(state, { body: 'from the future $FUT' }, NOW + 5 * HOUR);
    expect(messagesInWindow(state, '7d', NOW).some((m) => m.symbols.includes('FUT'))).toBe(false);
  });

  it('excludes deleted messages', () => {
    const state = createSeedState(NOW);
    const id = Object.keys(state.messages)[0];
    const withDeleted = {
      ...state,
      messages: { ...state.messages, [id]: { ...state.messages[id], deleted: true } },
    };
    expect(messagesInWindow(withDeleted, '7d', NOW).some((m) => m.id === id)).toBe(false);
  });
});

describe('rankTickers', () => {
  it('sorts by mention count descending', () => {
    const counts = rankTickers(createSeedState(NOW), '24h', NOW).map((t) => t.mentions);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('attaches the symbol record when one exists', () => {
    const lion = rankTickers(createSeedState(NOW), '24h', NOW).find((t) => t.ticker === 'LION');
    expect(lion?.symbol?.name).toBe('Alpha Lion Holdings');
  });

  it('reports a null spike when the ticker has no prior-window history', () => {
    let state = createSeedState(NOW);
    state = postMessage(state, { body: 'fresh take on $NEWCO' }, NOW);
    const row = rankTickers(state, '1h', NOW).find((t) => t.ticker === 'NEWCO');
    expect(row?.spike).toBeNull();
  });

  it('measures a spike against the previous window of the same length', () => {
    let state = createSeedState(NOW);
    // One mention in the prior hour, three in the current hour.
    state = postMessage(state, { body: 'old $ZZZ' }, NOW - 90 * 60_000);
    for (let i = 0; i < 3; i += 1) {
      state = postMessage(state, { body: `new $ZZZ ${i}` }, NOW - 5 * 60_000);
    }
    const row = rankTickers(state, '1h', NOW).find((t) => t.ticker === 'ZZZ');
    expect(row?.spike).toBe(3);
  });
});

describe('rankSymbols', () => {
  it('returns gainers in descending order, all positive', () => {
    const gainers = rankSymbols(createSeedState(NOW), 'gainers');
    expect(gainers.every((s) => s.changePercent > 0)).toBe(true);
    const pcts = gainers.map((s) => s.changePercent);
    expect([...pcts].sort((a, b) => b - a)).toEqual(pcts);
  });

  it('returns losers in ascending order, all negative', () => {
    const losers = rankSymbols(createSeedState(NOW), 'losers');
    expect(losers.every((s) => s.changePercent < 0)).toBe(true);
    const pcts = losers.map((s) => s.changePercent);
    expect([...pcts].sort((a, b) => a - b)).toEqual(pcts);
  });

  it('ranks most-watched by watcher count', () => {
    const watched = rankSymbols(createSeedState(NOW), 'watched');
    const counts = watched.map((s) => s.watchers);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('honours the limit', () => {
    expect(rankSymbols(createSeedState(NOW), 'watched', 2)).toHaveLength(2);
  });
});

describe('sentimentLeaders', () => {
  it('ignores tickers below the minimum tagged count', () => {
    const leaders = sentimentLeaders(createSeedState(NOW), '7d', 'bullish', 2, 5, NOW);
    expect(leaders.every((t) => t.split.bullish + t.split.bearish >= 2)).toBe(true);
  });

  it('orders bullish leaders by descending bullish share', () => {
    const shares = sentimentLeaders(createSeedState(NOW), '7d', 'bullish', 1, 10, NOW).map(
      (t) => t.split.bullishShare!,
    );
    expect([...shares].sort((a, b) => b - a)).toEqual(shares);
  });

  it('orders bearish leaders by ascending bullish share', () => {
    const shares = sentimentLeaders(createSeedState(NOW), '7d', 'bearish', 1, 10, NOW).map(
      (t) => t.split.bullishShare!,
    );
    expect([...shares].sort((a, b) => a - b)).toEqual(shares);
  });
});

describe('trendingHashtags', () => {
  it('counts uses and sorts descending', () => {
    let state = createSeedState(NOW);
    state = postMessage(state, { body: '#alpha again' }, NOW);
    state = postMessage(state, { body: '#alpha once more' }, NOW);
    const tags = trendingHashtags(state, '1h', 10, NOW);
    expect(tags[0]).toEqual({ tag: 'alpha', uses: 2 });
  });

  it('returns nothing when the window is empty', () => {
    expect(trendingHashtags(createSeedState(NOW), '1h', 10, NOW - 400 * HOUR)).toEqual([]);
  });
});

describe('suggestedUsers', () => {
  it('never suggests the viewer', () => {
    const suggestions = suggestedUsers(createSeedState(NOW), '7d', 10, NOW);
    expect(suggestions.some((s) => s.user.id === 'u_viewer')).toBe(false);
  });

  it('never suggests someone already followed', () => {
    const state = createSeedState(NOW);
    const suggestions = suggestedUsers(state, '7d', 10, NOW);
    expect(suggestions.some((s) => state.followedUsers.includes(s.user.id))).toBe(false);
  });

  it('drops a user once they are followed', () => {
    let state = createSeedState(NOW);
    const first = suggestedUsers(state, '7d', 10, NOW)[0];
    expect(first).toBeDefined();
    state = toggleFollowUser(state, first.user.id);
    expect(suggestedUsers(state, '7d', 10, NOW).some((s) => s.user.id === first.user.id)).toBe(false);
  });

  it('never suggests a blocked user', () => {
    let state = createSeedState(NOW);
    const first = suggestedUsers(state, '7d', 10, NOW)[0];
    state = toggleBlockUser(state, first.user.id);
    expect(suggestedUsers(state, '7d', 10, NOW).some((s) => s.user.id === first.user.id)).toBe(false);
  });
});

describe('chatterSpikes', () => {
  it('only includes tickers above their baseline', () => {
    let state = createSeedState(NOW);
    state = postMessage(state, { body: 'old $QQQ' }, NOW - 90 * 60_000);
    state = postMessage(state, { body: 'new $QQQ' }, NOW - 60_000);
    state = postMessage(state, { body: 'new $QQQ again' }, NOW - 60_000);
    const spikes = chatterSpikes(state, '1h', 10, NOW);
    expect(spikes.every((t) => (t.spike ?? 0) > 1)).toBe(true);
    expect(spikes.some((t) => t.ticker === 'QQQ')).toBe(true);
  });

  it('sorts by spike size', () => {
    const spikes = chatterSpikes(createSeedState(NOW), '24h', 10, NOW).map((t) => t.spike!);
    expect([...spikes].sort((a, b) => b - a)).toEqual(spikes);
  });
});
