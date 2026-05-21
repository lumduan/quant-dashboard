import { useMemo, type JSX } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { REPORT_COLORS } from '@/utils/palette';
import type { BenchmarkPoint, EquityPoint, PnLDistributionBucket } from '@/types/gateway';
import { formatDateTH, formatPercent, formatTHB } from '@/utils/formatters';

export interface EquityCurveChartProps {
  readonly data: EquityPoint[];
  readonly normalize?: boolean;
  readonly height?: number;
  readonly title?: string;
  readonly showBuyAndHold?: boolean;
  readonly benchmarkData?: ReadonlyArray<BenchmarkPoint>;
  readonly showRunUpDrawdownShading?: boolean;
  readonly showPerBarPnLHistogram?: boolean;
  readonly pnlDistributionBuckets?: ReadonlyArray<PnLDistributionBucket>;
}

interface ChartPoint {
  readonly date: string;
  readonly value: number;
  readonly benchmarkValue?: number | undefined;
}

const DEFAULT_HEIGHT = 320;
const LINE_COLOR = '#22c55e';
const BENCHMARK_COLOR = '#f59e0b';
const REFERENCE_LINE_COLOR = '#9ca3af';
const GRID_COLOR = '#e5e7eb';

export default function EquityCurveChart({
  data,
  normalize = true,
  height = DEFAULT_HEIGHT,
  title,
  showBuyAndHold = false,
  benchmarkData,
  showRunUpDrawdownShading = false,
  showPerBarPnLHistogram = false,
  pnlDistributionBuckets,
}: EquityCurveChartProps): JSX.Element {
  const series = useMemo<ChartPoint[]>(() => {
    if (data.length === 0) return [];

    const benchMap = new Map<string, number>();
    if (showBuyAndHold && benchmarkData) {
      for (const b of benchmarkData) {
        benchMap.set(b.date, b.value);
      }
    }

    const base = data[0]?.value ?? 0;
    const benchBase = benchmarkData?.[0]?.value ?? 0;
    const benchScale = !normalize || benchBase === 0 ? 1 : 100 / benchBase;
    const equityScale = !normalize || base === 0 ? 1 : 100 / base;

    return data.map((p) => {
      const bv = benchMap.get(p.date);
      return {
        date: p.date,
        value: p.value * equityScale,
        benchmarkValue: bv !== undefined ? bv * benchScale : undefined,
      };
    });
  }, [data, showBuyAndHold, benchmarkData, normalize]);

  const histogramData = useMemo(() => {
    if (!showPerBarPnLHistogram || !pnlDistributionBuckets || pnlDistributionBuckets.length === 0) {
      return undefined;
    }
    return pnlDistributionBuckets.map((b) => ({
      label: `${(b.bucket_low_pct * 100).toFixed(1)}%`,
      count: b.count,
      fill:
        b.kind === 'profit'
          ? REPORT_COLORS.positive
          : b.kind === 'loss'
            ? REPORT_COLORS.negative
            : REPORT_COLORS.neutral,
    }));
  }, [showPerBarPnLHistogram, pnlDistributionBuckets]);

  // Recharts 3.x Tooltip formatter/labelFormatter params are widened.
  const formatTooltipValue = (value: unknown): string => {
    if (typeof value !== 'number') return '';
    return normalize ? formatPercent((value - 100) / 100) : formatTHB(value);
  };
  const formatTooltipLabel = (label: unknown): string =>
    typeof label === 'string' ? formatDateTH(label) : '';

  const useComposed = showPerBarPnLHistogram && histogramData && histogramData.length > 0;
  const ChartComponent = useComposed ? ComposedChart : LineChart;

  return (
    <section aria-label={title ?? 'Portfolio equity curve'} className="space-y-2">
      {title ? <h2 className="text-sm font-semibold text-gray-700">{title}</h2> : null}
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={series} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip formatter={formatTooltipValue} labelFormatter={formatTooltipLabel} />
          {normalize ? (
            <ReferenceLine y={100} stroke={REFERENCE_LINE_COLOR} strokeDasharray="4 4" />
          ) : null}
          {useComposed && histogramData ? (
            <Bar dataKey="count" isAnimationActive={false} radius={[2, 2, 0, 0]}>
              {histogramData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          ) : null}
          <Line type="monotone" dataKey="value" stroke={LINE_COLOR} strokeWidth={2} dot={false} />
          {showBuyAndHold ? (
            <Line
              type="monotone"
              dataKey="benchmarkValue"
              stroke={BENCHMARK_COLOR}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
              name="Buy &amp; Hold"
            />
          ) : null}
          {showRunUpDrawdownShading ? (
            <ReferenceArea
              x1={series[0]?.date}
              x2={series[series.length - 1]?.date}
              y1={0}
              y2={100}
              fill={REPORT_COLORS.negative}
              fillOpacity={0.05}
            />
          ) : null}
        </ChartComponent>
      </ResponsiveContainer>
    </section>
  );
}
