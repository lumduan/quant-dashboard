# Phase 2 — Zod Schemas, Fetch Client & TanStack Query (quant-dashboard)

| Field | Value |
|---|---|
| Phase | 2 — Zod Schemas, Fetch Client & TanStack Query |
| Date | 2026-05-18 |
| Author | Claude (Opus 4.7), acting on lumduan's behalf |
| Branch | `phase/2-zod-schemas-fetch-client-tanstack-query` |
| Target | `main` (github.com/lumduan/quant-dashboard) |
| Linked roadmap | `docs/plans/ROADMAP.md` §Phase 2 (2.1 / 2.2 / 2.3) |

---

## Context

Phase 1 left the repo with a clean Vite + TypeScript + Tailwind v4 shell, a Zod-validated `src/config.ts`, the feature folder skeleton (`src/api/`, `src/hooks/`, `src/types/` all empty save `.gitkeep`), and TanStack Query v5 installed-but-not-wired. Phase 2 puts the **data layer** in place: Zod schemas that mirror the Gateway's Pydantic contracts 1:1, a typed `fetch` wrapper that validates every response via `safeParse`, one query function per Gateway endpoint, and TanStack Query hooks that consumers will reach for in Phases 3–8.

This is the phase that enforces **`project-skill.md` Hard Rule #4** ("Zod at boundaries"): every external response is validated *before* it enters the typed domain, and every type in `src/types/gateway.ts` is `z.infer<typeof XSchema>` — never a hand-written interface. The schema is the single source of truth; the type follows.

**End-to-end verification against a live Gateway is intentionally deferred** — `quant-api-gateway` Phase 6 is not yet shipped. Phase 2 is verified via MSW-mocked tests today; Phase 3 (or whenever the Gateway lands) will validate against real responses.

---

## Scope

### In scope

1. **Zod schemas** (`src/api/schemas.ts`) — `EquityPointSchema`, `StrategyInfoSchema`, `StrategyPerformanceSchema`, `OverallPerformanceSchema`, `PortfolioSnapshotSchema`. Shapes mirror ROADMAP §2.1 exactly.
2. **Inferred types** (`src/types/gateway.ts`) — only `export type X = z.infer<typeof XSchema>`. Zero hand-written interfaces.
3. **Fetch client** (`src/api/client.ts`) — `ApiError` class + `apiFetch<T>(path, schema, init?)` using `safeParse`. Relative paths only (the Vite dev proxy handles routing; no `getConfig()` import needed).
4. **Query functions** (`src/api/queries.ts`) — six functions covering all 11 Gateway endpoints (overall performance, strategies list, strategy performance ± date range, strategy equity curve, portfolio equity curve ± params, portfolio snapshot ± `:date` path-param).
5. **Test infrastructure for MSW** — install `msw@^2`, create `src/test/mocks/handlers.ts` (default happy-path handlers) + `src/test/mocks/server.ts` (`setupServer` instance) + wire `beforeAll/afterEach/afterAll` in `src/test-setup.ts`. Mocks excluded from coverage.
6. **Client tests** (`src/api/client.test.ts`) — happy path, HTTP error → `ApiError` with status, schema mismatch → `ApiError` with "Schema mismatch" message.
7. **Queries tests** (`src/api/queries.test.ts`) — URL assembly per function (path encoding, optional query params, `/portfolio/snapshot` vs `/portfolio/snapshot/:date` branch). Confirmed in the plan-approval round so `queries.ts` keeps ≥80% coverage.
8. **Provider wiring** (`src/main.tsx`) — `QueryClientProvider` with the documented defaults (`staleTime: 4 * 60_000`, `gcTime: 10 * 60_000`, `refetchOnWindowFocus: false`, `retry: 1`). **No `BrowserRouter` yet** — Phase 3 owns that wiring; `App.tsx` is replaced by `AppLayout` + `<Routes>` there. Confirmed in the plan-approval round.
9. **TanStack Query hooks** (`src/hooks/useGateway.ts`) — `useOverallPerformance`, `useStrategies`, `useStrategyEquityCurve(id)`, `usePortfolioEquityCurve(normalize, from?, to?)`, `useStrategyPerformance(id, from?, to?)`, `usePortfolioSnapshot(date?)`.
10. **Hook tests** (`src/hooks/useGateway.test.ts`) — `renderHook` with a fresh `QueryClient` per test via a wrapper; verify cache-key shape, `enabled` gating on empty id, `refetchInterval` option presence, and one end-to-end data flow against MSW.
11. **Plan doc** (this file) and **ROADMAP updates** (tick Phase 2 boxes, advance "Current Status" to Phase 3).
12. **PR opened** `phase/2-zod-schemas-fetch-client-tanstack-query` → `main`.

