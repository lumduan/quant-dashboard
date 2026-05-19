# Phase 7 — Interactive Filter & Date Range (quant-dashboard)

| Field | Value |
|---|---|
| Phase | 7 — Interactive Filter & Date Range |
| Date | 2026-05-19 |
| Author | Claude (Opus 4.7), acting on lumduan's behalf |
| Branch | `feat/phase-7-filter-date-range` |
| Target | `main` (github.com/lumduan/quant-dashboard) |
| Linked roadmap | `docs/plans/ROADMAP.md` §Phase 7 (7.1 Strategy Filter Hook, 7.2 Filter Components) |

---

## Context

Phase 6 shipped the three Strategy Adapter components (`CSMSetAdapter`, `TFEXAdapter`, `DefaultAdapter`) plus `StrategyAdapterFactory` and `NotFoundState`. Main bundle stands at **100.61 KB gzip**, 139/139 tests pass, coverage 99.74/94.94/98.18/99.74 project-wide. `src/components/filters/` is empty (`.gitkeep` only); `src/hooks/useStrategyFilter.ts` does not exist; `DashboardPage` calls `useOverallPerformance()` + `usePortfolioEquityCurve()` only and passes `series={[]}` to `MultiStrategyChart` as a Phase-5 placeholder.

Phase 7 makes the dashboard **interactive and bookmarkable**: filter state lives in the URL search params (`?strategy=a&strategy=b&from=2026-04-19&to=2026-05-19`), not in component state. Refreshing the page or copy-pasting a URL restores the exact filter. URL-as-state has three concrete benefits the alternatives don't:

1. **Bookmarkable** — links can encode a specific cross-section ("portfolio without TFEX, last 30 days").
2. **Reload-safe** — full-page refresh preserves the user's view.
3. **Share-safe** — URLs encode enough state to reproduce a teammate's screen.

The implementation has four pieces:

1. **`useStrategyFilter` hook** — reads/writes `strategy`, `from`, `to` via `useSearchParams` from `react-router-dom`. Setters use the **functional updater** pattern so concurrent updates can never clobber each other (Vercel `rerender-functional-setstate`).
2. **`StrategySelector`** — labeled checkbox list driven by `useStrategies()` (active only). One checkbox per active strategy + capital-weight badge `(XX%)`. "All" / "Clear" buttons. Pure presentational; takes `selectedIds` + `onChange` as props.
3. **`DateRangePicker`** — two `<input type="date">` (From, To). Defaults: 30 days ago / today (display only — does NOT propagate). Validates `from ≤ to`; if invalid, shows `<p role="alert">…</p>` and does NOT call `onChange`.
4. **`FilterBar`** — thin composer. Receives raw setters from page-level hook; wraps each call in `startTransition` (Vercel `rerender-transitions`) and hands wrapped callbacks down. Filter input stays responsive even if downstream renders are heavy.

`DashboardPage` is rewritten to:
- Call `useStrategyFilter()` at the top alongside the other hooks (Vercel `async-parallel`).
- Pass `from`/`to` to `usePortfolioEquityCurve(true, from, to)` so the portfolio chart reflects the date range.
- Use **`useQueries`** to fetch per-strategy equity curves in parallel for `selectedIds`, then assemble `MultiStrategyChart`'s `series` from those results (palette colors cycled per ROADMAP §5.3). This promotes the `useQueries` wiring from ROADMAP §8.1 into §7.1 so the strategy filter is observable end-to-end in Phase 7. Documented in **Architecture decisions** below.

Phase 7 is verified by MSW-mocked Vitest + `pnpm quality` (≥80% all metrics) + a clean `pnpm build`. Browser sanity against a live Gateway remains deferred (`quant-api-gateway` Phase 6 not yet shipped), but does not block Phase 7.

---

## Scope

### In scope

