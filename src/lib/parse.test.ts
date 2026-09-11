import { describe, expect, it } from 'vitest';
import {
  buildLinkPreview,
  extractHashtags,
  extractMentions,
  extractSymbols,
  extractUrls,
  tokenize,
} from './parse';

describe('extractSymbols', () => {
  it('finds cashtags and uppercases them', () => {
    expect(extractSymbols('long $aapl and $MSFT')).toEqual(['AAPL', 'MSFT']);
  });

  it('supports suffixed tickers', () => {
    expect(extractSymbols('$BRK.B and $BTC.X')).toEqual(['BRK.B', 'BTC.X']);
  });

  it('deduplicates repeated mentions of one ticker', () => {
    expect(extractSymbols('$LION $lion $LION')).toEqual(['LION']);
  });

  it('ignores dollar amounts and mid-word dollar signs', () => {
    expect(extractSymbols('paid $500 for it, US$AAPL quote')).toEqual([]);
  });

  it('rejects tickers longer than five letters', () => {
    expect(extractSymbols('$TOOLONGX')).toEqual([]);
  });
});

describe('extractMentions and extractHashtags', () => {
  it('extracts handles lowercased', () => {
    expect(extractMentions('cc @Pete and @dana_x')).toEqual(['pete', 'dana_x']);
  });

  it('extracts hashtags lowercased', () => {
    expect(extractHashtags('#Breakout #earnings')).toEqual(['breakout', 'earnings']);
  });

  it('ignores hashtags that start with a digit', () => {
    expect(extractHashtags('#2024 #q4')).toEqual(['q4']);
  });

  it('does not treat an email as a mention', () => {
    expect(extractMentions('mail me@example.com')).toEqual([]);
  });
});

describe('extractUrls', () => {
  it('strips trailing sentence punctuation', () => {
    expect(extractUrls('see https://example.com/a.')).toEqual(['https://example.com/a']);
  });
});

describe('tokenize', () => {
  it('round-trips the original body', () => {
    const body = 'long $LION per @pete #breakout https://example.com/x rest';
    expect(tokenize(body).map((t) => t.value).join('')).toBe(body);
  });

  it('classifies each entity', () => {
    const kinds = tokenize('$LION @pete #hot https://x.com/a')
      .map((t) => t.kind)
      .filter((k) => k !== 'text');
    expect(kinds).toEqual(['cashtag', 'mention', 'hashtag', 'url']);
  });

  it('does not split entities out of a URL fragment', () => {
    const tokens = tokenize('https://example.com/p#anchor');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe('url');
  });
});

describe('buildLinkPreview', () => {
  it('derives a preview from the first url', () => {
    expect(buildLinkPreview('read https://www.example.com/post')?.domain).toBe('example.com');
  });

  it('returns undefined when there is no url', () => {
    expect(buildLinkPreview('no links here')).toBeUndefined();
  });
});
