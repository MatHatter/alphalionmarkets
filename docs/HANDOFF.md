# Handoff prompt — moving the StockTwits parody into the real repo

This work was built in `mathatter/alphalionmarkets`, which turned out to be the
wrong repo. Everything is committed and pushed to the branch
`claude/youthful-darwin-5pxb4f` there, so nothing is lost.

Paste the block below as the opening prompt of a new session started against the
**correct** repo.

---

## The prompt

> I'm continuing work that was started in the wrong repository. The code lives in
> `mathatter/alphalionmarkets` on branch `claude/youthful-darwin-5pxb4f` (4
> commits, ~5,400 lines) and needs to move here.
>
> **First, get the code.** A Claude session can only attach repos from one owner,
> so you probably cannot add the source repo directly — if `add_repo` refuses,
> tell me and I'll bring the files over from my machine, where I have both repos
> cloned. From my machine the move is:
>
> ```
> git remote add parody https://github.com/mathatter/alphalionmarkets.git
> git fetch parody claude/youthful-darwin-5pxb4f
> git checkout -b stocktwits-parody parody/claude/youthful-darwin-5pxb4f
> ```
>
> Then reconcile it with this repo's existing structure rather than dropping it
> at the root — this repo already has a frontend, so the parody app needs to live
> somewhere sensible inside it and share the existing tooling where that makes
> sense. Tell me what you propose before restructuring.
>
> **What the project is.** A parody of StockTwits, built against a feature-parity
> checklist at `docs/FEATURE-PARITY.md`. That file is the spec and the source of
> truth for progress — every feature is a checkbox with an honest status, and it
> gets updated in the same commit as the code that changes it. Read it first.
>
> **Stack.** Vite + React 18 + TypeScript, Vitest. No UI framework, no CSS
> framework, no state library — plain CSS with custom properties, and state is a
> single `State` object mutated by pure functions.
>
> **Architecture.**
> - `src/lib/types.ts` — domain types (`Message`, `User`, `Symbol`, `State`).
> - `src/lib/parse.ts` — cashtag/mention/hashtag/URL tokenizer.
> - `src/lib/store.ts` — every mutation, each a pure function returning new `State`.
> - `src/lib/streams.ts` — stream selectors, filters, sentiment split.
> - `src/lib/series.ts` — deterministic synthetic market data.
> - `src/lib/rankings.ts`, `search.ts`, `symbolInfo.ts` — discovery.
> - `src/lib/seed.ts` — synthetic users, symbols, posts.
> - `src/components/` — Composer, MessageCard, Stream, SymbolPage, PriceChart,
>   VolumeChart, RankingsPage, SearchPage.
>
> **Done: §1 messages, §2 streams, §3 symbols, §4 rankings.** 145 unit tests
> pass; typecheck and production build are clean. Next up is §5 (profiles and the
> social graph), then §6 watchlists, §7 notifications.
>
> **Decisions already made — keep these unless I say otherwise:**
> - Messages cannot be edited, matching the real product. Entities are parsed and
>   frozen at post time.
> - Reply threads are one level deep; a reply to a reply flattens onto the root.
> - Deletes tombstone rather than remove, so replies and reshares keep resolving.
> - Blocking a user also drops the follow edge.
> - All market data is synthetic and deterministic, seeded from the ticker via
>   FNV-1a + mulberry32 so charts don't jitter between renders. There is no market
>   data feed and no licensing exposure.
> - **Chart colour is measured, not chosen by convention.** Bullish/bearish marks
>   use a validated diverging pair (blue ↔ red), NOT finance-convention green/red:
>   green vs red scores a colour-blind ΔE of 3.8 against a floor of 8, and in a
>   stacked bar colour is the only channel carrying the split. Green/red is kept
>   for price *text*, where the sign and the number carry the meaning. Do not
>   "fix" this back to green/red.
> - Charts ship a legend, a table view, and keyboard-reachable readouts, so no
>   value is gated behind hover.
>
> **Two things still outstanding:**
> 1. `public/al-logo.svg` is a PLACEHOLDER wordmark. The real logo is
>    `frontend/public/assets/Logo/AlphaLion_logo_transparent_emerald.png` in this
>    repo — wire that up and delete the placeholder.
> 2. The parody labelling in §10 of the checklist is the highest-risk item in the
>    project and has never had a proper review. A finance-social parody that reads
>    as genuine is where the real legal exposure is. Currently there is a banner,
>    plus parody text in the title, meta description and OG tags — all my own
>    judgement call, not reviewed.
>
> **How I want you to work:** finish each checklist section completely, update
> `docs/FEATURE-PARITY.md` statuses honestly in the same commit (`[~]` for
> partial, with a reason), write unit tests for logic, and actually render the app
> in a browser and look at it before claiming it works. Flag decisions you had to
> make rather than burying them.

---

## Where things stand

| Section | Status |
| --- | --- |
| §1 Messages | Done, minus GIF/video/real upload, quote-reshare UI, share & report menus |
| §2 Streams | Done, minus live "N new messages" prepend, infinite scroll, pull-to-refresh |
| §3 Symbols | Done, minus extended-hours quote and historical sentiment series |
| §4 Rankings & search | Done, minus most-active (needs a traded-volume field) |
| §5–§14 | Untouched |

145 tests. 4 commits on `claude/youthful-darwin-5pxb4f`:

```
21c99f1 Implement §4 rankings and search; replace emoji brand mark
bb1804a Implement §3 symbol pages and charts
9792284 Implement §1 messages and §2 streams
9db05c9 Add StockTwits feature-parity checklist
```
