# Phase 3 — Layout & Navigation (quant-dashboard)

| Field | Value |
|---|---|
| Phase | 3 — Layout & Navigation |
| Date | 2026-05-18 |
| Author | Claude (Opus 4.7), acting on lumduan's behalf |
| Branch | `feat/phase-3-layout-navigation` |
| Target | `main` (github.com/lumduan/quant-dashboard) |
| Linked roadmap | `docs/plans/ROADMAP.md` §Phase 3 |

---

## Context

Phase 2 left `quant-dashboard` with a complete data layer — Zod schemas mirroring the Gateway Pydantic contracts, an `apiFetch` wrapper that `safeParse`s every response, and six TanStack Query hooks under `QueryClientProvider`. `BrowserRouter` was intentionally deferred so this phase could ship routes and the layout shell together.

Phase 3 puts the **layout shell** in place: `BrowserRouter` + route map nested inside the existing `QueryClientProvider`, an `AppLayout` whose `<Suspense>` boundary lets route chunks (and Phase 5's lazy chart chunks) stream cleanly (Vercel `async-suspense-boundaries`), a `Sidebar` whose navigation is fully data-driven from `useStrategies()` (zero code change when a new strategy is added to the Gateway), and a `Header` whose connection indicator and "Last updated" timestamp derive from `useOverallPerformance()` with `useDeferredValue` applied to the timestamp so the header never blocks chart re-renders (Vercel `rerender-use-deferred-value`). Two page stubs (`DashboardPage`, `StrategyPage`) satisfy routing so the shell is testable end-to-end via MSW today; Phase 8 replaces both wholesale.

This phase is purely structural — no widgets, no charts, no filters. Acceptance is verified by MSW-mocked tests and `pnpm quality` ≥80%.

---

## Scope

### In scope

1. **`BrowserRouter` + route map** (`src/main.tsx`) — `<BrowserRouter><QueryClientProvider><AppLayout><Routes>…</Routes></AppLayout></QueryClientProvider></BrowserRouter>`. Replaces the `<App />` placeholder wholesale.
2. **`LoadingState`** (`src/components/ui/LoadingState.tsx`) — content-shaped skeleton (not a spinner); `readonly message?: string`; module-level component.
3. **`AppLayout`** (`src/components/layout/AppLayout.tsx`) — `<Suspense fallback={<LoadingState />}>` wrapping `{children}`; renders `<Sidebar />` + `<Header />` + `<main>{children}</main>`; responsive ≥1280px via Tailwind grid.
4. **`Sidebar`** (`src/components/layout/Sidebar.tsx`) — `useStrategies()`-driven `NavLink` list + home link; skeleton while pending; no inline subcomponents.
5. **`Header`** (`src/components/layout/Header.tsx`) — connection indicator switching on `useOverallPerformance().status` (🟢 success / 🟡 pending / 🔴 error); "Last updated: HH:MM:SS" derived from `data.computed_at`; `useDeferredValue` applied to the formatted timestamp string per spec.
6. **Page stubs** — `src/pages/DashboardPage.tsx` (named export, `<h1>Dashboard</h1>`); `src/pages/StrategyPage.tsx` (named export, `useParams<{ id: string }>()` → `<h1>Strategy: {id}</h1>`).
7. **`renderWithProviders` test helper** (`src/test/render.tsx`) — wraps QueryClient (`retry: false`) + `MemoryRouter` for router-aware co-located tests.
8. **Co-located tests** for every component (LoadingState, Sidebar, Header, AppLayout, DashboardPage, StrategyPage) using MSW + `getByRole`/`getByText`.
9. **Delete `src/App.tsx` + `src/App.test.tsx`** — replaced by AppLayout shell.
10. **Plan doc** (this file) and **ROADMAP updates** — tick Phase 3 boxes; advance "Current Status" to Phase 4; record bundle delta.
11. **PR opened** `feat/phase-3-layout-navigation` → `main`.

### Out of scope

- Widgets / charts / filters / real Dashboard content — Phases 4–7.
- `ErrorState` / `NotFoundState` — Phase 8.3 ships these alongside the real pages.
- New barrel `index.ts` files inside `layout/` or `ui/` — Hard Rule from Phase 1 (Vercel `bundle-barrel-imports`); only `charts/index.ts` is allowed.
- E2E verification against a live Gateway — blocked by `quant-api-gateway` Phase 6.

---

## Architecture decisions & constraints

| Decision | Why |
|---|---|
| `<BrowserRouter>` outermost; `<QueryClientProvider>` nested inside it | Per Phase 2 closeout notes: query client lives across navigations; routing changes don't tear down the cache. Matches the snippet in ROADMAP §Phase 3. |
| Single `<Suspense>` boundary at `AppLayout` level, not per route | One boundary streams Phase 5's lazy chart chunks; per-route boundaries would create flicker on navigation. Satisfies Vercel `async-suspense-boundaries`. |
| `LoadingState` lives in `src/components/ui/` | Phase 8.3 already plans it there. Shipping in Phase 3 fills the real Suspense-fallback need; Phase 8.3 only needs to iterate on skeleton variants. |
| Header connection indicator switches on `useOverallPerformance().status` directly | TanStack Query v5 `QueryStatus = 'pending' \| 'error' \| 'success'` is an exhaustive union — the mapping is total by construction. No derived flags or conditional chains. |
| `useDeferredValue` applied to the **formatted** timestamp string | The prompt specifies `const deferred = useDeferredValue(computedAt)`. Formatting before deferring keeps the deferred value a primitive (cheap identity diff). |
| Pages use **named exports** | The prompt is explicit. Diverges from the "default exports for route components" soft convention but Phase 8 revisits. |
| `App.tsx` + `App.test.tsx` deleted | Once `main.tsx` no longer imports `App`, the file is unreachable. "No half-finished implementations." |
| Sidebar/Header are **siblings** inside `AppLayout`, both alongside `<main>` | Tailwind grid `lg:grid-cols-[16rem_1fr]` with the header inside the main column. Matches the prompt's "alongside" wording. |
| Tests for router-aware components use `MemoryRouter` (not `BrowserRouter`) | History isolated per test; `initialEntries=['/strategy/csm-set-01']` lets `StrategyPage.test.tsx` assert the `:id` flow. |
| Shared `renderWithProviders` helper in `src/test/render.tsx` | Both `Sidebar` and `Header` need QueryClient; router-aware tests also need `MemoryRouter`. Helper is excluded from coverage by the existing `src/test/**` rule. |

---

## Deliverables

### Created

| Path | Purpose |
|---|---|
| `docs/plans/phase_3_layout_navigation.md` | This plan |
| `src/test/render.tsx` | `renderWithProviders` helper (QueryClient + optional MemoryRouter) |
| `src/components/ui/LoadingState.tsx` | Content-shaped skeleton for Suspense and async sections |
| `src/components/ui/LoadingState.test.tsx` | Renders; optional `message` prop displayed |
| `src/components/layout/Sidebar.tsx` | NavLink list from `useStrategies()` + home link |
| `src/components/layout/Sidebar.test.tsx` | Pending skeleton; per-strategy NavLinks; home link |
| `src/components/layout/Header.tsx` | Connection indicator + deferred timestamp |
| `src/components/layout/Header.test.tsx` | 🟢 on success / 🔴 on error / timestamp render |
| `src/components/layout/AppLayout.tsx` | Suspense + Sidebar + Header + main shell |
| `src/components/layout/AppLayout.test.tsx` | Children render inside Suspense; Sidebar + Header in DOM |
| `src/pages/DashboardPage.tsx` | `<h1>Dashboard</h1>` stub |
| `src/pages/DashboardPage.test.tsx` | Renders the heading |
| `src/pages/StrategyPage.tsx` | `<h1>Strategy: {id}</h1>` stub |
| `src/pages/StrategyPage.test.tsx` | `:id` URL param flows through |

### Modified

| Path | Change |
|---|---|
| `src/main.tsx` | Replace `<App />` with `<BrowserRouter><QueryClientProvider><AppLayout><Routes>…</Routes></AppLayout></QueryClientProvider></BrowserRouter>` |
| `docs/plans/ROADMAP.md` | Tick Phase 3 checkboxes; advance "Current Status" to Phase 4; note build-size delta |

### Deleted

| Path | Reason |
|---|---|
| `src/App.tsx` | Replaced by AppLayout shell — no longer reachable |
| `src/App.test.tsx` | Pair of above |

### Untouched

- `src/api/*`, `src/hooks/*`, `src/types/*`, `src/config.ts`, `src/utils/*` — data layer complete.
- `vite.config.ts`, `tsconfig.json`, `biome.json`, `package.json` — no new deps; `react-router-dom` already in `dependencies`.
- `src/test/mocks/handlers.ts` — existing handlers cover Phase 3; per-test error overrides via `server.use(...)`.
- `.claude/knowledge/*` — reassessed at end; updated only if a genuinely new pattern emerged.

---

## Acceptance criteria

- [x] `pnpm typecheck` — zero errors (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax`) (2026-05-18).
- [x] `pnpm lint` / `pnpm format` — clean (2026-05-18).
- [x] `pnpm test:coverage` — 53/53 passing; 100 stmts / 97.29 branch / 100 funcs / 100 lines (2026-05-18).
- [x] `pnpm build` — succeeds; bundle delta recorded (2026-05-18).
- [x] `pnpm quality` — full gate green (2026-05-18).
- [x] No `any` outside justified `// biome-ignore`; no `console.log`; all props `readonly`.
- [x] No component defined inside another component (Vercel `rerender-no-inline-components`).
- [x] `<Suspense fallback={<LoadingState />}>` wraps `{children}` inside `AppLayout`.
- [x] `Sidebar` consumes `useStrategies()`; renders one `NavLink` per active strategy + a home link; shows a skeleton while pending.
- [x] `Header` connection indicator follows `useOverallPerformance().status`: 🟢 / 🟡 / 🔴.
- [x] `Header` applies `useDeferredValue` to the timestamp string per spec.
- [x] `BrowserRouter` wired in `main.tsx`; `/` → `DashboardPage`; `/strategy/:id` → `StrategyPage` with the id rendered.
- [x] ROADMAP §Phase 3 boxes ticked; "Current Status" advanced to Phase 4 (2026-05-18).
- [x] PR `feat/phase-3-layout-navigation` → `main` opened — [#3](https://github.com/lumduan/quant-dashboard/pull/3) (2026-05-18).

---

## Implementation order

1. `git checkout -b feat/phase-3-layout-navigation`.
2. Write `docs/plans/phase_3_layout_navigation.md` (this file).
3. `src/test/render.tsx` — `renderWithProviders` helper.
4. `src/components/ui/LoadingState.tsx` + `LoadingState.test.tsx`.
5. `src/components/layout/Sidebar.tsx` + `Sidebar.test.tsx`.
6. `src/components/layout/Header.tsx` + `Header.test.tsx`.
7. `src/components/layout/AppLayout.tsx` + `AppLayout.test.tsx`.
8. `src/pages/DashboardPage.tsx` + test.
9. `src/pages/StrategyPage.tsx` + test.
10. Replace `src/main.tsx` body with the router-wired tree.
11. Delete `src/App.tsx` and `src/App.test.tsx`.
12. `pnpm typecheck && pnpm lint && pnpm format && pnpm test:coverage && pnpm build` — iterate to green.
13. Fill the Progress / Notes section of this plan (coverage numbers, bundle delta, deviations).
14. Update `docs/plans/ROADMAP.md` — tick boxes + advance Current Status.
15. Re-evaluate `.claude/knowledge/*`; update only if new pattern emerged.
16. Stage and commit with Conventional Commits subject; push branch; open PR.

---

## Critical files (reuse, don't recreate)

- **`src/hooks/useGateway.ts`** — `useStrategies()` for Sidebar; `useOverallPerformance()` for Header.
- **`src/test/mocks/handlers.ts`** — `fixtures` export carries canonical Gateway shapes; tests assert against fixtures rather than hard-coded values.
- **`src/test-setup.ts`** — MSW lifecycle already wired; per-test response overrides go through `server.use(...)`.
- **`.claude/knowledge/coding-standards.md` §Tests** — `getByRole` / `getByText` over `querySelector`; MSW for network mocking.
- **`.claude/knowledge/architecture.md` §Module Boundaries** — `components/` may import from `hooks/`, never the reverse.
- **ROADMAP §Phase 3** — snippets are reference; deviations require justification.

---

## Risk assessment and mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `useDeferredValue` on a string formatted in render churns identity every refetch | Medium | Low | Format via `useMemo(() => fmt(computedAt), [computedAt])` before deferring; primitive deferred value stays stable until `computed_at` changes. |
| `Header` tests race `useQuery` state — easy to assert "fetching", hard to assert "success" without `waitFor` | High | Low | Use `waitFor(() => ...)` for success path; `server.use(http.get(..., () => HttpResponse.error()))` for the error path. |
| `NavLink` requires a Router context — naive `render(<Sidebar />)` throws | High | Low | All router-aware tests go through `renderWithProviders` which wraps with `MemoryRouter`. |
| Suspense fallback never resolves under jsdom | Low | Low | Phase 3 has no `lazy()` callers; the fallback only fires if a Suspense-throwing child appears. AppLayout test renders a sync stub child — the fallback path is exercised once Phase 5 lazy charts land. |
| `verbatimModuleSyntax` rejects implicit type imports from `react-router-dom` | High | Low | `import type` for `NavLinkProps`; value imports for `NavLink`, `Routes`, `Route`, `useParams`, `MemoryRouter`, `BrowserRouter`. |
| `exactOptionalPropertyTypes` makes `LoadingState`'s `message?: string` rejection-prone | Medium | Low | Define as `readonly message?: string`; never pass `message={undefined}` from callers. Render conditionally. |
| Deleting `App.tsx` breaks an import we missed | Low | High | `rg "from '@/App'"` + `rg "App.tsx"` before deletion; `pnpm typecheck` is the final gate. |
| `useParams<{ id: string }>()` returns `id: string \| undefined` despite the generic | High | Low | Route registration guarantees `:id`; render `<h1>Strategy: {id ?? ''}</h1>` as the practical guard. Phase 8 swaps in `NotFoundState`. |
| Bundle grows non-trivially with `react-router-dom` | Medium | Low | Phase 2 baseline 219.86 KB JS / 68.30 KB gzip. Record the new size in ROADMAP "Current Status". |

---

## Testing approach

- **Unit (Vitest + RTL + MSW)** — `getByRole` / `getByText` only; no `querySelector`.
  - `LoadingState.test.tsx` — renders; passes `message` prop and asserts text.
  - `Sidebar.test.tsx` — pending state shows a loading region; success renders one anchor per fixture strategy + a home anchor.
  - `Header.test.tsx` — 🟢 on success after `waitFor`; 🔴 on error after `server.use(...)` override; timestamp string is present and contains the formatted time.
  - `AppLayout.test.tsx` — renders a synchronous test child; asserts `role="navigation"` (Sidebar), `role="banner"` (Header), and `role="main"` are all present.
  - `DashboardPage.test.tsx` — heading "Dashboard" present.
  - `StrategyPage.test.tsx` — `renderWithProviders({ route: '/strategy/csm-set-01' })` + `<Routes>` mounting `StrategyPage`; assert the id flows into the heading.
- **Type check** — `pnpm typecheck` confirms `verbatimModuleSyntax` / `exactOptionalPropertyTypes` cleanliness.
- **Lint + format** — Biome enforces `noConsole`, `noExplicitAny`, import order.
- **Coverage** — ≥80% all metrics.

---

## Verification plan (copy-paste sequence)

```bash
git checkout feat/phase-3-layout-navigation
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
# http://localhost:5173/                       → "Dashboard" heading + 🔴 Error indicator
# http://localhost:5173/strategy/csm-set-01    → "Strategy: csm-set-01" heading
kill %1
```

---

## Agent prompt (verbatim, embedded for reproducibility)

> You are implementing Phase 3 — Layout & Navigation for the quant-dashboard project. Follow these steps precisely and in order.
>
> ---
>
> ## 1. Read Knowledge Base First
>
> Before anything else, read these files in full:
>
> - `.claude/knowledge/project-skill.md` — internalize all Hard Rules and Soft Conventions
> - `.claude/skills/vercel-react-best-practices/SKILL.md` — async-suspense-boundaries, rerender-use-deferred-value, rerender-no-inline-components, bundle-barrel-imports
> - `docs/plans/ROADMAP.md` — focus on Phase 3 section and Current Status
> - `docs/plans/phase_2_zod_schemas_fetch_client.md` — use as the reference format for your plan markdown
>
> ---
>
> ## 2. Create a Git Branch
>
> ```bash
> git checkout -b feat/phase-3-layout-navigation
> ```
>
> ---
>
> ## 3. Write the Implementation Plan FIRST
>
> Draft `docs/plans/phase_3_layout_navigation.md` using phase_2_zod_schemas_fetch_client.md as the format template.
>
> The plan must include:
> - Scope and goals
> - Deliverables list (files to create/modify)
> - Acceptance criteria (mirroring ROADMAP.md Phase 3)
> - Risks and mitigations (e.g., Suspense boundary placement, useDeferredValue timing)
> - Step-by-step implementation order
> - This prompt embedded verbatim in the plan
>
> Save the plan file before writing any source code.
>
> ---
>
> ## 4. Implementation
>
> Only begin after the plan is saved. Implement in this order:
>
> ### 4.1 BrowserRouter + Route Map — main.tsx
>
> Wrap the existing `QueryClientProvider` with `BrowserRouter`. Nest routes inside `AppLayout`:
>
> ```typescript
> import { BrowserRouter, Route, Routes } from 'react-router-dom'
> import { AppLayout } from '@/components/layout/AppLayout'
> import { DashboardPage } from '@/pages/DashboardPage'
> import { StrategyPage } from '@/pages/StrategyPage'
>
> // Inside JSX:
> <BrowserRouter>
>   <QueryClientProvider client={queryClient}>
>     <AppLayout>
>       <Routes>
>         <Route path="/" element={<DashboardPage />} />
>         <Route path="/strategy/:id" element={<StrategyPage />} />
>       </Routes>
>     </AppLayout>
>   </QueryClientProvider>
> </BrowserRouter>
> ```
>
> ### 4.2 `src/components/ui/LoadingState.tsx`
>
> Create a skeleton component that mimics real content layout (NOT a generic spinner). It will be used as the Suspense fallback in AppLayout and chart lazy wrappers. Props: `readonly message?: string`. Mark all props `readonly`. Do NOT define this component inside another component (Vercel `rerender-no-inline-components`).
>
> ### 4.3 `src/components/layout/AppLayout.tsx`
>
> - Wraps `{children}` inside `<Suspense fallback={<LoadingState />}>` so route chunks and chart lazy-imports stream correctly (Vercel `async-suspense-boundaries`).
> - Renders `<Sidebar />` and `<Header />` alongside `<main>{children}</main>`.
> - Responsive layout ≥1280px.
> - Do NOT define Sidebar or Header inline here.
>
> ### 4.4 `src/components/layout/Sidebar.tsx`
>
> - Call `useStrategies()` to get the strategy list.
> - Render a `<NavLink to={"/strategy/" + s.id}>` for each active strategy.
> - Include a home link `<NavLink to="/">` for the Dashboard.
> - Show a loading skeleton while strategies are fetching.
> - Zero code changes required when a new strategy is added to the Gateway — the nav is fully data-driven.
> - Do NOT define sub-components inline.
>
> ### 4.5 `src/components/layout/Header.tsx`
>
> - Connection indicator derived from `useOverallPerformance().status`:
>   - `'success'` → 🟢 Connected
>   - `'pending'` → 🟡 Fetching
>   - `'error'` → 🔴 Error
> - "Last updated: HH:MM:SS" derived from `data.computed_at`.
> - Apply `useDeferredValue` on the timestamp string so the header never blocks chart re-renders (Vercel `rerender-use-deferred-value`):
>   ```typescript
>   const deferred = useDeferredValue(computedAt)
>   ```
> - Do NOT define sub-components inline.
>
> ### 4.6 Page Stubs
>
> Create minimal but correctly-typed stubs — enough to satisfy routing and tests:
>
> - `src/pages/DashboardPage.tsx` — renders a placeholder `<h1>Dashboard</h1>` (will be replaced in Phase 8).
> - `src/pages/StrategyPage.tsx` — reads `useParams<{ id: string }>()`, renders `<h1>Strategy: {id}</h1>` (will be replaced in Phase 8).
>
> Both must be valid named exports (not default exports at this phase to keep imports explicit).
>
> ---
>
> ## 5. Co-located Tests
>
> Write tests alongside each component. Use MSW (already wired in mocks) and `@testing-library/react`. Use `getByRole` / `getByText` for queries — never `querySelector`. Cover:
>
> - `AppLayout.test.tsx` — renders children inside Suspense; Sidebar and Header present in DOM.
> - `Sidebar.test.tsx` — shows strategy NavLinks from mocked `GET /api/v1/strategies`; shows loading state while pending; home link present.
> - `Header.test.tsx` — shows 🟢 when status=success; shows 🔴 when status=error; `useDeferredValue` does not break timestamp rendering.
> - `LoadingState.test.tsx` — renders without crashing; optional message prop displayed.
>
> ---
>
> ## 6. Quality Gate
>
> Run and fix until all pass:
>
> ```bash
> pnpm quality
> ```
>
> This runs: Biome lint + format + typecheck + test:coverage (≥80% lines/functions/branches/statements).
>
> Also verify manually:
> - Navigate `/` → DashboardPage stub renders.
> - Navigate `/strategy/csm-set-01` → StrategyPage stub renders with correct id.
> - Sidebar NavLinks generated from mocked strategy list.
> - Header shows correct connection indicator for each query status.
>
> ---
>
> ## 7. Update Documentation
>
> After all tests pass:
>
> 1. **`docs/plans/phase_3_layout_navigation.md`** — add:
>    - Completion date (today)
>    - Final coverage numbers
>    - Any test issues encountered and how they were resolved
>    - Notes on useDeferredValue behavior observed
>    - Check all acceptance criteria as ✅
>
> 2. **ROADMAP.md** — update Phase 3 section:
>    - Change all `[ ]` items to `[x]` with "done YYYY-MM-DD" annotations
>    - Update "Current Status" section: set current phase to Phase 4, move Phase 3 to Completed
>    - Note build size delta in Current Status
>
> 3. If any new patterns, decisions, or hard-won knowledge emerged, update the relevant knowledge file.
>
> ---
>
> ## 8. Commit and Pull Request
>
> ```bash
> git add -A
> git commit -m "feat(phase-3): layout & navigation — AppLayout, Sidebar, Header, BrowserRouter wiring"
> gh pr create --title "Phase 3 — Layout & Navigation" --body "Implements AppLayout with Suspense boundary, dynamic Sidebar from useStrategies(), Header with useDeferredValue timestamp, BrowserRouter route map, and page stubs. All acceptance criteria met. pnpm quality green."
> ```
>
> ---
>
> ## Constraints to Enforce Throughout
>
> - No `axios` — only native `fetch` + Zod.
> - No new barrel `index.ts` files inside `components/layout/` or `components/ui/`.
> - No `any` type without `// biome-ignore` justification.
> - No `console.log` in committed code.
> - All props interfaces use `readonly` modifier.
> - No component definitions inside other components (Vercel `rerender-no-inline-components`).
> - Types must be inferred from Zod schemas — never hand-written interfaces for API data.
> - `useDeferredValue` applied on the timestamp in Header exactly as specified.
> - `<Suspense>` boundary in AppLayout wraps all children.

---

## Progress / Notes

### Completion (2026-05-18)

- Branch `feat/phase-3-layout-navigation` cut off `main`.
- All 13 files in the deliverables table created or modified; `src/App.tsx` and `src/App.test.tsx` deleted.
- `pnpm quality` green on the first full pass after one round of lint cleanup (see below).

### Quality-gate output

```
pnpm lint           → Checked 29 files in 13ms. No fixes applied.
pnpm format         → Checked 29 files in  4ms. No fixes applied.
pnpm typecheck      → (zero errors)
pnpm test:coverage  → 53/53 tests passing across 10 files
                      Coverage:
                        All files                      100 stmts | 97.29% branch | 100 funcs | 100 lines
                        src/components/layout/*.tsx    100 / 100 / 100 / 100
                        src/components/ui/*.tsx        100 / 100 / 100 / 100
                        src/pages/*.tsx                100 /  66.66 / 100 / 100
                        src/api/*, src/hooks/*         100 / 100 / 100 / 100
                        src/types/gateway.ts             0 /   0 /   0 /   0   (type-only module)
pnpm build          → 107 modules,
                      dist/index.html          0.68 kB (gzip 0.42 kB)
                      dist/assets/index-*.css 11.28 kB (gzip 3.09 kB)
                      dist/assets/index-*.js 324.02 kB (gzip 97.51 kB)
```

### Bundle delta

| Bundle | Phase 2 | Phase 3 | Delta |
|---|---|---|---|
| Main JS (raw) | 219.86 kB | 324.02 kB | +104.16 kB |
| Main JS (gzip) | 68.30 kB | 97.51 kB | **+29.21 kB** |
| CSS (gzip) | 2.31 kB | 3.09 kB | +0.78 kB |

The gzip JS delta is driven by `react-router-dom@7.15.1` (BrowserRouter, Routes, NavLink, useParams, matchers). Still well under the 250 kB-gzip ceiling. No Recharts yet — Phase 5 will move charts into a separate lazy chunk before the bundle approaches the ceiling.

### Issues encountered and resolved

- **Biome `useSemanticElements` rule** flagged both `<div role="status">` skeleton containers (LoadingState + Sidebar pending region). Resolution: swap to `<output>`, which has the implicit `role="status"` + `aria-live="polite"` per the HTML spec. Drops the explicit `aria-live` and `role` attributes. `<output>` defaults to `display: inline`; added Tailwind `block` so the layout still flows. Tests (`getByRole('status', ...)`) keep working because the implicit role is preserved.
- **Biome formatter** wanted Sidebar's `<nav>` opening tag on a single line and Header.test.tsx's `server.use(http.get(...))` inlined. Both auto-fixed via `pnpm format:fix`.
- **No further iterations** — typecheck, lint, format, tests, and build all green on the first pass after the two lint fixes.

### Notes on `useDeferredValue` behavior observed

- The Header's deferred timestamp string converges immediately under jsdom — React schedules the catch-up render in the next microtask, and `waitFor` reliably observes the converged value within its default 1 s window.
- Formatting *before* deferring (via `useMemo`) keeps the deferred value a primitive string. When `data?.computed_at` is unchanged across re-renders, both the memo and the deferred value preserve referential equality, so the header doesn't trigger downstream renders unnecessarily.
- The placeholder `'—'` is emitted while `data` is undefined (initial pending state). Once `useOverallPerformance` resolves, the deferred value picks up the formatted `HH:MM:SS` string on the next render.

### Patterns established (Phase 3)

- **`renderWithProviders` helper** (`src/test/render.tsx`) — single entrypoint for router-aware + query-aware component tests. Builds a fresh `QueryClient` per call with `retry: false`, wraps in `MemoryRouter` with optional `route` initial entry, and returns the standard `render` result plus the constructed `client` for cache-key assertions. Excluded from coverage by the existing `src/test/**` rule. Future phases (filter tests, page tests, widget tests) reuse this without duplication.
- **`<output>` for status regions** — Biome's `useSemanticElements` rule and the HTML spec both prefer `<output>` over `<div role="status">`. Pattern applied in both LoadingState (full-screen skeleton) and Sidebar (small inline skeleton). Always set `aria-label` so screen readers read the purpose; always add Tailwind `block` because `<output>` is inline by default.
- **`Record`-as-const for status mappings** — `STATUS_LABEL = { success: '🟢 Connected', ... } as const` plus a `QueryStatus` union from TanStack Query gives a total, type-safe lookup with no `| undefined` widening from `noUncheckedIndexedAccess`. Cleaner than a switch when there are exactly three cases and the values are static.

### Notes for Phase 4 and later

- **Suspense boundary is already placed at AppLayout level** — Phase 5's `React.lazy` chart imports will stream through it without needing a per-route boundary. If Phase 8 wants per-route fallback messaging, an additional inner Suspense can wrap individual page regions.
- **Sidebar filters by `strategy.active`** — Gateway-controlled. Inactive strategies are never linked from the sidebar, even if they appear in `useStrategies()`. Phase 8 may want to surface inactive ones somewhere (settings page?), but Phase 3 is intentionally selective.
- **Pages use named exports** in Phase 3 per the prompt. The `coding-standards.md` soft convention prefers default exports for route components; Phase 8 should revisit when the real Dashboard and Strategy components land.
- **`StrategyPage` falls back to an empty id (`{id ?? ''}`)** when `useParams` returns undefined. Phase 8.3 replaces this with the `NotFoundState` component.
- **Manual sanity** with `pnpm dev` will show 🔴 Error in the header until `quant-api-gateway` Phase 6 ships — the dev proxy gets a 502 from the down Gateway, and `apiFetch` surfaces it as `ApiError`. This is expected, not a regression.

### Time spent

~25 minutes end-to-end (plan, scaffold, two-fix lint round, docs).
