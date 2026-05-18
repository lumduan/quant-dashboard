import { type JSX, useDeferredValue, useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EquityPoint } from '@/types/gateway';
import { formatDateTH, formatPercent } from '@/utils/formatters';

export interface Series {
  readonly id: string;
  readonly label: string;
  readonly data: EquityPoint[];
  readonly color: string;
}

export interface MultiStrategyChartProps {
  readonly series: Series[];
  readonly height?: number;
  readonly title?: string;
}

type MergedRow = Record<string, number | string>;

const DEFAULT_HEIGHT = 320;
const GRID_COLOR = '#e5e7eb';
const REFERENCE_LINE_COLOR = '#9ca3af';

function normalizeBase100(data: readonly EquityPoint[]): Map<string, number> {
  const out = new Map<string, number>();
  if (data.length === 0) return out;
  const base = data[0]?.value ?? 0;
  for (const p of data) {
    const value = base === 0 ? 100 : (p.value / base) * 100;
    out.set(p.date, value);
  }
  return out;
}

export default function MultiStrategyChart({
  series,
  height = DEFAULT_HEIGHT,
  title,
}: MultiStrategyChartProps): JSX.Element {
  // Defer the series array so future filter-bar changes (Phase 7) don't block input
  // (Vercel rerender-use-deferred-value). useDeferredValue always converges within one paint.
  const deferredSeries = useDeferredValue(series);

  const merged = useMemo<MergedRow[]>(() => {
    if (deferredSeries.length === 0) return [];
    const normalized = deferredSeries.map((s) => ({
      id: s.id,
      points: normalizeBase100(s.data),
    }));
    const allDates = new Set<string>();
    for (const { points } of normalized) {
      for (const date of points.keys()) {
        allDates.add(date);
      }
    }
    const sortedDates = [...allDates].sort();
    return sortedDates.map((date) => {
      const row: MergedRow = { date };
      for (const { id, points } of normalized) {
        const value = points.get(date);
        if (value !== undefined) row[id] = value;
      }
      return row;
    });
  }, [deferredSeries]);

  if (deferredSeries.length === 0) {
    return (
      <section
        aria-label={title ?? 'Multi-strategy comparison'}
        className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center"
      >
        {title ? <h2 className="text-sm font-semibold text-gray-700">{title}</h2> : null}
        <output className="text-sm text-gray-500">Select strategies to compare</output>
      </section>
    );
  }

  return (
    <section aria-label={title ?? 'Multi-strategy comparison'} className="space-y-2">
      {title ? <h2 className="text-sm font-semibold text-gray-700">{title}</h2> : null}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={merged} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip
            formatter={(value: unknown) =>
              typeof value === 'number' ? formatPercent((value - 100) / 100) : ''
            }
            labelFormatter={(label: unknown) =>
              typeof label === 'string' ? formatDateTH(label) : ''
            }
          />
          <ReferenceLine y={100} stroke={REFERENCE_LINE_COLOR} strokeDasharray="4 4" />
          <Legend />
          {deferredSeries.map((s) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              connectNulls={true}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
