import type { Message, State } from '../lib/types';
import type { StreamFilter } from '../lib/streams';
import { sentimentSplit } from '../lib/streams';
import { MessageCard } from './MessageCard';
import type { DraftInput } from '../lib/store';
import type { NavTarget } from '../lib/nav';

const FILTERS: { id: StreamFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'top', label: 'Top' },
  { id: 'bullish', label: 'Bullish' },
  { id: 'bearish', label: 'Bearish' },
  { id: 'links', label: 'Links' },
  { id: 'charts', label: 'Charts' },
];

interface Props {
  title: string;
  subtitle?: string;
  messages: Message[];
  state: State;
  filter: StreamFilter;
  onFilterChange: (filter: StreamFilter) => void;
  emptyMessage: string;
  showFilters?: boolean;
  showSentiment?: boolean;
  loading?: boolean;
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

export function Stream({
  title,
  subtitle,
  messages,
  state,
  filter,
  onFilterChange,
  emptyMessage,
  showFilters = true,
  showSentiment = false,
  loading = false,
  handlers,
}: Props) {
  const split = sentimentSplit(messages);

  return (
    <div className="stream">
      <header className="stream-head">
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
        {showSentiment && <SentimentGauge split={split} />}
        {showFilters && (
          <nav className="filters" aria-label="Stream filters">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={filter === f.id ? 'on' : undefined}
                aria-pressed={filter === f.id}
                onClick={() => onFilterChange(f.id)}
              >
                {f.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {loading ? (
        <div className="skeletons" aria-busy="true" aria-label="Loading messages">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <p className="empty">{emptyMessage}</p>
      ) : (
        messages.map((message) => (
          <MessageCard key={message.id} message={message} state={state} {...handlers} />
        ))
      )}
    </div>
  );
}

export function SentimentGauge({
  split,
}: {
  split: { bullish: number; bearish: number; bullishShare: number | null };
}) {
  if (split.bullishShare === null) {
    return <p className="gauge-empty">No sentiment tagged yet.</p>;
  }
  const bullPercent = Math.round(split.bullishShare * 100);
  return (
    <div className="gauge">
      <div className="gauge-bar" role="img" aria-label={`${bullPercent}% bullish`}>
        <span className="gauge-bull" style={{ width: `${bullPercent}%` }} />
      </div>
      <div className="gauge-legend">
        <span className="bull">{bullPercent}% Bullish ({split.bullish})</span>
        <span className="bear">{100 - bullPercent}% Bearish ({split.bearish})</span>
      </div>
    </div>
  );
}
