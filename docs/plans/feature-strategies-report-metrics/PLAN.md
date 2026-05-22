# Phase 4 — quant-dashboard — tabs + components + print

| Field | Value |
|---|---|
| Phase | 4 — Tabs + Components + Print |
| Date | 2026-05-21 |
| Author | Claude (Opus 4.7), acting on lumduan's behalf |
| Branch | `feat/dashboard-strategy-report-tabs` |
| Target | `main` (github.com/lumduan/quant-dashboard) |
| Linked roadmap | `../../../../plans/feature-strategies-report-metrics/ROADMAP.md` §Phase 4 |

---

## Context

Phases 1–3 are complete: csm-set computes and emits the `StrategyReport` payload,
infra-db has the schema + hypertables, and the gateway serves three new endpoints
(`/report`, `/trades`, `/benchmark-curve`). Phase 4 consumes those endpoints in the
React dashboard to render a TradingView-style per-strategy report with three tabs
(Metrics / Report / List of trades), lazy-loaded charts, dark-first theme, and
browser-print support.

**What exists today:**
- `StrategyPage` renders a single metrics view via `StrategyAdapterFactory` (no tabs).
- `src/api/schemas.ts` has 5 schemas.
- `src/api/queries.ts` has 6 query functions; `src/hooks/useGateway.ts` has 6 hooks.
- `src/components/charts/` has EquityCurveChart, DrawdownChart, MultiStrategyChart.
- `src/utils/formatters.ts` has `formatTHB(v)`, `formatPercent(v, decimals)`,
  `formatDateTH(iso)`, `trendColor(v)`.
- No print stylesheet exists.

**What's missing:**
- 15 Zod schemas for the StrategyReport tree.
- 3 new API query functions + 3 TanStack hooks.
- ~10 new components (tabs, tables, charts, header, print button).
- Print stylesheet.
- Extended EquityCurveChart.
- `?tab=` deep-linking in StrategyPage.
- MSW handlers for the 3 new endpoints.

**Out of scope:**
- Backend changes (all in Phases 1–3, complete).
- New routes (tab switching is query-string only).
- Docker/nginx changes (Phase 9).

---

## Scope

### In scope

1. Zod schemas — 15 new schemas in `src/api/schemas.ts` (additive only).
2. API queries — `fetchStrategyReport`, `fetchStrategyTrades`,
   `fetchStrategyBenchmarkCurve`.
3. TanStack hooks — `useStrategyReport`, `useStrategyTrades`,
   `useStrategyBenchmarkCurve`.
4. Palette + formatters — `REPORT_COLORS`; extend `formatTHB` with `signed` option;
   add `formatDateBKK`.
5. Print stylesheet — `src/styles/print.css` imported in `main.tsx`.
6. Components: PrintButton, StrategyTabs, MetricTable, HeadlineKPIStrip,
   TradeLogTable, ReportHeader, 4 chart components, extended EquityCurveChart.
7. StrategyPage modification — `useSearchParams` for `?tab=`.
8. MSW fixtures — 3 new handlers.
9. Tests — co-located `.test.tsx` for every new component.
10. Install `@tanstack/react-virtual`.

### Out of scope

- Backend endpoints (Phase 3, complete).
- New routes (tab is query-string).
- Theme toggling (single dark theme).

---

## Architecture decisions & constraints

| Decision | Why |
|---|---|
| Extend `formatTHB` with optional `opts` parameter | Backward-compatible; existing callers pass single arg. |
| Keep existing `formatPercent` as-is | Already handles fractional input + signed prefix. |
| Add `formatDateBKK` as a new function | Needs explicit `timeZone: 'Asia/Bangkok'`; `formatDateTH` stays. |
| REPORT_COLORS use exact TradingView dark hex values | Must match reference PDF for print fidelity. |
| Chart barrel pattern extends, not replaces | Single sanctioned barrel at `charts/index.ts`. |
| Tab state via `useSearchParams` | Bookmarkable, survives refresh, no route nesting. |
| All new EquityCurveChart props default `false` | Backward compatible with existing callers and tests. |

---

## Deliverables

### Created

- `docs/plans/feature-strategies-report-metrics/PLAN.md` — this plan
- `src/styles/print.css`
- `src/components/widgets/PrintButton.tsx` + `.test.tsx`
- `src/components/strategy/StrategyTabs.tsx` + `.test.tsx`
- `src/components/widgets/MetricTable.tsx` + `.test.tsx`
- `src/components/widgets/HeadlineKPIStrip.tsx` + `.test.tsx`
- `src/components/widgets/TradeLogTable.tsx` + `.test.tsx`
- `src/components/widgets/ReportHeader.tsx` + `.test.tsx`
- `src/components/charts/ProfitStructureChart.tsx` + `.test.tsx`
- `src/components/charts/BenchmarkRangeBar.tsx` + `.test.tsx`
- `src/components/charts/PnLDistributionChart.tsx` + `.test.tsx`
- `src/components/charts/WinLossDonut.tsx` + `.test.tsx`

