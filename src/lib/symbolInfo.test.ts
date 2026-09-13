import { describe, expect, it } from 'vitest';
import { createSeedState } from './seed';
import { headlinesFor, relatedSymbols, searchSymbols, topContributors } from './symbolInfo';
import { selectStream } from './streams';

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

describe('headlinesFor', () => {
  it('substitutes the ticker into every headline', () => {
    const headlines = headlinesFor('LION');
    expect(headlines).not.toHaveLength(0);
    expect(headlines.every((h) => h.title.includes('$LION'))).toBe(true);
  });

  it('leaves no unsubstituted placeholder', () => {
    expect(headlinesFor('MOON').some((h) => h.title.includes('{T}'))).toBe(false);
  });
});

describe('relatedSymbols', () => {
  it('never includes the symbol itself', () => {
    expect(relatedSymbols(createSeedState(NOW), 'LION').some((s) => s.ticker === 'LION')).toBe(false);
  });

  it('stays within the same asset class', () => {
    const related = relatedSymbols(createSeedState(NOW), 'LION');
    expect(related.every((s) => s.assetClass === 'equity')).toBe(true);
  });

  it('returns nothing for an unknown ticker', () => {
    expect(relatedSymbols(createSeedState(NOW), 'NOPE')).toEqual([]);
  });
});

describe('topContributors', () => {
  it('ranks by message count', () => {
    const state = createSeedState(NOW);
    const messages = selectStream(state, { kind: 'symbol', ticker: 'LION' }, 'all', NOW);
    const counts = topContributors(messages).map((c) => c.messages);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('returns nothing when there are no messages', () => {
    expect(topContributors([])).toEqual([]);
  });

  it('aggregates one author across their messages', () => {
    const state = createSeedState(NOW);
    const messages = selectStream(state, { kind: 'user', userId: 'u_bull' }, 'all', NOW);
    const contributors = topContributors(messages, 5);
    expect(contributors).toHaveLength(1);
    expect(contributors[0].messages).toBe(messages.length);
  });
});

describe('searchSymbols', () => {
  it('returns nothing for an empty query', () => {
    expect(searchSymbols(createSeedState(NOW), '  ')).toEqual([]);
  });

  it('ignores a leading dollar sign', () => {
    expect(searchSymbols(createSeedState(NOW), '$LIO')[0].ticker).toBe('LION');
  });

  it('is case-insensitive', () => {
    expect(searchSymbols(createSeedState(NOW), 'lion')[0].ticker).toBe('LION');
  });

  it('ranks a prefix match above a name match', () => {
    const results = searchSymbols(createSeedState(NOW), 'LI');
    expect(results[0].ticker).toBe('LION');
  });

  it('matches on company name too', () => {
    expect(searchSymbols(createSeedState(NOW), 'Bagholder').some((s) => s.ticker === 'BAGZ')).toBe(true);
  });

  it('honours the limit', () => {
    expect(searchSymbols(createSeedState(NOW), 'A', 2).length).toBeLessThanOrEqual(2);
  });
});
