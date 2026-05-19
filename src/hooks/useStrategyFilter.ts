import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// `from?: string | undefined` is the widened-optional form (vs bare `from?: string`).
// Required with `exactOptionalPropertyTypes: true` so callers can pass `{ from: undefined }`
// to clear a single key without also having to omit the property entirely.
export interface DateRangeInput {
  readonly from?: string | undefined;
  readonly to?: string | undefined;
}

export interface UseStrategyFilterResult {
  readonly selectedIds: string[];
  readonly from: string | undefined;
  readonly to: string | undefined;
  readonly setSelectedIds: (ids: readonly string[]) => void;
  readonly setDateRange: (next: DateRangeInput) => void;
}

// URL: /?strategy=csm-set-01&strategy=tfex-01&from=2026-04-19&to=2026-05-19
//
// The URL search params are the single source of truth for filter state — no
// useState / localStorage mirror. Both setters use the functional updater form
// (Vercel `rerender-functional-setstate`) so two updates in the same tick
// compose cleanly instead of clobbering each other through a stale closure.
export function useStrategyFilter(): UseStrategyFilterResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedIds = searchParams.getAll('strategy');
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;

  const setSelectedIds = useCallback(
    (ids: readonly string[]) => {
      setSearchParams((prev) => {
        prev.delete('strategy');
        for (const id of ids) prev.append('strategy', id);
        return prev;
      });
    },
    [setSearchParams],
  );

  const setDateRange = useCallback(
    (next: DateRangeInput) => {
      setSearchParams((prev) => {
        if (next.from === undefined) prev.delete('from');
        else prev.set('from', next.from);
        if (next.to === undefined) prev.delete('to');
        else prev.set('to', next.to);
        return prev;
      });
    },
    [setSearchParams],
  );

  return { selectedIds, from, to, setSelectedIds, setDateRange } as const;
}