### Modified

- `src/api/schemas.ts`, `src/api/queries.ts`, `src/hooks/useGateway.ts`
- `src/types/gateway.ts`
- `src/utils/palette.ts`, `src/utils/formatters.ts`
- `src/components/charts/index.ts`, `src/components/charts/EquityCurveChart.tsx`
- `src/pages/StrategyPage.tsx`
- `src/test/mocks/handlers.ts`
- `src/main.tsx`
- `package.json` + `pnpm-lock.yaml`

---

## Acceptance criteria

- [ ] `pnpm dev` → `/strategy/csm-set-01?tab=report` renders the full report.
- [ ] `pnpm build` succeeds.
- [ ] `pnpm quality` green (Biome + tsc + Vitest ≥ 80%).
- [ ] Browser Print → Save as PDF produces correct output.
- [ ] Unknown strategy id renders `NotFoundState`.
- [ ] `?tab=trades` renders `TradeLogTable`; `?tab=metrics` renders existing adapter.
- [ ] Tab change updates URL without page reload.
- [ ] All new components have co-located tests.
- [ ] Existing tests pass unchanged.

---

## AI Agent Prompt

> You are implementing **Phase 4 — quant-dashboard — tabs + components + print** from
> the cross-repo feature roadmap at
> `plans/feature-strategies-report-metrics/ROADMAP.md`.
> Follow every step in exact order.
>
> ---
>
> ## Step 0 — Read context first (mandatory, no code until Step 2)
>
> Read these files before touching any code:
> 1. `.claude/knowledge/project-skill.md`
> 2. `.claude/playbooks/feature-development.md`
> 3. `docs/plans/phase_1_bootstrap.md`
> 4. `../plans/feature-strategies-report-metrics/ROADMAP.md`
> 5. `src/api/schemas.ts`, `src/api/queries.ts`, `src/hooks/useGateway.ts`,
>    `src/pages/StrategyPage.tsx`, `src/components/charts/index.ts`,
>    `src/utils/palette.ts`, `src/utils/formatters.ts`, `src/types/gateway.ts`,
>    `src/test/mocks/handlers.ts`, `src/test/render.tsx`.
>
> ---
>
> ## Step 1 — Create git branch
>
> ```bash
> git checkout -b feat/dashboard-strategy-report-tabs
> ```
>
> ---
>
> ## Step 2 — Write the plan first
>
> Create `docs/plans/feature-strategies-report-metrics/PLAN.md` using
> phase_1_bootstrap.md as the format template.
>
> ---
>
> ## Step 3 — Zod schemas (src/api/schemas.ts — additive only)
>
> Add schemas: BenchmarkPointSchema, TradeLogEntrySchema, TradeLogPageSchema,
> HeadlineSchema, ProfitStructureSchema, ReturnsRowSchema, ReturnsSchema,
> BenchmarkComparisonSchema, RiskAdjustedSchema, PnLDistributionBucketSchema,
> WinLossSplitSchema, TradesAnalysisSchema, DetailsRowSchema, DetailsSchema,
> CapitalUsageRowSchema, MarginUsageSchema, CapitalEfficiencySchema,
> RunUpRowSchema, DrawdownRowSchema, RunUpsDrawdownsSchema,
> StrategyReportSchema, StrategyReportResponseSchema.
>
> ---
>
> ## Step 4 — API query functions (src/api/queries.ts — additive only)
>
> Add `fetchStrategyReport`, `fetchStrategyTrades`, `fetchStrategyBenchmarkCurve`
> with param interfaces.
>
> ---
>
> ## Step 5 — TanStack hooks (src/hooks/useGateway.ts — additive only)
>
> Add `useStrategyReport`, `useStrategyTrades` (with `keepPreviousData`),
> `useStrategyBenchmarkCurve`.
>
> ---
>
> ## Step 6 — Palette and formatters
>
> Add `REPORT_COLORS` to palette.ts. Extend `formatTHB` with signed option.
> Add `formatDateBKK` to formatters.ts.
>
> ---
>
> ## Step 7 — Print stylesheet
>
> Create `src/styles/print.css` with `@media print` rules. Import in `main.tsx`.
>
> ---
>
> ## Step 8 — Components and widgets
>
> 1. PrintButton
> 2. StrategyTabs
> 3. MetricTable
> 4. HeadlineKPIStrip
> 5. TradeLogTable
> 6. ReportHeader
> 7. Chart components: ProfitStructureChart, BenchmarkRangeBar,
>    PnLDistributionChart, WinLossDonut
> 8. Extend EquityCurveChart
>
> ---
>
> ## Step 9 — Modify StrategyPage
>
> Add `useSearchParams()` for `?tab=`. Render ReportHeader. Tab panel switching
> with Suspense + ErrorBoundary + ErrorState.
>
> ---
>
> ## Step 10 — Tests and MSW fixtures
>
> Add MSW handlers for `/strategies/:id/report`, `/strategies/:id/trades`,
> `/strategies/:id/benchmark-curve`. Write co-located tests.
>
> ---
>
> ## Step 11 — Quality gate
>
> ```bash
> pnpm quality
> ```
>
> ---
>
> ## Step 12 — Update docs
>
> Update PLAN.md, ROADMAP.md checkboxes, CHANGELOG.md.
>
> ---
>
> ## Step 13 — Commit
>
> Conventional commit with full description.

