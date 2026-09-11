import { useMemo, useState } from 'react';
import { createSeedState } from './lib/seed';
import { selectStream, trendingSymbols, type StreamFilter, type StreamId } from './lib/streams';
import {
  deleteMessage,
  postMessage,
  toggleBookmark,
  toggleFollowSymbol,
  toggleLike,
  voteInPoll,
  type DraftInput,
} from './lib/store';
import type { NavTarget } from './lib/nav';
import type { State } from './lib/types';
import { Composer } from './components/Composer';
import { Stream } from './components/Stream';
import { MessageCard } from './components/MessageCard';
import { compactNumber, price, signedPercent } from './lib/format';

const NAV: { target: NavTarget; label: string }[] = [
  { target: { kind: 'home' }, label: 'Home' },
  { target: { kind: 'trending' }, label: 'Trending' },
  { target: { kind: 'popular' }, label: 'Popular' },
  { target: { kind: 'watchlist' }, label: 'Watchlist' },
  { target: { kind: 'bookmarks' }, label: 'Saved' },
];

function streamIdFor(target: NavTarget): StreamId | null {
  switch (target.kind) {
    case 'home':
    case 'trending':
    case 'popular':
    case 'watchlist':
    case 'bookmarks':
      return { kind: target.kind };
    case 'symbol':
      return { kind: 'symbol', ticker: target.ticker };
    case 'hashtag':
      return { kind: 'hashtag', tag: target.tag };
    case 'user':
      return { kind: 'user', userId: target.userId };
    case 'search':
      return { kind: 'search', query: target.query };
    case 'message':
      return null;
  }
}

