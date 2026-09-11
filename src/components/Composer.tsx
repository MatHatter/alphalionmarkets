import { useState } from 'react';
import { MAX_MESSAGE_LENGTH, type Sentiment } from '../lib/types';
import type { DraftInput } from '../lib/store';

interface Props {
  placeholder?: string;
  parentId?: string;
  compact?: boolean;
  onPost: (draft: DraftInput) => void;
  onCancel?: () => void;
}

const HOUR = 3_600_000;

export function Composer({ placeholder, parentId, compact, onPost, onCancel }: Props) {
  const [body, setBody] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment | undefined>();
  const [pollOptions, setPollOptions] = useState<string[] | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_MESSAGE_LENGTH - body.length;
  const over = remaining < 0;
  const hasContent = body.trim().length > 0 || images.length > 0 || Boolean(pollOptions);

  function reset() {
    setBody('');
    setSentiment(undefined);
    setPollOptions(null);
    setImages([]);
    setError(null);
  }

  function submit() {
    if (!hasContent || over) return;
    try {
      onPost({
        body,
        sentiment,
        parentId,
        images,
        poll: pollOptions
          ? { options: pollOptions, durationMs: 24 * HOUR }
          : undefined,
      });
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post.');
    }
  }

  return (
    <section className={`composer${compact ? ' compact' : ''}`} aria-label="Post a message">
      <textarea
        className="composer-input"
        value={body}
        placeholder={placeholder ?? "What's the thesis? Be specific, be wrong publicly."}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        rows={compact ? 2 : 3}
      />

      {pollOptions && (
        <div className="poll-editor">
          {pollOptions.map((option, i) => (
            <input
              key={i}
              className="poll-option-input"
              value={option}
              placeholder={`Option ${i + 1}`}
              onChange={(e) =>
                setPollOptions(pollOptions.map((o, j) => (j === i ? e.target.value : o)))
              }
            />
          ))}
          <div className="poll-editor-actions">
            {pollOptions.length < 4 && (
              <button type="button" onClick={() => setPollOptions([...pollOptions, ''])}>
                Add option
              </button>
            )}
            <button type="button" onClick={() => setPollOptions(null)}>
              Remove poll
            </button>
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="composer-attachments">
          {images.map((image) => (
            <span key={image} className="chip">
              {image}
              <button
                type="button"
                aria-label={`Remove ${image}`}
                onClick={() => setImages(images.filter((i) => i !== image))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="composer-bar">
        <div className="sentiment-picker" role="group" aria-label="Sentiment">
          <button
            type="button"
            className={`tag bullish${sentiment === 'bullish' ? ' on' : ''}`}
            aria-pressed={sentiment === 'bullish'}
            onClick={() => setSentiment(sentiment === 'bullish' ? undefined : 'bullish')}
          >
            Bullish
          </button>
          <button
            type="button"
            className={`tag bearish${sentiment === 'bearish' ? ' on' : ''}`}
            aria-pressed={sentiment === 'bearish'}
            onClick={() => setSentiment(sentiment === 'bearish' ? undefined : 'bearish')}
          >
            Bearish
          </button>
        </div>

        <div className="composer-tools">
          <button
            type="button"
            title="Attach a chart"
            onClick={() => setImages([...images, `chart-${images.length + 1}`])}
          >
            Chart
          </button>
          <button
            type="button"
            title="Add a poll"
            disabled={Boolean(pollOptions) || Boolean(parentId)}
            onClick={() => setPollOptions(['', ''])}
          >
            Poll
          </button>
          <span className={`counter${over ? ' over' : ''}`}>{remaining}</span>
          {onCancel && (
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className="primary"
            disabled={!hasContent || over}
            onClick={submit}
          >
            {parentId ? 'Reply' : 'Post'}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      <p className="composer-note">
        Posts cannot be edited after publishing. Neither can the take.
      </p>
    </section>
  );
}
