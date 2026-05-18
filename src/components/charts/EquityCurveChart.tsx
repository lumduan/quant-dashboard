import { useMemo, type JSX } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EquityPoint } from '@/types/gateway';
import { formatDateTH, formatPercent, formatTHB } from '@/utils/formatters';

export interface EquityCurveChartProps {
  readonly data: EquityPoint[];
  readonly normalize?: boolean;
  readonly height?: number;
  readonly title?: string;
}

interface ChartPoint {
  readonly date: string;
  readonly value: number;
}

const DEFAULT_HEIGHT = 320;
const LINE_COLOR = '#22c55e';
const REFERENCE_LINE_COLOR = '#9ca3af';
const GRID_COLOR = '#e5e7eb';

export default function EquityCurveChart({
  data,
  normalize = true,
  height = DEFAULT_HEIGHT,
  title,
}: EquityCurveChartProps): JSX.Element {
  // Base-100 normalization: divide each value by the first value × 100.
  // Tooltip text in normalized mode shows the % gain from base (not the Base-100 number itself).
  const series = useMemo<ChartPoint[]>(() => {
    if (data.length === 0) return [];
    if (!normalize) return data.map((p) => ({ date: p.date, value: p.value }));
    const base = data[0]?.value ?? 0;
    if (base === 0) return data.map((p) => ({ date: p.date, value: 100 }));
    return data.map((p) => ({ date: p.date, value: (p.value / base) * 100 }));
  }, [data, normalize]);

  // Recharts 3.x Tooltip formatter/labelFormatter params are widened (ValueType / ReactNode).
  // Narrow inside before formatting; non-numeric values fall through to an empty string.
  const formatTooltipValue = (value: unknown): string => {
    if (typeof value !== 'number') return '';
    return normalize ? formatPercent((value - 100) / 100) : formatTHB(value);
  };
  const formatTooltipLabel = (label: unknown): string =>
    typeof label === 'string' ? formatDateTH(label) : '';

  return (
    <section aria-label={title ?? 'Portfolio equity curve'} className="space-y-2">
      {title ? <h2 className="text-sm font-semibold text-gray-700">{title}</h2> : null}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={series} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip formatter={formatTooltipValue} labelFormatter={formatTooltipLabel} />
          {normalize ? (
            <ReferenceLine y={100} stroke={REFERENCE_LINE_COLOR} strokeDasharray="4 4" />
          ) : null}
          <Line type="monotone" dataKey="value" stroke={LINE_COLOR} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
