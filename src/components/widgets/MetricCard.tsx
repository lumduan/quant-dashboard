import type { JSX } from 'react';

export interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly colorClass?: string;
  readonly subtitle?: string;
}

export function MetricCard({ label, value, colorClass, subtitle }: MetricCardProps): JSX.Element {
  const valueClass = ['text-2xl font-semibold tabular-nums', colorClass ?? 'text-gray-900']
    .join(' ')
    .trim();

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={valueClass}>{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
    </article>
  );
}
