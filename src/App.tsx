import { useMemo, useState } from 'react';
import { createSeedState } from './lib/seed';
import { selectStream, trendingSymbols, type StreamFilter, type StreamId } from './lib/streams';
import {
  deleteMessage,
  postMessage,
  toggleBookmark,
  toggleFollowSymbol,
  toggleFollowUser,
  toggleLike,
  voteInPoll,
  type DraftInput,
} from './lib/store';
import type { NavTarget } from './lib/nav';
import type { State } from './lib/types';
import { Composer } from './components/Composer';
import { Stream } from './components/Stream';
import { MessageCard } from './components/MessageCard';
import { pluralize, price, signedPercent } from './lib/format';
import { SymbolPage } from './components/SymbolPage';
import { RankingsPage } from './components/RankingsPage';
import { SearchPage } from './components/SearchPage';
import { Logo } from './components/Logo';
import { searchSymbols } from './lib/symbolInfo';

const NAV: { target: NavTarget; label: string }[] = [
  { target: { kind: 'home' }, label: 'Home' },
  { target: { kind: 'trending' }, label: 'Trending' },
  { target: { kind: 'rankings' }, label: 'Rankings' },
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
    case 'rankings':
      return null;
  }
}

export function App() {
  const [state, setState] = useState<State>(() => createSeedState());
  const [view, setView] = useState<NavTarget>({ kind: 'home' });
  const [filter, setFilter] = useState<StreamFilter>('all');
  const [query, setQuery] = useState('');
  // Suppressed after a submit or a pick, so the dropdown does not sit on top of
  // the results for the query the reader just ran.
  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
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
  const suggestions = useMemo(() => searchSymbols(state, query), [state, query]);

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
          <Logo />
          <span>Alpha Lion Markets</span>
        </button>
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setTypeaheadOpen(false);
            if (query.trim()) navigate({ kind: 'search', query: query.trim() });
          }}
        >
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setTypeaheadOpen(true);
            }}
            onFocus={() => setTypeaheadOpen(true)}
            onBlur={() => setTypeaheadOpen(false)}
            placeholder="Search messages, $tickers, people"
            aria-label="Search"
            aria-expanded={typeaheadOpen && suggestions.length > 0}
            aria-controls="symbol-suggestions"
            autoComplete="off"
          />
          {typeaheadOpen && suggestions.length > 0 && (
            <ul className="typeahead" id="symbol-suggestions" role="listbox">
              {suggestions.map((symbol) => (
                <li key={symbol.ticker} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQuery('');
                      setTypeaheadOpen(false);
                      navigate({ kind: 'symbol', ticker: symbol.ticker });
                    }}
                  >
                    <span className="rail-ticker">${symbol.ticker}</span>
                    <span className="typeahead-name">{symbol.name}</span>
                    <span className={symbol.change >= 0 ? 'up' : 'down'}>
                      {signedPercent(symbol.changePercent)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
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

          {view.kind === 'rankings' ? (
            <RankingsPage
              state={state}
              onNavigate={navigate}
              onFollowUser={(userId) => guarded((s) => toggleFollowUser(s, userId))}
            />
          ) : view.kind === 'search' ? (
            <SearchPage
              state={state}
              query={view.query}
              onNavigate={navigate}
              handlers={handlers}
            />
          ) : permalink ? (
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
              {view.kind === 'symbol' && (
                <SymbolPage
                  state={state}
                  ticker={view.ticker}
                  onNavigate={navigate}
                  onFollow={(t) => guarded((s) => toggleFollowSymbol(s, t))}
                />
              )}
              <Stream
                title={view.kind === 'symbol' ? `$${view.ticker.toUpperCase()} messages` : titleFor(view, state)}
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
                  {pluralize(item.mentions, 'post')}
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
    case 'rankings':
      return 'Rankings';
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
    case 'rankings':
      return 'What the crowd is loud about.';
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
