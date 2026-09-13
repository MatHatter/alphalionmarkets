import { describe, expect, it } from 'vitest';
import { createSeedState } from './seed';
import { search } from './search';
import { toggleBlockUser, toggleMuteUser } from './store';
import { likeCount } from './streams';

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

describe('search', () => {
  it('returns an empty result set for a blank query', () => {
    const results = search(createSeedState(NOW), '   ');
    expect(results.total).toBe(0);
    expect(results.messages).toEqual([]);
  });

  it('strips a leading sigil so $LION and LION agree', () => {
    const state = createSeedState(NOW);
    expect(search(state, '$lion').total).toBe(search(state, 'lion').total);
  });

  it('finds messages by body text', () => {
    expect(search(createSeedState(NOW), 'backtest').messages.length).toBeGreaterThan(0);
  });

  it('finds a symbol by ticker and by company name', () => {
    const state = createSeedState(NOW);
    expect(search(state, 'BAGZ').symbols.some((s) => s.ticker === 'BAGZ')).toBe(true);
    expect(search(state, 'Bagholder').symbols.some((s) => s.ticker === 'BAGZ')).toBe(true);
  });

  it('finds people by handle, display name and bio', () => {
    const state = createSeedState(NOW);
    expect(search(state, 'perma_bull').users.some((u) => u.id === 'u_bull')).toBe(true);
    expect(search(state, 'Cash Gang').users.some((u) => u.id === 'u_doom')).toBe(true);
    expect(search(state, 'proprietary').users.some((u) => u.id === 'u_quant')).toBe(true);
  });

  it('finds hashtags with their use counts', () => {
    const hashtags = search(createSeedState(NOW), 'breakout').hashtags;
    expect(hashtags.some((h) => h.tag === 'breakout' && h.uses > 0)).toBe(true);
  });

  it('sorts messages by recency or by likes', () => {
    const state = createSeedState(NOW);
    const recent = search(state, 'the', 'recent').messages.map((m) => m.createdAt);
    expect([...recent].sort((a, b) => b - a)).toEqual(recent);

    const popular = search(state, 'the', 'popular').messages.map(likeCount);
    expect([...popular].sort((a, b) => b - a)).toEqual(popular);
  });

  it('excludes muted and blocked authors from message results', () => {
    let state = createSeedState(NOW);
    state = toggleMuteUser(state, 'u_bull');
    const authors = search(state, 'the').messages.map((m) => m.authorId);
    expect(authors).not.toContain('u_bull');

    state = toggleBlockUser(state, 'u_doom');
    expect(search(state, 'doomer').users.some((u) => u.id === 'u_doom')).toBe(false);
  });

  it('totals every category', () => {
    const results = search(createSeedState(NOW), 'lion');
    expect(results.total).toBe(
      results.messages.length +
        results.symbols.length +
        results.users.length +
        results.hashtags.length,
    );
  });
});
