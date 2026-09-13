import { useId, useMemo, useState } from 'react';
import { RANGES, priceSeries, type RangeId } from '../lib/series';
import type { Symbol } from '../lib/types';
import { price as fmtPrice } from '../lib/format';

const WIDTH = 720;
const HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 26, left: 48 };

interface Props {
  symbol: Symbol;
  range: RangeId;
  onRangeChange: (range: RangeId) => void;
}

/**
 * Single-series price line. One series, so no legend — the heading names what is
 * plotted. Direct label on the endpoint only; the crosshair tooltip and the
 * table view carry every other value.
 */
export function PriceChart({ symbol, range, onRangeChange }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const gradientId = useId();

  const series = useMemo(() => priceSeries(symbol, range), [symbol, range]);

  const prices = series.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  // Pad the domain so the line never touches the frame.
  const lo = min - span * 0.08;
  const hi = max + span * 0.08;

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  const x = (i: number) =>
    PAD.left + (series.length === 1 ? plotWidth / 2 : (i / (series.length - 1)) * plotWidth);
  const y = (value: number) =>
    PAD.top + plotHeight - ((value - lo) / (hi - lo)) * plotHeight;

  const line = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.price)}`).join(' ');
  const area = `${line} L${x(series.length - 1)},${PAD.top + plotHeight} L${x(0)},${
    PAD.top + plotHeight
  } Z`;

  // The period's own direction, which may differ from the header's day change.
  const periodChange = series[series.length - 1].price - series[0].price;
  const up = periodChange >= 0;
  const stroke = up ? 'var(--chart-up)' : 'var(--chart-down)';

  const ticks = [hi, (hi + lo) / 2, lo];
  const active = hover !== null ? series[hover] : null;

  function pointerToIndex(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const svgX = ratio * WIDTH;
    const index = Math.round(((svgX - PAD.left) / plotWidth) * (series.length - 1));
    return Math.min(series.length - 1, Math.max(0, index));
  }

  return (
    <section className="chart-card">
      <header className="chart-head">
        <h3>${symbol.ticker} price</h3>
        <div className="chart-head-actions">
          <span className={`chart-delta ${up ? 'up' : 'down'}`}>
            {up ? '+' : ''}
            {fmtPrice(periodChange)} over {range}
          </span>
          <button type="button" className="link-button" onClick={() => setShowTable(!showTable)}>
            {showTable ? 'Hide table' : 'View as table'}
          </button>
        </div>
      </header>

      <div className="range-picker" role="group" aria-label="Chart range">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            className={r === range ? 'on' : undefined}
            aria-pressed={r === range}
            onClick={() => onRangeChange(r)}
          >
            {r}
          </button>
        ))}
      </div>

      <svg
        className="chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${symbol.ticker} price over ${range}, ending at ${fmtPrice(symbol.last)}`}
        onPointerMove={(e) => setHover(pointerToIndex(e))}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="grid"
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="axis-label" x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
              {fmtPrice(tick)}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <circle
          cx={x(series.length - 1)}
          cy={y(series[series.length - 1].price)}
          r={4}
          fill={stroke}
          stroke="var(--surface)"
          strokeWidth={2}
        />

        {active && hover !== null && (
          <g>
            <line
              className="crosshair"
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
            />
            <circle
              cx={x(hover)}
              cy={y(active.price)}
              r={4}
              fill={stroke}
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </g>
        )}

        <text className="axis-label" x={PAD.left} y={HEIGHT - 8}>
          {new Date(series[0].t).toLocaleDateString()}
        </text>
        <text className="axis-label" x={WIDTH - PAD.right} y={HEIGHT - 8} textAnchor="end">
          Now
        </text>
      </svg>

      <p className="chart-readout" aria-live="polite">
        {active ? (
          <>
            <strong>{fmtPrice(active.price)}</strong>{' '}
            <span>{new Date(active.t).toLocaleString()}</span>
          </>
        ) : (
          <span>Hover the chart for a price. Every figure here is invented.</span>
        )}
      </p>

      {showTable && (
        <div className="table-wrap">
          <table className="data-table">
            <caption>${symbol.ticker} price points over {range}</caption>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Price</th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.t}>
                  <td>{new Date(point.t).toLocaleString()}</td>
                  <td className="num">{fmtPrice(point.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
