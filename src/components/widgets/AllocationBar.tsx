import { useMemo, type JSX } from 'react';
import { formatPercent } from '@/utils/formatters';
import { STRATEGY_COLORS } from '@/utils/palette';

export interface AllocationBarProps {
  readonly allocation: Record<string, number>;
}

interface Segment {
  readonly id: string;
  readonly label: string;
  readonly weight: number;
  readonly color: string;
}

const FALLBACK_COLOR = '#94a3b8';

export function AllocationBar({ allocation }: AllocationBarProps): JSX.Element {
  const segments = useMemo<readonly Segment[]>(() => {
    const sorted = [...Object.entries(allocation)].sort((a, b) => b[1] - a[1]);
    return sorted.map(([id, weight], i) => ({
      id,
      label: id,
      weight,
      color: STRATEGY_COLORS[i % STRATEGY_COLORS.length] ?? FALLBACK_COLOR,
    }));
  }, [allocation]);

  return (
    <section aria-label="Capital allocation" className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
        {segments.map((segment) => (
          <div
            key={segment.id}
            aria-label={`${segment.label} ${formatPercent(segment.weight)}`}
            style={{ width: `${segment.weight * 100}%`, background: segment.color }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
        {segments.map((segment) => (
          <li key={segment.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: segment.color }}
            />
            <span className="text-gray-700">{segment.label}</span>
            <span className="ml-auto tabular-nums text-gray-500">
              {formatPercent(segment.weight)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