### Out of scope

- `BrowserRouter`, `AppLayout`, `Sidebar`, `Header` — Phase 3.
- Widgets, charts, adapters, filters — Phases 4–7.
- A logger utility — `ApiError` carries enough context to surface in UI later.
- Mutation hooks — Gateway is read-only.
- E2E verification against a live Gateway — blocked by `quant-api-gateway` Phase 6.
- CHANGELOG entry — kept minimal until Phase 9.

---

## Architecture decisions & constraints

| Decision | Why |
|---|---|
| **Relative paths in `apiFetch` (no `getConfig()` import)** | Phase 1's notes-to-future-phases explicitly recommend relative `/api/*` paths so the Vite dev proxy handles routing. Importing `getConfig()` would couple every test to env stubbing for no gain. |
| **`z.ZodType<T>` over the deprecated `z.ZodSchema<T>` alias** | The ROADMAP snippet uses `ZodSchema<T>`; in zod ≥3.25 that's a deprecated alias for `ZodType<T>`. We use `z.ZodType<T>` in the implementation but match the public contract documented in §2.2. |
| **MSW v2 (`http.get(...)` + `HttpResponse.json(...)`)** | v1 is deprecated and not Vite-friendly. v2 patches global `fetch` (works under Vitest jsdom) and pairs with `@vitest/coverage-v8`. |
| **MSW server lives in `src/test/mocks/`, wired globally in `test-setup.ts`** | One source of mock state per test run. Per-test overrides go through `server.use(...)`. Coverage excludes the mocks directory because it's test infrastructure. |
| **`QueryClientProvider` lives in `main.tsx`, not `App.tsx`** | The provider is infrastructural; `App.tsx` will be swapped out for `AppLayout` in Phase 3 and we don't want the provider's lifecycle tied to that swap. Same shape as the existing `<StrictMode>`. |
| **No `BrowserRouter` in Phase 2** | Confirmed during plan approval. Phase 1's plan already deferred it; adding it now leaves dead routing code. Phase 3 ships routes simultaneously with `BrowserRouter`. |
| **`QueryClient` instantiated at module scope in `main.tsx`** | Singleton per page load; Vite full-reloads on changes to `main.tsx`. Hook tests **never** import this singleton — each test builds a fresh `QueryClient({ defaultOptions: { queries: { retry: false } } })` inside its wrapper so assertions stay deterministic. |
| **`fetchPortfolioSnapshot(date?)` branches between `/portfolio/snapshot` and `/portfolio/snapshot/:date`** | Matches the Gateway contract. `:date` is path-encoded via `encodeURIComponent` for safety even though valid input is `YYYY-MM-DD`. |
| **`refetchInterval: 5 * 60_000` only on `useOverallPerformance`** | Per ROADMAP §2.3; the Gateway's 5-min cache TTL makes more aggressive polling pointless for individual strategy queries. |
| **Hook tests use `renderHook` from `@testing-library/react`** | Already at v16.x (React 19-compatible); no new test dep needed. |

---

## Deliverables

### Created

| Path | Purpose |
|---|---|
| `docs/plans/phase_2_zod_schemas_fetch_client.md` | This plan |
| `src/api/schemas.ts` | 5 Zod schemas mirroring Gateway Pydantic contracts |
| `src/types/gateway.ts` | `z.infer` types only |
| `src/api/client.ts` | `ApiError` + `apiFetch<T>` |
| `src/api/client.test.ts` | Happy path / HTTP error / schema mismatch tests |
| `src/api/queries.ts` | 6 query functions |
| `src/api/queries.test.ts` | URL-assembly + path-encoding + optional-params tests |
| `src/hooks/useGateway.ts` | 6 TanStack Query hooks |
| `src/hooks/useGateway.test.ts` | Cache keys, `enabled` gating, `refetchInterval`, E2E MSW |
| `src/test/mocks/handlers.ts` | Default MSW request handlers for the 6 endpoints |
| `src/test/mocks/server.ts` | `setupServer(...handlers)` instance |

