import type { JSX } from 'react';

export interface LoadingStateProps {
  readonly message?: string;
}

export function LoadingState({ message }: LoadingStateProps): JSX.Element {
  return (
    <output
      aria-busy="true"
      aria-label={message ?? 'Loading content'}
      className="block space-y-4 p-6"
    >
      {message ? <p className="text-sm text-gray-500">{message}</p> : null}
      <div className="h-8 w-1/3 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="h-24 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="h-64 animate-pulse rounded bg-gray-200" />
    </output>
  );
}