1. **`src/hooks/useStrategyFilter.ts`** — `useSearchParams`-backed hook returning `{ selectedIds, from, to, setSelectedIds, setDateRange } as const`. Both setters are `useCallback`-wrapped with `[setSearchParams]` deps and use the functional updater form (`setSearchParams((prev) => { ... return prev })`). Empty arrays delete the `strategy` key; `undefined` for `from`/`to` deletes its key (preserves the other).
2. **`src/hooks/useStrategyFilter.test.ts`** — co-located. Wrapper builds a fresh `MemoryRouter` per test. Asserts: default empty state, multi-id roundtrip, empty array clears the param, date range set/preserve/clear semantics, refresh-as-remount restores state from URL params.
3. **`src/components/filters/StrategySelector.tsx`** — props `readonly selectedIds: readonly string[]`, `readonly onChange: (ids: readonly string[]) => void`. Data via `useStrategies()`, filters `active: true` (same as Sidebar). Skeleton while pending; silent (non-crashing) fallback on error. Renders one `<label><input type="checkbox" /> {name} ({weight}%)</label>` per active strategy. "All" → calls `onChange(active.map(s => s.id))`. "Clear" → `onChange([])`. Single toggle handler closes over current `selectedIds` and computes the next array (add or remove the id).
4. **`src/components/filters/StrategySelector.test.tsx`** — renders checkboxes from MSW; toggling fires `onChange` with the right ids; "All" / "Clear" buttons; skeleton on pending; absent on error.
5. **`src/components/filters/DateRangePicker.tsx`** — props `readonly from: string | undefined`, `readonly to: string | undefined`, `readonly onChange: (range: { from?: string; to?: string }) => void`. Defaults computed once: `defaultFrom = (Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)`; `defaultTo = new Date().toISOString().slice(0, 10)`. Local draft state holds the typed values; `from`/`to` props seed the initial state; on user change, the draft updates immediately and `onChange` is invoked only when the resulting range is valid. If `draftFrom > draftTo`, `<p role="alert">From date must be before To date</p>` is rendered and `onChange` is NOT called.
6. **`src/components/filters/DateRangePicker.test.tsx`** — renders both `<input type="date">` with labels; valid range fires `onChange({ from, to })`; invalid range shows the alert and does NOT call `onChange`; defaults match the 30-day-ago / today format `YYYY-MM-DD`.
7. **`src/components/filters/FilterBar.tsx`** — composer. Props: `readonly selectedIds: readonly string[]`, `readonly from: string | undefined`, `readonly to: string | undefined`, `readonly onSelectedIdsChange: (ids: readonly string[]) => void`, `readonly onDateRangeChange: (range: { from?: string; to?: string }) => void`. Internally wraps each parent callback in `startTransition` and passes the wrapped versions to `<StrategySelector>` and `<DateRangePicker>` (Vercel `rerender-transitions`). The wrapped callbacks are memoized with `useCallback`.
8. **`src/components/filters/FilterBar.test.tsx`** — renders both children; user interaction propagates through (selecting a strategy + changing date both reach the parent callbacks); `startTransition` is exercised implicitly (no assertion needed — the test still observes the propagated call).
9. **`src/pages/DashboardPage.tsx`** — call `useStrategyFilter()`; pass `from`/`to` to `usePortfolioEquityCurve(true, from, to)`; use `useQueries` to fetch per-strategy equity curves in parallel for the **filtered active strategies** (or all active strategies if `selectedIds.length === 0`); assemble `MultiStrategyChart`'s `series` from those results; render `<FilterBar>` above `<PortfolioSummary>`. Hook is called at the page level (parallel with the other queries) per Vercel `async-parallel`.
10. **MSW handlers verification** — `/api/v1/strategies/:id/equity-curve` already exists in `handlers.ts:85`. The Phase 6 plan already confirmed this; no new endpoints needed. The multi-id test for the dashboard uses `server.use(...)` to override `/api/v1/strategies` with two active strategies.
11. **`docs/plans/phase_7_interactive_filter_date_range.md`** — this plan; includes the verbatim agent prompt.
12. **`docs/plans/ROADMAP.md`** — Phase 7 checkboxes ticked with `done 2026-05-19`; **Current Status** advanced to Phase 8; bundle gzip delta vs Phase 6 baseline (100.61 KB) recorded; test-count delta recorded.

### Out of scope

