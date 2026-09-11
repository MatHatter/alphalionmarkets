/** Navigation targets. Kept separate so components can import the type alone. */
export type NavTarget =
  | { kind: 'home' }
  | { kind: 'trending' }
  | { kind: 'popular' }
  | { kind: 'watchlist' }
  | { kind: 'bookmarks' }
  | { kind: 'symbol'; ticker: string }
  | { kind: 'hashtag'; tag: string }
  | { kind: 'user'; userId: string }
  | { kind: 'search'; query: string }
  | { kind: 'message'; messageId: string };
