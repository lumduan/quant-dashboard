import { Suspense, type JSX } from 'react';
import { LoadingState } from '@/components/ui/LoadingState';
import { AllocationBar } from '@/components/widgets/AllocationBar';
import { PortfolioSummary } from '@/components/widgets/PortfolioSummary';
import { useOverallPerformance } from '@/hooks/useGateway';

export function DashboardPage(): JSX.Element {
  const { data } = useOverallPerformance();

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <Suspense fallback={<LoadingState />}>
        <PortfolioSummary />
      </Suspense>
      {data ? (
        <Suspense fallback={<LoadingState />}>
          <AllocationBar allocation={data.allocation} />
        </Suspense>
      ) : null}
    </div>
  );
}
