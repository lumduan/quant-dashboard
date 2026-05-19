import { useQueryClient } from '@tanstack/react-query';
import { type JSX, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { StrategyAdapterFactory } from '@/components/strategy/StrategyAdapterFactory';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotFoundState } from '@/components/ui/NotFoundState';
import { useStrategies } from '@/hooks/useGateway';

export function StrategyPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: strategies, isPending, isError } = useStrategies();

  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['strategies'] });
  }, [queryClient]);

  if (isPending) {
    return <LoadingState message="Loading strategy…" />;
  }

  if (isError) {
    return <ErrorState message="Failed to load strategies" onRetry={handleRetry} />;
  }

  const strategy = strategies?.find((s) => s.id === id);
  if (!strategy) {
    return <NotFoundState message={`Strategy not found: ${id ?? '(no id)'}`} />;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-bold">{strategy.name}</h1>
      <StrategyAdapterFactory strategy={strategy} />
    </div>
  );
}
