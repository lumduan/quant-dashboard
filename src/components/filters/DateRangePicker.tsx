import { type ChangeEvent, type JSX, useCallback, useMemo, useState } from 'react';
import type { DateRangeInput } from '@/hooks/useStrategyFilter';

const ONE_DAY_MS = 86_400_000;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - THIRTY_DAYS_MS).toISOString().slice(0, 10);
}

export interface DateRangePickerProps {
  readonly from: string | undefined;
  readonly to: string | undefined;
  readonly onChange: (range: DateRangeInput) => void;
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps): JSX.Element {
  const defaultFrom = useMemo(() => thirtyDaysAgoIso(), []);
  const defaultTo = useMemo(() => todayIso(), []);

  // Local draft state lets the inputs show what the user typed even when the
  // resulting range is invalid (parent stays on the last-valid URL state).
  // `onChange` is only fired when `draftFrom <= draftTo`. No useEffect for
  // prop->draft sync — external URL changes are not expected in Phase 7.
  const [draftFrom, setDraftFrom] = useState<string>(() => from ?? defaultFrom);
  const [draftTo, setDraftTo] = useState<string>(() => to ?? defaultTo);

  const isInvalid = draftFrom > draftTo;

  const handleFromChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      setDraftFrom(next);
      if (next <= draftTo) onChange({ from: next, to: draftTo });
    },
    [draftTo, onChange],
  );

  const handleToChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      setDraftTo(next);
      if (draftFrom <= next) onChange({ from: draftFrom, to: next });
    },
    [draftFrom, onChange],
  );

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wider text-gray-600">
        Date Range
      </legend>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>From</span>
          <input
            type="date"
            aria-label="From"
            value={draftFrom}
            onChange={handleFromChange}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>To</span>
          <input
            type="date"
            aria-label="To"
            value={draftTo}
            onChange={handleToChange}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      </div>
      {isInvalid ? (
        <p role="alert" className="text-sm text-red-600">
          From date must be before To date
        </p>
      ) : null}
    </fieldset>
  );
}
