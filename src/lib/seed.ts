/** Synthetic seed data (§13). No market data is fetched; everything is fiction. */
import {
  extractHashtags,
  extractMentions,
  extractSymbols,
  buildLinkPreview,
} from './parse';
import type { Message, Sentiment, State, Symbol, User } from './types';

const HOUR = 3_600_000;

const USERS: Omit<User, 'joinedAt'>[] = [
  {
    id: 'u_viewer',
    handle: 'you',
    displayName: 'You',
    bio: 'Here to research. Definitely not to post.',
    avatarColor: '#c9873f',
    verified: false,
    rank: 'Cub',
  },
  {
    id: 'u_bull',
    handle: 'perma_bull_pete',
    displayName: 'Pete · Never Sold',
    bio: 'Up only. Dips are gifts. Ask me about my cost basis, I dare you.',
    avatarColor: '#2f9e6b',
    verified: true,
    rank: 'Apex Lion',
  },
  {
    id: 'u_doom',
    handle: 'doomer_dana',
    displayName: 'Dana · Cash Gang',
    bio: 'Called 14 of the last 2 crashes. The setup is identical to 2008.',
    avatarColor: '#b8434a',
    verified: false,
    rank: 'Cassandra (Unheard)',
  },
  {
    id: 'u_bag',
    handle: 'still_holding',
    displayName: 'Marcus',
    bio: 'Long-term investor since the stock went down 60%.',
    avatarColor: '#6b6f9e',
    verified: false,
    rank: 'Diamond Grip (Involuntary)',
  },
  {
    id: 'u_quant',
    handle: 'backtested',
    displayName: 'Ravi · Systematic',
    bio: 'The model is proprietary. The drawdown is public.',
    avatarColor: '#3f7fa8',
    verified: true,
    rank: 'Overfit Oracle',
  },
  {
    id: 'u_guru',
    handle: 'alpha_academy',
    displayName: 'ALPHA ACADEMY 🦁',
    bio: 'DM for the signals group. First month free. Not investment advice.',
    avatarColor: '#a8823f',
    verified: true,
    rank: 'Monetizer',
  },
];

const SYMBOLS: Symbol[] = [
  { ticker: 'LION', name: 'Alpha Lion Holdings', assetClass: 'equity', last: 42.18, change: 3.11, changePercent: 7.96, watchers: 128_400 },
  { ticker: 'MOON', name: 'Lunar Logistics Corp', assetClass: 'equity', last: 7.34, change: -1.42, changePercent: -16.21, watchers: 91_255 },
  { ticker: 'BAGZ', name: 'Bagholder Industries', assetClass: 'equity', last: 0.87, change: -0.09, changePercent: -9.38, watchers: 64_012 },
  { ticker: 'SAFE', name: 'Treasury Comfort ETF', assetClass: 'etf', last: 99.91, change: 0.02, changePercent: 0.02, watchers: 4_118 },
  { ticker: 'HYPE', name: 'Narrative Dynamics', assetClass: 'equity', last: 311.05, change: 24.88, changePercent: 8.69, watchers: 203_776 },
  { ticker: 'BTC.X', name: 'Bitcoin', assetClass: 'crypto', last: 71_204.5, change: -2_881.25, changePercent: -3.89, watchers: 512_339 },
];

interface SeedPost {
  author: string;
  body: string;
  sentiment?: Sentiment;
  hoursAgo: number;
  likes: number;
  images?: string[];
  poll?: { options: string[]; votes: number[]; endsInHours: number };
  replies?: Omit<SeedPost, 'replies'>[];
}

