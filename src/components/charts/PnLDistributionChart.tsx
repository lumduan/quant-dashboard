import { useMemo, type JSX } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { REPORT_COLORS } from '@/utils/palette';
import type { PnLDistributionBucket } from '@/types/gateway';

export interface PnLDistributionChartProps {
  readonly buckets: ReadonlyArray<PnLDistributionBucket>;
  readonly avgLossPct?: number | undefined;
  readonly avgProfitPct?: number | undefined;
  readonly height?: number;
}

interface BucketDatum {
  readonly label: string;
  readonly count: number;
  readonly kind: string;
}

export default function PnLDistributionChart({
  buckets,
  avgLossPct,
  avgProfitPct,
  height = 320,
}: PnLDistributionChartProps): JSX.Element {
  const chartData: BucketDatum[] = useMemo(
    () =>
      buckets.map((b) => ({
        label: `${(b.bucket_low_pct * 100).toFixed(1)}%`,
        count: b.count,
        kind: b.kind,
      })),
    [buckets],
  );

  return (
    <section aria-label="P&amp;L distribution chart" className="report-section">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2E39" />
          <XAxis dataKey="label" tick={{ fill: '#787B86', fontSize: 11 }} />
          <YAxis tick={{ fill: '#787B86', fontSize: 12 }} />
          <Tooltip
            formatter={(value: unknown) => {
              if (typeof value === 'number') return [value, 'Trades'];
              return [String(value), ''];
            }}
          />
          {avgLossPct !== undefined ? (
            <ReferenceLine
              x={avgLossPct !== undefined ? `${(avgLossPct * 100).toFixed(1)}%` : undefined}
              stroke={REPORT_COLORS.negative}
              strokeDasharray="4 4"
            />
          ) : null}
          {avgProfitPct !== undefined ? (
            <ReferenceLine
              x={`${(avgProfitPct * 100).toFixed(1)}%`}
              stroke={REPORT_COLORS.positive}
              strokeDasharray="4 4"
            />
          ) : null}
          <Bar dataKey="count" isAnimationActive={false} radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => {
              const fill =
                entry.kind === 'profit'
                  ? REPORT_COLORS.positive
                  : entry.kind === 'loss'
                    ? REPORT_COLORS.negative
                    : REPORT_COLORS.neutral;
              return <Cell key={index} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
