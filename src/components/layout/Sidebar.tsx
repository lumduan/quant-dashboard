import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { useStrategies } from '@/hooks/useGateway';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive
    ? 'block rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900'
    : 'block rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-50';
}

export function Sidebar(): JSX.Element {
  const { data: strategies, isPending } = useStrategies();
  const active = strategies?.filter((s) => s.active) ?? [];

  return (
    <nav aria-label="Primary" className="w-64 shrink-0 border-r border-gray-200 bg-white p-4">
      <ul className="space-y-1">
        <li>
          <NavLink to="/" end className={navLinkClass}>
            Dashboard
          </NavLink>
        </li>
      </ul>
      <div className="mt-6">
        <h2 className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Strategies
        </h2>
        {isPending ? (
          <output
            aria-busy="true"
            aria-label="Loading strategies"
            className="mt-2 block space-y-2 px-3"
          >
            <div className="h-8 animate-pulse rounded bg-gray-200" />
            <div className="h-8 animate-pulse rounded bg-gray-200" />
            <div className="h-8 animate-pulse rounded bg-gray-200" />
          </output>
        ) : (
          <ul className="mt-2 space-y-1">
            {active.map((strategy) => (
              <li key={strategy.id}>
                <NavLink to={`/strategy/${strategy.id}`} className={navLinkClass}>
                  {strategy.name}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}
