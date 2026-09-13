import { useMemo, useState } from 'react';
import type { State } from '../lib/types';
import type { NavTarget } from '../lib/nav';
import {
  TIMEFRAMES,
  chatterSpikes,
  rankSymbols,
  rankTickers,
  sentimentLeaders,
  suggestedUsers,
  trendingHashtags,
  type Timeframe,
} from '../lib/rankings';
import { compactNumber, pluralize, price, signedPercent } from '../lib/format';

interface Props {
  state: State;
  onNavigate: (target: NavTarget) => void;
  onFollowUser: (userId: string) => void;
}

export function RankingsPage({ state, onNavigate, onFollowUser }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>('24h');

  const tickers = useMemo(() => rankTickers(state, timeframe), [state, timeframe]);
  const spikes = useMemo(() => chatterSpikes(state, timeframe), [state, timeframe]);
  const bulls = useMemo(
    () => sentimentLeaders(state, timeframe, 'bullish'),
    [state, timeframe],
  );
  const bears = useMemo(
    () => sentimentLeaders(state, timeframe, 'bearish'),
    [state, timeframe],
  );
  const hashtags = useMemo(() => trendingHashtags(state, timeframe), [state, timeframe]);
  const people = useMemo(() => suggestedUsers(state, timeframe), [state, timeframe]);

  const gainers = rankSymbols(state, 'gainers');
  const losers = rankSymbols(state, 'losers');
  const watched = rankSymbols(state, 'watched');

  return (
    <div className="rankings">
      <header className="stream-head">
        <h1>Rankings</h1>
        <p className="subtitle">
          What the crowd is loud about. Loudness is not a signal, which has never
          stopped anyone.
        </p>
        <nav className="filters" aria-label="Ranking timeframe">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              type="button"
              className={t === timeframe ? 'on' : undefined}
              aria-pressed={t === timeframe}
              onClick={() => setTimeframe(t)}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <div className="rank-grid">
        <RankCard title="Most mentioned" empty="Nobody posted a ticker in this window.">
          {tickers.slice(0, 5).map((item, i) => (
            <RankRow
              key={item.ticker}
              index={i}
              ticker={item.ticker}
              onNavigate={onNavigate}
              primary={pluralize(item.mentions, 'post')}
              secondary={
                item.split.bullishShare === null
                  ? 'no sentiment tagged'
                  : `${Math.round(item.split.bullishShare * 100)}% bullish`
              }
            />
          ))}
        </RankCard>

        <RankCard
          title="Unusual chatter"
          hint="Posts this window vs the same window before it."
          empty="Nothing is being talked about more than usual."
        >
          {spikes.map((item, i) => (
            <RankRow
              key={item.ticker}
              index={i}
              ticker={item.ticker}
              onNavigate={onNavigate}
              primary={`${item.spike!.toFixed(1)}× normal`}
              secondary={pluralize(item.mentions, 'post')}
            />
          ))}
        </RankCard>

        <RankCard title="Most bullish" empty="Not enough tagged posts to call it.">
          {bulls.map((item, i) => (
            <RankRow
              key={item.ticker}
              index={i}
              ticker={item.ticker}
              onNavigate={onNavigate}
              primary={`${Math.round(item.split.bullishShare! * 100)}% bullish`}
              secondary={`${item.split.bullish} up · ${item.split.bearish} down`}
            />
          ))}
        </RankCard>

        <RankCard title="Most bearish" empty="Not enough tagged posts to call it.">
          {bears.map((item, i) => (
            <RankRow
              key={item.ticker}
              index={i}
              ticker={item.ticker}
              onNavigate={onNavigate}
              primary={`${100 - Math.round(item.split.bullishShare! * 100)}% bearish`}
              secondary={`${item.split.bullish} up · ${item.split.bearish} down`}
            />
          ))}
        </RankCard>

        <RankCard title="Top gainers" empty="Everything is down. Unusual, but not today.">
          {gainers.map((symbol, i) => (
            <RankRow
              key={symbol.ticker}
              index={i}
              ticker={symbol.ticker}
              onNavigate={onNavigate}
              primary={signedPercent(symbol.changePercent)}
              primaryClass="up"
              secondary={price(symbol.last)}
            />
          ))}
        </RankCard>

        <RankCard title="Top losers" empty="Nothing is down. Enjoy it.">
          {losers.map((symbol, i) => (
            <RankRow
              key={symbol.ticker}
              index={i}
              ticker={symbol.ticker}
              onNavigate={onNavigate}
              primary={signedPercent(symbol.changePercent)}
              primaryClass="down"
              secondary={price(symbol.last)}
            />
          ))}
        </RankCard>

        <RankCard title="Most watched" empty="No symbols yet.">
          {watched.map((symbol, i) => (
            <RankRow
              key={symbol.ticker}
              index={i}
              ticker={symbol.ticker}
              onNavigate={onNavigate}
              primary={`${compactNumber(symbol.watchers)} watching`}
              secondary={signedPercent(symbol.changePercent)}
            />
          ))}
        </RankCard>

        <RankCard title="Trending hashtags" empty="No hashtags in this window.">
          {hashtags.map((item, i) => (
            <li key={item.tag} className="rank-row">
              <span className="rank-index">{i + 1}</span>
              <button
                type="button"
                className="rank-name"
                onClick={() => onNavigate({ kind: 'hashtag', tag: item.tag })}
              >
                #{item.tag}
              </button>
              <span className="rank-primary">{pluralize(item.uses, 'post')}</span>
            </li>
          ))}
        </RankCard>

        <RankCard title="Who to follow" empty="You already follow everyone worth it.">
          {people.map((item) => (
            <li key={item.user.id} className="rank-row person">
              <button
                type="button"
                className="rank-person"
                onClick={() => onNavigate({ kind: 'user', userId: item.user.id })}
              >
                <span
                  className="avatar small"
                  style={{ background: item.user.avatarColor }}
                  aria-hidden="true"
                >
                  {item.user.displayName.charAt(0)}
                </span>
                <span>
                  <span className="rank-name">{item.user.displayName}</span>
                  <span className="rank-secondary">@{item.user.handle}</span>
                </span>
              </button>
              <button
                type="button"
                className="follow-button"
                onClick={() => onFollowUser(item.user.id)}
              >
                Follow
              </button>
            </li>
          ))}
        </RankCard>
      </div>
    </div>
  );
}

function RankCard({
  title,
  hint,
  empty,
  children,
}: {
  title: string;
  hint?: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.flat() : [children];
  const isEmpty = items.filter(Boolean).length === 0;
  return (
    <section className="rank-card">
      <h2>{title}</h2>
      {hint && <p className="rank-hint">{hint}</p>}
      {isEmpty ? <p className="empty small">{empty}</p> : <ol className="rank-list">{children}</ol>}
    </section>
  );
}

function RankRow({
  index,
  ticker,
  primary,
  primaryClass,
  secondary,
  onNavigate,
}: {
  index: number;
  ticker: string;
  primary: string;
  primaryClass?: string;
  secondary: string;
  onNavigate: (target: NavTarget) => void;
}) {
  return (
    <li className="rank-row">
      <span className="rank-index">{index + 1}</span>
      <button
        type="button"
        className="rank-name"
        onClick={() => onNavigate({ kind: 'symbol', ticker })}
      >
        ${ticker}
      </button>
      <span className={`rank-primary ${primaryClass ?? ''}`}>{primary}</span>
      <span className="rank-secondary">{secondary}</span>
    </li>
  );
}
