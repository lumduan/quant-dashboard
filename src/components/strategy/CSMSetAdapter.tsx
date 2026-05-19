import { type JSX, Suspense, useMemo } from 'react';
import { EquityCurveChart } from '@/components/charts';
import { LoadingState } from '@/components/ui/LoadingState';
import { MetricCard } from '@/components/widgets/MetricCard';
import { useStrategyEquityCurve, useStrategyPerformance } from '@/hooks/useGateway';
import type { StrategyInfo } from '@/types/gateway';
import { formatPercent, formatTHB, trendColor } from '@/utils/formatters';

const METRICS_GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4';

export interface CSMSetAdapterProps {
  readonly strategy: StrategyInfo;
}

export function CSMSetAdapter({ strategy }: CSMSetAdapterProps): JSX.Element {
  const { data: perf, isPending: perfPending } = useStrategyPerformance(strategy.id);
  const { data: equityCurve } = useStrategyEquityCurve(strategy.id);

  const dailyPnL = useMemo(() => formatTHB(perf?.daily_pnl ?? 0), [perf?.daily_pnl]);
  const dailyPnLColor = useMemo(() => trendColor(perf?.daily_pnl ?? 0), [perf?.daily_pnl]);
  const totalValue = useMemo(() => formatTHB(perf?.total_value ?? 0), [perf?.total_value]);
  const sharpe = useMemo(() => (perf?.sharpe_ratio ?? 0).toFixed(2), [perf?.sharpe_ratio]);
  const maxDD = useMemo(() => formatPercent(perf?.max_drawdown ?? 0), [perf?.max_drawdown]);
  const weightLabel = `Weight: ${(strategy.capital_weight * 100).toFixed(0)}% of portfolio`;

  return (
    <section aria-label={`${strategy.name} adapter`} className="space-y-6">
      <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
        {weightLabel}
      </span>
      {perfPending ? (
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
      {equityCurve ? (
        <Suspense fallback={<LoadingState />}>
          <EquityCurveChart data={equityCurve} normalize={true} title="Equity Curve" />
        </Suspense>
      ) : null}
      {import.meta.env.DEV ? (
        <details className="rounded border border-gray-200 p-2 text-xs">
          <summary className="cursor-pointer text-gray-600">Raw JSON</summary>
          <pre className="mt-2 overflow-x-auto text-gray-700">
            {JSON.stringify({ strategy, performance: perf, equityCurve }, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