### Modified

| Path | Change |
|---|---|
| `package.json` + `pnpm-lock.yaml` | Add `msw@^2` to `devDependencies` |
| `src/main.tsx` | Add `QueryClientProvider` (and `QueryClient` config) wrapping `<App />` |
| `src/test-setup.ts` | Import `server` from `@/test/mocks/server`; wire `beforeAll(server.listen)` / `afterEach(server.resetHandlers)` / `afterAll(server.close)` |
| `vite.config.ts` | Add `src/test/**` to coverage `exclude` array |
| `docs/plans/ROADMAP.md` | Tick all Phase 2 checkboxes; advance "Current Status" to Phase 3 |

### Untouched

- `src/config.ts`, `src/config.test.ts` — config layer already complete.
- `src/App.tsx`, `src/App.test.tsx` — Phase 3 replaces these wholesale.
- `tsconfig.json`, `biome.json`, `.gitignore`, `.dockerignore`, `Dockerfile`, `nginx.conf`.
- `.claude/*` — reassessed at the end of implementation; updated only if a genuinely new pattern emerged.

---

## Acceptance criteria

- [x] `pnpm install` succeeds; lockfile updated with `msw@2.14.6` (2026-05-18)
- [x] `pnpm typecheck` — zero errors (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax`) (2026-05-18)
- [x] `pnpm lint` — zero findings (2026-05-18)
- [x] `pnpm format` — no drift (2026-05-18)
- [x] `pnpm test:coverage` — 38/38 passing; 100% stmts / 98% branch / 100% funcs / 100% lines project-wide; 100% across `client.ts`, `queries.ts`, `useGateway.ts`, `schemas.ts` (2026-05-18)
- [x] `pnpm build` — succeeds; main bundle 68.30 KB gzip (well under 250 KB) (2026-05-18)
- [x] `pnpm quality` — full gate green (2026-05-18)
- [x] No `any` anywhere in `src/`; no `biome-ignore` needed
- [x] No `console.log` anywhere in `src/`
- [x] Every type in `src/types/gateway.ts` is `z.infer<typeof XSchema>` — zero hand-written interfaces
- [x] `apiFetch` throws `ApiError` on both HTTP error and schema mismatch (never silent) — verified by `src/api/client.test.ts`
- [x] `useStrategyEquityCurve('')` query is gated by `enabled: false` — verified
- [x] `useOverallPerformance()` query options include `refetchInterval` (5 minutes) — verified via observer options
- [x] Cache keys match exactly the shapes documented in ROADMAP §2.3
- [ ] ROADMAP §Phase 2 boxes ticked; "Current Status" advanced to Phase 3 — done as part of this commit
- [ ] PR opened `phase/2-zod-schemas-fetch-client-tanstack-query` → `main` — pending push

---

## Implementation order

1. `git checkout -b phase/2-zod-schemas-fetch-client-tanstack-query`
2. Write `docs/plans/phase_2_zod_schemas_fetch_client.md` (this file)
3. `pnpm add -D msw@^2`
4. Create `src/api/schemas.ts` (5 Zod schemas per ROADMAP §2.1)
5. Create `src/types/gateway.ts` (5 `z.infer` exports)
6. `pnpm typecheck` — confirm schemas compile cleanly
7. Create `src/api/client.ts` (`ApiError` + `apiFetch<T>`)
8. Create `src/api/queries.ts` (6 query functions, `URLSearchParams` + `encodeURIComponent`)
9. Create `src/test/mocks/handlers.ts` + `src/test/mocks/server.ts` (default happy-path handlers + `setupServer`)
10. Update `src/test-setup.ts` — wire MSW lifecycle hooks
11. Update `vite.config.ts` — add `src/test/**` to coverage exclude
12. Create `src/api/client.test.ts` (per-test `server.use(...)` overrides)
13. Create `src/api/queries.test.ts` (URL assembly verification)
14. Update `src/main.tsx` — add `QueryClient` + `QueryClientProvider`
15. Create `src/hooks/useGateway.ts` (6 hooks per ROADMAP §2.3)
16. Create `src/hooks/useGateway.test.ts` (wrapper with fresh `QueryClient`; cache keys; `enabled`; `refetchInterval`; end-to-end)
17. `pnpm quality` — iterate to green
18. `pnpm build` — confirm `dist/` produced; main bundle < 250 KB gzip
19. Update this plan's Progress / Notes section (final coverage numbers, deviations, time spent)
20. Update `docs/plans/ROADMAP.md` — tick §2.1/§2.2/§2.3 boxes, advance "Current Status" to Phase 3
21. Re-evaluate `.claude/*` — update only if a genuinely new pattern emerged
22. `git add` (selectively); conventional-commits commit
23. `git push -u origin phase/2-zod-schemas-fetch-client-tanstack-query`
24. `gh pr create --base main --title "feat(phase-2): Zod schemas, fetch client & TanStack Query hooks" --body …`

---

## Critical files (reuse, don't recreate)

- **`src/config.ts`** — exports `getConfig().VITE_API_BASE_URL` if absolute URLs are ever needed (not used in Phase 2; we go through the dev proxy).
- **`src/test-setup.ts`** — existing `@testing-library/jest-dom` + `cleanup()` after each test. Phase 2 adds MSW lifecycle hooks alongside.
- **`vite.config.ts`** — coverage `exclude` array gets `src/test/**` appended; thresholds and provider untouched.
- **`.claude/knowledge/coding-standards.md` §Error Handling** — canonical `safeParse` pattern; `apiFetch` follows it verbatim.
- **`.claude/knowledge/coding-standards.md` §Tests** — "Mock only the network. Use MSW for HTTP." reinforces the choice.
- **`.claude/knowledge/architecture.md` §Module Boundaries** — `api/` must not import from `components/`, `hooks/`, or `pages/`; the data-flow diagram justifies the file layout.
- **`docs/plans/ROADMAP.md` §Phase 2** — code snippets in §2.1, §2.2, §2.3 are the reference; deviation requires justification.

---

## Risk assessment and mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Schema drift vs Gateway Pydantic | High | High (silent UI break) | Schemas mirror §2.1 field-by-field; `safeParse` surfaces any mismatch as `ApiError("Schema mismatch: …")` — never silent. Integration smoke test lands once Gateway Phase 6 ships. |
| MSW v2 doesn't start under Vitest jsdom | Medium | Medium | `msw/node`'s `setupServer` patches global `fetch`; jsdom env exposes that. Fallback: mock `globalThis.fetch` directly in `client.test.ts`. |
| `QueryClient` singleton bleeds state across hook tests | High | High (flaky tests) | Hook tests never import the production singleton; each test builds a fresh `QueryClient` with `retry: false` inside its wrapper. |
| Coverage drops below 80% on `queries.ts` (one-liners — hard to branch) | Medium | Medium | `src/api/queries.test.ts` covers each function's URL assembly explicitly, including path-encoding and query-string branches. |
| `enabled: Boolean(id)` test is hard to assert without a network call | Medium | Low | Assert `result.current.fetchStatus === 'idle'` and `result.current.data === undefined` after `renderHook(() => useStrategyEquityCurve(''))`. |
| `safeParse` error message too long to be useful in `ApiError` | Low | Low | `parsed.error.message` is acceptable for now; can be reformatted to `error.issues.map(...)` later if it becomes noisy. |
| `verbatimModuleSyntax` rejects implicit type imports from `@/api/schemas` in `gateway.ts` | High | Low | `gateway.ts` uses `import type { z } from 'zod'` and value imports for schemas (z.infer needs the runtime symbol). Pattern from ROADMAP §2.1 snippet. |
| Provider order clash when Phase 3 adds `BrowserRouter` | Low | Low | Phase 2 puts `QueryClientProvider` at the outermost layer so Phase 3's `BrowserRouter` is an additive nest. |
| PR reviewer asks "where's the router?" | High | Low | Plan + PR body explicitly defer to Phase 3, matching Phase 1's documented deferral. |

---

## Testing approach

- **Unit (Vitest)**
  - `src/api/client.test.ts`:
    - **Happy path** — `server.use(http.get(...))` returning a schema-valid fixture; assert `apiFetch` returns the parsed shape.
    - **HTTP error** — `new HttpResponse(null, { status: 404 })`; assert `ApiError` thrown with `status === 404`, `name === 'ApiError'`.
    - **Schema mismatch** — `HttpResponse.json({ wrong: 'shape' })`; assert `ApiError` with message containing `"Schema mismatch"`.
  - `src/api/queries.test.ts`:
    - For each function: install a handler that records `request.url`; invoke the function; assert pathname + searchParams. Verifies `encodeURIComponent` on `id`, query-string assembly, and `/portfolio/snapshot/:date` branch.
  - `src/hooks/useGateway.test.ts`:
    - Wrapper builds a fresh `QueryClient` per test.
    - **Cache key shape** — `renderHook(() => useX(...))`; assert `client.getQueryCache().findAll()[0].queryKey` matches ROADMAP §2.3.
    - **`enabled` gating** — `renderHook(() => useStrategyEquityCurve(''))`; assert `fetchStatus === 'idle'` and `data === undefined`.
    - **`refetchInterval`** — inspect `client.getQueryCache().findAll()[0].options.refetchInterval`; assert `=== 5 * 60_000`.
    - **End-to-end** — `useStrategies` against MSW; `waitFor(() => result.current.isSuccess)`; assert data matches fixture.
- **Type check** — `pnpm typecheck` confirms generics propagate (e.g. `apiFetch(path, OverallPerformanceSchema)` returns `Promise<OverallPerformance>`).
- **Lint + format** — Biome enforces `noConsole`, `noExplicitAny`, import order.
- **Coverage** — `pnpm test:coverage` ≥80% all metrics; targets ≥95% on `client.ts`.
- **End-to-end smoke (manual, deferred)** — once Gateway Phase 6 ships, `pnpm dev` → DevTools console → `await fetchOverallPerformance()`.
- **Cross-check after commit** — `pnpm quality` runs the same gate CI runs.

---

## Verification plan (copy-paste sequence)

```bash
git checkout phase/2-zod-schemas-fetch-client-tanstack-query
pnpm install              # picks up msw@^2
pnpm typecheck            # zero errors
pnpm lint                 # zero findings
pnpm format               # no drift
pnpm test:coverage        # all green; ≥80% all metrics
pnpm build                # dist/ produced; main bundle < 250 KB gzip
pnpm quality              # full gate
```

Manual sanity (optional, deferred until Gateway is live):

```bash
pnpm dev &
sleep 2
# DevTools console at http://localhost:5173:
# > import('/src/api/queries.ts').then(m => m.fetchOverallPerformance()).catch(console.error)
# Expected (Gateway down): ApiError with status 502 — proxy + client path is wired.
kill %1
```

---

## Agent prompt (verbatim, embedded for reproducibility)

> You are implementing **Phase 2 — Zod Schemas, Fetch Client & TanStack Query** for the `quant-dashboard` project. Follow these steps in strict order: plan first, then implement, then document, then commit.
>
> ## Step 0 — Read Before Anything Else
> 1. Read `.claude/knowledge/project-skill.md` in full. Internalize all Hard Rules, especially **Hard Rule #4**: every external response boundary must be validated by a Zod schema; types are inferred from schemas, never hand-written.
> 2. Read `.claude/skills/vercel-react-best-practices/SKILL.md` — focus on `async-parallel`, `client-swr-dedup`, `rerender-use-deferred-value`.
> 3. Read `docs/plans/ROADMAP.md` — Phase 2 section completely (2.1, 2.2, 2.3).
> 4. Read `docs/plans/phase_1_bootstrap.md` — use it as the canonical format reference for your plan document.
>
> ## Step 1 — Create Git Branch
> `git checkout -b phase/2-zod-schemas-fetch-client-tanstack-query`
>
> ## Step 2 — Write the Plan First
> Create `docs/plans/phase_2_zod_schemas_fetch_client.md` before touching any src file. (Goal / Scope / Deliverables / Acceptance / Implementation steps / Risks / embedded prompt.)
>
> ## Step 3 — Phase 2.1: Zod Schemas & Inferred Types
> Create `src/api/schemas.ts` (5 schemas mirroring ROADMAP §2.1 verbatim) and `src/types/gateway.ts` (only `z.infer<typeof XSchema>` exports). `pnpm typecheck` must pass.
>
> ## Step 4 — Phase 2.2: Fetch Client
> Create `src/api/client.ts` (`ApiError` + `apiFetch<T>` using `safeParse`), `src/api/queries.ts` (one function per Gateway endpoint), and `src/api/client.test.ts` (MSW: happy path, HTTP error, schema mismatch). Coverage on `client.ts` ≥80%.
>
> ## Step 5 — Phase 2.3: TanStack Query Hooks
> Wrap `main.tsx` with `QueryClientProvider` configured `staleTime: 4*60_000`, `gcTime: 10*60_000`, `refetchOnWindowFocus: false`, `retry: 1`. Create `src/hooks/useGateway.ts` (6 hooks per ROADMAP §2.3). Create `src/hooks/useGateway.test.ts` (cache-key shape, `enabled` gating, `refetchInterval` presence, end-to-end MSW data flow).
>
> ## Step 6 — Quality Gate
> `pnpm typecheck && pnpm lint && pnpm format && pnpm test:coverage && pnpm build`. All green; coverage ≥80% all metrics; no `any` without justified ignore; no `console.log`.
>
> ## Step 7 — Update Documentation
> Add Progress / Completion section to `docs/plans/phase_2_zod_schemas_fetch_client.md`. Tick Phase 2 boxes in `docs/plans/ROADMAP.md`; advance "Current Status" to Phase 3. Update `.claude/knowledge/*` only if a genuinely new pattern emerged.
>
> ## Step 8 — Commit and Open PR
> Conventional-commits commit; push branch; open PR `phase/2-zod-schemas-fetch-client-tanstack-query` → `main`.
>
> **Absolute rules:** Plan file before any code. Zod at every external boundary. All types `z.infer`. Schema mismatches surface as `ApiError`. No `any`, no `console.log`, no hand-written domain interfaces.

---

## Progress / Notes

### Final resolved dependency versions (2026-05-18)

Dev (new this phase):

- `msw@2.14.6`

Existing dependencies in use:

- `@tanstack/react-query@5.100.10`
- `zod@3.25.76`
- `@testing-library/react@16.3.2` (provides `renderHook` + `waitFor`)
- `vitest@3.2.4` + `@vitest/coverage-v8@3.2.4`

### Quality-gate output (2026-05-18)

```
pnpm lint           → Checked 18 files in 23ms. No fixes applied.
pnpm format         → Checked 18 files in  6ms. No fixes applied.
pnpm typecheck      → (no output / zero errors)
pnpm test:coverage  → 38/38 tests passing across 5 files
                      Coverage:
                        All files        100 stmts | 98% branch | 100 funcs | 100 lines
                        src/api/client.ts    100 / 100 / 100 / 100
                        src/api/queries.ts   100 / 100 / 100 / 100
                        src/api/schemas.ts   100 / 100 / 100 / 100
                        src/hooks/useGateway 100 / 100 / 100 / 100
                        src/types/gateway.ts   0 /   0 /   0 /   0   (type-only module — nothing to cover)
pnpm build          → 76 modules, dist/index.html 0.68 kB,
                      dist/assets/index-*.css 7.69 kB (gzip 2.31 kB),
                      dist/assets/index-*.js 219.86 kB (gzip 68.30 kB)
```

### Decisions taken vs. the plan

- **`PortfolioEquityCurveParams` widened to `string | undefined`/`boolean | undefined`** rather than bare optional `string`/`boolean`. With `exactOptionalPropertyTypes: true`, passing `{ from: undefined }` from the hook into a `from?: string` slot is a hard error. Widening matches what callers actually pass and keeps the call site (`fetchPortfolioEquityCurve({ normalize, from, to })`) syntactically clean. The runtime contract is unchanged — `if (params?.from)` already treats `undefined` as absent.
- **`refetchInterval` assertion uses `query.observers[0]?.options.refetchInterval`** rather than `query.options.refetchInterval`. In TanStack Query v5, `refetchInterval` is a `QueryObserverOptions` (observer-level) setting, not a `QueryOptions` (query-level) setting. The cached `Query` exposes its observers; the observer's options carry the interval. This is an internal API of TanStack Query, but it's a public type and stable across the v5 line.
- **MSW v2 type quirk in `src/api/queries.test.ts`** — `HttpResponse.json` expects `JsonBodyType = Record<string, any> | string | number | boolean | null | undefined`, which is not directly exported. The test helper types its payload as `Record<string, unknown> | readonly Record<string, unknown>[]` to keep the helper type-safe without resorting to `any` or `as`.
- **`captureGet` test helper** — rather than spreading per-test handlers, we use a small `captureGet(pattern, payload)` wrapper that records `request.url` and returns `{ received: { pathname, search } }`. Centralises the URL-assembly assertion pattern across all six query-function tests.
- **`gateway.ts` reports 0/0/0/0 coverage** — expected for a pure type-export module. The project-wide totals (100/98/100/100) clear the 80% threshold; nothing to fix.
- **MSW lifecycle wired in the shared `test-setup.ts`** (not per-test). Tests opt into per-test mocks via `server.use(...)`. `afterEach(server.resetHandlers)` keeps tests independent. `onUnhandledRequest: 'error'` catches typo'd paths during development.

### Patterns established (Phase 2)

- **MSW v2 setup pattern** — `src/test/mocks/handlers.ts` (default handlers returning typed fixtures) + `src/test/mocks/server.ts` (`setupServer` instance) wired into `src/test-setup.ts` via `beforeAll(server.listen) / afterEach(server.resetHandlers) / afterAll(server.close)`. Coverage excludes `src/test/**`. Per-test response overrides go through `server.use(http.get(..., () => HttpResponse.json(...)))`. Future phases reuse this without duplication.
- **TanStack Query hook test wrapper** — `makeWrapper()` returns `{ wrapper, client }` where `client` is a fresh `QueryClient({ defaultOptions: { queries: { retry: false } } })` per test. `renderHook(() => useX(), { wrapper })` runs the hook in isolation. Cache-key assertions go through `client.getQueryCache().findAll()[0]?.queryKey`. End-to-end data flow uses `waitFor(() => result.current.isSuccess)`.
- **Cache-key shape convention** — Tuple of `[domain, ...discriminators]` where discriminators are either primitive ids or a single object holding optional params (e.g. `{ from, to }`). Lets TanStack Query's structural-equality cache hash keys cleanly while keeping query keys human-readable.

### Notes for Phase 3 and later

- **Provider order when Phase 3 adds `BrowserRouter`** — Phase 2 puts `<QueryClientProvider>` at the outermost layer (immediately inside `<StrictMode>`). Phase 3 should nest `<BrowserRouter>` *inside* `<QueryClientProvider>` so the query client lives across navigations. The existing `<App />` is replaced wholesale by `<AppLayout><Routes>…</Routes></AppLayout>` at that point.
- **`getConfig()` is not imported by `apiFetch`** — relative `/api/*` paths go through the Vite dev proxy. If a future hook needs absolute URLs (e.g. server-sent events from a different origin), `src/config.ts` already exports `getConfig().VITE_API_BASE_URL`.
- **`StrategyListSchema` / `EquityCurveSchema` are exported from `schemas.ts`** for reuse in tests and future widgets that may want to validate runtime data outside the standard hook flow.
- **MSW handlers in `src/test/mocks/handlers.ts` also export typed `fixtures`** — convenient for assertions that compare against the canonical fixture rather than hard-coding values in each test.
- **End-to-end smoke against a live Gateway is still deferred** — `quant-api-gateway` Phase 6 must ship before we can verify that real Gateway responses parse cleanly through Zod. Once it lands, run `pnpm dev`, open DevTools, and call `(await import('/src/api/queries.ts')).fetchOverallPerformance()` — should return a parsed `OverallPerformance` object.

### Time spent

~30 minutes end-to-end (planning, implementation, two iteration rounds — format and `refetchInterval` typing — docs).
