import { useMemo, type JSX } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EquityPoint } from '@/types/gateway';
import { formatDateTH } from '@/utils/formatters';

export interface DrawdownChartProps {
  readonly data: EquityPoint[];
  readonly height?: number;
  readonly title?: string;
}

interface DrawdownPoint {
  readonly date: string;
  readonly drawdown: number;
}

const DEFAULT_HEIGHT = 320;
const AREA_COLOR = '#ef4444';
const GRID_COLOR = '#e5e7eb';

const formatDrawdownPercent = (value: number): string => `${value.toFixed(2)}%`;

export default function DrawdownChart({
  data,
  height = DEFAULT_HEIGHT,
  title,
}: DrawdownChartProps): JSX.Element {
  // Running-peak drawdown: drawdown = (peak - value) / peak * -100.
  // peak is the running maximum value seen up to and including the current point.
  // Result is always ≤ 0 (0 when value equals peak).
  const series = useMemo<DrawdownPoint[]>(() => {
    let peak = 0;
    return data.map((p) => {
      if (p.value > peak) peak = p.value;
      const drawdown = peak === 0 ? 0 : ((peak - p.value) / peak) * -100;
      return { date: p.date, drawdown };
    });
  }, [data]);

  return (
    <section aria-label={title ?? 'Portfolio drawdown'} className="space-y-2">
      {title ? <h2 className="text-sm font-semibold text-gray-700">{title}</h2> : null}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={series} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <defs>
            <linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={AREA_COLOR} stopOpacity={0.05} />
              <stop offset="100%" stopColor={AREA_COLOR} stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={['auto', 0]} />
          <Tooltip
            formatter={(value: unknown) =>
              typeof value === 'number' ? formatDrawdownPercent(value) : ''
            }
            labelFormatter={(label: unknown) =>
              typeof label === 'string' ? formatDateTH(label) : ''
            }
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke={AREA_COLOR}
            strokeWidth={2}
            fill="url(#drawdownFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
