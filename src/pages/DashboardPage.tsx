import { useQueries, useQueryClient } from '@tanstack/react-query';
import { type JSX, Suspense, useCallback, useDeferredValue, useMemo } from 'react';
import { fetchStrategyEquityCurve } from '@/api/queries';
import { DrawdownChart, EquityCurveChart, MultiStrategyChart } from '@/components/charts';
import { FilterBar } from '@/components/filters/FilterBar';
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@/components/ui/ErrorBoundary';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AllocationBar } from '@/components/widgets/AllocationBar';
import { PortfolioSummary } from '@/components/widgets/PortfolioSummary';
import { StrategyCardGrid } from '@/components/widgets/StrategyCardGrid';
import { useOverallPerformance, usePortfolioEquityCurve, useStrategies } from '@/hooks/useGateway';
import { useStrategyFilter } from '@/hooks/useStrategyFilter';
import type { EquityPoint, StrategyInfo, StrategyPerformance } from '@/types/gateway';
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

function makeFallback(
  message: string,
  onRetry: () => void,
): (props: ErrorBoundaryFallbackProps) => JSX.Element {
  return ({ resetErrorBoundary }) => (
    <ErrorState
      message={message}
      onRetry={() => {
        onRetry();
        resetErrorBoundary();
      }}
    />
  );
}

export function DashboardPage(): JSX.Element {
  // All four hooks at the same level → TanStack Query fetches them in parallel
  // (Vercel `async-parallel`).
  const { selectedIds, from, to, setSelectedIds, setDateRange } = useStrategyFilter();
  const { data: overall } = useOverallPerformance();
  const { data: equityCurve } = usePortfolioEquityCurve(true, from, to);
  const { data: strategies } = useStrategies();
  const queryClient = useQueryClient();

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

  // Defer series so a flurry of filter changes doesn't block the chart's render
  // (Vercel `rerender-use-deferred-value`).
  const deferredSeries = useDeferredValue(series);

  // O(1) per-card lookup; rebuild only when overall performance changes.
  const performances = useMemo<Record<string, StrategyPerformance>>(
    () => Object.fromEntries(overall?.strategies.map((p) => [p.strategy_id, p]) ?? []),
    [overall?.strategies],
  );

  const invalidateOverall = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['overall-performance'] });
  }, [queryClient]);
  const invalidatePortfolioCurve = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['equity-curve', 'portfolio'] });
  }, [queryClient]);
  const invalidateStrategies = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['strategies'] });
  }, [queryClient]);
  const invalidateStrategyCurves = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['equity-curve', 'strategy'] });
  }, [queryClient]);

  const portfolioFallback = useMemo(
    () => makeFallback('Portfolio summary failed to render.', invalidateOverall),
    [invalidateOverall],
  );
  const equityChartsFallback = useMemo(
    () => makeFallback('Portfolio charts failed to render.', invalidatePortfolioCurve),
    [invalidatePortfolioCurve],
  );
  const allocationFallback = useMemo(
    () => makeFallback('Allocation bar failed to render.', invalidateOverall),
    [invalidateOverall],
  );
  const cardGridFallback = useMemo(
    () => makeFallback('Strategy cards failed to render.', invalidateStrategies),
    [invalidateStrategies],
  );
  const multiStrategyFallback = useMemo(
    () => makeFallback('Strategy comparison chart failed to render.', invalidateStrategyCurves),
    [invalidateStrategyCurves],
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
        <ErrorBoundary fallbackRender={portfolioFallback}>
          <PortfolioSummary />
        </ErrorBoundary>
      </Suspense>
      {equityCurve ? (
        <Suspense fallback={<LoadingState />}>
          <ErrorBoundary fallbackRender={equityChartsFallback}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <EquityCurveChart data={equityCurve} title="Equity Curve" />
              <DrawdownChart data={equityCurve} title="Drawdown" />
            </div>
          </ErrorBoundary>
        </Suspense>
      ) : null}
      {overall ? (
        <Suspense fallback={<LoadingState />}>
          <ErrorBoundary fallbackRender={allocationFallback}>
            <AllocationBar allocation={overall.allocation} />
          </ErrorBoundary>
        </Suspense>
      ) : null}
      <Suspense fallback={<LoadingState />}>
        <ErrorBoundary fallbackRender={cardGridFallback}>
          <StrategyCardGrid strategies={filteredStrategies} performances={performances} />
        </ErrorBoundary>
      </Suspense>
      <Suspense fallback={<LoadingState />}>
        <ErrorBoundary fallbackRender={multiStrategyFallback}>
          <MultiStrategyChart series={deferredSeries} title="Strategy Comparison" />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}
