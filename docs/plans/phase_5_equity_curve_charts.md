# Phase 5 — Equity Curve Charts (quant-dashboard)

| Field | Value |
|---|---|
| Phase | 5 — Equity Curve Charts |
| Date | 2026-05-18 |
| Author | Claude (Opus 4.7), acting on lumduan's behalf |
| Branch | `feature/phase-5-equity-curve-charts` |
| Target | `main` (github.com/lumduan/quant-dashboard) |
| Linked roadmap | `docs/plans/ROADMAP.md` §Phase 5 (5.1 EquityCurveChart, 5.2 DrawdownChart, 5.3 MultiStrategyChart) |

---

## Context

Phase 4 shipped `PortfolioSummary` and `AllocationBar` (the first user-visible content on the Dashboard) wired to `useOverallPerformance()`. Main bundle is **98.46 KB gzip** (well under the 250 KB ceiling), coverage 100/97.65/100/100, 81 tests passing. `STRATEGY_COLORS` already pulled forward to `src/utils/palette.ts`; `recharts@3.8.1` already in `dependencies`; `src/components/charts/` exists with only `.gitkeep`.

Phase 5 introduces the **first chart layer** and the only allowed barrel in the project. The headline performance objective is **keeping Recharts (~150 KB gzip) out of the main bundle** — every chart component is a default export imported via `React.lazy` from `src/components/charts/index.ts`, and every call site wraps the chart in `<Suspense fallback={<LoadingState />}>`. The bundle output must show Recharts in a chunk separate from `index-*.js`.

Three chart components ship in this phase:

1. **EquityCurveChart** — single-series line chart with a `normalize` toggle (Base-100 default, raw THB optional) and a `<ReferenceLine y={100} />` when normalized.
2. **DrawdownChart** — derived running-peak drawdown series rendered as a red `<Area />` with negative fill.
3. **MultiStrategyChart** — N-series overlay (always Base-100, palette-cycled colors, Recharts `<Legend />`); the series prop runs through `useDeferredValue` so future filter-bar changes (Phase 7) don't block input.

Each derived dataset (normalized series, drawdown series, merged multi-series) is wrapped in `useMemo` keyed on primitive deps (Vercel `rerender-memo`). The MSW handlers for `/api/v1/portfolio/equity-curve` and `/api/v1/strategies/:id/equity-curve` already exist with 3-point fixture data; Phase 5 extends the equity-curve fixture to 30 points spanning 30 days from a starting value of 1,000,000 so the rendered charts have realistic shape during dev (`pnpm dev`) and so the drawdown derivation has enough resolution to be visually meaningful.

End-to-end verification against a live Gateway remains deferred (`quant-api-gateway` Phase 6 not yet shipped); Phase 5 is verified via MSW-mocked Vitest + `pnpm quality` ≥ 80% + bundle inspection.

---

## Scope

### In scope

