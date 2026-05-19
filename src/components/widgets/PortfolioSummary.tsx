import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, type JSX } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { MetricCard } from '@/components/widgets/MetricCard';
import { useOverallPerformance } from '@/hooks/useGateway';
import { formatPercent, formatTHB, trendColor } from '@/utils/formatters';

const GRID_CLASS = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4';

export function PortfolioSummary(): JSX.Element {
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useOverallPerformance();
  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['overall-performance'] });
  }, [queryClient]);

  const portfolioValue = useMemo(
    () => formatTHB(data?.total_portfolio_value ?? 0),
    [data?.total_portfolio_value],
  );
  const dailyReturn = useMemo(
    () => formatPercent(data?.weighted_daily_return ?? 0),
    [data?.weighted_daily_return],
  );
  const dailyReturnColor = useMemo(
    () => trendColor(data?.weighted_daily_return ?? 0),
    [data?.weighted_daily_return],
  );
  const maxDrawdown = useMemo(
    () => formatPercent(data?.combined_max_drawdown ?? 0),
    [data?.combined_max_drawdown],
  );
  const maxDrawdownColor = useMemo(
    () => trendColor(data?.combined_max_drawdown ?? 0),
    [data?.combined_max_drawdown],
  );
  const activeStrategies = useMemo(
    () => String(data?.active_strategies ?? 0),
    [data?.active_strategies],
  );

  if (isPending) {
    return (
      <output
        aria-busy="true"
        aria-label="Loading portfolio summary"
        className={`block ${GRID_CLASS}`}
      >
        <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
      </output>
    );
  }

  if (isError || !data) {
    return <ErrorState message="Failed to load portfolio summary." onRetry={handleRetry} />;
  }

  return (
    <section aria-label="Portfolio summary" className={GRID_CLASS}>
      <MetricCard label="Portfolio Value" value={portfolioValue} />
      <MetricCard label="Today's Return" value={dailyReturn} colorClass={dailyReturnColor} />
      <MetricCard label="Max Drawdown" value={maxDrawdown} colorClass={maxDrawdownColor} />
      <MetricCard label="Active Strategies" value={activeStrategies} subtitle="strategies" />
    </section>
  );
}
