# Phase 8 — Dashboard & Strategy Pages (quant-dashboard)

| Field | Value |
|---|---|
| Phase | 8 — Dashboard & Strategy Pages |
| Date | 2026-05-19 |
| Author | Claude (Opus 4.7), acting on lumduan's behalf |
| Branch | `phase-8-dashboard-strategy-pages` |
| Target | `main` (github.com/lumduan/quant-dashboard) |
| Linked roadmap | `docs/plans/ROADMAP.md` §Phase 8 (8.1 DashboardPage, 8.2 StrategyPage, 8.3 UI States) |

---

## Context

Phase 7 completed the URL-as-state filter layer (172/172 tests, main bundle 103.26 KB gzip). The remaining Phase 8 work is the **glue layer that turns Phase 1–7 into a complete UI**: the `StrategyCardGrid` widget, a route-aware `ErrorState` + `ErrorBoundary`, a navigable `NotFoundState`, and the wiring that puts retry-on-failure inside every async section of the dashboard.

Reading the actual repo state (not the ROADMAP-as-written) the picture is narrower than the plan template suggests:

- **`StrategyPage.tsx` already exists** (28 lines) — uses `useParams` + `useStrategies()` + `LoadingState` + `NotFoundState` + `StrategyAdapterFactory`. **Missing:** an `isError` branch with retry-on-invalidation.
- **`NotFoundState.tsx` already exists** — but its container is `role="alert"` and it has **no "Back to Dashboard" link**. Phase 8 spec wants a semantic landmark (`role="main"`) plus a `<Link to="/">` back. Switching `role` will break two existing assertions (`StrategyPage.test.tsx:57`, `NotFoundState.test.tsx:8/14`) which we update in the same patch.
- **`LoadingState.tsx`, `MetricCard.tsx`, `PortfolioSummary.tsx`, `AllocationBar.tsx`, all charts, the adapter factory, and `FilterBar`** ship and are unchanged.
- **`DashboardPage.tsx`** already does the parallel `useOverallPerformance` + `usePortfolioEquityCurve` + `useStrategies` + `useQueries`-per-strategy fan-out and wraps each section in `<Suspense>`. **Missing:** the `StrategyCardGrid`, the `ErrorBoundary` wrap on every section, and the `useDeferredValue(series)` defer on the `MultiStrategyChart` prop.
- **`react-error-boundary` is NOT in `package.json`** — we ship a minimal class-based `ErrorBoundary` (`src/components/ui/ErrorBoundary.tsx`) with a `fallbackRender({ error, resetErrorBoundary })` contract that mirrors the upstream library's API.
- **TanStack Query swallows errors into `isError`** by default — `ErrorBoundary` does NOT catch them. The "ErrorState shown when overallPerf query errors" test therefore requires `PortfolioSummary`'s existing inline `<p role="alert">Failed…</p>` to be replaced with `<ErrorState onRetry={…invalidateQueries…} />`. Documented as a Phase-4 follow-up upgrade in §Architecture decisions.
- **MSW handlers** already cover all five endpoints DashboardPage / StrategyPage need. Error variants are introduced **per-test via `server.use(http.get(..., () => new HttpResponse(null, { status: 500 })))`** — the project's existing idiom (`DashboardPage.test.tsx:52` already overrides `/strategies` this way). No new entries in `handlers.ts`.

Phase 8 is verified end-to-end via MSW-mocked Vitest + `pnpm quality` (≥ 80 % all metrics) + a clean `pnpm build` (Recharts chunks remain lazy; main < 250 KB gzip — current 103.26 KB leaves ample headroom). Live-Gateway sanity stays deferred until `quant-api-gateway` Phase 6 ships.

---

## Scope

### In scope

