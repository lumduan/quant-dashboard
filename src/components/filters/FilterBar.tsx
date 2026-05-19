import { type JSX, startTransition, useCallback } from 'react';
import { DateRangePicker } from '@/components/filters/DateRangePicker';
import { StrategySelector } from '@/components/filters/StrategySelector';
import type { DateRangeInput } from '@/hooks/useStrategyFilter';

export interface FilterBarProps {
  readonly selectedIds: readonly string[];
  readonly from: string | undefined;
  readonly to: string | undefined;
  readonly onSelectedIdsChange: (ids: readonly string[]) => void;
  readonly onDateRangeChange: (range: DateRangeInput) => void;
}

// Filter changes are non-urgent: a checkbox click should never block the input
// from showing the new state, even if downstream re-renders (chart, summary)
// are expensive. `startTransition` marks the URL update as low-priority so
// React keeps the bar responsive (Vercel `rerender-transitions`).
export function FilterBar({
  selectedIds,
  from,
  to,
  onSelectedIdsChange,
  onDateRangeChange,
}: FilterBarProps): JSX.Element {
  const handleSelectedIds = useCallback(
    (ids: readonly string[]) => startTransition(() => onSelectedIdsChange(ids)),
    [onSelectedIdsChange],
  );

  const handleDateRange = useCallback(
    (range: DateRangeInput) => startTransition(() => onDateRangeChange(range)),
    [onDateRangeChange],
  );

  return (
    <section
      aria-label="Filters"
      className="flex flex-wrap items-start gap-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <StrategySelector selectedIds={selectedIds} onChange={handleSelectedIds} />
      <DateRangePicker from={from} to={to} onChange={handleDateRange} />
    </section>
  );
}