export function App() {
  const [state, setState] = useState<State>(() => createSeedState());
  const [view, setView] = useState<NavTarget>({ kind: 'home' });
  const [filter, setFilter] = useState<StreamFilter>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  function navigate(target: NavTarget) {
    setView(target);
    setFilter('all');
    setError(null);
    window.scrollTo({ top: 0 });
  }

  function guarded(fn: (s: State) => State) {
    setError(null);
    try {
      setState(fn);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }

  const handlers = {
    onNavigate: navigate,
    onLike: (id: string) => guarded((s) => toggleLike(s, id)),
    onBookmark: (id: string) => guarded((s) => toggleBookmark(s, id)),
    onDelete: (id: string) => guarded((s) => deleteMessage(s, id)),
    onReshare: (id: string) =>
      guarded((s) => postMessage(s, { body: '', resharedId: id })),
    onVote: (id: string, optionId: string) =>
      guarded((s) => voteInPoll(s, id, optionId)),
    onPost: (draft: DraftInput) => guarded((s) => postMessage(s, draft)),
  };

  const messages = useMemo(() => {
    const streamId = streamIdFor(view);
    return streamId ? selectStream(state, streamId, filter) : [];
  }, [state, view, filter]);
  const trending = useMemo(() => trendingSymbols(state), [state]);

  const permalink =
    view.kind === 'message' ? state.messages[view.messageId] : undefined;

  return (
    <div className="app">
      <div className="parody-banner" role="note">
        <strong>PARODY.</strong> Alpha Lion Markets is a work of satire. Every account,
        post, price and sentiment reading here is fictional. Nothing on this site is
        investment advice.
      </div>

      <header className="topbar">
        <button type="button" className="brand" onClick={() => navigate({ kind: 'home' })}>
          🦁 Alpha Lion Markets
        </button>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) navigate({ kind: 'search', query: query.trim() });
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, $tickers, people"
            aria-label="Search"
          />
        </form>
      </header>

      <div className="layout">
        <nav className="sidebar" aria-label="Main navigation">
          {NAV.map((item) => (
            <button
              key={item.label}
              type="button"
              className={view.kind === item.target.kind ? 'on' : undefined}
              aria-current={view.kind === item.target.kind ? 'page' : undefined}
              onClick={() => navigate(item.target)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="main">
          {error && <p className="error banner">{error}</p>}

          {permalink ? (
            <div className="stream">
              <header className="stream-head">
                <button type="button" className="back" onClick={() => navigate({ kind: 'home' })}>
                  ← Back
                </button>
                <h1>Message</h1>
              </header>
              <MessageCard message={permalink} state={state} showReplies {...handlers} />
            </div>
          ) : (
            <>
              {view.kind === 'home' && (
                <Composer onPost={handlers.onPost} />
              )}
              {view.kind === 'symbol' && <SymbolHeader state={state} ticker={view.ticker} onFollow={(t) => guarded((s) => toggleFollowSymbol(s, t))} />}
              <Stream
                title={titleFor(view, state)}
                subtitle={subtitleFor(view)}
                messages={messages}
                state={state}
                filter={filter}
                onFilterChange={setFilter}
                showSentiment={view.kind === 'symbol'}
                emptyMessage={emptyFor(view)}
                handlers={handlers}
              />
            </>
          )}
        </main>

        <aside className="rail" aria-label="Trending tickers">
          <h2>Trending now</h2>
          {trending.length === 0 && <p className="empty">Quiet out there.</p>}
          {trending.map((item) => {
            const symbol = state.symbols[item.ticker];
            const share = item.split.bullishShare;
            return (
              <button
                key={item.ticker}
                type="button"
                className="rail-row"
                onClick={() => navigate({ kind: 'symbol', ticker: item.ticker })}
              >
                <span className="rail-ticker">${item.ticker}</span>
                {symbol && (
                  <span className={`rail-price ${symbol.change >= 0 ? 'up' : 'down'}`}>
                    {price(symbol.last)} {signedPercent(symbol.changePercent)}
                  </span>
                )}
                <span className="rail-meta">
                  {compactNumber(item.mentions)} {item.mentions === 1 ? 'post' : 'posts'}
                  {share !== null && ` · ${Math.round(share * 100)}% bull`}
                </span>
              </button>
            );
          })}
          <p className="rail-note">
            Figures are fictional and generated for satirical purposes.
          </p>
        </aside>
      </div>
    </div>
  );
}

function SymbolHeader({
  state,
  ticker,
  onFollow,
}: {
  state: State;
  ticker: string;
  onFollow: (ticker: string) => void;
}) {
  const symbol = state.symbols[ticker.toUpperCase()];
  const following = state.followedSymbols.includes(ticker.toUpperCase());
  if (!symbol) {
    return (
      <section className="symbol-head unknown">
        <h2>${ticker.toUpperCase()}</h2>
        <p>No such instrument. Someone posted it anyway.</p>
      </section>
    );
  }
  return (
    <section className="symbol-head">
      <div>
        <h2>
          ${symbol.ticker} <span className="symbol-name">{symbol.name}</span>
        </h2>
        <p className={`symbol-price ${symbol.change >= 0 ? 'up' : 'down'}`}>
          {price(symbol.last)}{' '}
          <span>
            {symbol.change >= 0 ? '+' : ''}
            {price(symbol.change)} ({signedPercent(symbol.changePercent)})
          </span>
        </p>
        <p className="symbol-meta">{compactNumber(symbol.watchers)} watching</p>
      </div>
      <button
        type="button"
        className={following ? 'primary on' : 'primary'}
        onClick={() => onFollow(symbol.ticker)}
      >
        {following ? 'Following' : 'Follow'}
      </button>
    </section>
  );
}

function titleFor(view: NavTarget, state: State): string {
  switch (view.kind) {
    case 'home':
      return 'Home';
    case 'trending':
      return 'Trending';
    case 'popular':
      return 'Popular';
    case 'watchlist':
      return 'Watchlist';
    case 'bookmarks':
      return 'Saved';
    case 'symbol':
      return `$${view.ticker.toUpperCase()}`;
    case 'hashtag':
      return `#${view.tag}`;
    case 'user':
      return state.users[view.userId]?.displayName ?? 'Profile';
    case 'search':
      return `Search: ${view.query}`;
    case 'message':
      return 'Message';
  }
}

function subtitleFor(view: NavTarget): string | undefined {
  switch (view.kind) {
    case 'home':
      return 'People and tickers you follow.';
    case 'trending':
      return 'Loud right now, which is not the same as important.';
    case 'popular':
      return 'Most liked, all time.';
    case 'watchlist':
      return 'Everything mentioning a ticker you follow.';
    default:
      return undefined;
  }
}

function emptyFor(view: NavTarget): string {
  switch (view.kind) {
    case 'home':
      return 'Nothing here yet. Follow someone, or post the first take.';
    case 'watchlist':
      return 'No posts about your tickers. Enjoy the silence.';
    case 'bookmarks':
      return 'Nothing saved. You have no regrets to revisit.';
    case 'search':
      return 'No matches. Try a shorter query.';
    default:
      return 'Nothing to show.';
  }
}
