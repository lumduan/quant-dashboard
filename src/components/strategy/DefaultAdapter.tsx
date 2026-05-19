import { type JSX, useMemo } from 'react';
import { MetricCard } from '@/components/widgets/MetricCard';
import { useStrategyPerformance } from '@/hooks/useGateway';
import type { StrategyInfo } from '@/types/gateway';
import { formatPercent, formatTHB, trendColor } from '@/utils/formatters';

const METRICS_GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4';

export interface DefaultAdapterProps {
  readonly strategy: StrategyInfo;
}

export function DefaultAdapter({ strategy }: DefaultAdapterProps): JSX.Element {
  const { data: perf, isPending } = useStrategyPerformance(strategy.id);

  const dailyPnL = useMemo(() => formatTHB(perf?.daily_pnl ?? 0), [perf?.daily_pnl]);
  const dailyPnLColor = useMemo(() => trendColor(perf?.daily_pnl ?? 0), [perf?.daily_pnl]);
  const totalValue = useMemo(() => formatTHB(perf?.total_value ?? 0), [perf?.total_value]);
  const sharpe = useMemo(() => (perf?.sharpe_ratio ?? 0).toFixed(2), [perf?.sharpe_ratio]);
  const maxDD = useMemo(() => formatPercent(perf?.max_drawdown ?? 0), [perf?.max_drawdown]);

  return (
    <section aria-label={`${strategy.name} adapter (default)`} className="space-y-6">
      <output className="block rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
        Strategy type "{strategy.type ?? '(unknown)'}" has no adapter — falling back to generic
        metrics.
      </output>
      {isPending ? (
        <output
          aria-busy="true"
          aria-label="Loading strategy performance"
          className={`block ${METRICS_GRID}`}
        >
          <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
        </output>
      ) : (
        <section aria-label="Strategy performance" className={METRICS_GRID}>
          <MetricCard label="Daily PnL" value={dailyPnL} colorClass={dailyPnLColor} />
          <MetricCard label="Total Value" value={totalValue} />
          <MetricCard label="Sharpe Ratio" value={sharpe} />
          <MetricCard label="Max Drawdown" value={maxDD} />
        </section>
      )}
    </section>
  );
}
