# Alpha Lion Markets

A **parody** of stock-market social networks. Every account, post, price and
sentiment reading in this project is fictional. Nothing here is investment
advice.

## Running it

```bash
npm install
npm run dev        # dev server
npm test           # unit tests
npm run build      # typecheck + production build
```

## Layout

| Path | What it holds |
| --- | --- |
| `src/lib/types.ts` | Core domain types (`Message`, `User`, `Symbol`, `State`) |
| `src/lib/parse.ts` | Cashtag, mention, hashtag and URL parsing + tokenizer |
| `src/lib/store.ts` | State mutations — all pure, each returns a new `State` |
| `src/lib/streams.ts` | Stream selectors, filters, sentiment split, trending |
| `src/lib/seed.ts` | Synthetic users, symbols and posts |
| `src/components/` | Composer, MessageCard, RichText, Stream |
| `docs/FEATURE-PARITY.md` | The feature checklist this is built against |

## Status

Sections §1 (messages) and §2 (streams) of the parity checklist are the first
implemented slice. See `docs/FEATURE-PARITY.md` for what is done, partial, and
still untouched.

## Data

There is no market data feed. Quotes, volumes and watcher counts are invented
in `src/lib/seed.ts` and are deliberately absurd.
