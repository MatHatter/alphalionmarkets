/** Core domain types. See docs/FEATURE-PARITY.md §1. */

/**
 * Sentiment is the signature feature of the product being parodied: optional,
 * at most one per message, and immutable once posted.
 */
export type Sentiment = 'bullish' | 'bearish';

export interface User {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarColor: string;
  verified: boolean;
  /** Satirical rank badge (§14). */
  rank: string;
  joinedAt: number;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Poll {
  options: PollOption[];
  /** Epoch ms after which the poll is closed. */
  endsAt: number;
  /** Option id this viewer picked, if any. One vote per user. */
  votedOptionId?: string;
}

export interface LinkPreview {
  url: string;
  domain: string;
  title: string;
  description: string;
}

export interface Message {
  id: string;
  authorId: string;
  body: string;
  createdAt: number;
  sentiment?: Sentiment;
  /** Uppercase symbols parsed out of the body at post time. */
  symbols: string[];
  /** Lowercase hashtags parsed out of the body at post time. */
  hashtags: string[];
  /** Handles mentioned in the body at post time. */
  mentions: string[];
  /** Set when this message is a reply to another. Threads are one level deep. */
  parentId?: string;
  /** Set when this message reshares another. A quote reshare also has a body. */
  resharedId?: string;
  poll?: Poll;
  linkPreview?: LinkPreview;
  images: string[];
  likedBy: string[];
  /**
   * Display-only like count from seed data, where the headline number is far
   * larger than the cast of fictional users. Real likes are counted from
   * likedBy; this is added on top for presentation.
   */
  seedLikes?: number;
  bookmarkedBy: string[];
  deleted: boolean;
}

export interface Symbol {
  ticker: string;
  name: string;
  assetClass: 'equity' | 'etf' | 'crypto' | 'index';
  last: number;
  change: number;
  changePercent: number;
  watchers: number;
}

export interface State {
  users: Record<string, User>;
  messages: Record<string, Message>;
  symbols: Record<string, Symbol>;
  /** Id of the signed-in user. */
  viewerId: string;
  followedUsers: string[];
  followedSymbols: string[];
  mutedUsers: string[];
  blockedUsers: string[];
}

export const MAX_MESSAGE_LENGTH = 1000;
