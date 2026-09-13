import { useState } from 'react';
import type { VolumePoint } from '../lib/series';
import { compactNumber } from '../lib/format';

const WIDTH = 720;
const HEIGHT = 160;
const PAD = { top: 12, right: 12, bottom: 28, left: 48 };
const MAX_BAR = 24;

interface Props {
  ticker: string;
  series: VolumePoint[];
  spike: number | null;
}

/**
 * Message volume per bucket, split bullish / bearish / untagged.
 *
 * Colors are the validated diverging pair (blue for bullish, red for bearish),
 * not the finance-convention green/red: green vs red measures CVD ΔE 3.8, far
 * below the floor, and here color is the only thing distinguishing the stacked
 * segments. The legend and table carry identity regardless.
 */
export function VolumeChart({ ticker, series, spike }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(1, ...series.map((b) => b.messages));
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const band = plotWidth / series.length;
  const barWidth = Math.min(MAX_BAR, band * 0.7);

  const yFor = (value: number) => PAD.top + plotHeight - (value / max) * plotHeight;
  const ticks = [max, Math.round(max / 2), 0];

  return (
    <section className="chart-card">
      <header className="chart-head">
        <h3>${ticker} message volume</h3>
        <div className="chart-head-actions">
          {spike !== null && spike >= 1.5 && (
            <span className="spike-badge">▲ {spike.toFixed(1)}× normal chatter</span>
          )}
          <button type="button" className="link-button" onClick={() => setShowTable(!showTable)}>
            {showTable ? 'Hide table' : 'View as table'}
          </button>
        </div>
      </header>

      <div className="legend">
        <span className="legend-item">
          <span className="swatch bull" aria-hidden="true" /> Bullish
        </span>
        <span className="legend-item">
          <span className="swatch bear" aria-hidden="true" /> Bearish
        </span>
        <span className="legend-item">
          <span className="swatch untagged" aria-hidden="true" /> No tag
        </span>
      </div>

      <svg
        className="chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Message volume for ${ticker}, peak ${max} messages in a bucket`}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={yFor(tick)} y2={yFor(tick)} />
            <text className="axis-label" x={PAD.left - 8} y={yFor(tick) + 4} textAnchor="end">
              {compactNumber(tick)}
            </text>
          </g>
        ))}

        {series.map((bucket, i) => {
          const cx = PAD.left + band * i + band / 2;
          const untagged = bucket.messages - bucket.bullish - bucket.bearish;
          const segments = [
            { key: 'bull', value: bucket.bullish, fill: 'var(--chart-bull)' },
            { key: 'bear', value: bucket.bearish, fill: 'var(--chart-bear)' },
            { key: 'untagged', value: untagged, fill: 'var(--chart-neutral)' },
          ].filter((s) => s.value > 0);

          let cursor = PAD.top + plotHeight;
          return (
            <g
              key={bucket.t}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              tabIndex={0}
              role="group"
              aria-label={`${new Date(bucket.t).toLocaleString()}: ${bucket.messages} messages`}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              {/* Hit target spans the whole band, not just the painted bar. */}
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotHeight}
                fill="transparent"
              />
              {segments.map((segment) => {
                const height = (segment.value / max) * plotHeight;
                // 2px surface gap between stacked segments.
                const drawn = Math.max(1, height - 2);
                cursor -= height;
                return (
                  <rect
                    key={segment.key}
                    x={cx - barWidth / 2}
                    y={cursor}
                    width={barWidth}
                    height={drawn}
                    fill={segment.fill}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                );
              })}
            </g>
          );
        })}

        <line
          className="baseline"
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={PAD.top + plotHeight}
          y2={PAD.top + plotHeight}
        />
        <text className="axis-label" x={PAD.left} y={HEIGHT - 8}>
          {new Date(series[0].t).toLocaleDateString()}
        </text>
        <text className="axis-label" x={WIDTH - PAD.right} y={HEIGHT - 8} textAnchor="end">
          Now
        </text>
      </svg>

      <p className="chart-readout" aria-live="polite">
        {hover !== null ? (
          <>
            <strong>{series[hover].messages} messages</strong>{' '}
            <span>
              {series[hover].bullish} bullish · {series[hover].bearish} bearish ·{' '}
              {new Date(series[hover].t).toLocaleString()}
            </span>
          </>
        ) : (
          <span>Hover a bar for the bucket breakdown.</span>
        )}
      </p>

      {showTable && (
        <div className="table-wrap">
          <table className="data-table">
            <caption>${ticker} messages per bucket</caption>
            <thead>
              <tr>
                <th scope="col">Bucket</th>
                <th scope="col">Messages</th>
                <th scope="col">Bullish</th>
                <th scope="col">Bearish</th>
              </tr>
            </thead>
            <tbody>
              {series.map((bucket) => (
                <tr key={bucket.t}>
                  <td>{new Date(bucket.t).toLocaleString()}</td>
                  <td className="num">{bucket.messages}</td>
                  <td className="num">{bucket.bullish}</td>
                  <td className="num">{bucket.bearish}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
