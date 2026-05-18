import { useDeferredValue, useMemo, type JSX } from 'react';
import { useOverallPerformance } from '@/hooks/useGateway';

const STATUS_LABEL = {
  success: '🟢 Connected',
  pending: '🟡 Fetching',
  error: '🔴 Error',
} as const;

const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function formatTime(iso: string | undefined): string {
  if (!iso) return '—';
  return TIME_FORMATTER.format(new Date(iso));
}

export function Header(): JSX.Element {
  const { status, data } = useOverallPerformance();
  const computedAt = useMemo(() => formatTime(data?.computed_at), [data?.computed_at]);
  const deferred = useDeferredValue(computedAt);

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-base font-semibold text-gray-900">quant-dashboard</h1>
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span aria-label="Connection status">{STATUS_LABEL[status]}</span>
        <span aria-label="Last updated">Last updated: {deferred}</span>
      </div>
    </header>
  );
}
