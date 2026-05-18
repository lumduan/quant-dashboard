import type { JSX } from 'react';

export function App(): JSX.Element {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">quant-dashboard</h1>
      <p className="mt-2 text-gray-600">
        React 19 SPA for the quant trading system. Layout, routing, and live data land in Phase 3.
      </p>
    </main>
  );
}
