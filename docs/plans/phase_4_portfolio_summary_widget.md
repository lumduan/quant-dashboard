# Phase 4 — Portfolio Summary Widget (quant-dashboard)

| Field | Value |
|---|---|
| Phase | 4 — Portfolio Summary Widget |
| Date | 2026-05-18 |
| Author | Claude (Opus 4.7), acting on lumduan's behalf |
| Branch | `phase/4-portfolio-summary-widget` |
| Target | `main` (github.com/lumduan/quant-dashboard) |
| Linked roadmap | `docs/plans/ROADMAP.md` §Phase 4 (4.1 Formatters, 4.2 MetricCard / PortfolioSummary / AllocationBar) |

---

## Context

Phase 3 shipped the layout shell: `BrowserRouter` outside `QueryClientProvider`, `AppLayout` with a single `<Suspense fallback={<LoadingState />}>` boundary, a data-driven `Sidebar` from `useStrategies()`, and a `Header` with a `useDeferredValue` timestamp from `useOverallPerformance()`. `DashboardPage` and `StrategyPage` are still bare-`<h1>` stubs.

Phase 4 puts the **first user-visible content** on the Dashboard: the four headline portfolio metrics + the Capital Allocation Bar, all sourced from `useOverallPerformance()` (the same hook the Header already subscribes to — TanStack Query dedupes the request). It also introduces the formatter and palette utilities the rest of the project will share: Thai-baht / percent / date formatting with module-scoped `Intl` instances (Vercel `js-cache-function-results`), a trend-color helper, and a 5-color strategy palette pulled forward from Phase 5 because `AllocationBar` needs it now.

End-to-end verification against a live Gateway is still deferred (`quant-api-gateway` Phase 6 not yet live). Phase 4 is verified by MSW-mocked tests + `pnpm quality` ≥80%.

---

## Scope

### In scope

