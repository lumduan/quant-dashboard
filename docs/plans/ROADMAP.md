# Quant-Dashboard — Roadmap

`quant-dashboard` is the **React 19 + Vite + TypeScript** frontend of the quant trading system. It displays Portfolio Performance, Equity Curves, and Strategy Details by talking exclusively to `quant-api-gateway` over REST — no direct database connection. The container ships as Nginx serving the SPA on Docker network `quant-network`.

> **Principle:** Gateway computes everything. Dashboard only receives JSON and renders it.
> **Requires:** `quant-api-gateway` Phase 6 complete (11 REST endpoints ready) before this project's Phase 2 can be verified end-to-end.

**Conventions:** This roadmap is reconciled with [`.claude/knowledge/`](../../.claude/knowledge/) and the `vercel-react-best-practices` skill. Concretely:

- **`fetch` + Zod**, not `axios` ([stack-decisions.md §What We Deliberately Don't Use](../../.claude/knowledge/stack-decisions.md)).
- **Biome**, not ESLint + Prettier ([stack-decisions.md §Lint + Format](../../.claude/knowledge/stack-decisions.md)).
- **Zod schemas at every external boundary** — `project-skill.md` Hard Rule #4. Types are *inferred* from schemas, not duplicated.
- **TanStack Query** for client cache + dedup (Vercel `client-swr-dedup` equivalent for React Query).
- **React 19 patterns** — `<Suspense>` (`async-suspense-boundaries`), `useDeferredValue` (`rerender-use-deferred-value`), `startTransition` (`rerender-transitions`).
- **Bundle discipline** — Recharts code-split via `React.lazy` (Vercel `bundle-dynamic-imports`); no barrel files (`bundle-barrel-imports`).
- **Parallel fetches** — TanStack Query at the same level runs in parallel (Vercel `async-parallel`).

---

## Status Legend

| Symbol | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Completed |
| `[-]` | Skipped or deferred |

---

## Phase 1 — Project Bootstrap 🏗️

> **Goal:** Scaffold the project with Vite + TypeScript + Biome + TailwindCSS and wire a dev proxy to the Gateway.

The generic scaffold already covers most of Phase 1. The remaining work is the domain-library install, the dev proxy, env config, and replacing the template README.

#### 1.1 Vite Bootstrap

Already done (verify with `cat package.json`):

- `[x]` Vite 6 + React 19 + TypeScript 5 strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- `[x]` Biome 1.9 — lint + format in one binary
- `[x]` Vitest 3 + `@testing-library/react` + `@vitest/coverage-v8` (≥80% gate enforced in `vite.config.ts`)
- `[x]` Zod installed for boundary validation (Hard Rule #4)
- `[x]` Husky + lint-staged pre-commit (runs Biome on staged files)
- `[x]` `pnpm@9.15.0` pinned via Corepack (`packageManager` field)
- `[x]` `@/` path alias configured in `tsconfig.json` + `vite.config.ts`
- `[x]` `.gitignore` covers `.env`, `dist/`, `node_modules/`, `coverage/`

Remaining:

- `[ ]` Install domain dependencies (note: `axios` is **deliberately not** installed — use native `fetch` + Zod):
  ```bash
  pnpm add @tanstack/react-query react-router-dom recharts
  pnpm add -D tailwindcss @tailwindcss/vite
  ```
- `[ ]` Configure `vite.config.ts` — add the `/api` proxy and the Tailwind plugin. Use `loadEnv` so the proxy target reads from `.env`:
  ```typescript
  import { defineConfig, loadEnv } from 'vite'
  import react from '@vitejs/plugin-react'
  import tailwindcss from '@tailwindcss/vite'
  import { resolve } from 'node:path'

  export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    return {
      plugins: [react(), tailwindcss()],
      resolve: { alias: { '@': resolve(__dirname, 'src') } },
      server: {
        port: 5173,
        proxy: {
          '/api': {
            target: env.VITE_API_BASE_URL ?? 'http://localhost:8000',
            changeOrigin: true,
          },
        },
      },
    }
  })
  ```
- `[ ]` Activate `VITE_API_BASE_URL` in `.env.example` (currently commented out):
  ```env
  VITE_APP_NAME=quant-dashboard
  VITE_APP_VERSION=0.1.0
  VITE_API_BASE_URL=http://localhost:8000
  ```
- `[ ]` Update `src/config.ts` (per [architecture.md §Configuration](../../.claude/knowledge/architecture.md)) — add `VITE_API_BASE_URL` to the env Zod schema so misconfiguration fails fast at startup.
- `[ ]` Replace the generic-template `README.md` with quant-dashboard-specific overview, dev steps (`pnpm dev`), and deploy steps (`docker compose up -d dashboard`).

**Acceptance criteria:** `pnpm dev` → Vite on `localhost:5173` proxies `/api/*` to the Gateway. `pnpm build` succeeds. `pnpm quality` passes (lint + format + typecheck + test:coverage).

#### 1.2 Folder Structure

- `[ ]` Create feature folders under `src/` per [architecture.md](../../.claude/knowledge/architecture.md):
  ```
  src/
  ├── api/            # fetch wrappers + Zod response schemas
  ├── components/
  │   ├── charts/     # Recharts wrappers (lazy-loaded — see Phase 5)
  │   ├── filters/    # Strategy selector, date range
  │   ├── layout/     # AppLayout, Sidebar, Header
  │   ├── strategy/   # Strategy adapter components
  │   ├── ui/         # LoadingState, ErrorState, NotFoundState
  │   └── widgets/    # MetricCard, PortfolioSummary, AllocationBar, StrategyCardGrid
  ├── hooks/          # TanStack Query hooks + UI hooks
  ├── pages/          # DashboardPage, StrategyPage
  ├── types/          # Shared types (inferred from Zod schemas — no manual duplication)
  └── utils/          # formatters, palette, helpers
  ```
- `[ ]` No barrel `index.ts` files inside `components/*/` (Vercel `bundle-barrel-imports` — keep import paths statically analyzable). Exception: `src/components/charts/index.ts` re-exports `React.lazy` wrappers (Phase 5).

**Acceptance criteria:** Folder layout matches [architecture.md](../../.claude/knowledge/architecture.md). Biome `organizeImports` keeps order. No real credentials in repo.

---

## Phase 2 — Zod Schemas, Fetch Client & TanStack Query 🔌

> **Goal:** Define Zod schemas that mirror Gateway Pydantic schemas 1:1, build a typed `fetch` client (no axios), and wire TanStack Query hooks covering all 11 REST endpoints. Zod is the boundary; types are *inferred* — the schema is the source of truth.

#### 2.1 Zod Schemas & Inferred Types

- `[ ]` Create `src/api/schemas.ts` — mirror Gateway Pydantic schemas with Zod:
  ```typescript
  import { z } from 'zod'

  export const EquityPointSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),   // 'YYYY-MM-DD'
    value: z.number(),
  })

  export const StrategyInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),                                 // 'EQUITY_MOMENTUM' | 'TFEX_FUTURES' | ...
    capital_weight: z.number().min(0).max(1),
    active: z.boolean(),
  })

  export const StrategyPerformanceSchema = z.object({
    strategy_id: z.string(),
    daily_pnl: z.number(),
    total_value: z.number(),
    max_drawdown: z.number(),
    sharpe_ratio: z.number(),
    last_updated: z.string().datetime(),
  })

  export const OverallPerformanceSchema = z.object({
    total_portfolio_value: z.number(),
    weighted_daily_return: z.number(),
    combined_max_drawdown: z.number(),
    active_strategies: z.number().int(),
    allocation: z.record(z.string(), z.number()),
    strategies: z.array(StrategyPerformanceSchema),
    computed_at: z.string().datetime(),
  })

  export const PortfolioSnapshotSchema = z.object({
    date: z.string(),
    total_value: z.number(),
    weighted_return: z.number(),
    allocation: z.record(z.string(), z.number()),
  })
  ```
- `[ ]` Create `src/types/gateway.ts` — inferred types only (no duplicate hand-written interfaces):
  ```typescript
  import type { z } from 'zod'
  import type {
    EquityPointSchema,
    OverallPerformanceSchema,
    PortfolioSnapshotSchema,
    StrategyInfoSchema,
    StrategyPerformanceSchema,
  } from '@/api/schemas'

  export type EquityPoint = z.infer<typeof EquityPointSchema>
  export type StrategyInfo = z.infer<typeof StrategyInfoSchema>
  export type StrategyPerformance = z.infer<typeof StrategyPerformanceSchema>
  export type OverallPerformance = z.infer<typeof OverallPerformanceSchema>
  export type PortfolioSnapshot = z.infer<typeof PortfolioSnapshotSchema>
  ```
- `[ ]` Verify: `pnpm typecheck` passes; schema shapes match the Gateway response contract documented in `quant-api-gateway`.

**Acceptance criteria:** Hard Rule #4 satisfied — every external response is validated by a Zod schema; every domain type is inferred, never hand-written.

#### 2.2 Fetch Client (no axios)

- `[ ]` Create `src/api/client.ts` — typed `fetch` wrapper using `safeParse` (per [coding-standards.md §Error Handling](../../.claude/knowledge/coding-standards.md)):
  ```typescript
  import type { ZodSchema } from 'zod'

  export class ApiError extends Error {
    constructor(
      readonly status: number,
      readonly url: string,
      message: string,
    ) {
      super(message)
      this.name = 'ApiError'
    }
  }

  export async function apiFetch<T>(
    path: string,
    schema: ZodSchema<T>,
    init?: RequestInit,
  ): Promise<T> {
    const response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
    if (!response.ok) {
      throw new ApiError(response.status, path, `HTTP ${response.status} for ${path}`)
    }
    const raw: unknown = await response.json()
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(response.status, path, `Schema mismatch: ${parsed.error.message}`)
    }
    return parsed.data
  }
  ```
- `[ ]` Create `src/api/queries.ts` — one typed function per endpoint, no shared mutable state (Vercel `server-no-shared-module-state`):
  ```typescript
  import { z } from 'zod'
  import { apiFetch } from '@/api/client'
  import {
    EquityPointSchema,
    OverallPerformanceSchema,
    PortfolioSnapshotSchema,
    StrategyInfoSchema,
    StrategyPerformanceSchema,
  } from '@/api/schemas'

  const EquityCurveSchema = z.array(EquityPointSchema)
  const StrategyListSchema = z.array(StrategyInfoSchema)

  export const fetchOverallPerformance = () =>
    apiFetch('/api/v1/overall-performance', OverallPerformanceSchema)

  export const fetchStrategies = () =>
    apiFetch('/api/v1/strategies', StrategyListSchema)

  export const fetchStrategyPerformance = (id: string, from?: string, to?: string) => {
    const qs = new URLSearchParams()
    if (from) qs.set('from_date', from)
    if (to) qs.set('to_date', to)
    const tail = qs.toString()
    return apiFetch(
      `/api/v1/strategies/${encodeURIComponent(id)}/performance${tail ? `?${tail}` : ''}`,
      StrategyPerformanceSchema,
    )
  }

  export const fetchStrategyEquityCurve = (id: string) =>
    apiFetch(`/api/v1/strategies/${encodeURIComponent(id)}/equity-curve`, EquityCurveSchema)

  export const fetchPortfolioEquityCurve = (params?: {
    from?: string
    to?: string
    normalize?: boolean
  }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from_date', params.from)
    if (params?.to) qs.set('to_date', params.to)
    if (params?.normalize !== undefined) qs.set('normalize', String(params.normalize))
    const tail = qs.toString()
    return apiFetch(
      `/api/v1/portfolio/equity-curve${tail ? `?${tail}` : ''}`,
      EquityCurveSchema,
    )
  }

  export const fetchPortfolioSnapshot = (date?: string) =>
    apiFetch(
      date ? `/api/v1/portfolio/snapshot/${date}` : '/api/v1/portfolio/snapshot',
      PortfolioSnapshotSchema,
    )
  ```
- `[ ]` Co-locate `src/api/client.test.ts` (happy path, HTTP error, schema mismatch). Use **MSW** to mock the network per [coding-standards.md §Tests](../../.claude/knowledge/coding-standards.md).
- `[ ]` Verify in browser dev tools: `await fetchOverallPerformance()` returns validated typed data via the Vite dev proxy.

**Acceptance criteria:** All 11 endpoints typed and validated. No `any` in the client. Schema mismatches surface as `ApiError`, never silent.

#### 2.3 TanStack Query Hooks

- `[ ]` Wire `QueryClientProvider` in `src/main.tsx` with cache defaults aligned to Gateway's 5-minute cache TTL:
  ```typescript
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 4 * 60_000,       // refetch just before Gateway's 5-min TTL
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })
  ```
- `[ ]` Create `src/hooks/useGateway.ts` — one hook per endpoint:
  ```typescript
  import { useQuery } from '@tanstack/react-query'
  import {
    fetchOverallPerformance,
    fetchPortfolioEquityCurve,
    fetchStrategies,
    fetchStrategyEquityCurve,
  } from '@/api/queries'

  const FIVE_MINUTES = 5 * 60_000

  export const useOverallPerformance = () =>
    useQuery({
      queryKey: ['overall-performance'],
      queryFn: fetchOverallPerformance,
      refetchInterval: FIVE_MINUTES,
      staleTime: FIVE_MINUTES - 30_000,
    })

  export const useStrategies = () =>
    useQuery({ queryKey: ['strategies'], queryFn: fetchStrategies })

  export const useStrategyEquityCurve = (id: string) =>
    useQuery({
      queryKey: ['equity-curve', 'strategy', id],
      queryFn: () => fetchStrategyEquityCurve(id),
      enabled: Boolean(id),
    })

  export const usePortfolioEquityCurve = (
    normalize = true,
    from?: string,
    to?: string,
  ) =>
    useQuery({
      queryKey: ['equity-curve', 'portfolio', { normalize, from, to }],
      queryFn: () => fetchPortfolioEquityCurve({ normalize, from, to }),
    })
  ```
- `[ ]` Co-locate `useGateway.test.ts` — verify cache-key shape, `enabled` gating, and refetch interval.

**Acceptance criteria:** Hooks typed end-to-end. Same-level queries run in parallel automatically (Vercel `async-parallel`). Dedup handled by TanStack Query (`client-swr-dedup` equivalent).

---

## Phase 3 — Layout & Navigation 🗺️

> **Goal:** Build the AppLayout with a Sidebar that auto-generates its navigation from `GET /api/v1/strategies`.

#### 3.1 App Layout

- `[ ]` Create `src/components/layout/AppLayout.tsx` — wraps children in `<Suspense fallback={<LoadingState />}>` so route + chart chunks can stream (Vercel `async-suspense-boundaries`).
- `[ ]` Create `src/components/layout/Sidebar.tsx` — dynamic nav from `useStrategies()`. Each `<NavLink to={"/strategy/" + s.id}>` is generated from the API; adding a new strategy requires zero code change.
- `[ ]` Create `src/components/layout/Header.tsx`:
  - Connection indicator (🟢 connected / 🟡 fetching / 🔴 error) derived from `useOverallPerformance().status`.
  - "Last updated: HH:MM:SS" computed from `computed_at`.
  - Use **`useDeferredValue`** for the timestamp so the header never blocks chart re-renders (Vercel `rerender-use-deferred-value`).
- `[ ]` Configure React Router in `src/main.tsx`:
  ```typescript
  import { BrowserRouter, Route, Routes } from 'react-router-dom'

  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/strategy/:id" element={<StrategyPage />} />
        </Routes>
      </AppLayout>
    </QueryClientProvider>
  </BrowserRouter>
  ```
- `[ ]` Verify: navigation between Dashboard ↔ Strategy works; Sidebar shows active strategies from the API.

**Acceptance criteria:** Layout responsive at ≥1280px. Sidebar entries generated dynamically from API response. Suspense fallback visible during initial load.

---

## Phase 4 — Portfolio Summary Widget 📈

> **Goal:** Display the 4 main portfolio metrics + Capital Allocation Bar using `GET /api/v1/overall-performance`.

#### 4.1 Formatters

- `[ ]` Create `src/utils/formatters.ts`. Hoist `Intl` instances to module scope (Vercel `js-cache-function-results` — `Intl` constructors are expensive):
  ```typescript
  const THB_FORMATTER = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  })

  const DATE_FORMATTER = new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  export const formatTHB = (v: number): string => THB_FORMATTER.format(v)

  export const formatPercent = (v: number, decimals = 2): string =>
    `${v >= 0 ? '+' : ''}${(v * 100).toFixed(decimals)}%`

  export const formatDateTH = (iso: string): string =>
    DATE_FORMATTER.format(new Date(iso))

  export const trendColor = (v: number): string =>
    v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-gray-400'
  ```
- `[ ]` Co-locate `formatters.test.ts` covering positive, negative, zero, and edge cases (very large THB, fractional %).

**Acceptance criteria:** `formatTHB(1_000_000)` → "฿1,000,000". `formatPercent(0.0123)` → "+1.23%". `formatPercent(-0.0123)` → "-1.23%". Intl instances are module-scoped.

#### 4.2 MetricCard, PortfolioSummary & AllocationBar

- `[ ]` Create `src/components/widgets/MetricCard.tsx` — pure presentation; props marked `readonly` per [coding-standards.md §TypeScript](../../.claude/knowledge/coding-standards.md). No internal state. **Do not** define this component inside another component (Vercel `rerender-no-inline-components`).
- `[ ]` Create `src/components/widgets/PortfolioSummary.tsx` — 4-up grid:
  - Portfolio value (`formatTHB`), today's return (`formatPercent`, colored), Max Drawdown (`formatPercent`), active strategy count.
  - Subscribes to `useOverallPerformance()` and renders skeletons while loading.
- `[ ]` Create `src/components/widgets/AllocationBar.tsx`:
  - Stacked bar; each segment is one strategy weight from `data.allocation: Record<string, number>`.
  - Colors come from the shared palette in `src/utils/palette.ts` so the bar visually matches the charts.
- `[ ]` Co-locate tests per widget using `getByRole` / `getByText` ([coding-standards.md §Tests](../../.claude/knowledge/coding-standards.md)).

**Acceptance criteria:** Widget renders all 4 metrics + AllocationBar from real Gateway data. Negative values red, positive green. Each widget ≥80% coverage.

---

## Phase 5 — Equity Curve Charts 📉

> **Goal:** Build Recharts-based components for Equity Curve, Drawdown, and Multi-strategy Overlay — **lazy-loaded so the Recharts bundle (~150 KB gzipped) never blocks first paint**.

This is where Vercel `bundle-dynamic-imports` matters most. All chart components are default exports loaded via `React.lazy`.

- `[ ]` Create `src/utils/palette.ts`:
  ```typescript
  export const STRATEGY_COLORS = [
    '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
  ] as const
  ```
- `[ ]` Create `src/components/charts/index.ts` — `React.lazy` re-exports (the only allowed barrel in the project):
  ```typescript
  import { lazy } from 'react'
  export const EquityCurveChart   = lazy(() => import('./EquityCurveChart'))
  export const DrawdownChart      = lazy(() => import('./DrawdownChart'))
  export const MultiStrategyChart = lazy(() => import('./MultiStrategyChart'))
  ```
  Consumers wrap with `<Suspense fallback={<LoadingState />}>`.

#### 5.1 EquityCurveChart

- `[ ]` Create `src/components/charts/EquityCurveChart.tsx` (default export for `React.lazy`):
  - Props: `readonly data: EquityPoint[]`, `readonly normalize?: boolean`, `readonly height?: number`, `readonly title?: string`.
  - `normalize=true` → Base 100; `normalize=false` → raw THB.
  - `ReferenceLine` at y=100 when normalized.
  - Tooltip shows formatted value and date.
  - `useMemo` for the derived series so chart isn't recomputed on every parent render (Vercel `rerender-memo`).
- `[ ]` Co-locate test: renders, normalize toggle flips axis baseline, tooltip text contains formatted value.

**Acceptance criteria:** Both normalized and raw modes render. `pnpm build` log shows chart code in a separate chunk.

#### 5.2 DrawdownChart

- `[ ]` Create `src/components/charts/DrawdownChart.tsx`:
  - Derive drawdown via `useMemo` from the equity series: `(peak - current) / peak * -100`.
  - Red `<Area />`; X-axis shape matches `EquityCurveChart` so they stack visually.
  - Tooltip shows drawdown % on hover.
- `[ ]` Verify peak drawdown matches `OverallPerformance.combined_max_drawdown` from Gateway.

**Acceptance criteria:** DrawdownChart renders correctly; max drawdown matches the Gateway value.

#### 5.3 MultiStrategyChart

- `[ ]` Create `src/components/charts/MultiStrategyChart.tsx`:
  ```typescript
  interface Series {
    readonly id: string
    readonly label: string
    readonly data: EquityPoint[]
    readonly color: string
  }
  ```
  - Always `normalize=true` (cross-scale comparison).
  - Pulls colors from `STRATEGY_COLORS`.
  - Use **`useDeferredValue`** on the series array so filter changes don't block input (Vercel `rerender-use-deferred-value`).
- `[ ]` Verify: 2+ strategies render with distinct colors; `Legend` shows strategy names.

**Acceptance criteria:** Multiple strategies overlay on one chart with distinct colors and a shared Y-axis.

---

## Phase 6 — Strategy Adapter Components 🔌

> **Goal:** Implement the Adapter pattern so each strategy type has its own display component — adding a new type only requires a new entry in `ADAPTER_MAP`.

#### 6.1 Adapter Factory

- `[ ]` Create `src/components/strategy/StrategyAdapterFactory.tsx`. The `Record` is an O(1) lookup (Vercel `js-set-map-lookups`):
  ```typescript
  import type { ComponentType } from 'react'
  import type { StrategyInfo } from '@/types/gateway'
  import { CSMSetAdapter } from './CSMSetAdapter'
  import { DefaultAdapter } from './DefaultAdapter'
  import { TFEXAdapter } from './TFEXAdapter'

  export interface StrategyAdapterProps {
    readonly strategy: StrategyInfo
  }

  const ADAPTER_MAP: Readonly<Record<string, ComponentType<StrategyAdapterProps>>> = {
    EQUITY_MOMENTUM: CSMSetAdapter,
    TFEX_FUTURES:    TFEXAdapter,
  }

  export function StrategyAdapterFactory({ strategy }: StrategyAdapterProps): JSX.Element {
    const Adapter = ADAPTER_MAP[strategy.type] ?? DefaultAdapter
    return <Adapter strategy={strategy} />
  }
  ```

**Acceptance criteria:** Adding a new strategy type only requires adding to `ADAPTER_MAP` — no other code changes.

#### 6.2 CSMSetAdapter (EQUITY_MOMENTUM)

- `[ ]` Create `src/components/strategy/CSMSetAdapter.tsx`:
  - Performance metrics: Daily PnL, Total Value, Sharpe Ratio, Max Drawdown.
  - Lazy `EquityCurveChart` (`normalize=true`) sourced from `useStrategyEquityCurve(strategy.id)`.
  - Capital-weight badge: `Weight: {(strategy.capital_weight * 100).toFixed(0)}% of portfolio`.
  - Dev-only collapsible raw-JSON viewer gated by `import.meta.env.DEV`.
- `[ ]` Co-locate test (renders all metrics; chart `Suspense` fallback shows then resolves).

**Acceptance criteria:** CSM-SET shows equity curve + all metrics. No TypeScript errors.

#### 6.3 DefaultAdapter & TFEXAdapter

- `[ ]` Create `src/components/strategy/DefaultAdapter.tsx`:
  - Yellow warning badge: `Strategy type "{type}" has no adapter`.
  - Shows generic performance metrics so unknown types don't break the page.
- `[ ]` Create `src/components/strategy/TFEXAdapter.tsx` — stub for future TFEX integration:
  - "Coming soon" UI.
  - Props prepared: `margin_level`, `contract_expiry`, `position_direction`.
- `[ ]` Verify: unknown strategy type → `DefaultAdapter` with warning; page still renders.

**Acceptance criteria:** Unknown type does not crash the dashboard; fallback UI displays correctly.

---

## Phase 7 — Interactive Filter & Date Range 🔍

> **Goal:** Store filter state in URL search params — bookmarkable, refresh-safe filtered URLs.

#### 7.1 Strategy Filter Hook

- `[ ]` Create `src/hooks/useStrategyFilter.ts`:
  ```typescript
  import { useCallback } from 'react'
  import { useSearchParams } from 'react-router-dom'

  // URL: /?strategy=csm-set-01&from=2026-01-01&to=2026-05-17
  export function useStrategyFilter() {
    const [searchParams, setSearchParams] = useSearchParams()

    const selectedIds = searchParams.getAll('strategy')
    const from = searchParams.get('from') ?? undefined
    const to   = searchParams.get('to')   ?? undefined

    const setSelectedIds = useCallback((ids: readonly string[]) => {
      // functional update — never relies on stale closure (Vercel rerender-functional-setstate)
      setSearchParams((prev) => {
        prev.delete('strategy')
        for (const id of ids) prev.append('strategy', id)
        return prev
      })
    }, [setSearchParams])

    const setDateRange = useCallback((next: { from?: string; to?: string }) => {
      setSearchParams((prev) => {
        if (next.from) prev.set('from', next.from); else prev.delete('from')
        if (next.to)   prev.set('to',   next.to);   else prev.delete('to')
        return prev
      })
    }, [setSearchParams])

    return { selectedIds, from, to, setSelectedIds, setDateRange } as const
  }
  ```
- `[ ]` Verify: changing filter updates URL; refresh restores filter state.

**Acceptance criteria:** Filter state survives reload via URL params.

#### 7.2 Filter Components

- `[ ]` Create `src/components/filters/StrategySelector.tsx`:
  - Multi-select dropdown driven by `useStrategies()`.
  - Checkbox + capital-weight badge per row; "All" / "Clear" buttons.
- `[ ]` Create `src/components/filters/DateRangePicker.tsx`:
  - `<input type="date">` for From / To.
  - Defaults: `from` = 30 days ago, `to` = today.
  - Validate `from ≤ to` on change (block invalid state with a visible message).
- `[ ]` Create `src/components/filters/FilterBar.tsx` — composes `StrategySelector` + `DateRangePicker`. Wrap setter calls in `startTransition` so filter changes are non-urgent and the input stays responsive (Vercel `rerender-transitions`).
- `[ ]` Use `selectedIds` to filter `MultiStrategyChart` and `StrategyCardGrid`.

**Acceptance criteria:** Both filters work; URL is the source of truth; bookmarked URL restores state exactly.

---

## Phase 8 — Dashboard & Strategy Pages 🖥️

> **Goal:** Assemble all components into the Dashboard and Strategy Detail pages, with Loading/Error/NotFound states and parallel data fetching.

#### 8.1 DashboardPage

- `[ ]` Create `src/pages/DashboardPage.tsx`:
  - Hooks: `useOverallPerformance()`, `usePortfolioEquityCurve()`, `useStrategyFilter()`. TanStack Query runs these **in parallel** when called at the same level (Vercel `async-parallel`).
  - Layout: `FilterBar → PortfolioSummary → (EquityCurveChart | DrawdownChart) 2-col → AllocationBar → StrategyCardGrid`.
  - Each async section wrapped in `<Suspense fallback={<LoadingState />}>` (Vercel `async-suspense-boundaries`).
  - Errors wrapped in `<ErrorBoundary fallback={<ErrorState />}>`.
- `[ ]` Create `src/components/widgets/StrategyCardGrid.tsx`:
  - One card per strategy: name, daily PnL (colored by sign), Max DD, Sharpe.
  - Click → `navigate('/strategy/' + id)` via `useNavigate`.

**Acceptance criteria:** Dashboard loads, filter works, card-grid navigates to the detail page.

#### 8.2 StrategyPage

- `[ ]` Create `src/pages/StrategyPage.tsx`:
  ```typescript
  import { useParams } from 'react-router-dom'
  import { StrategyAdapterFactory } from '@/components/strategy/StrategyAdapterFactory'
  import { NotFoundState } from '@/components/ui/NotFoundState'
  import { useStrategies } from '@/hooks/useGateway'

  export default function StrategyPage(): JSX.Element {
    const { id } = useParams<{ id: string }>()
    const { data: strategies } = useStrategies()
    const strategy = strategies?.find((s) => s.id === id)

    if (!strategy) return <NotFoundState message={`Strategy not found: ${id}`} />

    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">{strategy.name}</h1>
        <StrategyAdapterFactory strategy={strategy} />
      </div>
    )
  }
  ```
- `[ ]` Verify: `/strategy/csm-set-01` → `CSMSetAdapter`; `/strategy/unknown-id` → `NotFoundState`.

**Acceptance criteria:** Page renders the correct adapter for the strategy type.

#### 8.3 UI States

- `[ ]` Create `src/components/ui/LoadingState.tsx` — skeleton that matches real content layout (not a generic spinner).
- `[ ]` Create `src/components/ui/ErrorState.tsx` — error icon + message + Retry button (calls `QueryClient.invalidateQueries` for the failed key).
- `[ ]` Create `src/components/ui/NotFoundState.tsx` — shown when a strategy id is not in the registry.
- `[ ]` Tests use `getByRole` / `getByText` per [coding-standards.md §Accessibility](../../.claude/knowledge/coding-standards.md).

**Acceptance criteria:** Loading / Error / NotFound display correctly in their respective scenarios.

---

## Phase 9 — Docker Integration & Nginx 🐳

> **Goal:** Package the dashboard as a Docker container that runs on `quant-network`. Most of this is already scaffolded — the remaining work is the `/api/` proxy, `/healthz`, and the Compose service.

#### 9.1 Nginx Config — add `/api/` proxy + `/healthz`

Already in `nginx.conf`:

- `[x]` SPA fallback (`try_files $uri $uri/ /index.html`)
- `[x]` Security headers (X-Frame-Options, X-Content-Type-Options, CSP, etc.)
- `[x]` gzip enabled
- `[x]` Hashed-asset caching + `index.html` no-cache

Remaining:

- `[ ]` Add `/api/` proxy_pass to the Gateway:
  ```nginx
  location /api/ {
      proxy_pass         http://quant-api-gateway:8000;
      proxy_set_header   Host              $host;
      proxy_set_header   X-Real-IP         $remote_addr;
      proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_read_timeout 30s;
  }
  ```
- `[ ]` Add `/healthz` route:
  ```nginx
  location = /healthz {
      access_log off;
      return 200 'ok';
      add_header Content-Type text/plain;
  }
  ```

**Acceptance criteria:** Nginx proxies `/api/` to `quant-api-gateway:8000`; `/healthz` returns 200; SPA routing still works.

#### 9.2 Dockerfile

Already done:

- `[x]` Multi-stage (`node:20-alpine` builder → `nginx:1.27-alpine` server)
- `[x]` `corepack enable` + `pnpm install --frozen-lockfile` + `pnpm build`
- `[x]` `HEALTHCHECK` configured

Remaining:

- `[ ]` After 9.1 lands, point `HEALTHCHECK` at `/healthz` (currently `wget -qO- http://localhost/`):
  ```dockerfile
  HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost/healthz || exit 1
  ```

**Acceptance criteria:** `docker build -t quant-dashboard .` succeeds; final image < 50 MB.

#### 9.3 Docker Compose Integration

- `[ ]` Add a `dashboard` service to the trading-system umbrella `docker-compose.yml` (or create one in this repo's root if the umbrella file is elsewhere):
  ```yaml
  services:
    dashboard:
      build:
        context: ./quant-dashboard
      container_name: quant-dashboard
      restart: always
      ports:
        - "3000:80"
      depends_on:
        api-gateway:
          condition: service_healthy
      networks:
        - quant-network
      healthcheck:
        test: ["CMD-SHELL", "wget -qO- http://localhost/healthz || exit 1"]
        interval: 30s
        timeout: 5s
        retries: 3

  networks:
    quant-network:
      external: true
  ```
- `[ ]` Verify: `docker compose up -d dashboard` → status `healthy`; `http://localhost:3000` → dashboard renders live Gateway data through the Nginx proxy.

**Acceptance criteria:** Dashboard runs on `quant-network`; all `/api/*` calls route via Nginx to `quant-api-gateway:8000`.

---

## Project File Structure

```
quant-dashboard/
├── nginx.conf
├── Dockerfile
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts
├── tsconfig.json
├── biome.json
├── .env.example
├── .gitignore
├── README.md
│
├── docs/
│   └── plans/
│       └── ROADMAP.md
│
└── src/
    ├── main.tsx
    ├── config.ts                  # Zod-validated import.meta.env
    │
    ├── api/
    │   ├── client.ts              # fetch wrapper + ApiError + safeParse
    │   ├── client.test.ts
    │   ├── schemas.ts             # Zod schemas (source of truth)
    │   └── queries.ts             # one function per Gateway endpoint
    │
    ├── types/
    │   └── gateway.ts             # z.infer types — no hand-written interfaces
    │
    ├── hooks/
    │   ├── useGateway.ts          # TanStack Query hooks
    │   ├── useGateway.test.ts
    │   ├── useStrategyFilter.ts   # URL-as-state
    │   └── useStrategyFilter.test.ts
    │
    ├── utils/
    │   ├── formatters.ts          # THB / %, date, trend color
    │   ├── formatters.test.ts
    │   └── palette.ts             # STRATEGY_COLORS
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.tsx
    │   │   ├── Sidebar.tsx
    │   │   └── Header.tsx
    │   ├── charts/
    │   │   ├── index.ts                  # React.lazy re-exports
    │   │   ├── EquityCurveChart.tsx      # default export
    │   │   ├── DrawdownChart.tsx         # default export
    │   │   └── MultiStrategyChart.tsx    # default export
    │   ├── widgets/
    │   │   ├── PortfolioSummary.tsx
    │   │   ├── MetricCard.tsx
    │   │   ├── AllocationBar.tsx
    │   │   └── StrategyCardGrid.tsx
    │   ├── filters/
    │   │   ├── FilterBar.tsx
    │   │   ├── StrategySelector.tsx
    │   │   └── DateRangePicker.tsx
    │   ├── strategy/
    │   │   ├── StrategyAdapterFactory.tsx
    │   │   ├── CSMSetAdapter.tsx
    │   │   ├── TFEXAdapter.tsx
    │   │   └── DefaultAdapter.tsx
    │   └── ui/
    │       ├── LoadingState.tsx
    │       ├── ErrorState.tsx
    │       └── NotFoundState.tsx
    │
    └── pages/
        ├── DashboardPage.tsx
        └── StrategyPage.tsx
```

---

## Dependency Map

```
Phase 1 (Project Bootstrap)
    └── Phase 2 (Zod Schemas + fetch Client + TanStack Query)
            └── Phase 3 (Layout + Navigation)
                    ├── Phase 4 (Portfolio Summary Widget)
                    ├── Phase 5 (Equity Curve Charts — lazy)
                    ├── Phase 6 (Strategy Adapter Components)
                    └── Phase 7 (Interactive Filter + Date Range)
                            └── Phase 8 (Dashboard + Strategy Pages)
                                    └── Phase 9 (Docker + Nginx)
```

**External project dependencies:**

- `quant-api-gateway` Phase 6 must be complete — all 11 REST endpoints live.
- `strategies.json` must contain at least 1 active strategy (CSM-SET).
- `quant-network` Docker network must be running (created by `quant-infra-db`).

---

## Overall Exit Criteria

> `docker compose up -d dashboard` from a fresh clone → everything ready with no additional configuration.

- [ ] `docker compose ps` shows `quant-dashboard` status `healthy`.
- [ ] `http://localhost:3000` → Portfolio Summary displays all Gateway fields.
- [ ] Equity Curve chart renders; hover tooltip shows correct values.
- [ ] Sidebar auto-generates the strategy menu from `GET /api/v1/strategies`.
- [ ] Filter bar: changing strategy / date range updates charts in realtime and writes to URL search params.
- [ ] `/strategy/csm-set-01` → `CSMSetAdapter` shows that strategy's equity curve.
- [ ] `pnpm typecheck` passes with no errors.
- [ ] `pnpm test:coverage` passes with ≥80% on lines / functions / branches / statements.
- [ ] `pnpm quality` (lint + format + typecheck + test:coverage) passes.
- [ ] `pnpm build` produces `dist/` successfully; **main bundle < 250 KB gzipped**, **Recharts in a separate lazy chunk**.
- [ ] No `console.log` in committed code; no `any` outside justified `// biome-ignore` lines; every external response validated by a Zod schema.

---

## Current Status

- **Current phase:** Phase 1 — Project Bootstrap (generic scaffold complete; domain dependencies, `/api` proxy, and env config still pending).
- **Completed:**
  - Generic scaffold — Vite 6, React 19, TypeScript 5 strict, Biome 1.9, Vitest 3, Husky + lint-staged, Docker multi-stage, Nginx with SPA fallback + security headers, GitHub Actions CI / docker-publish / security-audit, `.claude/` knowledge base, Zod, `pnpm@9.15.0` pinned via Corepack.
- **Blocked by:** `quant-api-gateway` Phase 6 (11 REST endpoints) must be live before Phase 2 can be verified end-to-end.
- **Next step:** finish Phase 1 — install domain dependencies (`@tanstack/react-query`, `react-router-dom`, `recharts`, `tailwindcss`, `@tailwindcss/vite`), add the `/api` proxy to `vite.config.ts`, and activate `VITE_API_BASE_URL` in `.env.example`.

---

## Related Notes

- `quant-api-gateway` — API Gateway Roadmap (Phase 1–7, 11 REST Endpoints)
- `quant-csm-set` — Architecture Overview and Standard JSON Schema
- `quant-infra-db` — Infrastructure: PostgreSQL + MongoDB + Docker Network (`quant-network`)
- `quant-csm-set-adapter` — CSM-SET Adapter that sends data to the Gateway
- [`.claude/knowledge/project-skill.md`](../../.claude/knowledge/project-skill.md) — Hard Rules + Soft Conventions (entry point for any AI agent)
- [`.claude/knowledge/stack-decisions.md`](../../.claude/knowledge/stack-decisions.md) — why `fetch`+Zod over `axios`; why Biome over ESLint+Prettier
- [`.claude/knowledge/architecture.md`](../../.claude/knowledge/architecture.md) — folder structure + module boundaries (`api → hooks → components → pages`)
- [`.claude/knowledge/coding-standards.md`](../../.claude/knowledge/coding-standards.md) — naming, file size budgets, error handling, accessibility
- [`.claude/knowledge/commands.md`](../../.claude/knowledge/commands.md) — every `pnpm` / docker / git command you'll need
- [`.claude/skills/vercel-react-best-practices/SKILL.md`](../../.claude/skills/vercel-react-best-practices/SKILL.md) — performance rule reference (parallel fetches, lazy chunks, `useDeferredValue`, `startTransition`)