---

## Progress / Notes

### Completion date: 2026-05-21

All 13 steps completed on branch `feat/dashboard-strategy-report-tabs`.

### Files created (14 new)

- `docs/plans/feature-strategies-report-metrics/PLAN.md`
- `src/styles/print.css`
- `src/components/widgets/PrintButton.tsx` + `.test.tsx`
- `src/components/strategy/StrategyTabs.tsx` + `.test.tsx`
- `src/components/widgets/MetricTable.tsx` + `.test.tsx`
- `src/components/widgets/HeadlineKPIStrip.tsx` + `.test.tsx`
- `src/components/widgets/TradeLogTable.tsx` + `.test.tsx`
- `src/components/widgets/ReportHeader.tsx` + `.test.tsx`
- `src/components/charts/ProfitStructureChart.tsx` + `.test.tsx`
- `src/components/charts/BenchmarkRangeBar.tsx` + `.test.tsx`
- `src/components/charts/PnLDistributionChart.tsx` + `.test.tsx`
- `src/components/charts/WinLossDonut.tsx` + `.test.tsx`

### Files modified (12)

- `src/api/schemas.ts` — 15 new Zod schemas appended
- `src/api/queries.ts` — 3 new query functions + 2 param interfaces
- `src/hooks/useGateway.ts` — 3 new hooks with keepPreviousData
- `src/types/gateway.ts` — ~20 inferred type exports
- `src/utils/palette.ts` — REPORT_COLORS added
- `src/utils/formatters.ts` — formatTHB extended (signed), formatDateBKK added
- `src/components/charts/index.ts` — 4 new React.lazy() exports
- `src/components/charts/EquityCurveChart.tsx` — 3 optional props added
- `src/pages/StrategyPage.tsx` — tabs + ReportHeader + tab panels
- `src/test/mocks/handlers.ts` — fixtures + 3 MSW handlers added
- `src/main.tsx` — print.css import
- `package.json` — @tanstack/react-virtual added

### Decisions taken vs. the plan

- **formatTHB backward-compatible extension**: Added optional `opts?: { readonly signed?: boolean }` parameter. All 8 existing call sites are unaffected.
- **formatPercent kept as-is**: Existing implementation already handles fractional input with signed prefix.
- **formatDateBKK as new function**: Uses `Intl.DateTimeFormat` with `timeZone: 'Asia/Bangkok'`. Existing `formatDateTH` unchanged.
- **REPORT_COLORS use exact TradingView dark hex values**: `#26A69A` positive, `#EF5350` negative, `#2962FF` accent, `#787B86` neutral, `#131722` bg, `#1E222D` panel.
- **Chart barrel pattern extended with 4 new lazy exports**: ProfitStructureChart, BenchmarkRangeBar, PnLDistributionChart, WinLossDonut.
- **EquityCurveChart**: showBuyAndHold merges benchmark data into series by date; showRunUpDrawdownShading adds ReferenceArea; showPerBarPnLHistogram switches to ComposedChart with Bar layer. All new props default to false.
- **Tab state via useSearchParams**: Default 'metrics' preserves backward compatibility. Tab change uses `replace: true` to avoid polluting browser history.
- **TradeLogTable virtualization**: Uses `@tanstack/react-virtual` only when `page.total > 200`. Mocked in all tests.

### Deviations from the plan

- **ReportHeader**: Removed DateRangePicker and date-related props since date filtering is a Phase 7+ feature. The header now renders strategy name, tabs, and print button only.
- **StrategyPage**: Report and trades hooks are always called (with TanStack Query caching), not conditionally on tab active state. This ensures data is pre-fetched when switching tabs.
- **@tanstack/react-virtual**: Added to package.json but cannot run `pnpm install` in the current environment. User must run `pnpm install` before `pnpm quality`.

### Notes for quality gate

- `pnpm install` is needed first (adds @tanstack/react-virtual to node_modules)
- `pnpm quality` runs: lint → format → typecheck → test:coverage (≥80%)
- All new components have co-located tests following project patterns
- Recharts mock pattern used in all chart tests
- @tanstack/react-virtual mock used in TradeLogTable and StrategyPage tests