1. **`src/utils/formatters.ts`** — `formatTHB`, `formatPercent(v, decimals=2)`, `formatDateTH`, `trendColor`. Module-scoped `Intl.NumberFormat` (`th-TH`, currency THB, maxFraction 0) and `Intl.DateTimeFormat` (`th-TH`, year/month-short/day).
2. **`src/utils/formatters.test.ts`** — positive / negative / zero / very-large THB; fractional ± percent; `formatDateTH` returns a string; `trendColor` triplet.
3. **`src/utils/palette.ts`** — `STRATEGY_COLORS` `as const` tuple of 5 hex strings + `StrategyColor` type.
4. **`src/components/widgets/MetricCard.tsx`** — pure presentational, `readonly` props (`label`, `value`, optional `colorClass`, optional `subtitle`); no internal state, no inline children components.
5. **`src/components/widgets/MetricCard.test.tsx`** — renders label / value; applies `colorClass`; renders `subtitle` when provided; omits subtitle node when absent.
6. **`src/components/widgets/PortfolioSummary.tsx`** — subscribes to `useOverallPerformance()`; renders 4 `MetricCard`s on success (Portfolio Value, Today's Return, Max Drawdown, Active Strategies); 4 inline skeleton placeholders on `isPending`; inline error fallback on `isError`. All derived display strings via `useMemo`.
7. **`src/components/widgets/PortfolioSummary.test.tsx`** — MSW happy path (4 formatted values appear); loading frame (4 skeleton placeholders before resolution); error path via per-test `server.use(...)` → fallback text visible.
8. **`src/components/widgets/AllocationBar.tsx`** — props `{ readonly allocation: Record<string, number> }`; `useMemo` derives sorted segment array `{ id, label, weight, color }[]` (sort by weight desc; color = `STRATEGY_COLORS[i % STRATEGY_COLORS.length]`); renders horizontal stacked bar + legend row.
9. **`src/components/widgets/AllocationBar.test.tsx`** — all keys appear in legend; each segment's inline `width` style matches `weight * 100%`; sort order is weight-desc.
10. Wire `PortfolioSummary` + `AllocationBar` into `src/pages/DashboardPage.tsx`. `AllocationBar` reads `data.allocation` from `useOverallPerformance()` at the page level. Wrap each async section in `<Suspense fallback={<LoadingState />}>` per the prompt.
11. This plan doc.
12. `docs/plans/ROADMAP.md` — tick all Phase 4 boxes with `done 2026-05-18`; add Phase 4 completion block to "Current Status"; advance "Current phase" to Phase 5; record build-size delta.
13. PR `phase/4-portfolio-summary-widget` → `main`.

### Out of scope

- `StrategyCardGrid` — Phase 8.1.
- `ErrorState` / `NotFoundState` components — Phase 8.3 (Phase 4 uses an inline fallback `<p>` instead).
- Charts (`EquityCurveChart`, `DrawdownChart`, `MultiStrategyChart`) — Phase 5.
- `FilterBar` / `StrategySelector` / date range — Phase 7.
- Adapter pattern (`StrategyAdapterFactory` etc.) — Phase 6.
- Extending the MSW `overall-performance` handler — the existing fixture (`{ 'csm-set-01': 0.6, cash: 0.4 }`) is sufficient for happy-path tests; richer allocations are exercised via per-test `server.use(...)` overrides where useful.

---

## Architecture decisions & constraints

| Decision | Why |
|---|---|
| `Intl` constructors hoisted to module scope in `formatters.ts` | Vercel `js-cache-function-results`. ICU constructors cost ~1ms each; called once at import time, not per render. Also the literal ROADMAP §4.1 snippet. |
| `formatPercent(0)` returns `"+0.00%"` (positive sign) but `trendColor(0)` returns gray | Matches the ROADMAP §4.1 spec verbatim (`v >= 0 ? '+' : ''` vs `v > 0`). Slight sign/color inconsistency at exactly zero is acceptable and documented in the test. |
| `MetricCard` is its own file with named export | Vercel `rerender-no-inline-components` + project's "no barrel inside widgets" rule. Imports go through the source path. |
| All four `PortfolioSummary` metric strings derived in `useMemo` | Vercel `rerender-memo`. Each memo's dep is the primitive field on `data` — guards against accidental string churn on cache identity changes. |
| `PortfolioSummary` uses inline skeleton `<div>`s (4 of them) rather than reusing `LoadingState` | `LoadingState` is a full-page skeleton (heading + 4 cards + chart row) — too tall for a 4-card widget. Local skeletons keep layout shift tight. `LoadingState` remains the AppLayout-level fallback for route/lazy boundaries. |
| Error fallback is an inline `<p role="alert">Failed to load portfolio summary.</p>` | `ErrorState` is Phase 8.3. Prompt explicitly says an inline fallback is acceptable for this phase. |
| `AllocationBar` props take `allocation: Record<string, number>` directly | Hook-agnostic and testable in isolation. The page wires `data.allocation` from `useOverallPerformance()` at the call site. |
| `AllocationBar` sorts segments by weight desc | Visually the heaviest weight lands on the left so the bar reads importance-first. Use `[...Object.entries(allocation)].sort((a, b) => b[1] - a[1])` (no `toSorted` because `Object.entries` already returns a fresh array). |
| Colors cycle via `STRATEGY_COLORS[i % STRATEGY_COLORS.length]` | Allocations can include any number of keys (strategies + `cash`); 5 palette entries cycle gracefully. |
| `palette.ts` pulled forward from Phase 5 | `AllocationBar` needs it now. Phase 5's chart components will import the same module — no duplication. |
| Widgets use **named exports** | Matches the Phase 3 convention for non-route components. Default exports remain reserved for `React.lazy` chart targets in Phase 5. |
| `DashboardPage` keeps a **named export** | Matches Phase 3 stub. Phase 8 revisits route components' export style. |
| Each async section wrapped in `<Suspense fallback={<LoadingState />}>` | Both `PortfolioSummary` and `AllocationBar` subscribe to the same query — a single `<Suspense>` around both keeps fallbacks coherent. Phase 5 charts will get their own boundaries when lazy-loaded. (`useQuery` doesn't natively throw to Suspense without `useSuspenseQuery`; components handle their own `isPending`/`isError` branches today, and the same boundary catches Phase 5's lazy chart imports.) |
| Tests use `renderWithProviders` from `src/test/render.tsx` | Already provides QueryClient + MemoryRouter; no need for a bespoke wrapper per widget test. |
| THB locale assertions use substring/regex matches | `Intl.NumberFormat('th-TH', { currency: 'THB' })` output varies by Node ICU build (`"฿1,000,000"` vs `"THB 1,000,000"`). Assert via `/1,000,000/` regex; assert sign and `,` thousand-separator explicitly. |

---

## Deliverables

### Created

| Path | Purpose |
|---|---|
| `docs/plans/phase_4_portfolio_summary_widget.md` | This plan |
| `src/utils/formatters.ts` | THB / percent / date / trendColor with module-scoped Intl |
| `src/utils/formatters.test.ts` | Formatter behavior + edge cases |
| `src/utils/palette.ts` | `STRATEGY_COLORS` tuple + `StrategyColor` type |
| `src/components/widgets/MetricCard.tsx` | Pure presentational metric tile |
| `src/components/widgets/MetricCard.test.tsx` | Label / value / colorClass / subtitle rendering |
| `src/components/widgets/PortfolioSummary.tsx` | 4-up grid wired to `useOverallPerformance()` |
| `src/components/widgets/PortfolioSummary.test.tsx` | Loading / success / error paths |
| `src/components/widgets/AllocationBar.tsx` | Stacked allocation bar + legend |
| `src/components/widgets/AllocationBar.test.tsx` | Segment widths + legend keys + sort order |

### Modified

| Path | Change |
|---|---|
| `src/pages/DashboardPage.tsx` | Wire `PortfolioSummary` + `AllocationBar` inside a `<Suspense>` boundary; keep named export |
| `docs/plans/ROADMAP.md` | Tick Phase 4 boxes; advance "Current Status" to Phase 5; add Phase 4 summary; record bundle delta |

### Untouched

- `src/api/*`, `src/hooks/*`, `src/types/*`, `src/config.ts` — data layer complete.
- `src/test/mocks/handlers.ts` — existing `/api/v1/overall-performance` handler is sufficient; per-test overrides via `server.use(...)`.
- `src/components/layout/*`, `src/components/ui/LoadingState.tsx` — Phase 3 outputs are final.
- `src/pages/StrategyPage.tsx` — Phase 6/8 owns.
- `vite.config.ts`, `tsconfig.json`, `biome.json`, `package.json` — no new dependencies.
- `.claude/knowledge/*` — re-assessed at end; updated only if a genuinely new pattern emerged.

---

## Acceptance criteria

- [x] `formatTHB(1_000_000)` returns a string matching `/1,000,000/` (locale-tolerant) (2026-05-18).
- [x] `formatPercent(0.0123)` → `"+1.23%"`; `formatPercent(-0.0123)` → `"-1.23%"`; `formatPercent(0)` → `"+0.00%"` (2026-05-18).
- [x] `Intl.NumberFormat` and `Intl.DateTimeFormat` constructed exactly once per process (module scope) (2026-05-18).
- [x] `MetricCard` renders label + value; applies `colorClass`; subtitle optional; component defined at module scope (no inline subcomponents) (2026-05-18).
- [x] `PortfolioSummary` renders all 4 metrics from `useOverallPerformance()` data; negative values get red, positive get green via `trendColor`; shows 4 skeleton placeholders on `isPending`; shows inline error message on `isError` (2026-05-18).
- [x] `AllocationBar` renders one bar segment + one legend row per allocation entry; segment widths sum visually to 100%; entries sorted by weight desc (2026-05-18).
- [x] All widget props marked `readonly`; tests use `getByRole`/`getByText` (2026-05-18).
- [x] `pnpm typecheck` / `pnpm lint` / `pnpm format` clean (2026-05-18).
- [x] `pnpm test:coverage` ≥80% on lines/functions/branches/statements project-wide; ≥80% on each new file in `src/utils/` and `src/components/widgets/` (2026-05-18).
- [x] `pnpm build` succeeds; main bundle stays well under 250 KB gzip (2026-05-18).
- [x] `pnpm quality` green (2026-05-18).
- [x] ROADMAP Phase 4 boxes ticked; "Current Status" advanced to Phase 5 (2026-05-18).
- [ ] PR `phase/4-portfolio-summary-widget` → `main` opened (pending push).

---

## Implementation order

1. `git checkout -b phase/4-portfolio-summary-widget`.
2. Write this plan doc.
3. `src/utils/formatters.ts` + `formatters.test.ts`.
4. `src/utils/palette.ts`.
5. `src/components/widgets/MetricCard.tsx` + `MetricCard.test.tsx`.
6. `src/components/widgets/PortfolioSummary.tsx` + `PortfolioSummary.test.tsx`.
7. `src/components/widgets/AllocationBar.tsx` + `AllocationBar.test.tsx`.
8. Update `src/pages/DashboardPage.tsx`.
9. `pnpm typecheck && pnpm lint && pnpm format && pnpm test:coverage && pnpm build && pnpm quality` — iterate to green.
10. Fill the Progress / Notes section (coverage numbers, bundle delta, deviations).
11. Update `docs/plans/ROADMAP.md`.
12. Re-evaluate `.claude/knowledge/*`; update only if a new pattern emerged.
13. `git add -A && git commit -m "feat(phase-4): portfolio summary widget — formatters, MetricCard, PortfolioSummary, AllocationBar"`.
14. `git push -u origin phase/4-portfolio-summary-widget && gh pr create ...`.

---

## Critical files (reuse, do not recreate)

- **`src/hooks/useGateway.ts` → `useOverallPerformance`** — already wired with `refetchInterval: 5*60_000`. Both `PortfolioSummary` and (the parent of) `AllocationBar` subscribe; TanStack Query dedupes the single request.
- **`src/test/render.tsx` → `renderWithProviders`** — single entrypoint for widget tests needing QueryClient + Router context.
- **`src/test/mocks/handlers.ts`** — `fixtures.overall` carries the canonical Gateway shape. Tests assert against fixture values to stay drift-resistant.
- **`src/components/ui/LoadingState.tsx`** — reused as the `<Suspense>` fallback in `DashboardPage`, not inside `PortfolioSummary` (size mismatch).
- **`src/api/schemas.ts` → `OverallPerformanceSchema`** — the contract for `data.allocation` (`Record<string, number>`).

---

## Risk assessment and mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Locale-dependent THB output breaks string equality assertions | High | Low | Use regex / substring matchers (`/1,000,000/`) not `toBe('฿1,000,000')`. Documented in test. |
| `exactOptionalPropertyTypes` rejects spreading optional `colorClass` / `subtitle` | Medium | Low | Render `subtitle` via `{subtitle ? <p>{subtitle}</p> : null}`; build `className` via `['base', colorClass].filter(Boolean).join(' ')`. Never pass `undefined` as a prop value. |
| `useQuery`'s `isPending` flips to `isError` synchronously when MSW returns `HttpResponse.error()` — easy to miss the loading frame in tests | Medium | Low | Loading test asserts the synchronous initial render of skeletons; success test uses `waitFor`; error test uses `findByRole('alert')`. |
| Suspense boundary doesn't actually suspend with regular `useQuery` | Low | Low | Documented: widgets handle their own `isPending` branch; the `<Suspense>` boundary is in place to catch Phase 5's lazy chart chunks. |
| `STRATEGY_COLORS` length (5) vs allocation length (could be >5) cycles colors silently | Medium | Low | `i % STRATEGY_COLORS.length` documented in code; legend shows the key so the user can always attribute the segment. |
| Sorting allocation segments mutates input | Low | Low | `[...Object.entries(allocation)]` produces a fresh array; never mutate `allocation`. |
| `formatDateTH(invalid)` could produce `"Invalid Date"` | Low | Low | Not exercised in Phase 4 (no date display yet); test asserts only that a valid ISO string returns a non-empty string. |
| Bundle size creeps above ceiling | Low | Low | No new dependencies; only utility + small components. Phase 3 baseline 97.51 KB gzip; expect <5 KB delta. |

---

## Testing approach

- **Unit (Vitest + RTL + MSW)** — assertions via `getByRole` / `getByText` / `findByRole`.
  - `formatters.test.ts` — pure-function tests. No DOM. Coverage target ≥95% (small surface).
  - `MetricCard.test.tsx` — `render(<MetricCard label="X" value="Y" />)`; assert label + value via `getByText`; `colorClass` reaches the value element; subtitle present/absent.
  - `PortfolioSummary.test.tsx` — three blocks:
    - *loading* — synchronous assertion that 4 `<output>` skeletons render before the query resolves.
    - *success* — `renderWithProviders(<PortfolioSummary />)`; `await waitFor(...)`; assert each formatted value present.
    - *error* — `server.use(http.get('/api/v1/overall-performance', () => HttpResponse.error()))`; `findByRole('alert')`.
  - `AllocationBar.test.tsx` — pass `{ 'csm-set-01': 0.6, 'tfex-01': 0.3, cash: 0.1 }`; assert all 3 keys in legend; legend order is heaviest-first; each segment's `style.width` matches expected percentage.
- **Type check** — `pnpm typecheck` confirms `readonly` props + `exactOptionalPropertyTypes` + `verbatimModuleSyntax` clean.
- **Lint + format** — Biome enforces `noConsole`, `noExplicitAny`, import order.
- **Coverage** — ≥80% on all new files; `pnpm test:coverage` runs the project gate.
- **Build size** — `pnpm build` confirms no regression vs Phase 3 baseline (97.51 KB gzip).

---

## Verification plan (copy-paste sequence)

```bash
git checkout phase/4-portfolio-summary-widget
pnpm typecheck
pnpm lint
pnpm format
pnpm test:coverage
pnpm build
pnpm quality
```

Manual sanity (the dev proxy will 502 until Gateway is up — that's expected):

```bash
pnpm dev &
sleep 2
# http://localhost:5173/   → red error indicator in Header
#                            + PortfolioSummary inline alert fallback
#                            + AllocationBar hidden (no allocation when error)
kill %1
```

---

## Agent prompt (verbatim, embedded for reproducibility)

> You are implementing Phase 4 — Portfolio Summary Widget for the quant-dashboard project. Follow this exact workflow: READ → PLAN → IMPLEMENT → DOCUMENT → COMMIT/PR.
>
> ---
>
> ## Step 1 — Read Before Anything
>
> 1. Read `.claude/knowledge/project-skill.md` in full. Internalize all Hard Rules and Soft Conventions.
> 2. Read `.claude/skills/vercel-react-best-practices/SKILL.md`. Note which rules apply to Phase 4 (especially `js-cache-function-results`, `rerender-no-inline-components`, `rerender-memo`).
> 3. Read `docs/plans/ROADMAP.md` — focus on Phase 4 (§4.1 Formatters, §4.2 MetricCard / PortfolioSummary / AllocationBar) but also scan the Current Status and conventions sections.
> 4. Read `docs/plans/phase_3_layout_navigation.md` to understand what was shipped last.
>
> ---
>
> ## Step 2 — Create Git Branch
>
> ```bash
> git checkout -b phase/4-portfolio-summary-widget
> ```
>
> ---
>
> ## Step 3 — Write the Plan First (DO NOT CODE YET)
>
> Create `docs/plans/phase_4_portfolio_summary_widget.md` mirroring the structure of phase_2_zod_schemas_fetch_client.md. The plan must include:
>
> - Phase summary and goal
> - Scope (what is in / out of Phase 4)
> - Ordered deliverables with file paths
> - Acceptance criteria (copied + refined from ROADMAP.md)
> - Risks and edge cases
> - Dependency notes (LoadingState already exists; MSW handler may need extending)
> - The full AI agent prompt embedded (this prompt)
>
> Save the plan. Do not proceed to Step 4 until the plan file exists on disk.
>
> ---
>
> ## Step 4 — Implement in Order
>
> ### 4a. `src/utils/formatters.ts`
>
> ```typescript
> // Hoist Intl instances to module scope — expensive constructors called once only
> // (Vercel js-cache-function-results)
> const THB_FORMATTER = new Intl.NumberFormat('th-TH', {
>   style: 'currency',
>   currency: 'THB',
>   maximumFractionDigits: 0,
> })
>
> const DATE_FORMATTER = new Intl.DateTimeFormat('th-TH', {
>   year: 'numeric',
>   month: 'short',
>   day: 'numeric',
> })
>
> export const formatTHB = (v: number): string => THB_FORMATTER.format(v)
>
> export const formatPercent = (v: number, decimals = 2): string =>
>   `${v >= 0 ? '+' : ''}${(v * 100).toFixed(decimals)}%`
>
> export const formatDateTH = (iso: string): string =>
>   DATE_FORMATTER.format(new Date(iso))
>
> export const trendColor = (v: number): string =>
>   v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-gray-400'
> ```
>
> ### 4b. `src/utils/formatters.test.ts`
>
> Cover: positive THB, negative THB, zero, very large (1,000,000+), fractional percent (+1.23%, -1.23%, 0.00%), `formatDateTH` returns a string, `trendColor` for positive/negative/zero. Target ≥80% branch coverage.
>
> ### 4c. `src/utils/palette.ts`
>
> ```typescript
> export const STRATEGY_COLORS = [
>   '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
> ] as const
>
> export type StrategyColor = typeof STRATEGY_COLORS[number]
> ```
>
> ### 4d. `src/components/widgets/MetricCard.tsx`
>
> - Pure presentational component — no internal state, no side effects.
> - All props `readonly`.
> - Do NOT define this component inside another component (Vercel `rerender-no-inline-components`).
> - Props: `readonly label: string`, `readonly value: string`, `readonly colorClass?: string`, `readonly subtitle?: string`.
> - Render a card with label, value (applying `colorClass`), and optional subtitle.
> - Co-locate `MetricCard.test.tsx`: assert `getByText(label)`, `getByText(value)`, color class applied.
>
> ### 4e. `src/components/widgets/PortfolioSummary.tsx`
>
> - Subscribes to `useOverallPerformance()`.
> - While loading (`isLoading`): render 4 skeleton `MetricCard` placeholders (reuse/extend `LoadingState` pattern from Phase 3 or render inline skeletons — keep consistent with existing UI).
> - On error: surface a concise error message (full `ErrorState` component is Phase 8 — a simple inline fallback is acceptable here).
> - On success: render a 4-up responsive grid using `MetricCard`:
>   1. Portfolio Value → `formatTHB(data.total_portfolio_value)`
>   2. Today's Return → `formatPercent(data.weighted_daily_return)` with `trendColor`
>   3. Max Drawdown → `formatPercent(data.combined_max_drawdown)` with `trendColor`
>   4. Active Strategies → `String(data.active_strategies)` + label "strategies"
> - Use `useMemo` for all derived display values (Vercel `rerender-memo`).
> - Co-locate `PortfolioSummary.test.tsx`: MSW returns mocked `OverallPerformance`; assert all 4 metric values appear via `getByText`; assert loading skeleton renders before data resolves.
>
> ### 4f. `src/components/widgets/AllocationBar.tsx`
>
> - Props: `readonly allocation: Record<string, number>` (from `OverallPerformance.allocation`).
> - Use `useMemo` to derive sorted segment array `{ id, label, weight, color }[]` using `STRATEGY_COLORS` from `src/utils/palette.ts` — O(1) per segment (Vercel `js-set-map-lookups` mindset).
> - Render a horizontal stacked bar: each segment is a `<div>` with `width: {weight * 100}%` and `background: color`.
> - Include a legend row below the bar showing strategy name + formatted percent per segment.
> - Co-locate `AllocationBar.test.tsx`: assert all strategy keys appear in the rendered output; assert widths correspond to allocation values.
>
> ### 4g. Update handlers.ts
>
> Verify a MSW handler for `GET /api/v1/overall-performance` exists with realistic mock data matching `OverallPerformanceSchema`. Add one if missing.
>
> ### 4h. Update DashboardPage.tsx
>
> Wire `PortfolioSummary` and `AllocationBar` into the page. The `AllocationBar` receives `data.allocation` from `useOverallPerformance()`. Wrap each async section in `<Suspense fallback={<LoadingState />}>`.
>
> ---
>
> ## Step 5 — Quality Gate
>
> Run and confirm all pass:
>
> ```bash
> pnpm typecheck
> pnpm lint
> pnpm test:coverage   # must be ≥80% lines/functions/branches/statements
> pnpm build           # main bundle < 250 KB gzip
> pnpm quality         # combined gate
> ```
>
> Fix any failures before proceeding.
>
> ---
>
> ## Step 6 — Document
>
> Update `docs/plans/phase_4_portfolio_summary_widget.md`:
> - Mark each deliverable complete with date (2026-05-18 or actual date).
> - Note any test failures encountered and how they were resolved.
> - Record final coverage numbers and build bundle size.
>
> Update ROADMAP.md:
> - Change all Phase 4 `[ ]` items to `[x]` with date annotation.
> - Update "Current Status" section to reflect Phase 4 complete, Phase 5 next.
> - Add a note in the Phase 4 completed summary block (matching Phase 3's style).
>
> If any new patterns were discovered (e.g., skeleton loading conventions, Tailwind color utilities for trend colors), update the relevant knowledge or skills file.
>
> ---
>
> ## Step 7 — Commit and PR
>
> ```bash
> git add -A
> git commit -m "feat(phase-4): portfolio summary widget — formatters, MetricCard, PortfolioSummary, AllocationBar"
> git push origin phase/4-portfolio-summary-widget
> # open PR targeting main
> gh pr create --title "Phase 4 — Portfolio Summary Widget" \
>   --body "Implements Phase 4: formatters (THB/percent/date/trendColor), MetricCard, PortfolioSummary, AllocationBar, palette. pnpm quality ✅"
> ```
>
> ---
>
> ## Constraints & Hard Rules (non-negotiable)
>
> - No `axios` — native `fetch` + Zod only.
> - No hand-written TypeScript interfaces for Gateway data — infer from Zod schemas.
> - No barrel `index.ts` inside widgets (Vercel `bundle-barrel-imports`).
> - No `console.log` in committed code.
> - No `any` without `// biome-ignore` justification.
> - `Intl` constructors must be module-scoped, never inside render functions.
> - `MetricCard` must NOT be defined inside `PortfolioSummary` — separate file (Vercel `rerender-no-inline-components`).
> - All derived values in `PortfolioSummary` and `AllocationBar` memoized with `useMemo` (Vercel `rerender-memo`).
> - Tests use `getByRole` / `getByText` per `coding-standards.md §Accessibility`.

---

## Progress / Notes

### Completion (2026-05-18)

- Branch `phase/4-portfolio-summary-widget` cut off `main`.
- All 10 created files + 2 modified files in the deliverables table written / updated.
- `pnpm quality` green on the first full pass after a single format auto-fix (Biome wanted single-quoted strings in two `it()` titles + a multi-line `await screen.findByText(...)` collapsed onto one line).

### Quality-gate output

```
pnpm lint           → Checked 38 files in 18ms. No fixes applied.
pnpm format         → Checked 38 files in 14ms. No fixes applied.
pnpm typecheck      → (zero errors)
pnpm test:coverage  → 81/81 tests passing across 14 files
                      Coverage:
                        All files                          100 stmts | 97.65% branch | 100 funcs | 100 lines
                        src/utils/formatters.ts            100 / 100 / 100 / 100
                        src/utils/palette.ts               100 / 100 / 100 / 100
                        src/components/widgets/*.tsx       100 /  97.61 / 100 / 100
                          MetricCard.tsx                   100 / 100 / 100 / 100
                          PortfolioSummary.tsx             100 / 100 / 100 / 100
                          AllocationBar.tsx                100 /  85.71 / 100 / 100  (line 25 = FALLBACK_COLOR safety branch)
                        src/pages/DashboardPage.tsx        100 / 100 / 100 / 100
                        src/types/gateway.ts                 0 /   0 /   0 /   0     (type-only module)
pnpm build          → 112 modules,
                      dist/index.html          0.68 kB (gzip 0.42 kB)
                      dist/assets/index-*.css 14.83 kB (gzip 3.66 kB)
                      dist/assets/index-*.js 327.34 kB (gzip 98.46 kB)
```

### Bundle delta

| Bundle | Phase 3 | Phase 4 | Delta |
|---|---|---|---|
| Main JS (raw) | 324.02 kB | 327.34 kB | +3.32 kB |
| Main JS (gzip) | 97.51 kB | 98.46 kB | **+0.95 kB** |
| CSS (gzip) | 3.09 kB | 3.66 kB | +0.57 kB |

The gzip JS delta (+0.95 KB) is the four new widget components + the formatter / palette utilities. No new dependencies. Well under the 250 KB-gzip ceiling.

### Issues encountered and resolved

- **Biome formatter** rejected double-quoted strings in two test titles and wanted a multi-line `await screen.findByText(...)` collapsed onto one line. Fixed via `pnpm format:fix` (single round).
- **`noUncheckedIndexedAccess` typing on `STRATEGY_COLORS[i % length]`** — under the strict flag, dynamic-index access returns `string | undefined`. Resolved with `?? FALLBACK_COLOR` (a slate-400 hex) so the runtime path is total. Coverage shows line 25 of `AllocationBar.tsx` as the only uncovered branch (the fallback never actually triggers — `i % length` is always in range — but it satisfies the typechecker without a `// biome-ignore` or non-null assertion).
- **No further iterations** — typecheck, lint, format, tests, and build all green after the single format fix.

### Notes on patterns observed

- **Module-scoped `Intl.NumberFormat` + `Intl.DateTimeFormat` cuts construction cost dramatically** — ICU constructors are ~1 ms each on cold paths. Two instances created once at module import; `formatTHB` and `formatDateTH` are just thin method calls thereafter. Pattern reusable for any future locale-sensitive formatter.
- **`useMemo` with primitive deps**, not the whole `data` object, keeps memo cache hits stable across React Query refetches. Each `useMemo` in `PortfolioSummary` depends on a single `data?.field` primitive — when the cache returns a structurally-equal value, the memo never recomputes.
- **Inline skeletons sized to the live content** prevent layout shift better than reusing the full-page `LoadingState`. The widget's 4-cell grid is mirrored exactly in the loading state (same `GRID_CLASS` constant, four `h-24` placeholders).
- **`role="alert"` is the right semantic for inline error fallback** — it gets announced by screen readers without a layout component (good fit when `ErrorState` isn't built yet).
- **`<output>` over `<div role="status">` for skeleton regions** — same pattern Phase 3 established. Biome's `useSemanticElements` rule already enforces it.

### Notes for Phase 5 and later

- **`src/utils/palette.ts` is shared** — pulled forward into Phase 4. Phase 5's `EquityCurveChart`, `DrawdownChart`, and `MultiStrategyChart` should import `STRATEGY_COLORS` from the same module so the dashboard's `AllocationBar` colors visually match the chart series.
- **`AllocationBar` cycles colors via `i % length`** — when allocation has more keys than the palette has entries (>5), colors repeat. Legend still shows the key, so attribution remains clear. If Phase 5 needs a wider palette, extend `STRATEGY_COLORS` rather than introducing a per-feature palette.
- **`DashboardPage` is still skeletal** — it composes `PortfolioSummary` + `AllocationBar` today; Phase 5 will add the equity/drawdown chart row, Phase 7 the `FilterBar` + URL-state filter, Phase 8 the `StrategyCardGrid`. Each can drop into the `<div className="space-y-6 p-6">` container without restructuring.
- **`PortfolioSummary` handles its own `isPending`/`isError` branches today**. When Phase 5's lazy chart chunks arrive, the page-level `<Suspense fallback={<LoadingState />}>` boundaries already wired around `PortfolioSummary` and `AllocationBar` will additionally catch the chart imports' suspension without further changes.
- **Manual sanity** with `pnpm dev` will show 🔴 Error in the header + `PortfolioSummary`'s inline alert until `quant-api-gateway` Phase 6 ships (Gateway is the actual data source). Expected, not a regression.

### Time spent

~20 minutes end-to-end (plan, implementation, one format-fix round, docs).
