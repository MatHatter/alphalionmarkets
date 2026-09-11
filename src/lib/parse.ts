/** Body parsing: cashtags, mentions, hashtags, URLs. See §1. */
import type { LinkPreview } from './types';

/**
 * A ticker is 1-5 letters, optionally suffixed for crypto pairs ($BTC.X) or
 * share classes ($BRK.B). Matched only when not preceded by a word character,
 * so "US$AAPL" and mid-word dollar signs do not become links.
 */
const CASHTAG = /(?<![\w$])\$([A-Za-z]{1,5}(?:\.[A-Za-z]{1,2})?)\b/g;
const MENTION = /(?<![\w@])@([A-Za-z0-9_]{1,20})\b/g;
const HASHTAG = /(?<![\w#])#([A-Za-z][A-Za-z0-9_]{0,30})\b/g;
// Named URL_RE, not URL: a module-level `URL` would shadow the global
// URL constructor used by buildLinkPreview.
const URL_RE = /https?:\/\/[^\s<>"']+/g;

/** Strip trailing punctuation a writer is more likely to have meant as prose. */
function trimUrl(url: string): string {
  return url.replace(/[.,;:!?)\]]+$/, '');
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function extractSymbols(body: string): string[] {
  return unique([...body.matchAll(CASHTAG)].map((m) => m[1].toUpperCase()));
}

export function extractMentions(body: string): string[] {
  return unique([...body.matchAll(MENTION)].map((m) => m[1].toLowerCase()));
}

export function extractHashtags(body: string): string[] {
  return unique([...body.matchAll(HASHTAG)].map((m) => m[1].toLowerCase()));
}

export function extractUrls(body: string): string[] {
  return unique([...body.matchAll(URL_RE)].map((m) => trimUrl(m[0])));
}

export type Token =
  | { kind: 'text'; value: string }
  | { kind: 'cashtag'; value: string; ticker: string }
  | { kind: 'mention'; value: string; handle: string }
  | { kind: 'hashtag'; value: string; tag: string }
  | { kind: 'url'; value: string; href: string };

/**
 * Tokenize a body for rendering. Returns tokens in source order with no gaps,
 * so joining every `value` reproduces the input exactly.
 */
export function tokenize(body: string): Token[] {
  type Match = { start: number; end: number; token: Token };
  const matches: Match[] = [];

  for (const m of body.matchAll(CASHTAG)) {
    matches.push({
      start: m.index!,
      end: m.index! + m[0].length,
      token: { kind: 'cashtag', value: m[0], ticker: m[1].toUpperCase() },
    });
  }
  for (const m of body.matchAll(MENTION)) {
    matches.push({
      start: m.index!,
      end: m.index! + m[0].length,
      token: { kind: 'mention', value: m[0], handle: m[1].toLowerCase() },
    });
  }
  for (const m of body.matchAll(HASHTAG)) {
    matches.push({
      start: m.index!,
      end: m.index! + m[0].length,
      token: { kind: 'hashtag', value: m[0], tag: m[1].toLowerCase() },
    });
  }
  for (const m of body.matchAll(URL_RE)) {
    const href = trimUrl(m[0]);
    matches.push({
      start: m.index!,
      end: m.index! + href.length,
      token: { kind: 'url', value: href, href },
    });
  }

  matches.sort((a, b) => a.start - b.start);

  const tokens: Token[] = [];
  let cursor = 0;
  for (const match of matches) {
    // URLs can contain '#' and '@', so drop any match that starts inside an
    // entity we have already consumed.
    if (match.start < cursor) continue;
    if (match.start > cursor) {
      tokens.push({ kind: 'text', value: body.slice(cursor, match.start) });
    }
    tokens.push(match.token);
    cursor = match.end;
  }
  if (cursor < body.length) {
    tokens.push({ kind: 'text', value: body.slice(cursor) });
  }
  return tokens;
}

/**
 * Build a preview card for the first URL in a body. Synthetic: there is no
 * network fetch, the copy is derived from the link itself (§13).
 */
export function buildLinkPreview(body: string): LinkPreview | undefined {
  const [url] = extractUrls(body);
  if (!url) return undefined;
  let domain: string;
  try {
    domain = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
  return {
    url,
    domain,
    title: `${domain} — the article nobody in the replies opened`,
    description:
      'Shared without being read. The headline was enough to confirm what everyone already believed.',
  };
}
