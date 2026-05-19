import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { StrategyAdapterFactory } from '@/components/strategy/StrategyAdapterFactory';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotFoundState } from '@/components/ui/NotFoundState';
import { useStrategies } from '@/hooks/useGateway';

export function StrategyPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data: strategies, isPending } = useStrategies();

  if (isPending) {
    return <LoadingState message="Loading strategy…" />;
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
