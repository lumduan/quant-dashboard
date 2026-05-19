import { type JSX, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StrategyInfo, StrategyPerformance } from '@/types/gateway';
import { formatPercent, trendColor } from '@/utils/formatters';

export interface StrategyCardGridProps {
  readonly strategies: StrategyInfo[];
  readonly performances: Record<string, StrategyPerformance>;
}

interface StrategyCardProps {
  readonly strategy: StrategyInfo;
  readonly performance: StrategyPerformance | undefined;
  readonly onSelect: (id: string) => void;
}

function StrategyCard({ strategy, performance, onSelect }: StrategyCardProps): JSX.Element {
  const handleClick = useCallback(() => onSelect(strategy.id), [onSelect, strategy.id]);
  const pnl = performance?.daily_pnl ?? 0;
  const dd = performance?.max_drawdown ?? 0;
  const sharpe = performance?.sharpe_ratio ?? 0;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-gray-300"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{strategy.name}</p>
        {strategy.type && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {strategy.type}
          </span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-gray-500">Daily PnL</dt>
          <dd className={`tabular-nums ${trendColor(pnl)}`}>{formatPercent(pnl)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Max DD</dt>
          <dd className="tabular-nums text-red-400">{formatPercent(dd)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Sharpe</dt>
          <dd className="tabular-nums text-gray-900">{sharpe.toFixed(2)}</dd>
        </div>
      </dl>
    </button>
  );
}

export function StrategyCardGrid({ strategies, performances }: StrategyCardGridProps): JSX.Element {
  const navigate = useNavigate();
  const onSelect = useCallback(
    (id: string) => {
      navigate(`/strategy/${id}`);
    },
    [navigate],
  );
  const sorted = useMemo(
    () => [...strategies].sort((a, b) => a.name.localeCompare(b.name)),
    [strategies],
  );

  if (sorted.length === 0) {
    return <output className="block text-sm text-gray-500">No strategies to display.</output>;
  }

  return (
    <section
      aria-label="Strategy cards"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {sorted.map((s) => (
        <StrategyCard
          key={s.id}
          strategy={s}
          performance={performances[s.id]}
          onSelect={onSelect}
        />
      ))}
    </section>
  );
}
