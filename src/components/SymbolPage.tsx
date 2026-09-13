import { useMemo, useState } from 'react';
import type { State } from '../lib/types';
import type { NavTarget } from '../lib/nav';
import {
  chatterSpike,
  marketSession,
  messageVolumeSeries,
  symbolStats,
  type RangeId,
} from '../lib/series';
import { selectStream, sentimentSplit } from '../lib/streams';
import { headlinesFor, relatedSymbols, topContributors } from '../lib/symbolInfo';
import { compactNumber, pluralize, price as fmtPrice, relativeTime, signedPercent } from '../lib/format';
import { PriceChart } from './PriceChart';
import { VolumeChart } from './VolumeChart';
import { SentimentGauge } from './Stream';

const HOUR = 3_600_000;

const SESSION_LABEL: Record<ReturnType<typeof marketSession>, string> = {
  'pre-market': 'Pre-market',
  open: 'Market open',
  'after-hours': 'After hours',
  closed: 'Market closed',
};

interface Props {
  state: State;
  ticker: string;
  onNavigate: (target: NavTarget) => void;
  onFollow: (ticker: string) => void;
}

export function SymbolPage({ state, ticker, onNavigate, onFollow }: Props) {
  const [range, setRange] = useState<RangeId>('1M');
  const upper = ticker.toUpperCase();
  const symbol = state.symbols[upper];

  const messages = useMemo(
    () => selectStream(state, { kind: 'symbol', ticker: upper }),
    [state, upper],
  );

  const volume = useMemo(
    () =>
      messageVolumeSeries(
        messages.map((m) => ({ t: m.createdAt, sentiment: m.sentiment })),
        12,
        4 * HOUR,
      ),
    [messages],
  );

  if (!symbol) {
    return (
      <section className="symbol-head unknown">
        <h2>${upper}</h2>
        <p>
          No such instrument on this exchange, which has not stopped anyone from
          posting about it.
        </p>
      </section>
    );
  }

  const stats = symbolStats(symbol);
  const session = marketSession();
  const following = state.followedSymbols.includes(upper);
  const split = sentimentSplit(messages);
  const contributors = topContributors(messages);
  const related = relatedSymbols(state, upper);
  const up = symbol.change >= 0;

  return (
    <div className="symbol-page">
      <section className="symbol-head">
        <div>
          <h2>
            ${symbol.ticker} <span className="symbol-name">{symbol.name}</span>
            <span className="asset-class">{symbol.assetClass}</span>
          </h2>
          <p className={`symbol-price ${up ? 'up' : 'down'}`}>
            {fmtPrice(symbol.last)}{' '}
            <span>
              {up ? '+' : ''}
              {fmtPrice(symbol.change)} ({signedPercent(symbol.changePercent)})
            </span>
          </p>
          <p className="symbol-meta">
            <span className={`session ${session}`}>{SESSION_LABEL[session]}</span> ·{' '}
            {compactNumber(symbol.watchers)} watching
          </p>
        </div>
        <button
          type="button"
          className={following ? 'primary on' : 'primary'}
          onClick={() => onFollow(symbol.ticker)}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      </section>

      <PriceChart symbol={symbol} range={range} onRangeChange={setRange} />

      <section className="stats-card">
        <h3>Key statistics</h3>
        <dl className="stats-grid">
          <div><dt>Open</dt><dd>{fmtPrice(stats.open)}</dd></div>
          <div><dt>Prev close</dt><dd>{fmtPrice(stats.previousClose)}</dd></div>
          <div><dt>Day range</dt><dd>{fmtPrice(stats.dayLow)} – {fmtPrice(stats.dayHigh)}</dd></div>
          <div><dt>52-week</dt><dd>{fmtPrice(stats.yearLow)} – {fmtPrice(stats.yearHigh)}</dd></div>
          <div><dt>Volume</dt><dd>{compactNumber(stats.volume)}</dd></div>
          <div><dt>Market cap</dt><dd>{compactNumber(stats.marketCap)}</dd></div>
          <div><dt>P/E</dt><dd>{stats.peRatio === null ? '—' : stats.peRatio}</dd></div>
          <div>
            <dt>Next earnings</dt>
            <dd>{new Date(stats.earningsAt).toLocaleDateString()}</dd>
          </div>
        </dl>
        <p className="fiction-note">
          Every figure in this panel is fictional and generated from the ticker
          symbol itself.
        </p>
      </section>

      <section className="chart-card">
        <header className="chart-head">
          <h3>${symbol.ticker} sentiment</h3>
        </header>
        <SentimentGauge split={split} />
      </section>

      <VolumeChart
        ticker={symbol.ticker}
        series={volume}
        spike={chatterSpike(volume)}
      />

      <section className="stats-card">
        <h3>Top contributors</h3>
        {contributors.length === 0 ? (
          <p className="empty">Nobody has posted about ${symbol.ticker} yet.</p>
        ) : (
          <ul className="contributor-list">
            {contributors.map((contributor) => {
              const user = state.users[contributor.userId];
              return (
                <li key={contributor.userId}>
                  <button
                    type="button"
                    onClick={() => onNavigate({ kind: 'user', userId: contributor.userId })}
                  >
                    <span
                      className="avatar small"
                      style={{ background: user?.avatarColor ?? '#666' }}
                      aria-hidden="true"
                    >
                      {user?.displayName.charAt(0) ?? '?'}
                    </span>
                    <span className="contributor-name">{user?.displayName}</span>
                  </button>
                  <span className="contributor-stats">
                    {pluralize(contributor.messages, 'post')} ·{' '}
                    {compactNumber(contributor.likes)} likes
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="stats-card">
        <h3>News</h3>
        <ul className="news-list">
          {headlinesFor(symbol.ticker).map((headline) => (
            <li key={headline.id}>
              <span className="news-title">{headline.title}</span>
              <span className="news-meta">
                {headline.source} · {relativeTime(Date.now() - headline.hoursAgo * HOUR)}
              </span>
            </li>
          ))}
        </ul>
        <p className="fiction-note">Fictional headlines. No real outlet wrote these.</p>
      </section>

      {related.length > 0 && (
        <section className="stats-card">
          <h3>Related</h3>
          <div className="related-row">
            {related.map((other) => (
              <button
                key={other.ticker}
                type="button"
                className="related-chip"
                onClick={() => onNavigate({ kind: 'symbol', ticker: other.ticker })}
              >
                <span className="rail-ticker">${other.ticker}</span>
                <span className={other.change >= 0 ? 'up' : 'down'}>
                  {signedPercent(other.changePercent)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
