import { useMemo, type JSX } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { REPORT_COLORS } from '@/utils/palette';
import { formatPercent } from '@/utils/formatters';

export interface BenchmarkRangeBarProps {
  readonly strategyReturn: number;
  readonly strategyMin: number;
  readonly strategyMax: number;
  readonly buyAndHoldReturn: number;
  readonly buyAndHoldMin: number;
  readonly buyAndHoldMax: number;
  readonly height?: number;
}

interface RangeDatum {
  readonly name: string;
  readonly min: number;
  readonly current: number;
  readonly max: number;
}

export default function BenchmarkRangeBar({
  strategyReturn,
  strategyMin,
  strategyMax,
  buyAndHoldReturn,
  buyAndHoldMin,
  buyAndHoldMax,
  height = 200,
}: BenchmarkRangeBarProps): JSX.Element {
  const chartData: RangeDatum[] = useMemo(
    () => [
      { name: 'Strategy', min: strategyMin, current: strategyReturn, max: strategyMax },
      { name: 'Buy & Hold', min: buyAndHoldMin, current: buyAndHoldReturn, max: buyAndHoldMax },
    ],
    [strategyReturn, strategyMin, strategyMax, buyAndHoldReturn, buyAndHoldMin, buyAndHoldMax],
  );

  return (
    <section aria-label="Benchmark comparison chart" className="report-section">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2E39" />
          <XAxis type="number" tick={{ fill: '#787B86', fontSize: 12 }} tickFormatter={(v: number) => formatPercent(v)} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#787B86', fontSize: 12 }} width={80} />
          <Tooltip
            formatter={(value: unknown) => {
              if (typeof value === 'number') return [formatPercent(value), ''];
              return [String(value), ''];
            }}
          />
          <Bar dataKey="current" fill={REPORT_COLORS.accent} isAnimationActive={false} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
