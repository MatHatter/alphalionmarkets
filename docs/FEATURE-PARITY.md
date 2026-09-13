# StockTwits Feature-Parity Checklist

Build spec for the Alpha Lion Markets parody. This is a *feature inventory* of
StockTwits as of 2026, written as a gap checklist so we can tick items off and
see what is genuinely missing rather than guessing.

Legend: `[ ]` not started · `[~]` partial · `[x]` done · `[-]` deliberately out of scope

Status column is the source of truth for "are we missing anything." Update it in
the same commit as the code that changes it.

---

## 1. Core content object: the message

The atomic unit. Everything else in the product is a view over it.

- [x] Post composer, 1000-char limit (StockTwits raised from 140; parody should match the modern limit)
- [x] Cashtag parsing — `$AAPL` becomes a link to the symbol stream
- [x] Mention parsing — `@username` links to profile, generates a notification
- [x] Hashtag parsing — `#earnings` links to a tag stream
- [x] Bare URL autolinking + link preview card (title, description, image, domain)
- [x] **Sentiment tag: Bullish / Bearish / none** — the single most distinctive StockTwits feature. Must be optional, must be one-per-message, must be immutable after post.
- [~] Image attachment (single + multi-image grid) — placeholder tiles, no real upload
- [ ] GIF picker
- [ ] Video attachment w/ inline player
- [~] Chart attachment / drawing tool — attach button adds a placeholder; no annotator
- [x] Poll (2–4 options, duration, live result bars, one vote per user)
- [x] Reply (threaded, one level deep in StockTwits' model — confirm before deepening)
- [~] Reshare / repost with optional quote — bare reshare works, quote UI not wired
- [x] Like
- [x] Bookmark / save to a private list
- [ ] Share (copy link, share to X/Reddit, embed code)
- [x] Delete own message
- [~] Edit window? — **Decided: no edits**, matching the real product. Entities are parsed
      and frozen at post time. The composer says so as a joke.
- [ ] Report message (spam, abuse, pump-and-dump)
- [~] Mute / block author — enforced in every stream selector; no overflow-menu UI yet
- [x] Permalink page for a single message with its replies
- [x] Relative timestamps ("3m", "2h", "Sep 4") with absolute on hover
- [x] "Official"/verified author badge
- [x] Message character counter w/ over-limit state

## 2. Streams (the feeds)

- [x] **Home / Following stream** — messages from followed users and followed symbols
- [x] **Trending stream** — algorithmically hot messages
- [x] **Symbol stream** — all messages for one ticker, the product's center of gravity
- [x] Symbol stream filter tabs: All / Top / Bullish / Bearish / Links / Charts
- [x] **Popular / "Suggested"** stream
- [x] **Watchlist stream** — merged feed of every symbol on your watchlist
- [x] Hashtag stream
- [x] Search-results stream
- [ ] Infinite scroll + "N new messages" live-prepend pill at top
- [ ] Real-time push of new messages into an open stream (websocket or poll)
- [ ] Pull-to-refresh (mobile)
- [x] Empty states for every stream
- [x] Loading skeletons for every stream

## 3. Symbols / tickers

- [x] Symbol page: price, change, % change, colored up/down
- [x] OHLC, volume, market cap, day range, 52-week range
- [x] Price chart w/ range selector (1D 5D 1M 3M 6M 1Y 5Y MAX)
- [~] Pre-market / after-hours session badge — badge derived from the clock; no separate extended-hours quote
- [x] **Sentiment gauge** — bullish vs bearish share of recent messages, the signature StockTwits widget
- [x] **Message volume chart** — unusual-chatter detection over time
- [~] Sentiment shown as a historical series — volume chart is bucketed over time and split by sentiment; the gauge itself is still a point-in-time number
- [x] Follow / unfollow a symbol
- [~] Add to watchlist from symbol page — Follow doubles as this; no separate multi-watchlist picker (§6)
- [x] Watchers count ("12,431 watching")
- [x] News headlines for the symbol
- [x] Earnings date + estimates
- [x] Key stats / fundamentals panel
- [x] Related / similar symbols
- [x] Top contributors for this symbol
- [x] Symbol autocomplete typeahead (search-as-you-type on `$`)
- [x] Asset classes — equities, ETFs, crypto and indices modelled; futures and forex unused
- [x] Handle delisted / invalid ticker gracefully

## 4. Rankings and discovery

- [x] **Trending tickers** list (most-mentioned right now)
- [x] **Most-watched** tickers
- [~] **Top gainers / losers / most active** — gainers, losers and most-watched ship; most-active needs a traded-volume field
- [x] **Unusual volume / chatter spike** — cross-market list, scored against each ticker's own prior window
- [x] Sentiment leaderboard (most bullish / most bearish tickers)
- [x] Trending hashtags
- [x] Suggested users to follow
- [x] Rankings page with timeframe toggle (1h / 24h / 7d)
- [x] Global search across messages, symbols, users, hashtags
- [x] Search filters + sort

## 5. Users, profiles, social graph

- [ ] Profile page: avatar, display name, @handle, bio, join date, website, location
- [ ] Follower / following counts + their list pages
- [ ] Follow / unfollow a user
- [ ] Profile tabs: Messages / Replies / Likes / Watchlist
- [ ] **Ideas / performance stats** — StockTwits shows per-user sentiment record
- [ ] User's watchlist visible on profile (public/private toggle)
- [ ] Verified / "Official Account" badges
- [ ] **Rank badges** — StockTwits has a tiered contributor system worth parodying hard
- [ ] Block user
- [ ] Mute user
- [ ] Own-profile edit
- [ ] Avatar + banner upload

## 6. Watchlists

- [ ] Create / rename / delete multiple watchlists
- [ ] Add / remove symbols
- [ ] Reorder (drag)
- [ ] Watchlist table: last, change, % change, volume, sentiment
- [ ] Sort by any column
- [ ] Sparkline per row
- [ ] Import / export (CSV)
- [ ] Public vs private watchlist
- [ ] Watchlist-wide message stream (see §2)
- [ ] Per-symbol alerts from watchlist

## 7. Notifications & alerts

- [ ] Notification center, unread badge
- [ ] Types: mention, reply, like, reshare, new follower, poll ended
- [ ] Price alerts (above / below / % move)
- [ ] Symbol-chatter alerts (unusual mention volume)
- [ ] Earnings-date reminders
- [ ] Mark all read
- [ ] Per-type notification settings
- [ ] Email digest
- [ ] Web push / mobile push
- [ ] Real-time delivery into an open session

## 8. Rooms / live

- [ ] **Rooms** — StockTwits' live audio/chat rooms
- [ ] Room list + join
- [ ] Live chat messages within a room
- [ ] Speaker vs listener roles, raise hand
- [ ] Scheduled rooms + reminders
- [ ] Room recordings / replay
- [ ] Live market-hours indicator (pre / open / after / closed) in the global chrome

## 9. Accounts & auth

- [ ] Sign up (email + password)
- [ ] OAuth sign-in (Google / Apple / X)
- [ ] Email verification
- [ ] Password reset
- [ ] Sessions / logout everywhere
- [ ] 2FA
- [ ] Account settings, delete account
- [ ] Privacy settings
- [ ] Onboarding: pick interests → pick symbols → pick users to follow
- [ ] Logged-out browsing with gated actions + sign-in wall

## 10. Moderation, safety, compliance

- [ ] Report message / user
- [ ] Block & mute enforcement across every stream
- [ ] Spam / pump-and-dump heuristics
- [ ] Rate limiting on post, follow, like
- [ ] Shadowban / suspended-account states
- [ ] **"Not investment advice" disclaimer** — mandatory in the real product, and prime parody surface
- [ ] Terms / privacy / disclosures pages
- [ ] Age gate?
- [ ] Clear "THIS IS A PARODY" labelling — legally the most important item on this list; must be unmissable in the header, footer, page title, meta tags, and OG cards

## 11. Monetization surfaces (parody targets)

- [ ] Ads / sponsored messages in-stream
- [ ] **Premium tier** (StockTwits Edge-style) with gated features
- [ ] Upsell modals and paywall interstitials
- [ ] Sponsored "partner" symbol pages
- [ ] Affiliate broker links / "trade this now" buttons

## 12. Platform & chrome

- [ ] Responsive layout (mobile / tablet / desktop three-column)
- [ ] Dark mode + light mode, respecting system preference
- [ ] Global nav: home, rankings, watchlist, notifications, profile, compose
- [ ] Ticker tape across the top
- [ ] Keyboard shortcuts
- [ ] SEO: titles, meta descriptions, OG/Twitter cards per message & symbol
- [ ] Embeddable message widget
- [ ] Public API surface? (StockTwits has one)
- [ ] RSS feeds per symbol
- [ ] Accessibility: keyboard nav, focus states, ARIA, contrast, reduced motion
- [ ] i18n scaffolding
- [ ] 404 / 500 / offline pages
- [ ] Analytics

## 13. Data layer

- [ ] Quote source (real, delayed, or fully synthetic — decide and document)
- [ ] Symbol master list / search index
- [ ] Sentiment aggregation job
- [ ] Trending computation job
- [ ] Caching strategy for quotes
- [ ] Seed / fixture data so the app looks alive on first run
- [ ] Bot accounts generating ambient parody chatter

## 14. Parody-specific (things StockTwits does *not* have)

These are ours, and are the reason the project exists. Parity is the floor, not the ceiling.

- [ ] House voice / tone guide for generated content
- [ ] Satirical badge and rank names
- [ ] Running gags: the perma-bull, the doomer, the "this is fine" bagholder
- [ ] Fake premium tier that upsells absurdly
- [ ] Loss-porn leaderboard
- [ ] Conviction meter that is inversely correlated with accuracy

---

## How to use this document

1. Before claiming parity, walk §1–§13 top to bottom and set each status honestly.
2. Anything marked `[-]` needs a one-line reason next to it.
3. A section is only "done" when every row in it is `[x]` or `[-]`.
4. Re-run this audit after each milestone; the list is the review, not a one-off.

## Current status

**§1 Messages, §2 Streams, §3 Symbols and §4 Rankings are implemented.** Vite + React +
TypeScript, with a pure-function state layer (`src/lib/store.ts`) and stream
selectors (`src/lib/streams.ts`) covered by 145 unit tests.

Working: composer with the 1000-char limit and the bull/bear sentiment tag,
entity parsing and rendering, polls, replies (one level deep), likes,
bookmarks, delete, bare reshare, link previews, the seven streams with the six
filter tabs, the sentiment gauge, and the trending-tickers rail.

§3 adds the symbol page: price chart with the full range selector and a
crosshair readout, key statistics, sentiment gauge, message-volume chart split
by sentiment with an unusual-chatter badge, top contributors, news, related
symbols, and a ticker typeahead in the search bar.

§4 adds the rankings page (nine boards on a 1h/24h/7d toggle) and global
search across messages, symbols, people and hashtags with scope tabs and a
sort control. "Unusual chatter" scores each ticker against its own previous
window, so it surfaces what is unusual for that ticker rather than what is
simply loud.

Not yet in §1/§2: GIF picker, video, real image upload, quote-reshare UI, share
and report menus, live "N new messages" prepend, infinite scroll,
pull-to-refresh. Sections §5–§14 are untouched.

**Chart colour note.** Bullish/bearish *marks* use a validated diverging pair
(blue ↔ red), not the finance-convention green/red. Measured with the dataviz
validator, green vs red scores a colour-blind ΔE of 3.8 — far below the ΔE 8
floor — and in a stacked bar colour is the only channel carrying the split.
Green/red is retained for price text, where the sign and the number carry the
meaning and colour only reinforces it. Charts also ship a legend, a table view,
and keyboard-reachable per-bar readouts.

All data is synthetic (`src/lib/seed.ts`); no market data is fetched. This
settles the §13 open question in favour of fully fictional quotes.

**Brand mark.** `public/al-logo.svg` is a **placeholder** "AL" wordmark, not the
real logo — no logo file has ever been committed to this repository. Drop the
real asset in at that path, keeping the filename and the 64×64 viewBox, and no
code changes.