1. **`src/components/ui/ErrorBoundary.tsx`** — minimal class-based boundary with `fallbackRender({ error, resetErrorBoundary }) => ReactNode` + `onReset?` prop. No `console` calls (Hard Rule #2 + `noConsole` Biome rule).
2. **`src/components/ui/ErrorBoundary.test.tsx`** — happy path (children render), catches a thrown error and invokes `fallbackRender`, `resetErrorBoundary` clears state and re-renders children, `onReset` callback fires.
3. **`src/components/ui/ErrorState.tsx`** — props `{ readonly message: string; readonly onRetry?: () => void }`. Container `role="alert"`. Renders icon (decorative, `aria-hidden`) + message + optional Retry `<button>`. Pure presentation; the caller owns `queryClient.invalidateQueries`.
4. **`src/components/ui/ErrorState.test.tsx`** — renders message, renders Retry button only when `onRetry` provided, omitted button absent, click calls `onRetry`, container has `role="alert"`.
5. **`src/components/ui/NotFoundState.tsx`** — **modified**: container becomes `<main role="main">` (semantic full-page landmark) and gains a `<Link to="/">Back to Dashboard</Link>` (react-router-dom). Message + icon retained.
6. **`src/components/ui/NotFoundState.test.tsx`** — **modified**: existing assertions switch from `getByRole('alert')` → `getByRole('main')`; new assertion checks the back link's `href` is `/`. Wrap render in `MemoryRouter` (use `renderWithProviders`).
7. **`src/components/widgets/StrategyCardGrid.tsx`** — props `{ readonly strategies: StrategyInfo[]; readonly performances: Record<string, StrategyPerformance> }`. Renders one `<StrategyCard>` per strategy in a `useMemo`-sorted grid. **`StrategyCard` is a named function at module scope in the same file** (Vercel `rerender-no-inline-components`). Each card is a `<button type="button">` (keyboard + a11y) with `onClick → navigate('/strategy/' + id)` via `useNavigate`. Shows: name, type badge, Daily PnL (`formatPercent` + `trendColor`), Max Drawdown (`formatPercent`), Sharpe Ratio. Empty `strategies` → `<p role="status">No strategies to display.</p>`.
8. **`src/components/widgets/StrategyCardGrid.test.tsx`** — renders correct number of cards, shows formatted PnL with `trendColor` class, click calls `useNavigate` with `/strategy/:id` (mock via `vi.mock('react-router-dom', …, useNavigate: () => navigateMock)`), empty array renders the empty status.
9. **`src/components/widgets/PortfolioSummary.tsx`** — **modified**: `isError || !data` branch swaps the inline `<p role="alert">` for `<ErrorState message="Failed to load portfolio summary." onRetry={() => queryClient.invalidateQueries({ queryKey: ['overall-performance'] })} />`. Adds `useQueryClient()` import.
10. **`src/components/widgets/PortfolioSummary.test.tsx`** — **modified**: existing error-path test asserts `Retry` button presence + click triggers a re-fetch (verify via second handler invocation count).
11. **`src/pages/DashboardPage.tsx`** — **modified**: each `<Suspense>` section wrapped in `<ErrorBoundary fallbackRender={…}>`; new `<StrategyCardGrid>` section placed after `<AllocationBar>` and before `<MultiStrategyChart>`; `useDeferredValue(series)` applied to the chart prop; `performances` map computed via `useMemo(() => Object.fromEntries(overall?.strategies.map((p) => [p.strategy_id, p]) ?? []), [overall?.strategies])`.
12. **`src/pages/DashboardPage.test.tsx`** — **extended**: assert `StrategyCardGrid` cards render, assert `ErrorState` appears when `overall-performance` returns 500 (via `server.use(...)`), assert retry-click triggers a re-fetch.
13. **`src/pages/StrategyPage.tsx`** — **modified**: add `isError` branch returning `<ErrorState message="Failed to load strategies" onRetry={() => queryClient.invalidateQueries({ queryKey: ['strategies'] })} />`. Add `useQueryClient` import.
14. **`src/pages/StrategyPage.test.tsx`** — **extended**: error-state test (mock 500 on `/strategies`, assert `<ErrorState>` with Retry, click retry → second fetch). Existing NotFound test switches `findByRole('alert')` → `findByRole('main')`.
15. **`docs/plans/phase_8_dashboard_strategy_pages.md`** — this plan, embedded verbatim agent prompt at the bottom + Progress / Completion section appended after implementation.
16. **`docs/plans/ROADMAP.md`** — tick all Phase 8 `[ ]` items as `[x] done 2026-05-19`; "Current Status" → Phase 9; Next step → "Phase 9 — Docker Integration & Nginx".

### Out of scope

- **Per-strategy `from`/`to` query params** — the `useStrategyEquityCurve` hook does not take date params today; would need Gateway-side filter support first.
- **`useStrategyPerformance` history per card** — `StrategyCardGrid` reads aggregate `OverallPerformance.strategies[]` already returned by a single Gateway round-trip. No additional fan-out.
- **`react-error-boundary` install** — explicitly skipped to avoid bundle weight for a 60-line class-based shim.
- **Bake error variants into `handlers.ts`** — handlers stay happy-path-only; per-test `server.use(...)` overrides remain the project idiom.
- **Replace inline `<p role="alert">` in `Sidebar`/`AllocationBar`** — not strictly required by §8.3. Out of scope; leave for a future cleanup.
- **`throwOnError: true` on TanStack Query** — would let the ErrorBoundary catch query errors but breaks the existing `isError` contract and would need every consumer audited. Skipped.
- **E2E live-Gateway smoke** — blocked by `quant-api-gateway` Phase 6.

---

## Architecture decisions & constraints

| Decision | Why |
|---|---|
| **`ErrorBoundary` is class-based, custom, 1 file** | `react-error-boundary` adds ~1 KB gzip for a 60-line shim. The class component (`componentDidCatch`, `getDerivedStateFromError`, `reset()`) is React-stable since 16.0. Public contract mirrors the upstream library so a future swap is mechanical. |
| **`ErrorBoundary` uses `fallbackRender` prop, not `fallback`** | Lets the caller compose `useQueryClient()` inside the fallback (per spec). A flat `fallback: ReactNode` prop would force callers to hoist the query client outside React. |
| **`onReset?` callback is the seam where the page wires `invalidateQueries`** | Keeps ErrorBoundary pure; pages own which keys to invalidate. The render-prop's `resetErrorBoundary` clears the boundary's own state. |
| **PortfolioSummary's `isError` branch refactored to use `ErrorState`** | TanStack Query swallows query errors into `isError` — ErrorBoundary does not catch them. The only way to satisfy "ErrorState shown when overallPerf query errors" is to render it from inside the consuming component. ErrorBoundary remains the safety net for **render-time** crashes. |
| **`NotFoundState` upgraded from `role="alert"` to `<main role="main">`** | A full-page 404 is a navigation landmark, not a transient alert; `<main>` is the correct semantic. The existing 3 tests update in the same patch. |
| **`<Link to="/">` (not `<a href="/">`)** | Client-side navigation, no full-page reload, integrates with `MemoryRouter` in tests. Requires `react-router-dom` (already at 7.15.1). |
| **`StrategyCard` is a named module-scope function in the same file as `StrategyCardGrid`** | Vercel `rerender-no-inline-components`. Same-file is acceptable (Phase 6's `StrategyAdapterFactory` uses the same pattern). |
| **`StrategyCard` is a `<button type="button">`** | Real button semantics (keyboard activation, focus ring) without nesting interactive elements. PnL/Sharpe content stays semantic inside; click handler memoizes cleanly. |
| **`useNavigate` consumed at the grid level via a `useCallback` over `id`** | Stable handler per card instance; avoids new closure per render. Card receives `onSelect: (id: string) => void`. |
| **`useDeferredValue` applied at the page level on `series`** | Idempotent with `MultiStrategyChart`'s internal defer; satisfies the spec; communicates intent at the call site. |
| **`performances` map computed via `useMemo` over `overall?.strategies`** | One pass; O(n) build, O(1) per-card lookup. Vercel `js-set-map-lookups`. |
| **Per-test `server.use(...)` for error variants** | Project's established MSW v2 idiom. Avoids polluting the shared `handlers.ts` with conditional logic. |
| **All props `readonly`, named exports for non-page components** | Hard rule + project convention. |
| **No new runtime dependencies** | `react-error-boundary` skipped; `react-router-dom` already installed. Bundle budget preserved. |
| **No barrel files added** | `src/components/charts/index.ts` remains the only allowed barrel. |

### Vercel best-practice rules applied

| Rule tag | Where it's enforced |
|---|---|
| `async-parallel` | `DashboardPage` calls `useOverallPerformance` + `useStrategies` + `usePortfolioEquityCurve` + `useStrategyFilter` at the same level; `useQueries` fans out per-strategy curves in parallel. |
| `async-suspense-boundaries` | Every async section (`PortfolioSummary`, `AllocationBar`, equity/drawdown charts, `MultiStrategyChart`, `StrategyCardGrid`) wrapped in its own `<Suspense>`. |
| `rerender-use-deferred-value` | `useDeferredValue` on `series` at page level + already inside `MultiStrategyChart`; also `useDeferredValue` in `Header` (Phase 3). |
| `rerender-transitions` | `startTransition` wraps setter calls in `FilterBar` (Phase 7). |
| `rerender-no-inline-components` | `StrategyCard` defined at module scope in `StrategyCardGrid.tsx`; one top-level component per file. |
| `rerender-memo` | `useMemo` on `filteredStrategies`, `series`, `performances`, sorted `strategies` in `StrategyCardGrid`. |
| `bundle-dynamic-imports` | Recharts split via `React.lazy` in `src/components/charts/index.ts` (Phase 5). |
| `bundle-barrel-imports` | Only `src/components/charts/index.ts` is a barrel; all other imports are statically analyzable. |
| `js-set-map-lookups` | `performances: Record<string, StrategyPerformance>` for O(1) card lookups; `ADAPTER_MAP` in `StrategyAdapterFactory` (Phase 6). |

---

## Deliverables

### Created

| Path | Purpose |
|---|---|
| `docs/plans/phase_8_dashboard_strategy_pages.md` | This plan |
| `src/components/ui/ErrorBoundary.tsx` | Class-based boundary; `fallbackRender({ error, resetErrorBoundary })` + `onReset?` |
| `src/components/ui/ErrorBoundary.test.tsx` | Happy path, catches throw, reset clears state, `onReset` fires |
| `src/components/ui/ErrorState.tsx` | `role="alert"` + icon + message + optional Retry button |
| `src/components/ui/ErrorState.test.tsx` | Message renders, Retry present/absent, click fires `onRetry`, `role="alert"` |
| `src/components/widgets/StrategyCardGrid.tsx` | Cards from `strategies` + `performances`; `StrategyCard` named subcomponent |
| `src/components/widgets/StrategyCardGrid.test.tsx` | Card count, formatted PnL + color, navigate-on-click, empty array → status |

### Modified

| Path | Change |
|---|---|
| `src/components/ui/NotFoundState.tsx` | Container → `<main role="main">`; add `<Link to="/">Back to Dashboard</Link>` |
| `src/components/ui/NotFoundState.test.tsx` | Switch `getByRole('alert')` → `getByRole('main')`; new test for back link `href="/"`; wrap in `renderWithProviders` for `MemoryRouter` |
| `src/components/widgets/PortfolioSummary.tsx` | `isError` branch → `<ErrorState onRetry={() => queryClient.invalidateQueries(['overall-performance'])} />` |
| `src/components/widgets/PortfolioSummary.test.tsx` | Error-path test asserts Retry button + click triggers re-fetch |
| `src/pages/DashboardPage.tsx` | Wrap each `<Suspense>` in `<ErrorBoundary>`; add `<StrategyCardGrid>`; `useDeferredValue(series)`; build `performances` via `useMemo` |
| `src/pages/DashboardPage.test.tsx` | Add: StrategyCardGrid renders cards, ErrorState appears on 500, Retry triggers re-fetch |
| `src/pages/StrategyPage.tsx` | Add `isError` branch with `<ErrorState onRetry={…invalidateQueries(['strategies'])…} />` |
| `src/pages/StrategyPage.test.tsx` | Existing NotFound assertion switches role; add error-state + retry test |
| `docs/plans/ROADMAP.md` | Tick §8.1 / §8.2 / §8.3 boxes; advance "Current Status" to Phase 9 |
| `.claude/knowledge/coding-standards.md` (if pattern new) | Add ErrorBoundary + TanStack Query invalidation snippet if absent |

### Untouched

- `src/api/*`, `src/hooks/*`, `src/types/*`, `src/utils/*` — data + util layer unchanged.
- `src/components/charts/*`, `src/components/strategy/*`, `src/components/filters/*`, `src/components/layout/*` — Phase 1–7 outputs final.
- `src/components/widgets/MetricCard.tsx`, `AllocationBar.tsx` — unchanged.
- `src/components/ui/LoadingState.tsx` — unchanged.
- `src/test/mocks/handlers.ts`, `src/test/mocks/server.ts`, `src/test/render.tsx`, `src/test-setup.ts` — unchanged.
- `src/main.tsx`, `vite.config.ts`, `tsconfig.json`, `biome.json`, `package.json`, `pnpm-lock.yaml` — no new deps, no router changes.

---

## Acceptance criteria

- [ ] `ErrorBoundary` catches a thrown render-time error and calls `fallbackRender({ error, resetErrorBoundary })`; `resetErrorBoundary` clears `hasError`; `onReset?` fires on reset.
- [ ] `ErrorState` renders `role="alert"` container, message text, and Retry button **only when** `onRetry` is provided; click calls `onRetry`.
- [ ] `NotFoundState` renders inside `<main role="main">` with the message and a `<Link to="/">Back to Dashboard</Link>` (`href === '/'`).
- [ ] `StrategyCardGrid` renders one card per strategy with name, type badge, formatted Daily PnL (`trendColor` class), Max DD, Sharpe. Click navigates to `/strategy/:id`. Empty array → `role="status"` message.
- [ ] `StrategyCard` is a module-scope named function in the same file as `StrategyCardGrid` (no inline component definitions).
- [ ] `DashboardPage` renders `FilterBar → PortfolioSummary → (EquityCurve | Drawdown) → AllocationBar → StrategyCardGrid → MultiStrategyChart`, each async section wrapped in `<Suspense fallback={<LoadingState />}><ErrorBoundary fallbackRender={…}>…</ErrorBoundary></Suspense>`.
- [ ] `MultiStrategyChart` `series` prop derived via `useDeferredValue` at the page level.
- [ ] `PortfolioSummary` `isError` branch renders `<ErrorState>` whose Retry button calls `queryClient.invalidateQueries({ queryKey: ['overall-performance'] })`.
- [ ] `StrategyPage` `isError` branch renders `<ErrorState>` whose Retry button calls `queryClient.invalidateQueries({ queryKey: ['strategies'] })`.
- [ ] `pnpm typecheck` — zero errors.
- [ ] `pnpm lint` — zero findings.
- [ ] `pnpm format` — no drift.
- [ ] `pnpm test:coverage` — all green; **total test count ≥ 172 + Phase 8 additions** (target ≈ +20–28 new tests, ≈ 192–200 total); coverage ≥ 80 % lines / funcs / branches / statements project-wide.
- [ ] `pnpm build` — succeeds; **main bundle ≤ 110 KB gzip** (Phase 7 baseline 103.26 KB; budget +6.74 KB).
- [ ] Recharts chunks remain in separate lazy chunks; main bundle stays well under 250 KB gzip.
- [ ] `pnpm quality` — full gate green.
- [ ] No `any`; no `console.log`; no hand-written domain interfaces; no axios; all props `readonly`.
- [ ] `docs/plans/phase_8_dashboard_strategy_pages.md` created with verbatim agent prompt at the bottom + Progress / Completion section appended after implementation.
- [ ] `docs/plans/ROADMAP.md` Phase 8 boxes ticked; "Current Status" → Phase 9; "Next step" → Phase 9.
- [ ] Branch `phase-8-dashboard-strategy-pages` cut off `main`; commit follows Conventional Commits; PR opened to `main`.

---

## Implementation order

1. `git checkout -b phase-8-dashboard-strategy-pages`.
2. Write this plan, commit `docs(phase-8): add implementation plan for dashboard & strategy pages`.
3. **UI primitives first (no upstream deps):**
   1. `ErrorBoundary.tsx` + test.
   2. `ErrorState.tsx` + test.
   3. `NotFoundState.tsx` modification + test rewrite.
4. **Widget:** `StrategyCardGrid.tsx` + test (mocks `useNavigate`).
5. **Cross-phase touch:** `PortfolioSummary.tsx` `isError` branch swap + test update.
6. **Page wiring:** `StrategyPage.tsx` `isError` branch + test update.
7. **Page wiring:** `DashboardPage.tsx` — wrap sections in `<ErrorBoundary>`, add `<StrategyCardGrid>`, `useDeferredValue(series)`, build `performances` via `useMemo` + test extension.
8. `pnpm typecheck && pnpm lint && pnpm format && pnpm test:coverage && pnpm build` → iterate to green.
9. Append "Progress / Completion" section to this plan with final test count, bundle gzip, deviations.
10. Update `docs/plans/ROADMAP.md` (boxes, Current Status → Phase 9, Next step).
11. Re-evaluate `.claude/knowledge/coding-standards.md`: add **only** if ErrorBoundary + `invalidateQueries` retry pattern is not already documented.
12. Commit implementation: `feat(phase-8): dashboard & strategy pages — StrategyCardGrid, ErrorState, NotFoundState, DashboardPage, StrategyPage`.
13. Commit docs: `docs(phase-8): update roadmap, plan notes, and knowledge base`.
14. `git push -u origin phase-8-dashboard-strategy-pages`.
15. `gh pr create --base main --title "Phase 8: Dashboard & Strategy Pages" --body …`.

---

## Critical files (reuse, don't recreate)

- **`src/hooks/useGateway.ts → useStrategies(), useOverallPerformance(), usePortfolioEquityCurve(normalize, from?, to?)`** — already wired; Phase 8 only consumes.
- **`src/types/gateway.ts → StrategyInfo, StrategyPerformance, OverallPerformance`** — `z.infer` types reused by `StrategyCardGrid` props.
- **`src/utils/formatters.ts → formatPercent, trendColor, formatTHB`** — used by `StrategyCardGrid` cards.
- **`src/components/strategy/StrategyAdapterFactory.tsx`** — `StrategyPage` already routes through it.
- **`src/components/charts/index.ts`** — barrel of lazy chart wrappers; consumed by `DashboardPage` unchanged.
- **`src/components/widgets/MetricCard.tsx`** — reference for the card visual language; StrategyCard borrows the same Tailwind classes.
- **`src/test/render.tsx → renderWithProviders`** — `QueryClient` + `MemoryRouter` (supports `route` prop); used by every new test.
- **`src/test/mocks/handlers.ts`** — happy-path handlers; Phase 8 tests override with `server.use(...)` for 500 variants.
- **`src/components/widgets/PortfolioSummary.tsx`** — reference for the `isPending` / `isError` / `data` guard ladder.

---

## Testing strategy

| Test file | Key assertions |
|---|---|
| `ErrorBoundary.test.tsx` | Children render normally; throwing child → `fallbackRender` invoked with the thrown error; `resetErrorBoundary` removes the error UI and re-renders children; `onReset?` callback fires on reset. Suppress React's expected `console.error` for the throw via `vi.spyOn(console, 'error').mockImplementation(() => {})`. |
| `ErrorState.test.tsx` | `getByRole('alert')` present; `getByText(message)` present; `getByRole('button', { name: 'Retry' })` only when `onRetry` provided; click fires `onRetry` (jest mock); no Retry button when `onRetry` omitted. |
| `NotFoundState.test.tsx` (rewrite) | `getByRole('main')` present with message; `getByRole('link', { name: /back to dashboard/i }).getAttribute('href') === '/'`; default vs custom message. Wrap in `renderWithProviders`. |
| `StrategyCardGrid.test.tsx` | Renders N cards for N strategies; PnL cell has the expected `text-green-400`/`text-red-400` class; click on a card calls `useNavigate` mock with `/strategy/:id`; empty `strategies=[]` → `getByRole('status')`; cards sorted by name. Mock `useNavigate` via `vi.mock('react-router-dom', async (orig) => { const a = await orig<typeof import('react-router-dom')>(); return { ...a, useNavigate: () => navigateMock } })`. |
| `PortfolioSummary.test.tsx` (extend) | 500 response → `getByRole('alert')` contains "Failed to load"; Retry button present; click triggers second fetch (verify with a `requestCounter` in the test handler). |
| `DashboardPage.test.tsx` (extend) | `StrategyCardGrid` cards render (`findByRole('button', { name: /CSM-SET Equity Momentum/ })` after data resolves); ErrorState appears when `/overall-performance` returns 500; Retry click triggers a second invocation. |
| `StrategyPage.test.tsx` (extend) | 500 on `/strategies` → ErrorState rendered, Retry button present; click triggers second fetch. Existing NotFound test switches `findByRole('alert')` → `findByRole('main')`. |

All Recharts-dependent tests reuse the project's `vi.mock('recharts', …)` shell pattern from `EquityCurveChart.test.tsx` / `StrategyPage.test.tsx`.

---

## Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TanStack Query errors don't reach `ErrorBoundary` | Certain (by design) | High (test would silently fail) | Explicit decision: `PortfolioSummary` consumes `ErrorState` directly for query errors; `ErrorBoundary` is the safety net for render-time crashes only. Documented in §Architecture decisions. |
| `NotFoundState` role change breaks 2 existing tests | Certain | Low | Update both tests in the same patch; explicitly call out in Progress notes. |
| MSW per-test override forgets `server.resetHandlers` semantics | Low | Medium | `src/test-setup.ts` already wires `afterEach(server.resetHandlers)`; pattern is in active use. |
| `useNavigate` mock leaks across tests | Low | Medium | Define inside `describe` with `beforeEach` reset, or use `vi.mocked(navigate).mockClear()` between cases. |
| Re-defining `StrategyCard` inside `StrategyCardGrid` (lint regression) | Medium | High | Plan explicitly puts `StrategyCard` at module scope above the parent; reviewer + CI Biome lint catches violations. |
| `ErrorBoundary` doesn't reset on prop change (stale error after retry from inside fallback) | Medium | Medium | `resetErrorBoundary` clears state; pages call `invalidateQueries` then `resetErrorBoundary` in the same handler so the next render attempts to re-fetch. |
| `useDeferredValue` double-defer breaks chart rendering | Low | Low | Idempotent; `MultiStrategyChart` already defers internally. Verified by existing chart tests. |
| `pnpm build` chunk-split surprises | Low | Low | Routes are statically imported in `main.tsx` (no lazy import); no chunk-split changes expected. |
| Card click target overlaps with the Sidebar `<NavLink>` test selector | Low | Low | `Sidebar`'s links live in a `<nav>`; cards are inside a `<section aria-label="Strategy cards">`. `findByRole('button', { name: /CSM-SET/ })` scopes to cards. |
| `Object.fromEntries(...).map([id, perf])` mistyped when `overall?.strategies` is undefined | Low | Low | `?? []` fallback inside `useMemo` keeps `performances` as `{}` when data not yet loaded. |
| Coverage drops below 80 % | Low | Medium | Each new file ships with branch coverage tests; PortfolioSummary's existing pending/error branches preserved. |

---

## Verification plan

```bash
git checkout phase-8-dashboard-strategy-pages
pnpm install              # no new deps
pnpm typecheck            # zero errors
pnpm lint                 # zero findings
pnpm format               # no drift
pnpm test:coverage        # ≥ 80 % all metrics; ~192–200 tests total
pnpm build                # main bundle ≤ 110 KB gzip; Recharts chunks lazy
pnpm quality              # full gate green
```

Browser sanity (deferred until Gateway Phase 6 ships):

```bash
pnpm dev
# http://localhost:5173/
#   → FilterBar + PortfolioSummary + (EquityCurve | Drawdown) + AllocationBar
#     + StrategyCardGrid + MultiStrategyChart all render
# Click a strategy card → URL becomes /strategy/csm-set-01 and CSMSetAdapter loads
# http://localhost:5173/strategy/unknown-id → NotFoundState with "Back to Dashboard"
# Force a Gateway 500 → ErrorState with Retry visible on the affected section
```

---

## Agent prompt (verbatim, embedded for reproducibility)

> You are implementing Phase 8 — Dashboard & Strategy Pages for the quant-dashboard project. Follow this sequence exactly: plan first, then implement, then document, then commit + PR.
>
> ---
>
> ## 0. Pre-Work: Read Before Touching Any Code
>
> 1. Read `.claude/knowledge/project-skill.md` in full — internalize all Hard Rules and Soft Conventions.
> 2. Read `.claude/skills/vercel-react-best-practices/SKILL.md` — note every rule tag you must apply (async-parallel, async-suspense-boundaries, rerender-use-deferred-value, rerender-transitions, rerender-no-inline-components, rerender-memo, bundle-dynamic-imports, bundle-barrel-imports).
> 3. Read `docs/plans/ROADMAP.md` — focus on Phase 8 section (§8.1 DashboardPage, §8.2 StrategyPage, §8.3 UI States). Note exactly which items are `[ ]` vs already completed.
> 4. Read `docs/plans/phase_7_interactive_filter_date_range.md` — understand current DashboardPage state, what's already wired, and what remains.
> 5. Read `docs/plans/phase_2_zod_schemas_fetch_client.md` — use as the structural template for your plan file.
>
> ---
>
> ## 1. Create Git Branch
>
> ```bash
> git checkout -b phase-8-dashboard-strategy-pages
> ```
>
> ---
>
> ## 2. Write the Plan FIRST — No Code Until This File Exists
>
> Create `docs/plans/phase_8_dashboard_strategy_pages.md` before writing a single line of implementation code.
>
> The plan must include:
>
> - **Scope** — exactly what Phase 8 delivers (reference ROADMAP §8.1–8.3)
> - **Deliverables** — file-by-file list with acceptance criteria per file
> - **Architecture decisions** — how ErrorBoundary + Suspense layer together; how parallel fetches are structured; why NotFoundState vs ErrorState are separate components
> - **Vercel best-practice rules applied** — list each rule tag and which component it applies to
> - **Risks** — what could go wrong (MSW mock coverage gaps, ErrorBoundary reset behavior, TanStack Query v5 API differences)
> - **Test strategy** — what MSW handlers are needed; which assertions use getByRole vs getByText
> - **This prompt embedded** at the bottom of the plan file
>
> ---
>
> ## 3. Implement Phase 8 Deliverables
>
> ### 3.1 `src/components/ui/ErrorState.tsx`
>
> - Props: `readonly message: string`, `readonly onRetry?: () => void`
> - Render: error icon + message text + "Retry" `<button>` (only when `onRetry` is provided)
> - The `onRetry` caller (DashboardPage / StrategyPage) is responsible for calling `queryClient.invalidateQueries` — ErrorState itself is pure presentation
> - `role="alert"` on the container for accessibility
> - **Do NOT define this component inside another component** (rerender-no-inline-components)
> - Co-locate `src/components/ui/ErrorState.test.tsx`:
>   - renders message text
>   - renders Retry button when onRetry provided
>   - does NOT render Retry button when onRetry omitted
>   - calls onRetry when Retry button clicked
>   - container has role="alert"
>
> ### 3.2 NotFoundState.tsx
>
> - Props: `readonly message: string`
> - Render: 404 icon/emoji + message + "Back to Dashboard" `<Link to="/">` (React Router)
> - `role="main"` or semantic landmark appropriate for a full-page not-found
> - Co-locate NotFoundState.test.tsx:
>   - renders message
>   - renders back link with correct href
>
> ### 3.3 `src/components/widgets/StrategyCardGrid.tsx`
>
> - Props: `readonly strategies: StrategyInfo[]`, `readonly performances: Record<string, StrategyPerformance>`
> - Renders one card per strategy: name, type badge, daily PnL (colored via `trendColor` from formatters.ts), Max Drawdown (`formatPercent`), Sharpe Ratio
> - Each card is a `<button>` or `<article>` with `onClick` → `navigate('/strategy/' + strategy.id)` via `useNavigate`
> - **Do NOT define the card sub-component inline** — extract as a named component in the same file or a separate file (rerender-no-inline-components)
> - `useMemo` on the sorted/filtered card list if strategies array is large (rerender-memo)
> - Co-locate `src/components/widgets/StrategyCardGrid.test.tsx`:
>   - renders correct number of cards
>   - displays formatted PnL with correct color class
>   - clicking a card calls navigate with correct path
>   - empty strategies array renders empty state message
>
> ### 3.4 DashboardPage.tsx — Complete Assembly
>
> Build on what Phase 7 already wired. The complete page must:
>
> **Data fetching (all at the same render level for parallel execution — async-parallel):**
> ```typescript
> const overallPerf = useOverallPerformance()
> const portfolioEquity = usePortfolioEquityCurve(true, from, to)
> const strategies = useStrategies()
> const { selectedIds, from, to } = useStrategyFilter()
> const equityCurveQueries = useQueries({
>   queries: (selectedIds.length > 0 ? selectedIds : (strategies.data?.map(s => s.id) ?? [])).map(id => ({
>     queryKey: ['equity-curve', 'strategy', id],
>     queryFn: () => fetchStrategyEquityCurve(id),
>     enabled: Boolean(id),
>   }))
> })
> ```
>
> **Layout (top to bottom):**
> 1. `<FilterBar />` — strategy selector + date range (already implemented Phase 7)
> 2. `<Suspense fallback={<LoadingState />}><ErrorBoundary fallback={...}><PortfolioSummary /></ErrorBoundary></Suspense>`
> 3. Two-column grid: `EquityCurveChart` (portfolio, normalized) | `DrawdownChart` (portfolio equity) — each in its own `<Suspense>` + `<ErrorBoundary>`
> 4. `<AllocationBar />` — from `overallPerf.data?.allocation`
> 5. `<StrategyCardGrid />` — from `strategies.data` + build `performances` map from `overallPerf.data?.strategies`
> 6. `<MultiStrategyChart />` — already wired in Phase 7, keep it
>
> **ErrorBoundary integration:**
> - Use a simple class-based `ErrorBoundary` or install `react-error-boundary` (check if already in package.json first)
> - If `react-error-boundary` is NOT in package.json, implement a minimal class-based ErrorBoundary in `src/components/ui/ErrorBoundary.tsx`
> - The fallback prop receives a `resetErrorBoundary` function — wire it to `() => { queryClient.invalidateQueries(...); resetErrorBoundary() }`
> - Use `useQueryClient()` hook in the fallback render function (not inside ErrorBoundary class itself)
>
> **useDeferredValue** — apply to the `series` array passed to `MultiStrategyChart` so filter changes don't block chart re-render (rerender-use-deferred-value).
>
> **startTransition** — already applied in FilterBar (Phase 7); ensure DashboardPage doesn't introduce new synchronous blocking state updates.
>
> Co-locate DashboardPage.test.tsx:
> - renders PortfolioSummary metrics from mocked useOverallPerformance
> - renders StrategyCardGrid cards
> - renders EquityCurveChart and DrawdownChart (mock Recharts with `vi.mock('recharts', ...)`)
> - FilterBar present and interactable
> - ErrorState shown when overallPerf query errors
> - loading skeletons shown while data fetches
>
> ### 3.5 StrategyPage.tsx
>
> ```typescript
> import { useParams } from 'react-router-dom'
> import { useQueryClient } from '@tanstack/react-query'
> import { StrategyAdapterFactory } from '@/components/strategy/StrategyAdapterFactory'
> import { NotFoundState } from '@/components/ui/NotFoundState'
> import { ErrorState } from '@/components/ui/ErrorState'
> import { LoadingState } from '@/components/ui/LoadingState'
> import { useStrategies } from '@/hooks/useGateway'
>
> export default function StrategyPage(): JSX.Element {
>   const { id } = useParams<{ id: string }>()
>   const queryClient = useQueryClient()
>   const { data: strategies, isLoading, isError } = useStrategies()
>
>   if (isLoading) return <LoadingState />
>   if (isError) return (
>     <ErrorState
>       message="Failed to load strategies"
>       onRetry={() => queryClient.invalidateQueries({ queryKey: ['strategies'] })}
>     />
>   )
>
>   const strategy = strategies?.find((s) => s.id === id)
>   if (!strategy) return <NotFoundState message={`Strategy not found: ${id ?? 'unknown'}`} />
>
>   return (
>     <div className="space-y-6">
>       <h1 className="text-xl font-bold text-white">{strategy.name}</h1>
>       <StrategyAdapterFactory strategy={strategy} />
>     </div>
>   )
> }
> ```
>
> Co-locate StrategyPage.test.tsx:
> - known strategy id → renders correct adapter (mock StrategyAdapterFactory, assert it received correct strategy prop)
> - unknown id → renders NotFoundState with message containing the id
> - loading state → renders LoadingState
> - error state → renders ErrorState with Retry button; clicking Retry calls invalidateQueries
>
> ---
>
> ## 4. MSW Handler Coverage
>
> Check handlers.ts — add any missing handlers needed for Phase 8 tests:
> - `GET /api/v1/overall-performance` — already present (Phase 4)
> - `GET /api/v1/strategies` — already present (Phase 3)
> - `GET /api/v1/portfolio/equity-curve` — already present (Phase 5)
> - `GET /api/v1/strategies/:id/equity-curve` — already present (Phase 7)
> - Add error-state variants (HTTP 500 handlers) gated by a test-controlled flag for ErrorState/ErrorBoundary tests
>
> ---
>
> ## 5. Quality Gates
>
> After implementation, run and fix until all pass:
>
> ```bash
> pnpm typecheck
> pnpm lint
> pnpm test:coverage   # must remain ≥80% lines/functions/branches/statements
> pnpm build           # main bundle must stay < 250 KB gzip; Recharts in separate lazy chunks
> ```
>
> Verify `pnpm build` output:
> - `dist/assets/DashboardPage-*.js` and `StrategyPage-*.js` are NOT in the main chunk (they're route-level, loaded by React Router — confirm they are split)
> - Recharts chunks (`EquityCurveChart-*.js`, `DrawdownChart-*.js`, `MultiStrategyChart-*.js`, shared `CartesianChart-*.js`) remain as separate lazy chunks
> - Main bundle < 250 KB gzip
>
> ---
>
> ## 6. Documentation Updates
>
> After all tests pass and build succeeds:
>
> ### Update `docs/plans/phase_8_dashboard_strategy_pages.md`
> Add a progress section at the bottom:
> - Date completed
> - Final test count (was 172 after Phase 7, note new total)
> - Final main bundle gzip size
> - Any deviations from the plan, problems encountered, solutions applied
> - Mark all acceptance criteria as ✅ or note deferred items
>
> ### Update ROADMAP.md
> - Mark all Phase 8 `[ ]` items as `[x]` with date 2026-05-19 (or today's date)
> - Update "Current Status" section: current phase → Phase 9, completed list → add Phase 8 entry
> - Update "Next step" → Phase 9 (Docker Integration & Nginx)
>
> ### Review `.claude/knowledge/*`
> Check if any new patterns emerged during Phase 8 that should be captured:
> - ErrorBoundary + TanStack Query invalidation pattern → add to `coding-standards.md` if not present
> - `react-error-boundary` install decision (if made) → add to `stack-decisions.md`
> - Any new Vercel best-practice rule applications → add to `project-skill.md` examples
>
> ---
>
> ## 7. Commit and PR
>
> ```bash
> git add -A
> git commit -m "feat(phase-8): dashboard & strategy pages — StrategyCardGrid, ErrorState, NotFoundState, DashboardPage, StrategyPage
>
> - Add StrategyCardGrid widget with per-strategy metrics and navigate-on-click
> - Add ErrorState (role=alert, onRetry callback) and NotFoundState UI components
> - Complete DashboardPage: parallel fetches, Suspense+ErrorBoundary on every section,
>   PortfolioSummary + EquityCurveChart + DrawdownChart + AllocationBar + StrategyCardGrid
> - Add StrategyPage: useParams lookup, StrategyAdapterFactory dispatch, NotFoundState fallback
> - Add ErrorBoundary component wired to queryClient.invalidateQueries on retry
> - Extend MSW handlers with error-state variants for boundary testing
> - Tests: [N] total (up from 172); coverage ≥80% all metrics
> - Build: main [X] KB gzip; Recharts chunks unchanged as lazy splits
> - Docs: ROADMAP Phase 8 complete; phase plan updated with progress notes"
>
> git push origin phase-8-dashboard-strategy-pages
> gh pr create \
>   --title "Phase 8: Dashboard & Strategy Pages" \
>   --body "## Phase 8 — Dashboard & Strategy Pages
>
> ### Deliverables
> - \`src/components/widgets/StrategyCardGrid.tsx\` — strategy cards with metrics + navigation
> - \`src/components/ui/ErrorState.tsx\` — error display with retry callback
> - \`src/components/ui/NotFoundState.tsx\` — 404 page with back link
> - \`src/components/ui/ErrorBoundary.tsx\` — class-based boundary wired to TanStack Query invalidation
> - \`src/pages/DashboardPage.tsx\` — complete assembly with parallel fetches, Suspense, ErrorBoundary
> - \`src/pages/StrategyPage.tsx\` — adapter dispatch with loading/error/notfound states
> - \`docs/plans/phase_8_dashboard_strategy_pages.md\` — implementation plan + progress notes
> - \`docs/plans/ROADMAP.md\` — Phase 8 marked complete
>
> ### Quality
> - All tests pass; coverage ≥80%
> - Main bundle < 250 KB gzip
> - \`pnpm quality\` passes (lint + format + typecheck + test:coverage)
>
> ### Vercel Best Practices Applied
> - async-parallel: useOverallPerformance + usePortfolioEquityCurve + useStrategies called at same level
> - async-suspense-boundaries: each async section wrapped independently
> - rerender-use-deferred-value: series array to MultiStrategyChart deferred
> - rerender-no-inline-components: StrategyCard extracted from StrategyCardGrid
> - bundle-dynamic-imports: Recharts chunks remain lazy
>
> Closes Phase 8. Next: Phase 9 — Docker Integration & Nginx." \
>   --base main \
>   --head phase-8-dashboard-strategy-pages
> ```
>
> ---
>
> ## Hard Rules Reminder (from project-skill.md)
>
> Before submitting, verify:
> - [ ] No `any` without `// biome-ignore` justification
> - [ ] No `console.log` in committed code
> - [ ] No hand-written TypeScript interfaces that duplicate Zod schema shapes
> - [ ] No axios — only `fetch` + Zod
> - [ ] No barrel `index.ts` except index.ts
> - [ ] Every component defined at module scope (never inside another component)
> - [ ] Every external response validated by a Zod schema via `safeParse`
> - [ ] All props interfaces use `readonly` modifiers
