import { useQueries } from '@tanstack/react-query';
import { type JSX, Suspense, useMemo } from 'react';
import { fetchStrategyEquityCurve } from '@/api/queries';
import { DrawdownChart, EquityCurveChart, MultiStrategyChart } from '@/components/charts';
import { FilterBar } from '@/components/filters/FilterBar';
import { LoadingState } from '@/components/ui/LoadingState';
import { AllocationBar } from '@/components/widgets/AllocationBar';
import { PortfolioSummary } from '@/components/widgets/PortfolioSummary';
import { useOverallPerformance, usePortfolioEquityCurve, useStrategies } from '@/hooks/useGateway';
import { useStrategyFilter } from '@/hooks/useStrategyFilter';
import type { EquityPoint, StrategyInfo } from '@/types/gateway';
import { STRATEGY_COLORS } from '@/utils/palette';

interface ChartSeries {
  readonly id: string;
  readonly label: string;
  readonly data: EquityPoint[];
  readonly color: string;
}

function pickFilteredStrategies(
  strategies: StrategyInfo[] | undefined,
  selectedIds: readonly string[],
): StrategyInfo[] {
  const active = strategies?.filter((s) => s.active) ?? [];
  if (selectedIds.length === 0) return active;
  return active.filter((s) => selectedIds.includes(s.id));
}

export function DashboardPage(): JSX.Element {
  // All four hooks at the same level → TanStack Query fetches them in parallel
  // (Vercel `async-parallel`).
  const { selectedIds, from, to, setSelectedIds, setDateRange } = useStrategyFilter();
  const { data: overall } = useOverallPerformance();
  const { data: equityCurve } = usePortfolioEquityCurve(true, from, to);
  const { data: strategies } = useStrategies();

  const filteredStrategies = useMemo(
    () => pickFilteredStrategies(strategies, selectedIds),
    [strategies, selectedIds],
  );

  // useQueries runs N per-strategy fetches in parallel. The cache key matches
  // useStrategyEquityCurve(id), so TanStack Query dedupes when the same id is
  // also requested from a strategy detail page.
  const strategyQueries = useQueries({
    queries: filteredStrategies.map((s) => ({
      queryKey: ['equity-curve', 'strategy', s.id] as const,
      queryFn: () => fetchStrategyEquityCurve(s.id),
    })),
  });

  const series = useMemo<ChartSeries[]>(
    () =>
      filteredStrategies.flatMap<ChartSeries>((s, i) => {
        const data = strategyQueries[i]?.data;
        if (!data) return [];
        return [
          {
            id: s.id,
            label: s.name,
            data,
            color: STRATEGY_COLORS[i % STRATEGY_COLORS.length] ?? STRATEGY_COLORS[0],
          },
        ];
      }),
    [filteredStrategies, strategyQueries],
  );

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <FilterBar
        selectedIds={selectedIds}
        from={from}
        to={to}
        onSelectedIdsChange={setSelectedIds}
        onDateRangeChange={setDateRange}
      />
      <Suspense fallback={<LoadingState />}>
        <PortfolioSummary />
      </Suspense>
      {overall ? (
        <Suspense fallback={<LoadingState />}>
          <AllocationBar allocation={overall.allocation} />
        </Suspense>
      ) : null}
      {equityCurve ? (
        <Suspense fallback={<LoadingState />}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <EquityCurveChart data={equityCurve} title="Equity Curve" />
            <DrawdownChart data={equityCurve} title="Drawdown" />
          </div>
        </Suspense>
      ) : null}
      <Suspense fallback={<LoadingState />}>
        <MultiStrategyChart series={series} title="Strategy Comparison" />
      </Suspense>
    </div>
  );
}
