import { useMemo, useState } from 'react';
import type { State } from '../lib/types';
import type { NavTarget } from '../lib/nav';
import { SCOPES, search, type SearchScope, type SearchSort } from '../lib/search';
import { MessageCard } from './MessageCard';
import { pluralize, signedPercent } from '../lib/format';
import type { DraftInput } from '../lib/store';

interface Props {
  state: State;
  query: string;
  onNavigate: (target: NavTarget) => void;
  handlers: {
    onNavigate: (target: NavTarget) => void;
    onLike: (id: string) => void;
    onBookmark: (id: string) => void;
    onDelete: (id: string) => void;
    onReshare: (id: string) => void;
    onVote: (id: string, optionId: string) => void;
    onPost: (draft: DraftInput) => void;
  };
}

export function SearchPage({ state, query, onNavigate, handlers }: Props) {
  const [scope, setScope] = useState<SearchScope>('top');
  const [sort, setSort] = useState<SearchSort>('recent');

  const results = useMemo(() => search(state, query, sort), [state, query, sort]);

  const counts: Record<SearchScope, number> = {
    top: results.total,
    messages: results.messages.length,
    symbols: results.symbols.length,
    people: results.users.length,
    hashtags: results.hashtags.length,
  };

  const showMessages = scope === 'top' || scope === 'messages';
  const showSymbols = scope === 'top' || scope === 'symbols';
  const showPeople = scope === 'top' || scope === 'people';
  const showHashtags = scope === 'top' || scope === 'hashtags';
  const messageLimit = scope === 'top' ? 3 : results.messages.length;

  return (
    <div className="stream">
      <header className="stream-head">
        <h1>Search: {query}</h1>
        <p className="subtitle">
          {results.total === 0
            ? 'No matches.'
            : `${pluralize(results.total, 'result')} across messages, symbols, people and hashtags.`}
        </p>
        <nav className="filters" aria-label="Result type">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={scope === s.id ? 'on' : undefined}
              aria-pressed={scope === s.id}
              onClick={() => setScope(s.id)}
            >
              {s.label} {counts[s.id] > 0 && <span className="count">{counts[s.id]}</span>}
            </button>
          ))}
        </nav>
        {showMessages && results.messages.length > 1 && (
          <div className="sort-row">
            <label htmlFor="search-sort">Sort messages</label>
            <select
              id="search-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SearchSort)}
            >
              <option value="recent">Most recent</option>
              <option value="popular">Most liked</option>
            </select>
          </div>
        )}
      </header>

      {results.total === 0 ? (
        <p className="empty">
          Nothing matched “{query}”. Try a ticker, a handle, or a shorter word.
        </p>
      ) : (
        counts[scope] === 0 && (
          <p className="empty">
            No {SCOPES.find((s) => s.id === scope)?.label.toLowerCase()} matched
            “{query}”, but other categories did — try the Top tab.
          </p>
        )
      )}

      {showSymbols && results.symbols.length > 0 && (
        <section className="stats-card">
          <h3>Symbols</h3>
          <div className="related-row">
            {results.symbols.map((symbol) => (
              <button
                key={symbol.ticker}
                type="button"
                className="related-chip"
                onClick={() => onNavigate({ kind: 'symbol', ticker: symbol.ticker })}
              >
                <span className="rail-ticker">${symbol.ticker}</span>
                <span className="typeahead-name">{symbol.name}</span>
                <span className={symbol.change >= 0 ? 'up' : 'down'}>
                  {signedPercent(symbol.changePercent)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {showPeople && results.users.length > 0 && (
        <section className="stats-card">
          <h3>People</h3>
          <ul className="contributor-list">
            {results.users.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => onNavigate({ kind: 'user', userId: user.id })}
                >
                  <span
                    className="avatar small"
                    style={{ background: user.avatarColor }}
                    aria-hidden="true"
                  >
                    {user.displayName.charAt(0)}
                  </span>
                  <span className="contributor-name">{user.displayName}</span>
                </button>
                <span className="contributor-stats">@{user.handle}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showHashtags && results.hashtags.length > 0 && (
        <section className="stats-card">
          <h3>Hashtags</h3>
          <div className="related-row">
            {results.hashtags.map((item) => (
              <button
                key={item.tag}
                type="button"
                className="related-chip"
                onClick={() => onNavigate({ kind: 'hashtag', tag: item.tag })}
              >
                #{item.tag}
                <span className="rank-secondary">{pluralize(item.uses, 'post')}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {showMessages &&
        results.messages
          .slice(0, messageLimit)
          .map((message) => (
            <MessageCard key={message.id} message={message} state={state} {...handlers} />
          ))}

      {scope === 'top' && results.messages.length > messageLimit && (
        <button type="button" className="link-button" onClick={() => setScope('messages')}>
          See all {results.messages.length} messages
        </button>
      )}
    </div>
  );
}
