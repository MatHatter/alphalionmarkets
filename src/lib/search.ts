/** Global search across messages, symbols, users and hashtags (§4). */
import type { Message, State, Symbol, User } from './types';
import { likeCount } from './streams';
import { searchSymbols } from './symbolInfo';

export type SearchScope = 'top' | 'messages' | 'symbols' | 'people' | 'hashtags';
export type SearchSort = 'recent' | 'popular';

export const SCOPES: { id: SearchScope; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'messages', label: 'Messages' },
  { id: 'symbols', label: 'Symbols' },
  { id: 'people', label: 'People' },
  { id: 'hashtags', label: 'Hashtags' },
];

export interface SearchResults {
  messages: Message[];
  symbols: Symbol[];
  users: User[];
  hashtags: { tag: string; uses: number }[];
  total: number;
}

function matchesMessage(state: State, message: Message, q: string): boolean {
  const author = state.users[message.authorId];
  return (
    message.body.toLowerCase().includes(q) ||
    message.symbols.some((s) => s.toLowerCase().includes(q)) ||
    message.hashtags.some((h) => h.includes(q)) ||
    (author
      ? author.handle.toLowerCase().includes(q) ||
        author.displayName.toLowerCase().includes(q)
      : false)
  );
}

function searchUsers(state: State, q: string): User[] {
  return Object.values(state.users)
    .filter(
      (u) =>
        !state.blockedUsers.includes(u.id) &&
        (u.handle.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.bio.toLowerCase().includes(q)),
    )
    .sort((a, b) => a.handle.localeCompare(b.handle));
}

function searchHashtags(state: State, q: string): { tag: string; uses: number }[] {
  const counts = new Map<string, number>();
  for (const message of Object.values(state.messages)) {
    if (message.deleted) continue;
    for (const tag of message.hashtags) {
      if (tag.includes(q)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, uses]) => ({ tag, uses }))
    .sort((a, b) => b.uses - a.uses || a.tag.localeCompare(b.tag));
}

/**
 * A search always computes every category, so the scope tabs can show counts
 * without re-running the query. `scope` only narrows what a caller renders.
 */
export function search(
  state: State,
  query: string,
  sort: SearchSort = 'recent',
): SearchResults {
  const q = query.trim().toLowerCase().replace(/^[$#@]/, '');
  if (!q) {
    return { messages: [], symbols: [], users: [], hashtags: [], total: 0 };
  }

  const messages = Object.values(state.messages)
    .filter(
      (m) =>
        !m.deleted &&
        !state.blockedUsers.includes(m.authorId) &&
        !state.mutedUsers.includes(m.authorId) &&
        matchesMessage(state, m, q),
    )
    .sort((a, b) =>
      sort === 'popular' ? likeCount(b) - likeCount(a) : b.createdAt - a.createdAt,
    );

  const symbols = searchSymbols(state, q, 20);
  const users = searchUsers(state, q);
  const hashtags = searchHashtags(state, q);

  return {
    messages,
    symbols,
    users,
    hashtags,
    total: messages.length + symbols.length + users.length + hashtags.length,
  };
}
