import type { JSX } from 'react';
import { Link } from 'react-router-dom';

export interface NotFoundStateProps {
  readonly message?: string;
}

export function NotFoundState({ message }: NotFoundStateProps): JSX.Element {
  return (
    <main className="flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-2xl font-semibold text-gray-500"
      >
        ?
      </span>
      <p className="text-sm text-gray-600">{message ?? 'Not found.'}</p>
      <Link
        to="/"
        className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        Back to Dashboard
      </Link>
    </main>
  );
}