const POSTS: SeedPost[] = [
  {
    author: 'u_bull',
    body: '$LION breaking out of a 3-day base on no volume. This is the exact pattern that preceded the last move. I am adding here and I will add again 8% lower, which will not happen. #breakout',
    sentiment: 'bullish',
    hoursAgo: 0.4,
    likes: 214,
    replies: [
      { author: 'u_doom', body: '@perma_bull_pete a 3-day base is not a base, it is a Tuesday.', sentiment: 'bearish', hoursAgo: 0.3, likes: 88 },
      { author: 'u_bag', body: 'said the same about $BAGZ at 14. still holding. still long term.', hoursAgo: 0.2, likes: 41 },
    ],
  },
  {
    author: 'u_doom',
    body: 'Nobody is talking about this: $HYPE now trades at 94x sales while insiders have sold every single week since March. The music stops eventually. I have been early before and I will be early again.',
    sentiment: 'bearish',
    hoursAgo: 1.2,
    likes: 176,
    replies: [
      { author: 'u_bull', body: 'been hearing this since $HYPE was 80. it is 311.', sentiment: 'bullish', hoursAgo: 1.0, likes: 133 },
    ],
  },
  {
    author: 'u_quant',
    body: 'Ran the backtest on the $LION setup across 4,000 instances since 1997. Win rate 51.2%, average hold 6 days, Sharpe 0.31 before costs and negative after them. Posting anyway because the equity curve looks incredible if you start it in 2019. https://example.com/alpha-lion-backtest',
    hoursAgo: 2.1,
    likes: 302,
    images: ['equity-curve'],
  },
  {
    author: 'u_guru',
    body: 'My private group called $HYPE at 240 🦁 Screenshots below. Spots closing at midnight. This is education only and NOT investment advice and past performance does not guarantee future results and I am legally required to keep typing.',
    sentiment: 'bullish',
    hoursAgo: 2.6,
    likes: 58,
    images: ['signal-screenshot', 'testimonial'],
    replies: [
      { author: 'u_quant', body: 'The screenshot is cropped exactly where the drawdown starts.', hoursAgo: 2.4, likes: 267 },
    ],
  },
  {
    author: 'u_bag',
    body: 'Four years in $BAGZ today. Down 94%. I have stopped checking, which technically makes me a long-term investor. My thesis has not changed because I never wrote one down.',
    hoursAgo: 3.4,
    likes: 441,
  },
  {
    author: 'u_bull',
    body: '$MOON down 16% on the guidance cut. Market is being irrational. The guidance cut is actually bullish because it lowers the bar for next quarter, which is how numbers work.',
    sentiment: 'bullish',
    hoursAgo: 4.2,
    likes: 97,
  },
  {
    author: 'u_quant',
    body: 'Poll: your position is down 30%. What is the actual plan?',
    hoursAgo: 5.1,
    likes: 129,
    poll: {
      options: ['Average down', 'Hold and stop looking', 'Cut it', 'Post about it instead'],
      votes: [412, 688, 96, 1_204],
      endsInHours: 19,
    },
  },
  {
    author: 'u_doom',
    body: 'Rotated everything into $SAFE. Yes it yields nothing. Yes I will miss the rally. I sleep like a stone and my hands have stopped shaking. #cash',
    sentiment: 'bearish',
    hoursAgo: 7.8,
    likes: 203,
  },
  {
    author: 'u_bull',
    body: '$BTC.X dipping under 72k is just leverage flushing out. Fundamentals unchanged. The fundamentals are that it goes up. #crypto',
    sentiment: 'bullish',
    hoursAgo: 11.5,
    likes: 312,
  },
  {
    author: 'u_bag',
    body: 'Sold $LION at 38 to buy $MOON at 9. Please do the opposite of whatever I post. I am a reliable signal and I am at peace with it.',
    sentiment: 'bearish',
    hoursAgo: 26,
    likes: 587,
  },
];

export function createSeedState(now = Date.now()): State {
  const users: Record<string, User> = {};
  for (const user of USERS) {
    users[user.id] = { ...user, joinedAt: now - 400 * 24 * HOUR };
  }

  const symbols: Record<string, Symbol> = {};
  for (const symbol of SYMBOLS) symbols[symbol.ticker] = symbol;

  const messages: Record<string, Message> = {};
  let seq = 0;

  const build = (post: SeedPost, parentId?: string): Message => {
    seq += 1;
    const id = `seed_${seq}`;
    const createdAt = now - post.hoursAgo * HOUR;
    const likers = USERS.map((u) => u.id).slice(0, Math.min(post.likes, USERS.length));
    return {
      id,
      authorId: post.author,
      body: post.body,
      createdAt,
      sentiment: post.sentiment,
      symbols: extractSymbols(post.body),
      hashtags: extractHashtags(post.body),
      mentions: extractMentions(post.body),
      parentId,
      poll: post.poll
        ? {
            options: post.poll.options.map((label, i) => ({
              id: `${id}_opt_${i}`,
              label,
              votes: post.poll!.votes[i] ?? 0,
            })),
            endsAt: now + post.poll.endsInHours * HOUR,
          }
        : undefined,
      linkPreview: buildLinkPreview(post.body),
      images: post.images ?? [],
      // The viewer's own like is tracked in likedBy by toggleLike.
      likedBy: likers.filter((u) => u !== 'u_viewer'),
      seedLikes: post.likes,
      bookmarkedBy: [],
      deleted: false,
    };
  };

  for (const post of POSTS) {
    const message = build(post);
    messages[message.id] = message;
    for (const reply of post.replies ?? []) {
      const child = build(reply, message.id);
      messages[child.id] = child;
    }
  }

  return {
    users,
    messages,
    symbols,
    viewerId: 'u_viewer',
    followedUsers: ['u_bull', 'u_quant', 'u_bag'],
    followedSymbols: ['LION', 'HYPE', 'BAGZ'],
    mutedUsers: [],
    blockedUsers: [],
  };
}
