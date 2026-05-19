import type { JSX } from 'react';

export interface NotFoundStateProps {
  readonly message?: string;
}

export function NotFoundState({ message }: NotFoundStateProps): JSX.Element {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center"
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-2xl font-semibold text-gray-500"
      >
        ?
      </span>
      <p className="text-sm text-gray-600">{message ?? 'Not found.'}</p>
    </div>
  );
}