- **`StrategyCardGrid`** — Phase 8.1. Will independently consume `selectedIds` then.
- **`ErrorState`** — Phase 8.3. Phase 7 keeps `StrategySelector`'s error path silent (returns `null`) rather than pulling forward `ErrorState`.
- **Live Gateway integration** — blocked by `quant-api-gateway` Phase 6. Phase 7 is verified by MSW only.
- **Persisting filter state in `localStorage`** — URL is the only source of truth (`client-localstorage-schema` doesn't apply).
- **Calendar/range-picker third-party library** — native `<input type="date">` is sufficient for Phase 7's scope and adds zero bundle weight.
- **Time-of-day in `from`/`to`** — date precision only, per Gateway's `YYYY-MM-DD` contract.
- **Per-strategy `from`/`to` in `useStrategyEquityCurve`** — the hook currently doesn't accept date params; adding them is a Gateway-driven decision; deferred.

---

## Architecture decisions & constraints

| Decision | Why |
|---|---|
| **URL search params are the single source of truth for filter state** | Bookmarkable, refresh-safe, share-safe. ROADMAP §7.1 acceptance: "Filter state survives reload via URL params." No `useState`/`localStorage` for filter values. |
| **Functional updater (`setSearchParams((prev) => …)`) in both setters** | Avoids stale-closure bugs when two updates fire in the same tick (Vercel `rerender-functional-setstate`). Required by the ROADMAP §7.1 snippet. |
| **Empty array clears `strategy`; `undefined` clears its key, preserving the other** | "Clear" must remove the param entirely so the URL stays clean. `setDateRange({ from: undefined })` must NOT also clear `to`. Tested explicitly. |
| **`useStrategyFilter()` called only in `DashboardPage`** | One subscription to the URL state; props flow down. `FilterBar` stays a pure composer. Avoids double-subscription/re-render in the page tree. (Confirmed during plan-approval.) |
| **`startTransition` lives in `FilterBar`, not in `useStrategyFilter`** | The hook is value-neutral about urgency; the composer is the right place to declare "filter changes are non-urgent" because that's a UX assertion about the bar itself. Wrapping in the hook would force *every* caller into transition semantics. (Vercel `rerender-transitions`.) |
| **`useQueries` in `DashboardPage` for parallel per-strategy equity-curve fetch** | Phase 7 needs `selectedIds` to have a visible effect on the dashboard. `useQueries` runs N fetches in parallel — the canonical Vercel `async-parallel` pattern. ROADMAP §5.3 documented this as Phase 8; we promote it to Phase 7 because it makes the filter observable end-to-end. (Confirmed during plan-approval.) Documented as a minor scope expansion vs ROADMAP-as-written. |
| **`MultiStrategyChart` `series` derived during render via `useMemo`** | Series is a function of `useQueries` results + selected strategies + palette — no `useEffect` (Vercel `rerender-derived-state-no-effect`). |
| **`DateRangePicker` local-draft + alert pattern** | Inputs must show what the user typed even when invalid, but the parent's URL state must NOT update on invalid input. Local-draft holds the displayed value; `onChange` propagates only on valid ranges. `useEffect` is **not** used for prop→draft sync — initial seed only. External URL changes are not expected in Phase 7. |
| **`<input type="date">` is sufficient (no third-party picker)** | Browser-native, ≤ 0 bundle bytes, accessible, full keyboard support. ROADMAP §7.2 calls for `<input type="date">`. |
| **`StrategySelector` filters by `active: true` (same as Sidebar)** | Inactive strategies don't appear in the dashboard; filter UI matches. Inactive ids that arrive via a bookmarked URL are still preserved in `selectedIds` — they simply don't appear as checked boxes. |
| **`StrategySelector` error path is silent (returns `null`)** | `ErrorState` is Phase 8.3. A missing strategy list shouldn't crash the page; the bar simply doesn't render. Documented in §Risks. |
| **All props `readonly`** | Hard Rule + Phase-6 pattern (`StrategyAdapterProps`, `MetricCardProps`). |
| **No new dependencies** | `react-router-dom` already at v7.15.1 (Phase 3) — `useSearchParams` is from the same package. No date library, no UI component library. |
| **No barrel files added** | `src/components/charts/index.ts` remains the only allowed barrel. Filter components import directly. |

---

## Deliverables

### Created

| Path | Purpose |
|---|---|
| `docs/plans/phase_7_interactive_filter_date_range.md` | This plan |
| `src/hooks/useStrategyFilter.ts` | URL-as-state hook (`selectedIds`, `from`, `to`, two setters) |
| `src/hooks/useStrategyFilter.test.ts` | Default state, multi-id roundtrip, clear semantics, date range get/set/preserve, refresh-as-remount |
| `src/components/filters/StrategySelector.tsx` | Checkbox list driven by `useStrategies()` + "All" / "Clear" |
| `src/components/filters/StrategySelector.test.tsx` | Renders from MSW, toggle fires `onChange`, "All" / "Clear" buttons, pending skeleton, error silent |
| `src/components/filters/DateRangePicker.tsx` | Two `<input type="date">` + `from ≤ to` validation + 30-day-ago/today defaults |
| `src/components/filters/DateRangePicker.test.tsx` | Renders inputs, valid range propagates, invalid range alerts + suppresses `onChange`, defaults are recent |
| `src/components/filters/FilterBar.tsx` | Composer; wraps setters in `startTransition` |
| `src/components/filters/FilterBar.test.tsx` | Both children render; user actions propagate; props plumbed correctly |

### Modified

| Path | Change |
|---|---|
| `src/pages/DashboardPage.tsx` | Add `useStrategyFilter()`; pass `from`/`to` to `usePortfolioEquityCurve`; add `useQueries` for per-strategy equity curves; assemble `MultiStrategyChart` `series`; render `<FilterBar>` above `<PortfolioSummary>` |
| `src/pages/DashboardPage.test.tsx` | Add coverage for filter rendering, date-range propagation, and `MultiStrategyChart` series binding (multi-id MSW override) |
| `docs/plans/ROADMAP.md` | Tick Phase 7 checkboxes with `done 2026-05-19`; advance "Current Status" to Phase 8; record test-count + bundle gzip delta |
| `.claude/knowledge/*` | **Only if a genuinely new pattern emerged.** Default: no change. |

### Untouched

- `src/api/*`, `src/hooks/useGateway.ts`, `src/types/*` — data layer complete.
- `src/test/mocks/handlers.ts` — both `/strategies` and `:id/equity-curve` already handled.
- `src/components/charts/*`, `src/components/widgets/*`, `src/components/strategy/*`, `src/components/layout/*`, `src/components/ui/*` — Phase 1–6 outputs final.
- `src/main.tsx` — `BrowserRouter` already wired (Phase 3).
- `vite.config.ts`, `tsconfig.json`, `biome.json`, `package.json` — no new deps.

---

## Acceptance criteria

- [ ] `useStrategyFilter` returns `{ selectedIds: string[], from: string | undefined, to: string | undefined, setSelectedIds, setDateRange } as const`; both setters use functional-updater form.
- [ ] `setSelectedIds(['a','b'])` produces URL `?strategy=a&strategy=b`. `setSelectedIds([])` removes the `strategy` key. Order preserved.
- [ ] `setDateRange({ from: '2026-01-01', to: '2026-05-19' })` produces `?from=2026-01-01&to=2026-05-19`. `setDateRange({ from: undefined })` removes `from` and **preserves** `to`. Symmetric for `to`.
- [ ] Refresh-as-remount: starting `MemoryRouter` at `/?strategy=a&from=2026-01-01` restores `selectedIds=['a']`, `from='2026-01-01'`, `to=undefined`.
- [ ] `StrategySelector` renders one checkbox per **active** strategy from `useStrategies()`; capital-weight badge shows `(60%)` style; "All" selects all active ids; "Clear" empties. Pending → skeleton; error → `null`.
- [ ] `DateRangePicker` renders two `<input type="date">` with labels "From" and "To"; valid range calls `onChange({ from, to })`; invalid range shows `<p role="alert">From date must be before To date</p>` and does **not** call `onChange`; defaults match `YYYY-MM-DD` for 30 days ago / today.
- [ ] `FilterBar` composes both sub-components; wraps both parent setters in `startTransition`; the wrapped callbacks are stable across re-renders (`useCallback` with correct deps).
- [ ] `DashboardPage` calls `useStrategyFilter()`; passes `from`/`to` to `usePortfolioEquityCurve`; uses `useQueries` to fetch per-strategy equity curves in parallel; renders `<FilterBar>` above `<PortfolioSummary>`; `MultiStrategyChart` `series` derived from filtered strategies + parallel query results.
- [ ] **URL is the source of truth**: a bookmarked URL with strategy + date params restores both on first paint.
- [ ] `pnpm typecheck` — zero errors.
- [ ] `pnpm lint` — zero findings.
- [ ] `pnpm format` — no drift.
- [ ] `pnpm test:coverage` — all green; total tests ≥ 139 + Phase 7 additions (≈ +18–22 new tests); coverage ≥ 80% project-wide.
- [ ] `pnpm build` — succeeds; main bundle gzip ≤ 105 KB (Phase 6 baseline 100.61 KB; budget +4.39 KB).
- [ ] `pnpm quality` — full gate green.
- [ ] No `any` anywhere; no `console.log`; no hand-written domain interfaces.
- [ ] `docs/plans/phase_7_interactive_filter_date_range.md` created with verbatim agent prompt embedded.
- [ ] `docs/plans/ROADMAP.md` Phase 7 boxes ticked; "Current Status" advanced to Phase 8.
- [ ] Branch `feat/phase-7-filter-date-range` cut off `main`; commits follow Conventional Commits; PR opened to `main`.

---

## Implementation order

1. `git checkout -b feat/phase-7-filter-date-range` ✓
2. Write this plan doc and commit
3. `useStrategyFilter` + test — smallest, foundational
4. `StrategySelector` + test
5. `DateRangePicker` + test
6. `FilterBar` + test
7. Update `DashboardPage` + extend its test (multi-id MSW override; recharts mock)
8. `pnpm quality` — iterate to green
9. `pnpm build` — record main + chart-chunk sizes
10. Add "Progress / Completion" section to this plan
11. Update `docs/plans/ROADMAP.md` — tick §7.1/§7.2; advance "Current Status" to Phase 8
12. Re-evaluate `.claude/knowledge/*` — only update if a genuinely new pattern emerged
13. Commit implementation: `feat(phase-7): implement interactive filter & date range with URL-as-state`
14. Commit docs: `docs(phase-7): update roadmap, plan notes, and knowledge base`
15. `git push -u origin feat/phase-7-filter-date-range`
16. `gh pr create --base main --title "Phase 7: Interactive Filter & Date Range"`

---

## Critical files (reuse, don't recreate)

- **`src/hooks/useGateway.ts → useStrategies(), usePortfolioEquityCurve(normalize, from, to), useStrategyEquityCurve(id)`** — already wired. Phase 7 only ever **consumes** these.
- **`src/types/gateway.ts → StrategyInfo, EquityPoint`** — `z.infer` types.
- **`src/utils/palette.ts → STRATEGY_COLORS`** — cycle via `i % STRATEGY_COLORS.length` when assembling `MultiStrategyChart` series (same pattern as `AllocationBar`).
- **`src/components/charts/index.ts → MultiStrategyChart`** — lazy default-export wrapper.
- **`src/components/widgets/PortfolioSummary.tsx`** — reference for pending/error guard pattern + `useMemo` on primitive deps.
- **`src/components/layout/Sidebar.tsx`** — reference for `active: true` filtering + pending skeleton via `<output role="status">`.
- **`src/test/render.tsx → renderWithProviders`** — `QueryClient` + `MemoryRouter`; supports `route` prop for the bookmarked-URL test.
- **`src/test/mocks/handlers.ts → handlers, fixtures, server.use(...)`** — canonical MSW fixtures.
- **`src/components/charts/MultiStrategyChart.test.tsx`** — reference for the `vi.mock('recharts', ...)` pattern.

---

## Per-component design notes

### `src/hooks/useStrategyFilter.ts`

```typescript
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UseStrategyFilterResult {
  readonly selectedIds: string[];
  readonly from: string | undefined;
  readonly to: string | undefined;
  readonly setSelectedIds: (ids: readonly string[]) => void;
  readonly setDateRange: (next: { from?: string; to?: string }) => void;
}

export function useStrategyFilter(): UseStrategyFilterResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedIds = searchParams.getAll('strategy');
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;

  const setSelectedIds = useCallback(
    (ids: readonly string[]) => {
      setSearchParams((prev) => {
        prev.delete('strategy');
        for (const id of ids) prev.append('strategy', id);
        return prev;
      });
    },
    [setSearchParams],
  );

  const setDateRange = useCallback(
    (next: { from?: string; to?: string }) => {
      setSearchParams((prev) => {
        if (next.from === undefined) prev.delete('from');
        else prev.set('from', next.from);
        if (next.to === undefined) prev.delete('to');
        else prev.set('to', next.to);
        return prev;
      });
    },
    [setSearchParams],
  );

  return { selectedIds, from, to, setSelectedIds, setDateRange } as const;
}
```

### `DashboardPage` (key changes)

```typescript
const { selectedIds, from, to, setSelectedIds, setDateRange } = useStrategyFilter();
const { data: overall } = useOverallPerformance();
const { data: equityCurve } = usePortfolioEquityCurve(true, from, to);
const { data: strategies } = useStrategies();

const filteredStrategies = useMemo(() => {
  const active = strategies?.filter((s) => s.active) ?? [];
  if (selectedIds.length === 0) return active;
  return active.filter((s) => selectedIds.includes(s.id));
}, [strategies, selectedIds]);

const strategyQueries = useQueries({
  queries: filteredStrategies.map((s) => ({
    queryKey: ['equity-curve', 'strategy', s.id] as const,
    queryFn: () => fetchStrategyEquityCurve(s.id),
  })),
});

const series = useMemo(
  () =>
    filteredStrategies
      .map((s, i) => {
        const q = strategyQueries[i];
        if (!q?.data) return null;
        return {
          id: s.id,
          label: s.name,
          data: q.data,
          color: STRATEGY_COLORS[i % STRATEGY_COLORS.length],
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  [filteredStrategies, strategyQueries],
);
```

Note: `useQueries`'s `queryKey` is identical to `useStrategyEquityCurve`'s — TanStack Query dedupes automatically.

---

## Testing strategy

| Test file | Key assertions |
|---|---|
| `useStrategyFilter.test.ts` | Default `/` → empty state; `setSelectedIds(['a','b'])` → `?strategy=a&strategy=b`; `setSelectedIds([])` → no `strategy`; `setDateRange({...})` set; `setDateRange({from:undefined})` preserves `to`; refresh-as-remount restores state. |
| `StrategySelector.test.tsx` | One checkbox per active strategy from MSW; toggling fires correct `onChange`; "All" / "Clear" buttons; pending skeleton; capital-weight badge; error returns `null`. |
| `DateRangePicker.test.tsx` | Both labelled inputs; defaults `YYYY-MM-DD` (recent); valid range fires `onChange`; invalid range alerts + suppresses `onChange`; fix → alert disappears. |
| `FilterBar.test.tsx` | Both sub-components present; user actions propagate through to parent callbacks (asserted via `await waitFor` since `startTransition` is async). |
| `DashboardPage.test.tsx` (extended) | `<FilterBar>` renders above `<PortfolioSummary>`; multi-strategy MSW override → `MultiStrategyChart` receives 2-series array; mocks recharts per Phase-5 pattern. |

---

## Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Strategy IDs with special chars break URL parsing | Low | Medium | `URLSearchParams.append/getAll` encodes/decodes automatically. |
| `setSearchParams` functional update + `startTransition` race | Low | Medium | React 19 batches; both functional setters compose cleanly. |
| `<input type="date">` validation differs across browsers | Medium | Low | Compare strings (`YYYY-MM-DD`) lexicographically; tests are assertion-only. |
| `useQueries` over an empty `filteredStrategies` returns `[]` | Low | Low | Supported; tested. |
| `useQueries` cache key collides with `useStrategyEquityCurve` | Intentional (dedup) | n/a | Same key intentionally dedupes. |
| Inactive strategies in `selectedIds` (bookmarked URL) | Medium | Low | `filteredStrategies` filters by `active: true` first, then narrows. Inactive ids silently dropped. |
| Local-draft drift in `DateRangePicker` | Low (no external source in Phase 7) | Low | Documented; fixable later with a `key={from + to}` from the parent if needed. |
| Bundle exceeds 105 KB gzip | Low | Low | Phase 6 baseline 100.61 KB; filter layer adds ~3 KB. |
| Coverage drops below 80% | Medium | Medium | Pending + error branches tested; toggle handler tested with both add + remove paths. |
| Vercel `rerender-no-inline-components` violation | Low | High | All four files define exactly one top-level component. |
| Tests rely on single-strategy fixture for multi-id | High (if unaddressed) | Medium | Multi-id test uses `server.use(http.get('/api/v1/strategies', ...))`. |

---

## Verification plan

```bash
git checkout feat/phase-7-filter-date-range
pnpm install              # no new deps; no-op
pnpm typecheck            # zero errors
pnpm lint                 # zero findings
pnpm format               # no drift
pnpm test:coverage        # ≥80% all metrics; ≥139 + ~20 new tests
pnpm build                # main bundle ≤ 105 KB gzip
pnpm quality              # full gate green
```

Browser sanity (deferred until Gateway Phase 6 ships):

```bash
pnpm dev
# http://localhost:5173/?strategy=csm-set-01&from=2026-04-01&to=2026-05-01
#   → FilterBar reflects state; portfolio chart re-fetches with date params;
#     MultiStrategyChart renders one series.
# Click "Clear" → URL strips ?strategy; chart switches to "select strategies".
# Refresh page → state restored.
```

---

## Plan-mode design decisions (confirmed with user)

| Question | Decision | Rationale |
|---|---|---|
| Where should `useStrategyFilter()` be invoked? | **DashboardPage only — FilterBar takes props.** | One subscription to the URL state; FilterBar stays a thin presentational composer; raw setters flow down and FilterBar wraps them in `startTransition` before delegating to its children. |
| Should Phase 7 wire `selectedIds` into `MultiStrategyChart` via `useQueries`? | **Yes — wire it in Phase 7.** | Promotes the `useQueries` work from ROADMAP §8.1 into §7.1 so the strategy filter is observable end-to-end. Aligns with Vercel `async-parallel`. |

---

## Agent prompt (verbatim, embedded for reproducibility)

> You are implementing **Phase 7 — Interactive Filter & Date Range** for the `quant-dashboard` project. Follow this exact workflow — plan first, then implement, then document and commit.
>
> ---
>
> ## Step 0 — Read Before Acting
>
> Read these files in full before writing any code or plan:
>
> 1. `.claude/knowledge/project-skill.md` — internalize all Hard Rules and Soft Conventions
> 2. `.claude/skills/vercel-react-best-practices/SKILL.md` — focus on: `rerender-transitions`, `rerender-use-deferred-value`, `rerender-functional-setstate`, `async-parallel`
> 3. `docs/plans/ROADMAP.md` — read the entire file; focus deeply on **Phase 7 — Interactive Filter & Date Range** (§7.1 and §7.2) and the **Current Status** section
> 4. `docs/plans/phase_6_strategy_adapter_components.md` — understand the last completed phase as context
> 5. `docs/plans/phase_2_zod_schemas_fetch_client.md` — use this as the exact format template for your plan file
>
> ---
>
> ## Step 1 — Create Feature Branch
>
> ```bash
> git checkout -b feat/phase-7-filter-date-range
> ```
>
> ---
>
> ## Step 2 — Write the Plan (DO NOT CODE YET)
>
> Create `docs/plans/phase_7_interactive_filter_date_range.md` following the exact structure of phase_2_zod_schemas_fetch_client.md.
>
> Your plan must include:
> - **Scope** — what is in/out of Phase 7
> - **Deliverables** — every file to be created or modified
> - **Acceptance Criteria** — from ROADMAP.md Phase 7 section
> - **Architecture Decisions** — why URL-as-state, `startTransition` placement, `functional setstate` pattern
> - **Risks / Edge Cases** — `from > to` validation, empty `selectedIds`, URL encoding of strategy IDs with special characters
> - **Implementation Order** — hook → components → page wiring → tests
> - **The full AI agent prompt** (this prompt, embedded verbatim)
>
> Save the file. Commit the plan:
> ```bash
> git add docs/plans/phase_7_interactive_filter_date_range.md
> git commit -m "docs(phase-7): add implementation plan for interactive filter & date range"
> ```
>
> ---
>
> ## Step 3 — Implement
>
> Implement in this order. After each file, run `pnpm typecheck` to catch errors early.
>
> ### 3.1 `src/hooks/useStrategyFilter.ts`
>
> Implement exactly as specified in ROADMAP.md §7.1:
>
> - Read `strategy` params via `searchParams.getAll('strategy')` → `selectedIds: string[]`
> - Read `from` and `to` params → `from: string | undefined`, `to: string | undefined`
> - `setSelectedIds(ids: readonly string[])` — use functional updater: `setSearchParams((prev) => { prev.delete('strategy'); for (const id of ids) prev.append('strategy', id); return prev })`
> - `setDateRange(next: { from?: string; to?: string })` — functional updater pattern, deletes key when value is undefined
> - Return `{ selectedIds, from, to, setSelectedIds, setDateRange } as const`
> - `useCallback` on both setters with `[setSearchParams]` dep
>
> ### 3.2 `src/hooks/useStrategyFilter.test.ts`
>
> Co-locate tests. Use `renderWithProviders` from render.tsx (wrap in `MemoryRouter` with `initialEntries`). Cover:
> - Default state: `selectedIds = []`, `from = undefined`, `to = undefined`
> - `setSelectedIds(['a', 'b'])` → URL contains `?strategy=a&strategy=b`
> - `setSelectedIds([])` → `strategy` param removed from URL
> - `setDateRange({ from: '2026-01-01', to: '2026-05-19' })` → URL contains `?from=2026-01-01&to=2026-05-19`
> - `setDateRange({ from: undefined })` → `from` removed, `to` preserved
> - Refresh (remount with same URL) → state restored from URL params
>
> ### 3.3 `src/components/filters/StrategySelector.tsx`
>
> - Props: `readonly selectedIds: readonly string[]`, `readonly onChange: (ids: readonly string[]) => void`
> - Data: `useStrategies()` — render skeleton while pending, silent error (don't crash)
> - Render a labeled multi-select list: checkbox per strategy + strategy name + capital-weight badge `(XX%)`
> - "All" button → `onChange(strategies.map(s => s.id))`
> - "Clear" button → `onChange([])`
> - Filter by `active: true` (same as Sidebar)
> - **No inline component definitions** (Vercel `rerender-no-inline-components`)
> - `readonly` props throughout
> - Co-locate `StrategySelector.test.tsx`: renders strategy list from MSW mock, checkbox toggles call `onChange`, "All"/"Clear" buttons work
>
> ### 3.4 `src/components/filters/DateRangePicker.tsx`
>
> - Props: `readonly from: string | undefined`, `readonly to: string | undefined`, `readonly onChange: (range: { from?: string; to?: string }) => void`
> - Two `<input type="date">` elements: "From" and "To"
> - Default display: if `from` is undefined render 30 days ago (`new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)`); if `to` is undefined render today
> - Validation: if user sets `from > to`, show `<p role="alert">From date must be before To date</p>` and do NOT call `onChange`
> - Call `onChange` only on valid state
> - Co-locate `DateRangePicker.test.tsx`: renders inputs, valid range calls `onChange`, invalid range shows error and does not call `onChange`, defaults are within last 30 days
>
> ### 3.5 `src/components/filters/FilterBar.tsx`
>
> - Composes `StrategySelector` + `DateRangePicker`
> - Consumes `useStrategyFilter()` internally — this is the single source of truth
> - Wrap ALL setter calls in `startTransition` (Vercel `rerender-transitions`) so filter changes are non-urgent:
>   ```typescript
>   import { startTransition } from 'react'
>   // ...
>   const handleStrategyChange = (ids: readonly string[]) => {
>     startTransition(() => setSelectedIds(ids))
>   }
>   ```
> - Export `useStrategyFilter` return values via a render-prop or context if `DashboardPage` needs them — OR simply have `DashboardPage` call `useStrategyFilter()` directly (preferred: hook called at page level, `FilterBar` receives only callbacks)
> - Co-locate `FilterBar.test.tsx`: renders both sub-components, strategy change + date change propagate through
>
> ### 3.6 Update DashboardPage.tsx
>
> - Call `useStrategyFilter()` at the top of `DashboardPage` (same level as other hooks — parallel execution pattern, Vercel `async-parallel`)
> - Pass `from` and `to` to `usePortfolioEquityCurve(normalize, from, to)`
> - Derive `filteredStrategies` from `strategies` filtered by `selectedIds` (when `selectedIds.length > 0`; otherwise show all)
> - Pass `filteredStrategies` as `series` to `MultiStrategyChart` (using `useQueries` for parallel per-strategy equity curve fetching — stub with `useStrategyEquityCurve` per strategy if `useQueries` isn't wired yet; note in plan)
> - Place `<FilterBar />` above `<PortfolioSummary />` in the layout
> - Wrap `FilterBar` in its own `<Suspense fallback={<LoadingState />}>` if it has async dependencies
>
> ---
>
> ## Step 4 — Quality Gate
>
> Run the full quality gate and fix all failures before proceeding:
>
> ```bash
> pnpm typecheck
> pnpm test:coverage
> pnpm lint
> pnpm format
> # or combined:
> pnpm quality
> ```
>
> All checks must pass. Coverage must remain ≥80% on lines/functions/branches/statements project-wide.
>
> ---
>
> ## Step 5 — Update Documentation
>
> ### 5.1 Update `docs/plans/phase_7_interactive_filter_date_range.md`
>
> Add a **Progress / Completion** section at the bottom:
> - Date completed: 2026-05-19 (or actual date)
> - Total tests added / total project tests
> - Coverage percentages
> - Bundle size delta (main bundle gzip before → after)
> - Any deviations from plan + rationale
> - Mark each acceptance criterion as ✅ or note any deferred items
>
> ### 5.2 Update ROADMAP.md
>
> - Change all Phase 7 `[ ]` items to `[x]` with completion date
> - Update **Current Status** section:
>   - Change "Current phase: Phase 7" → "Current phase: Phase 8"
>   - Add Phase 7 to the Completed list with test count, bundle gzip size, and link to `phase_7_interactive_filter_date_range.md`
>   - Update "Next step" to Phase 8
>
> ### 5.3 Update `.claude/knowledge/*` if needed
>
> If you discovered new patterns (e.g., `startTransition` + `useSearchParams` interaction, date validation pattern), add a note to the relevant knowledge file.
>
> ---
>
> ## Step 6 — Commit and PR
>
> ```bash
> # Stage all implementation files
> git add src/hooks/useStrategyFilter.ts \
>         src/hooks/useStrategyFilter.test.ts \
>         src/components/filters/StrategySelector.tsx \
>         src/components/filters/StrategySelector.test.tsx \
>         src/components/filters/DateRangePicker.tsx \
>         src/components/filters/DateRangePicker.test.tsx \
>         src/components/filters/FilterBar.tsx \
>         src/components/filters/FilterBar.test.tsx \
>         src/pages/DashboardPage.tsx
>
> git commit -m "feat(phase-7): implement interactive filter & date range with URL-as-state"
>
> # Stage documentation updates
> git add docs/plans/phase_7_interactive_filter_date_range.md \
>         docs/plans/ROADMAP.md \
>         .claude/knowledge/
>
> git commit -m "docs(phase-7): update roadmap, plan notes, and knowledge base"
>
> # Push and open PR
> git push origin feat/phase-7-filter-date-range
> gh pr create \
>   --title "Phase 7: Interactive Filter & Date Range" \
>   --body "Implements useStrategyFilter (URL-as-state), StrategySelector, DateRangePicker, FilterBar, and wires DashboardPage. All filter state persists in URL search params. pnpm quality green." \
>   --base main
> ```
>
> ---
>
> ## Constraints & Hard Rules (from project-skill.md)
>
> - **No `axios`** — use native `fetch` only
> - **No hand-written TypeScript interfaces for Gateway types** — infer from Zod schemas
> - **No barrel files** except index.ts
> - **No `any`** outside justified `// biome-ignore` lines
> - **No inline component definitions** — every component defined at module scope
> - **All external responses** validated by a Zod schema before use
> - **`startTransition`** wraps all filter setter calls in `FilterBar`
> - **Functional updater pattern** for all `setSearchParams` calls (never stale closure)
> - **`readonly` props** on all presentational components
> - **`useCallback`** with correct deps on all event handlers passed as props
>
> ---
>
> ## Files to Create / Modify
>
> | File | Action |
> |------|--------|
> | `docs/plans/phase_7_interactive_filter_date_range.md` | CREATE (plan first) |
> | `src/hooks/useStrategyFilter.ts` | CREATE |
> | `src/hooks/useStrategyFilter.test.ts` | CREATE |
> | `src/components/filters/StrategySelector.tsx` | CREATE |
> | `src/components/filters/StrategySelector.test.tsx` | CREATE |
> | `src/components/filters/DateRangePicker.tsx` | CREATE |
> | `src/components/filters/DateRangePicker.test.tsx` | CREATE |
> | `src/components/filters/FilterBar.tsx` | CREATE |
> | `src/components/filters/FilterBar.test.tsx` | CREATE |
> | DashboardPage.tsx | MODIFY |
> | ROADMAP.md | MODIFY |
> | `.claude/knowledge/*` | MODIFY if needed |
>
> Begin with Step 0 (read all referenced files). Do not write a single line of implementation code until `docs/plans/phase_7_interactive_filter_date_range.md` is saved and committed.

---

## Progress / Completion

### Completion date

2026-05-19.

### Quality-gate output

```
pnpm lint           → Checked 63 files. No findings.
pnpm format         → Checked 63 files. No fixes needed (after one format:fix round).
pnpm typecheck      → (zero errors)
pnpm test:coverage  → 172/172 tests passing across 26 files
                      Coverage (project-wide):
                        All files                                            99.8 stmts | 95.32 branch | 98.43 funcs | 99.8 lines
                        src/hooks/useStrategyFilter.ts                        100 / 100   / 100 / 100
                        src/components/filters/StrategySelector.tsx           100 / 94.73 / 100 / 100
                        src/components/filters/DateRangePicker.tsx            100 / 100   / 100 / 100
                        src/components/filters/FilterBar.tsx                  100 / 100   / 100 / 100
                        src/pages/DashboardPage.tsx                           100 / 94.73 / 100 / 100
pnpm build          → 775 modules transformed
                      dist/index.html                                 0.68 KB (gzip 0.42 KB)
                      dist/assets/index-*.css                        16.97 KB (gzip 4.17 KB)
                      dist/assets/EquityCurveChart-*.js               1.29 KB (gzip 0.75 KB)
                      dist/assets/MultiStrategyChart-*.js             9.17 KB (gzip 3.28 KB)
                      dist/assets/DrawdownChart-*.js                 13.97 KB (gzip 5.14 KB)
                      dist/assets/LineChart-*.js                     25.36 KB (gzip 7.73 KB)
                      dist/assets/index-*.js                        343.48 KB (gzip 103.26 KB)
                      dist/assets/CartesianChart-*.js               336.79 KB (gzip 101.50 KB)
```

### Bundle / chunk delta vs Phase 6

| Bundle | Phase 6 | Phase 7 | Delta |
|---|---|---|---|
| Main JS (raw) | 334.99 KB | 343.48 KB | +8.49 KB |
| Main JS (gzip) | **100.61 KB** | **103.26 KB** | **+2.65 KB** |
| CSS (gzip) | 3.92 KB | 4.17 KB | +0.25 KB |
| Recharts chunks (gzip) | ~118 KB | ~118 KB | unchanged (lazy) |

The +2.65 KB main-bundle delta is the four new filter files (`useStrategyFilter` hook + `StrategySelector` + `DateRangePicker` + `FilterBar`) plus the `useQueries` wiring in `DashboardPage`. Recharts stays fully code-split.

### Test count delta vs Phase 6

| Phase | Test files | Tests |
|---|---|---|
| Phase 6 | 22 | 139 |
| Phase 7 | 26 | 172 |
| **Delta** | **+4** | **+33** |

New test files: `useStrategyFilter.test.ts` (8), `StrategySelector.test.tsx` (9), `DateRangePicker.test.tsx` (8), `FilterBar.test.tsx` (3); the existing `DashboardPage.test.tsx` was extended (4 → 9 tests; the original "empty series → status message" test was rewritten because the new behavior shows all active strategies by default).

### Acceptance criteria check

- ✅ `useStrategyFilter` returns the documented shape with functional-updater setters.
- ✅ `setSelectedIds(['a','b'])` → `?strategy=a&strategy=b`; `setSelectedIds([])` removes the key. Order preserved.
- ✅ `setDateRange({...})` set + preserve-other-key semantics for `from` and `to` symmetric.
- ✅ Refresh-as-remount restores state from URL.
- ✅ `StrategySelector` checkbox-per-active-strategy with `(XX%)` badge; "All" / "Clear" buttons; pending skeleton; error returns `null`.
- ✅ `DateRangePicker` two labelled date inputs; valid range fires `onChange`; invalid range shows `<p role="alert">` + suppresses `onChange`; defaults are recent.
- ✅ `FilterBar` composes both sub-components; wraps setters in `startTransition` via `useCallback`-stable wrappers.
- ✅ `DashboardPage` calls `useStrategyFilter()`; passes `from`/`to` to `usePortfolioEquityCurve`; uses `useQueries` for parallel per-strategy equity curves; renders `<FilterBar>` above `<PortfolioSummary>`.
- ✅ Bookmarked URL restores both filters on first paint (verified by `route='/?strategy=csm-set-01'` test).
- ✅ Quality gate fully green; main bundle 103.26 KB gzip (≤ 105 KB budget).
- ✅ No `any`; no `console.log`; no hand-written domain interfaces.
- ✅ Branch `feat/phase-7-filter-date-range` cut off `main`; commits follow Conventional Commits.

### Deviations from the plan

1. **`DateRangeInput` type widened to `from?: string | undefined`** rather than bare `from?: string`. Required by `exactOptionalPropertyTypes: true` so `setDateRange({ from: undefined })` is type-safe. Same fix Phase 2 applied to `PortfolioEquityCurveParams`; documented inline in `useStrategyFilter.ts`. Exported as a named type and reused by `DateRangePicker` and `FilterBar` so all three components agree on the contract.
2. **`DashboardPage` test rewritten, not just extended.** The original "empty series → placeholder" test no longer holds because the new behavior treats "no selection" as "show all active." That test was replaced by two more accurate tests: (a) by default the chart renders all active strategies, no placeholder; (b) when there are zero active strategies (MSW override returns `[]`), the placeholder appears. The reload-restore, date-range, and multi-strategy paths are new tests on top.

### Patterns established or reinforced (Phase 7)

- **URL-as-state via `useSearchParams` + functional updater** — the only way to multi-set search params without stale-closure clobbering. Worth reusing for any future bookmarkable UI state.
- **Single-subscription pattern for shared URL state** — call the hook once at the page level; pass values + setters down. Avoids re-render duplication when multiple components would otherwise subscribe to the same source.
- **`startTransition` lives at the composer, not the source** — the hook is value-neutral; the composer makes the UX claim. Means callers without UX-urgency concerns (e.g. a CLI-like internal page) can use the same hook without paying transition latency.
- **Local-draft + `<input type="date">` validation** — keep the input fully controlled by local state, only propagate via `onChange` when the value passes validation. Avoids the "snap-back" jarring effect that pure-controlled inputs cause when the parent rejects a value. No `useEffect` sync needed because Phase 7 has no external URL-change source.
- **`useQueries` cache-key alignment with single-fetch hook** — using `['equity-curve', 'strategy', id]` in both `useQueries` and `useStrategyEquityCurve` lets TanStack Query dedupe automatically. The strategy-detail page (Phase 6) and the dashboard chart share one cache entry per strategy.

### Time spent

~35 minutes end-to-end (plan, implementation, one format round, one type-fix round for `exactOptionalPropertyTypes`).
