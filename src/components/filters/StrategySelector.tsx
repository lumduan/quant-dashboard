import { type JSX, useCallback } from 'react';
import { useStrategies } from '@/hooks/useGateway';

export interface StrategySelectorProps {
  readonly selectedIds: readonly string[];
  readonly onChange: (ids: readonly string[]) => void;
}

export function StrategySelector({
  selectedIds,
  onChange,
}: StrategySelectorProps): JSX.Element | null {
  const { data: strategies, isPending, isError } = useStrategies();

  const handleToggle = useCallback(
    (id: string) => {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id];
      onChange(next);
    },
    [selectedIds, onChange],
  );

  const handleAll = useCallback(() => {
    const active = strategies?.filter((s) => s.active) ?? [];
    onChange(active.map((s) => s.id));
  }, [strategies, onChange]);

  const handleClear = useCallback(() => onChange([]), [onChange]);

  if (isPending) {
    return (
      <output aria-busy="true" aria-label="Loading strategies" className="block space-y-2">
        <div className="h-8 animate-pulse rounded bg-gray-200" />
        <div className="h-8 animate-pulse rounded bg-gray-200" />
      </output>
    );
  }

  if (isError || !strategies) return null;

  const active = strategies.filter((s) => s.active);

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wider text-gray-600">
        Strategies
      </legend>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAll}
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
        >
          All
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
        >
          Clear
        </button>
      </div>
      <ul className="space-y-1">
        {active.map((s) => {
          const checked = selectedIds.includes(s.id);
          const weight = (s.capital_weight * 100).toFixed(0);
          return (
            <li key={s.id}>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggle(s.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>{s.name}</span>
                <span className="text-xs text-gray-500">({weight}%)</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