1. **`src/components/charts/index.ts`** — the project's only barrel; re-exports each chart as `React.lazy(() => import('./Xyz'))`.
2. **`src/components/charts/EquityCurveChart.tsx`** — default export; `data`, `normalize`, `height`, `title` props (all `readonly`); `useMemo` normalized series; `<ReferenceLine y={100} />` when normalized; tooltip via formatter (`formatTHB` / `formatPercent` + `formatDateTH`).
3. **`src/components/charts/EquityCurveChart.test.tsx`** — `vi.mock('recharts', …)` shells; capture `data` prop; assert (a) render, (b) normalized series starts at 100, (c) raw series equals input values, (d) `ReferenceLine` only rendered when normalized.
4. **`src/components/charts/DrawdownChart.tsx`** — default export; `data`, `height`, `title` props; `useMemo` derives `drawdown = (peak - value) / peak * -100` with running peak; red `<Area />`.
5. **`src/components/charts/DrawdownChart.test.tsx`** — assert (a) render, (b) max-drawdown point equals `Math.min(...derivedSeries)`, (c) all drawdowns ≤ 0 (drawdown is non-positive by construction), (d) initial point has 0 drawdown.
6. **`src/components/charts/MultiStrategyChart.tsx`** — default export; `Series` interface (`id`, `label`, `data: EquityPoint[]`, `color`); `series`, `height`, `title` props; always Base-100; `useDeferredValue(series)`; `useMemo` merges by `date` into Recharts row shape; renders `<Legend />`; consumer assigns colors from `STRATEGY_COLORS` cycle.
7. **`src/components/charts/MultiStrategyChart.test.tsx`** — assert (a) 2-series render produces 2 Recharts `<Line>` children with distinct colors, (b) Legend renders both labels, (c) deferred series doesn't crash with rapid prop changes, (d) empty series array renders the empty-state message without crashing.
8. **`src/test/mocks/handlers.ts`** — extend the existing `equityCurve` fixture from 3 points to 30 points spanning 30 days starting at 1,000,000 with deterministic up/down variation. Both `/api/v1/portfolio/equity-curve` and `/api/v1/strategies/:id/equity-curve` handlers continue to return this fixture.
9. **`src/pages/DashboardPage.tsx`** — add a 2-column chart row (EquityCurveChart + DrawdownChart) below `AllocationBar`, wrapped in `<Suspense fallback={<LoadingState />}>`. Each subscribes to `usePortfolioEquityCurve()`. **MultiStrategyChart is rendered with `series={[]}` as a placeholder showing an empty-state message** — real per-strategy parallel fetching via `useQueries` defers to Phase 8 (matches Phase 8's `async-parallel` ownership; documented decision).
10. **`src/pages/DashboardPage.test.tsx`** — extend to verify a chart region renders after data resolves; the existing tests for heading and PortfolioSummary/AllocationBar continue to pass.
11. **Plan doc** (this file).
12. **`docs/plans/ROADMAP.md`** — Phase 5 checkboxes `[x]` with `done 2026-05-18`; "Current Status" advances to Phase 6; build size + chunk sizes recorded; Phase 5 footer note added.

### Out of scope

- `FilterBar` / `StrategySelector` / date range — Phase 7.
- `StrategyCardGrid` — Phase 8.
- `ErrorState` / `NotFoundState` — Phase 8.3.
- Per-strategy parallel fetching via `useQueries` for the MultiStrategyChart — Phase 8 (`async-parallel`).
- Adapter pattern (`StrategyAdapterFactory` etc.) — Phase 6.
- New dependencies — `recharts@3.8.1` is already installed.

---

## Architecture decisions & constraints

| Decision | Why |
|---|---|
| **Each chart is `export default function …`** | Required for `React.lazy(() => import('./X'))` — `lazy()` reads the default export of the imported module. |
| **`src/components/charts/index.ts` is the ONLY barrel in the project** | Vercel `bundle-barrel-imports` is the project convention except for this file. The barrel exists specifically to centralize the `React.lazy()` wrappers so every consumer suspends identically. |
| **`useMemo` on every derived series, dep on primitives** | Vercel `rerender-memo`. Deps: `data` reference and `normalize` primitive for EquityCurveChart; `data` for DrawdownChart; `deferredSeries` for MultiStrategyChart. Same pattern as Phase 4's `PortfolioSummary`. |
| **`useDeferredValue` on MultiStrategyChart's `series` prop** | Vercel `rerender-use-deferred-value`. Phase 7's `FilterBar` will mutate `selectedIds` rapidly; deferring lets the input stay responsive while the chart catches up. Wired now so Phase 7 doesn't have to retrofit. |
| **Recharts always inside `<ResponsiveContainer width="100%" height={height}>`** | Caller controls height; width is fluid. `height` defaults to 320 (matches the Phase 4 widget aspect ratio). |
| **Tooltip formatter uses `formatPercent((value - 100) / 100)` in normalized mode** | Base-100 means start=100, so a Base-100 value of 105.23 ⇒ +5.23% gain. Calling `formatPercent(value)` directly would wrongly produce "+10523.00%". |
| **Drawdown formula `(peak - value) / peak * -100`** | ROADMAP §5.2 + agent prompt §4c. Output is always ≤ 0; matches the convention used in `OverallPerformance.combined_max_drawdown`. |
| **Multi-series merge** | Build a single ordered array `Array<{ date: string; [seriesId]: number }>`. The dates union of all series, sorted ASC; for each date, copy each series's normalized value at that date (if present). Recharts' `LineChart` then renders one `<Line dataKey={s.id} stroke={s.color} />` per series. |
| **MultiStrategyChart series receives colors from caller, not from STRATEGY_COLORS internally** | The caller (DashboardPage / future FilterBar) controls palette cycling — same model as AllocationBar. Caller does `series.map((s, i) => ({ ...s, color: STRATEGY_COLORS[i % STRATEGY_COLORS.length] }))`. Keeps the chart pure (no palette dependency). |
| **MultiStrategyChart in DashboardPage receives `series={[]}` (placeholder)** | User-confirmed deferral. The component renders an empty-state message when `series.length === 0`. Phase 8 wires real per-strategy fetching via `useQueries` (parallelism is Phase 8's `async-parallel` story). |
| **Recharts in jsdom tests: `vi.mock('recharts', ...)` per chart test file** | User-confirmed. Mock replaces `ResponsiveContainer`, `LineChart`, `AreaChart`, `Line`, `Area`, `Legend`, `ReferenceLine` with `<div data-testid="X" data-points={JSON.stringify(data)} data-color={stroke} />`. Tests parse `data-points` to assert derivation correctness — no DOM measurement, no hover-tooltip interaction. |
| **MSW fixture upgraded to 30 points** | Three points isn't enough for a believable drawdown chart in `pnpm dev`. New fixture: 30 days from 2026-04-19 to 2026-05-18, starting at 1,000,000, with deterministic up/down variation (no `Math.random()` — tests must be stable). |
| **Charts return `JSX.Element` via `import type { JSX } from 'react'`** | Matches Phase 4 widgets; React 19 + `verbatimModuleSyntax` requires the type import. |
| **`Series` is the only exported chart-prop interface** | Phase 8 consumers construct it. Other prop types stay private to each chart file. |

---

## Deliverables

### Created

| Path | Purpose |
|---|---|
| `docs/plans/phase_5_equity_curve_charts.md` | This plan |
| `src/components/charts/index.ts` | `React.lazy` re-exports of all three charts (only allowed barrel) |
| `src/components/charts/EquityCurveChart.tsx` | Default-export single-series chart with normalize toggle |
| `src/components/charts/EquityCurveChart.test.tsx` | Vi-mocked recharts; data-prop assertions; ReferenceLine presence |
| `src/components/charts/DrawdownChart.tsx` | Default-export derived running-peak drawdown chart |
| `src/components/charts/DrawdownChart.test.tsx` | Max-drawdown equals Math.min; all values ≤ 0; initial point 0 |
| `src/components/charts/MultiStrategyChart.tsx` | Default-export multi-series overlay with `useDeferredValue` |
| `src/components/charts/MultiStrategyChart.test.tsx` | 2-series colors distinct, Legend labels, empty-state rendering |

### Modified

| Path | Change |
|---|---|
| `src/test/mocks/handlers.ts` | Extend `equityCurve` from 3 points to 30 points (1M starting value, deterministic variation) |
| `src/pages/DashboardPage.tsx` | Add Suspense-wrapped 2-col chart row (EquityCurveChart + DrawdownChart) + MultiStrategyChart placeholder |
| `src/pages/DashboardPage.test.tsx` | Add assertion that at least one chart region renders after data resolves |
| `docs/plans/ROADMAP.md` | Tick Phase 5 boxes, advance "Current Status" to Phase 6, record bundle/chunk sizes |

### Untouched

- `src/api/*`, `src/hooks/*`, `src/types/*` — data layer complete.
- `src/utils/palette.ts`, `src/utils/formatters.ts` — already exported what charts need.
- `src/components/layout/*`, `src/components/ui/LoadingState.tsx` — Phase 3 outputs final.
- `src/pages/StrategyPage.tsx` — Phase 6/8 own.
- `vite.config.ts`, `tsconfig.json`, `biome.json`, `package.json` — no new deps.
- `.claude/knowledge/*` — re-assessed at the end; only updated if a genuinely new pattern emerged.

---

## Acceptance criteria

- [x] `src/components/charts/index.ts` exports `EquityCurveChart`, `DrawdownChart`, `MultiStrategyChart` via `React.lazy()` (2026-05-18).
- [x] All three chart components are `export default function …` — verified by the barrel's `import('./X')` resolving to a default export at runtime (2026-05-18).
- [x] `EquityCurveChart` renders both `normalize=true` (Base-100 with ReferenceLine y=100) and `normalize=false` (raw THB) modes (2026-05-18).
- [x] `DrawdownChart` derives `drawdown = (peak - value) / peak * -100` with running peak; max-drawdown test asserts `Math.min(...series)` matches the computed value (-10.00% for the fixture) (2026-05-18).
- [x] `MultiStrategyChart` renders 2+ series with distinct colors; Legend rendered; `useDeferredValue` on the series prop in place; rerender from 2 → 3 series converges (2026-05-18).
- [x] All derived data uses `useMemo` with primitive-only deps (`data` array reference, `normalize` boolean, `deferredSeries` array reference) (2026-05-18).
- [x] DashboardPage wraps every chart section in `<Suspense fallback={<LoadingState />}>` (2026-05-18).
- [x] `pnpm typecheck` zero errors; `pnpm lint` zero findings; `pnpm format` no drift; `pnpm test:coverage` 118/118 passing with 99.84/93.96/98/99.84; `pnpm build` succeeds (2026-05-18).
- [x] `pnpm build` shows Recharts as separate chunks (`CartesianChart-*.js` 101.50 KB gzip is the bulk of Recharts, only loaded on demand); main bundle 99.75 KB gzip (2026-05-18).
- [x] No `any` (no `// biome-ignore` needed); no `console.log`; charts consume `EquityPoint` from `@/types/gateway` (no hand-written domain interfaces) (2026-05-18).
- [x] Plan doc + ROADMAP updated (2026-05-18); PR `feature/phase-5-equity-curve-charts` → `main` pending push.

---

## Implementation order

1. `git checkout -b feature/phase-5-equity-curve-charts`.
2. Write `docs/plans/phase_5_equity_curve_charts.md` (this file).
3. Extend `src/test/mocks/handlers.ts` `equityCurve` fixture to 30 points (deterministic).
4. Create `src/components/charts/EquityCurveChart.tsx` + `.test.tsx`.
5. Create `src/components/charts/DrawdownChart.tsx` + `.test.tsx`.
6. Create `src/components/charts/MultiStrategyChart.tsx` + `.test.tsx`.
7. Create `src/components/charts/index.ts` (`React.lazy` barrel).
8. Update `src/pages/DashboardPage.tsx` and `.test.tsx`.
9. `pnpm typecheck && pnpm lint && pnpm format && pnpm test:coverage && pnpm build && pnpm quality` — iterate to green.
10. Inspect `pnpm build` output; record main + recharts chunk sizes.
11. Update plan doc Progress section + ROADMAP.
12. Re-evaluate `.claude/knowledge/*` (chart-testing pattern).
13. Commit + push + open PR.

---

## Critical files (reuse, do not recreate)

- **`src/utils/palette.ts → STRATEGY_COLORS`** — single source of palette truth; MultiStrategyChart's caller cycles it.
- **`src/utils/formatters.ts → formatTHB / formatPercent / formatDateTH`** — tooltip formatters; module-scoped Intl.
- **`src/hooks/useGateway.ts → usePortfolioEquityCurve, useStrategyEquityCurve`** — already wired; DashboardPage subscribes.
- **`src/test/mocks/handlers.ts → fixtures.equityCurve`** — extended in this phase; tests assert against fixture values.
- **`src/test/render.tsx → renderWithProviders`** — QueryClient + MemoryRouter wrapper; chart tests use plain `render(…)` because they receive `data` as a prop directly.
- **`src/components/ui/LoadingState.tsx`** — fallback for every Suspense boundary that wraps a lazy chart.
- **`src/types/gateway.ts → EquityPoint`** — `z.infer` type; charts type their `data` prop as `readonly EquityPoint[]`.

---

## Risk assessment and mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Recharts pulled into the main chunk despite `React.lazy` | Medium | High | Lazy barrel uses literal `import('./X')` strings (statically analyzable). Verify in `pnpm build` chunk output. |
| `vi.mock('recharts', …)` breaks because the import path differs | Medium | Medium | Use `vi.mock('recharts', async (importOriginal) => { const actual = await importOriginal<typeof import('recharts')>(); return { ...actual, … } })`. |
| `useMemo` deps recompute every render | High | Medium | TanStack Query returns stable `data` references until cache mutates; `useMemo` dep on the array reference is correct. |
| Recharts 3.x peer-dep warnings on React 19 | Low | Low | `recharts@3.8.1` already accepted by `pnpm install`; runtime works under R19. |
| Drawdown divides by zero if first equity value is 0 | Low | Low | Guard: `peak === 0 ? 0 : (peak - value) / peak * -100`. Fixture starts at 1,000,000. |
| Multi-series merge produces holes when series have different date ranges | Medium | Low | `connectNulls={true}` on each `<Line />`. |
| Main bundle gzip exceeds 100 KB after this phase | Low | Low | Phase 4 baseline 98.46 KB; lazy chunks aren't in main. |
| Empty series renders crash Recharts | Medium | Low | Empty-state guard returns `role="status"` message and skips Recharts. |

---

## Testing approach

- **`vi.mock('recharts', …)` per chart test file** — mocks `ResponsiveContainer`, `LineChart`, `AreaChart`, `Line`, `Area`, `Legend`, `ReferenceLine` with `<div data-testid …>` elements carrying serialized props.
- **Derivation correctness via `JSON.parse(el.dataset.points!)`** — captures the `data` prop passed to chart shells; assert values vs. expected formulas.
- **Color assertions via `data-color={stroke}`** — `Line` mock surfaces its `stroke` prop.
- **Empty-state test** — Render `<MultiStrategyChart series={[]} />`; assert `role="status"` message present; chart shells absent.
- **`useDeferredValue` convergence** — `rerender` with new series; `findByText(thirdSeriesLabel)` resolves.
- **DashboardPage integration** — `renderWithProviders(<DashboardPage />)`; `await findByRole('region', { name: /equity curve/i })`.
- **Coverage** — `pnpm test:coverage` ≥ 80% on `src/components/charts/*.tsx` and project-wide.

---

## Verification plan

```bash
git checkout feature/phase-5-equity-curve-charts
pnpm typecheck
pnpm lint
pnpm format
pnpm test:coverage
pnpm build           # inspect chunk graph for recharts in its own chunk
pnpm quality
```

---

## Agent prompt (verbatim, embedded for reproducibility)

> You are implementing Phase 5 — Equity Curve Charts for the `quant-dashboard` project. Follow every step in order. Do NOT skip the planning step.
>
> ## Step 1 — Read Before You Code
>
> Read these files in full before writing a single line of source code:
> - project-skill.md — Hard Rules and project conventions
> - SKILL.md — performance patterns (bundle-dynamic-imports, rerender-memo, rerender-use-deferred-value)
> - ROADMAP.md — focus on Phase 5 section and Current Status
> - phase_4_portfolio_summary_widget.md — last completed phase (context + patterns)
> - phase_2_zod_schemas_fetch_client.md — use as format reference for your plan doc
>
> ## Step 2 — Create Git Branch
>
> ```bash
> git checkout -b feature/phase-5-equity-curve-charts
> ```
>
> ## Step 3 — Write the Plan First
>
> Before any implementation, create `docs/plans/phase_5_equity_curve_charts.md` using phase_2_zod_schemas_fetch_client.md as the format template. The plan must include:
> - Phase goal and scope
> - All deliverables with file paths
> - Acceptance criteria (matching ROADMAP.md Phase 5)
> - Implementation order and any risks
> - This full AI agent prompt embedded in the plan
>
> Save the plan file. Then proceed to implementation.
>
> ## Step 4 — Implementation
>
> Implement in this exact order:
>
> ### 4a. `src/components/charts/index.ts`
> The only allowed barrel in the project. Re-export all three charts as React.lazy:
> ```typescript
> import { lazy } from 'react'
> export const EquityCurveChart   = lazy(() => import('./EquityCurveChart'))
> export const DrawdownChart      = lazy(() => import('./DrawdownChart'))
> export const MultiStrategyChart = lazy(() => import('./MultiStrategyChart'))
> ```
>
> ### 4b. `src/components/charts/EquityCurveChart.tsx`
> - **Must be a default export** (required for React.lazy)
> - Props: `readonly data: EquityPoint[]`, `readonly normalize?: boolean`, `readonly height?: number`, `readonly title?: string`
> - `normalize=true` (default) → Base-100 series computed with `useMemo`; `normalize=false` → raw THB values
> - Render `<ReferenceLine y={100} />` when normalized
> - Tooltip shows formatted value (formatTHB or formatPercent depending on normalize) and date (formatDateTH)
> - Use `useMemo` for the derived data series — dep array on `data` and `normalize` primitives (Vercel `rerender-memo`)
> - Co-locate `EquityCurveChart.test.tsx`: test renders, normalize=true shows Base-100 baseline, normalize=false shows raw values, tooltip text contains formatted value
>
> ### 4c. `src/components/charts/DrawdownChart.tsx`
> - **Must be a default export**
> - Props: `readonly data: EquityPoint[]`, `readonly height?: number`, `readonly title?: string`
> - Derive drawdown series with `useMemo`: for each point, `drawdown = (peak - value) / peak * -100` where peak is the running maximum value up to that point
> - Use a red Recharts `<Area />` with negative fill
> - Tooltip shows drawdown % (e.g., "-12.34%")
> - Co-locate `DrawdownChart.test.tsx`: test renders, verify max drawdown point matches `Math.min(...derivedSeries)`, tooltip shows formatted negative %
>
> ### 4d. `src/components/charts/MultiStrategyChart.tsx`
> - **Must be a default export**
> - Define `Series` interface: `{ readonly id: string; readonly label: string; readonly data: EquityPoint[]; readonly color: string }`
> - Props: `readonly series: Series[]`, `readonly height?: number`, `readonly title?: string`
> - Always normalize to Base-100 (cross-scale comparison — never raw THB)
> - Apply `useDeferredValue` on the series array so filter changes don't block input (Vercel `rerender-use-deferred-value`)
> - Use `useMemo` for the merged/normalized dataset
> - Colors come from `STRATEGY_COLORS` in palette.ts — assign per series index
> - Render a Recharts `<Legend />` showing strategy labels
> - Co-locate `MultiStrategyChart.test.tsx`: test 2+ series render with distinct colors, Legend displays strategy labels, useDeferredValue does not break rendering
>
> ### 4e. Update DashboardPage.tsx
> Wire the lazy charts into DashboardPage using real hooks. Each chart section must be wrapped in `<Suspense fallback={<LoadingState />}>`. Use `usePortfolioEquityCurve()` for EquityCurveChart and DrawdownChart. Use `useStrategies()` + per-strategy equity curve data for MultiStrategyChart (or leave MultiStrategyChart as a placeholder with an empty series array if per-strategy parallel fetching is deferred to Phase 8 — document the decision in the plan).
>
> ### 4f. MSW Handlers
> Check handlers.ts. If equity-curve endpoints (`/api/v1/portfolio/equity-curve` and `/api/v1/strategies/:id/equity-curve`) are not already mocked, add them with realistic fixture data (at least 30 data points spanning 30 days, starting value 1_000_000).
>
> ## Step 5 — Quality Gate
>
> Run and fix until all pass:
> ```bash
> pnpm quality        # biome lint + format + typecheck + test:coverage
> pnpm build          # verify separate chunk for recharts
> ```
>
> In the build output, confirm that Recharts code appears in a chunk separate from the main bundle (chunk name will differ from `index-[hash].js`). Note the chunk sizes in your plan doc.
>
> ## Step 6 — Update Documentation
>
> After `pnpm quality` and `pnpm build` both pass:
>
> 1. Update `docs/plans/phase_5_equity_curve_charts.md`:
>    - Mark all acceptance criteria as completed
>    - Record: completion date (2026-05-18), test count, coverage % per metric, main bundle size (KB gzip), Recharts chunk size (KB gzip), any issues encountered and how they were resolved
>
> 2. Update ROADMAP.md:
>    - Phase 5 checkboxes: change all `[ ]` to `[x]`
>    - Add completion note: `Done YYYY-MM-DD` on each item
>    - Update **Current Status** section: phase → Phase 6, completed list, build/coverage numbers, next step
>    - Add footer note: `✅ **Phase 5 complete YYYY-MM-DD — see [phase_5_equity_curve_charts.md](./phase_5_equity_curve_charts.md).**`
>
> 3. If any new architectural decisions, patterns, or gotchas emerged (e.g., Recharts + React 19 compatibility notes, Vitest + React.lazy mocking pattern), update the relevant knowledge file.
>
> ## Step 7 — Commit and PR
>
> ```bash
> git add -A
> git commit -m "feat(charts): Phase 5 — lazy EquityCurveChart, DrawdownChart, MultiStrategyChart
>
> - src/components/charts/index.ts: React.lazy barrel (only allowed barrel)
> - EquityCurveChart: normalize toggle, Base-100, ReferenceLine, useMemo
> - DrawdownChart: running-peak drawdown derivation, red Area, useMemo
> - MultiStrategyChart: multi-series overlay, useDeferredValue, Legend
> - DashboardPage: Suspense-wrapped lazy charts wired to TanStack Query hooks
> - MSW handlers: equity-curve endpoints added
> - docs/plans/phase_5_equity_curve_charts.md: plan + completion notes
> - docs/plans/ROADMAP.md: Phase 5 complete, status updated
> - pnpm quality: X/X tests pass; XX% coverage; build XX KB gzip main + XX KB gzip recharts chunk"
>
> git push -u origin feature/phase-5-equity-curve-charts
> ```
>
> Then open a PR to `main` with title: `feat(charts): Phase 5 — Equity Curve Charts (lazy-loaded Recharts)` and description summarizing what was built, test count, coverage, and chunk sizes.
>
> ## Constraints (Hard Rules — never violate)
> - No `axios` — use `apiFetch` from client.ts
> - No hand-written TypeScript interfaces for domain types — infer from Zod schemas
> - No `any` without `// biome-ignore` justification
> - No `console.log` in committed code
> - All three chart components MUST be `export default` functions (React.lazy requirement)
> - `useMemo` on ALL derived data (drawdown series, normalized series, merged multi-series)
> - `useDeferredValue` on MultiStrategyChart's series prop
> - Chart components wrapped in `<Suspense>` at every call site — never rendered without a Suspense boundary
> - `src/components/charts/index.ts` is the ONLY barrel file allowed (per project convention)

---

## Progress / Notes

### Completion (2026-05-18)

- Branch `feature/phase-5-equity-curve-charts` cut off `main`.
- All 8 created files (charts + tests + barrel) + 3 modified files (`handlers.ts`, `DashboardPage.tsx`, `DashboardPage.test.tsx`) shipped.
- `pnpm quality` green after two iteration rounds:
  - **Round 1** — Recharts 3.x Tooltip `formatter` / `labelFormatter` props expect `ValueType | undefined` and `ReactNode` respectively, not bare `number` / `string`. Widened all three charts' handler params to `unknown` and narrowed inside (typeof check before format call) — TypeScript's contravariant parameter assignability accepts `(value: unknown) => string` for any `Formatter<ValueType, NameType>` slot.
  - **Round 2** — Biome `useSemanticElements` rejected `<p role="status">` in MultiStrategyChart's empty state; switched to native `<output>` (matches Phase 4's `PortfolioSummary` skeleton convention).
- Biome `format:fix` collapsed two multi-line imports / JSX into single-line form (no logic changes).

### Quality-gate output

```
pnpm lint           → Checked 45 files in 6ms. No fixes applied.
pnpm format         → Checked 45 files in 4ms. No fixes applied.
pnpm typecheck      → (zero errors)
pnpm test:coverage  → 118/118 tests passing across 17 files
                      Coverage:
                        All files                                99.84 stmts | 93.96% branch | 98% funcs | 99.84 lines
                        src/components/charts/EquityCurveChart.tsx   100 / 86.95 / 100 / 100
                        src/components/charts/DrawdownChart.tsx      100 / 85.71 / 100 / 100
                        src/components/charts/MultiStrategyChart.tsx 98.83 /  86.20 / 75 / 98.83
                        src/components/charts/index.ts               100 / 100 / 100 / 100
                        src/pages/DashboardPage.tsx                  100 / 100 / 100 / 100
pnpm build          → 766 modules transformed
                      dist/index.html                                 0.68 KB (gzip 0.42 KB)
                      dist/assets/index-*.css                        14.99 KB (gzip 3.69 KB)
                      dist/assets/EquityCurveChart-*.js               1.29 KB (gzip 0.75 KB)
                      dist/assets/MultiStrategyChart-*.js             9.17 KB (gzip 3.28 KB)
                      dist/assets/DrawdownChart-*.js                 13.97 KB (gzip 5.14 KB)
                      dist/assets/LineChart-*.js                     25.36 KB (gzip 7.73 KB)
                      dist/assets/index-*.js                        330.41 KB (gzip 99.75 KB)
                      dist/assets/CartesianChart-*.js               336.79 KB (gzip 101.50 KB)
```

### Bundle / chunk delta

| Bundle | Phase 4 | Phase 5 | Delta |
|---|---|---|---|
| Main JS (raw) | 327.34 KB | 330.41 KB | +3.07 KB |
| Main JS (gzip) | 98.46 KB | **99.75 KB** | **+1.29 KB** |
| CSS (gzip) | 3.66 KB | 3.69 KB | +0.03 KB |
| Recharts (gzip, lazy-loaded) | n/a | **~118 KB** total across 5 chunks (largest: `CartesianChart-*.js` 101.50 KB) | +118 KB lazy |

The +1.29 KB main-bundle delta is the `React.lazy` wrappers in `src/components/charts/index.ts` plus the new `usePortfolioEquityCurve()` call site in `DashboardPage.tsx`. **Recharts itself is fully code-split** into 5 lazy chunks totalling ~118 KB gzip — none of which loads until a chart Suspense boundary mounts. Main bundle stays well under the 250 KB-gzip ceiling.

### Coverage detail (uncovered branches — all `typeof X !== 'number'`/`'string'` fallback paths in Tooltip formatters)

- `EquityCurveChart.tsx:43,51,55` — early `data.length === 0` exits and the `base === 0` ternary fallback (exercised by tests but not all sub-branches counted by V8).
- `DrawdownChart.tsx:64,67` — Tooltip formatter's non-number / non-string fallback branches (never reached because Recharts always passes typed values; defensive code).
- `MultiStrategyChart.tsx:103` — `points.get(date)` undefined branch (covered structurally; partial branch coverage due to V8 reporter).
- All uncovered lines are defensive `?? '' / return 0` fallbacks; project-wide branch coverage 93.96% remains well above the 80% gate.

### Issues encountered and resolved

- **Recharts 3.x Tooltip formatter type-strictness** — `formatter` param widened to `unknown` + narrowed inside (one typeof guard) so `(value: ValueType, name: NameType, item, index, payload) => ReactNode` is satisfied via contravariant parameter assignability. Same pattern applied to `labelFormatter`. Documented in each chart file with a one-line comment so future maintainers don't re-narrow.
- **Biome `useSemanticElements`** — empty-state `<p role="status">` rejected; switched to `<output>`. `screen.getByRole('status')` continues to resolve because `<output>` exposes `role="status"` implicitly per HTML spec.
- **`<linearGradient />` casing warning during Recharts AreaChart test** — React 19 stderr warning emitted when our mock passes children through unchanged (the real Recharts component would consume the `<defs><linearGradient>` and inject it into SVG, but the mock just renders the children). Warning is cosmetic — tests pass and assertions are unaffected. Considered moving the gradient out but the warning is only emitted in tests where Recharts is mocked, and adding mocks for `defs` / `linearGradient` would be noise. Leaving as-is.

### Patterns established (Phase 5)

- **`vi.mock('recharts', async (importOriginal) => …)` per chart test file** — preserve `...actual` from `importOriginal<typeof import('recharts')>()`, override only what the test needs (ResponsiveContainer, LineChart, AreaChart, Line, Area, Legend, Tooltip, ReferenceLine, CartesianGrid, XAxis, YAxis). Each shell renders a `<div data-testid="X" data-points={JSON.stringify(data)} data-color={stroke} …>`. Tests parse the `data-points` attribute to assert derivation correctness without depending on Recharts' SVG output. The Tooltip mock invokes the formatter functions immediately with sentinel values and surfaces the returned string in a `data-value-N` attribute, so formatter tests are zero-interaction.
- **Tooltip formatter param widening** — Recharts 3.x's `Formatter<ValueType, NameType>` accepts `ValueType | undefined`. Use `(value: unknown) => string` and narrow inside; TypeScript's contravariant function-type assignability accepts this for any concrete `ValueType`.
- **`useDeferredValue` on array props** — wire it now even though the producer is stable. Phase 7's `FilterBar` will mutate the series rapidly; deferring at the consumer means Phase 7 doesn't have to retrofit.
- **`React.lazy` barrel** — single `src/components/charts/index.ts` centralises every chart's `lazy(() => import('./X'))`. Vite's static analysis on the `import('./X')` literal produces one chunk per chart plus shared Recharts chunks (`CartesianChart-*`, `LineChart-*`) automatically.

### Notes for Phase 6 and later

- **`MultiStrategyChart` accepts pre-colored series** — caller cycles `STRATEGY_COLORS[i % length]`. Phase 7's `FilterBar` / Phase 8's parallel `useQueries` should build the `Series` array shape:
  ```ts
  series.map((s, i) => ({ id: s.id, label: s.name, data: equityData[i] ?? [], color: STRATEGY_COLORS[i % STRATEGY_COLORS.length] }))
  ```
- **MultiStrategyChart empty-state output** — `<output>` with text "Select strategies to compare" is the placeholder. Phase 8 should replace `series={[]}` with the real selected-strategies array; the empty-state will then naturally disappear when at least one strategy is selected.
- **Recharts chunks are shared across charts** — `CartesianChart-*.js` and `LineChart-*.js` chunks are reused by EquityCurveChart and MultiStrategyChart. Adding a new line/area chart in future phases will likely add only the new component's own ~5 KB chunk; the shared Recharts code is paid once.
- **`vi.mock('recharts', …)` is per-test-file overhead** — if more chart tests are added, extract a shared `recharts.mock.ts` helper. For Phase 5's three test files the duplication is tolerable.
- **Drawdown formula matches `OverallPerformance.combined_max_drawdown`** — Gateway computes this server-side; the chart re-derives it client-side for display. When Gateway Phase 6 ships, the two should agree to within rounding.

### Time spent

~25 minutes end-to-end (plan, implementation, two iteration rounds for Recharts 3.x types + Biome a11y, docs).

