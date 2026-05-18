import { Suspense, type JSX } from 'react';
import { DrawdownChart, EquityCurveChart, MultiStrategyChart } from '@/components/charts';
import { LoadingState } from '@/components/ui/LoadingState';
import { AllocationBar } from '@/components/widgets/AllocationBar';
import { PortfolioSummary } from '@/components/widgets/PortfolioSummary';
import { useOverallPerformance, usePortfolioEquityCurve } from '@/hooks/useGateway';

export function DashboardPage(): JSX.Element {
  const { data: overall } = useOverallPerformance();
  const { data: equityCurve } = usePortfolioEquityCurve();

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-bold">Dashboard</h1>
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
      {/*
        MultiStrategyChart ships as a Phase-5 component but is rendered with an empty
        series array until Phase 8 wires per-strategy parallel fetching via useQueries
        (matches Phase 8's async-parallel ownership; documented in
        docs/plans/phase_5_equity_curve_charts.md).
      */}
      <Suspense fallback={<LoadingState />}>
        <MultiStrategyChart series={[]} title="Strategy Comparison" />
      </Suspense>
    </div>
  );
}
