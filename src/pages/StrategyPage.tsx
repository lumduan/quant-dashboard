import { useQueryClient } from '@tanstack/react-query';
import { type JSX, Suspense, useCallback, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { StrategyAdapterFactory } from '@/components/strategy/StrategyAdapterFactory';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotFoundState } from '@/components/ui/NotFoundState';
import { HeadlineKPIStrip } from '@/components/widgets/HeadlineKPIStrip';
import { ReportHeader } from '@/components/widgets/ReportHeader';
import { TradeLogTable } from '@/components/widgets/TradeLogTable';
import { useStrategies, useStrategyReport, useStrategyTrades } from '@/hooks/useGateway';

const DEFAULT_LIMIT = 100;

export function StrategyPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'metrics';

  const { data: strategies, isPending, isError } = useStrategies();

  const [tradesOffset, setTradesOffset] = useState(0);

  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['strategies'] });
  }, [queryClient]);

  const handleTabChange = useCallback(
    (tab: string) => {
      setSearchParams({ tab }, { replace: true });
    },
    [setSearchParams],
  );

  const handleTradesPageChange = useCallback((offset: number) => {
    setTradesOffset(offset);
  }, []);

  const strategy = useMemo(
    () => strategies?.find((s) => s.id === id),
    [strategies, id],
  );

  // Fetch report and trades data only when the corresponding tab is active
  const {
    data: reportResponse,
    isPending: reportPending,
    isError: reportError,
  } = useStrategyReport(id ?? '', undefined);

  const {
    data: tradesPage,
    isPending: tradesPending,
    isError: tradesError,
  } = useStrategyTrades(id ?? '', {
    limit: DEFAULT_LIMIT,
    offset: tradesOffset,
  });

  if (isPending) {
    return <LoadingState message="Loading strategy…" />;
  }

  if (isError) {
    return <ErrorState message="Failed to load strategies" onRetry={handleRetry} />;
  }

  if (!strategy) {
    return <NotFoundState message={`Strategy not found: ${id ?? '(no id)'}`} />;
  }

  return (
    <div className="space-y-6 p-6">
      <ReportHeader
        strategyName={strategy.name}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {activeTab === 'metrics' ? (
        <Suspense fallback={<LoadingState />}>
          <ErrorBoundary
            fallbackRender={({ error, resetErrorBoundary }) => (
              <ErrorState message={error.message} onRetry={resetErrorBoundary} />
            )}
          >
            <StrategyAdapterFactory strategy={strategy} />
          </ErrorBoundary>
        </Suspense>
      ) : null}

      {activeTab === 'report' ? (
        <Suspense fallback={<LoadingState message="Loading report…" />}>
          <ErrorBoundary
            fallbackRender={({ error, resetErrorBoundary }) => (
              <ErrorState message={error.message} onRetry={resetErrorBoundary} />
            )}
          >
            {reportPending ? (
              <LoadingState message="Loading strategy report…" />
            ) : reportError ? (
              <ErrorState
                message="Failed to load strategy report"
                onRetry={() =>
                  queryClient.invalidateQueries({ queryKey: ['strategy-report', id] })
                }
              />
            ) : reportResponse ? (
              <div className="space-y-8">
                <HeadlineKPIStrip headline={reportResponse.report.headline} />
                <Suspense fallback={<LoadingState message="Loading charts…" />}>
                  <div className="space-y-8">
                    <section aria-label="Profit structure">
                      <h2 className="mb-3 text-sm font-semibold text-[#B2B5BE]">
                        Profit Structure
                      </h2>
                    </section>
                    <section aria-label="Returns table">
                      <h2 className="mb-3 text-sm font-semibold text-[#B2B5BE]">Returns</h2>
                    </section>
                  </div>
                </Suspense>
              </div>
            ) : (
              <ErrorState
                message="No report data available for this strategy"
                onRetry={() =>
                  queryClient.invalidateQueries({ queryKey: ['strategy-report', id] })
                }
              />
            )}
          </ErrorBoundary>
        </Suspense>
      ) : null}

      {activeTab === 'trades' ? (
        <Suspense fallback={<LoadingState message="Loading trades…" />}>
          <ErrorBoundary
            fallbackRender={({ error, resetErrorBoundary }) => (
              <ErrorState message={error.message} onRetry={resetErrorBoundary} />
            )}
          >
            {tradesPending ? (
              <LoadingState message="Loading trades…" />
            ) : tradesError ? (
              <ErrorState
                message="Failed to load trades"
                onRetry={() =>
                  queryClient.invalidateQueries({ queryKey: ['strategy-trades', id] })
                }
              />
            ) : tradesPage ? (
              <TradeLogTable page={tradesPage} onPageChange={handleTradesPageChange} />
            ) : (
              <ErrorState
                message="No trade data available"
                onRetry={() =>
                  queryClient.invalidateQueries({ queryKey: ['strategy-trades', id] })
                }
              />
            )}
          </ErrorBoundary>
        </Suspense>
      ) : null}
    </div>
  );
}
