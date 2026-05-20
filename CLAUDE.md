# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

React 19 SPA for the quant trading system. Renders **Portfolio Performance**, **Equity Curves**, and **Strategy Details** fed by [`quant-api-gateway`](https://github.com/lumduan/quant-api-gateway) over REST.

**Core principle:** the Gateway computes everything; the dashboard only fetches JSON and renders. Do not push business/derivation logic into the SPA — if you find yourself computing PnL, drawdowns, or aggregates client-side, that almost always belongs in the Gateway.

## Commands

Always `pnpm` (Hard Rule #1) — never `npm`/`yarn`/`bun`. Corepack pins `pnpm@9.15.0` via the `packageManager` field.

| Task | Command |
|---|---|
| Dev server (HMR on :5173) | `pnpm dev` |
| Production build (tsc + Vite) | `pnpm build` |
| Preview prod build | `pnpm preview` |
| Lint / lint fix | `pnpm lint` / `pnpm lint:fix` |
| Format check / write | `pnpm format` / `pnpm format:fix` |
| Type check | `pnpm typecheck` |
| Single test file | `pnpm test src/path/to/File.test.tsx` |
| All tests | `pnpm test` (watch: `pnpm test:watch`) |
| Tests + coverage (80% gate) | `pnpm test:coverage` |
| **Full CI parity gate** | `pnpm quality` |

`pnpm quality` is the same gate CI runs — if it passes locally the PR will pass CI. Pre-commit (husky + lint-staged) runs Biome on staged files; do not bypass with `--no-verify`.

## Architecture

### Data flow (one direction, strict)

```
External API / env / URL / localStorage
        │  Zod schema (Hard Rule #4)
        ▼
   src/api/        fetch + validate + return typed data
        │
        ▼
   src/hooks/      TanStack Query wrappers, derived state
        │
        ▼
   src/components/ render + user events (thin presenters)
        │
        ▼
   src/pages/      route-level assembly
```

Import rules: `components/` ⊄ `pages/`; `utils/` ⊄ `hooks|components|pages/`; `api/` ⊄ `hooks|components|pages/`. Every boundary crossing (external → internal, untyped → typed) gets a Zod schema.

### Key modules

- **`src/config.ts`** — `loadConfig()` / `getConfig()` validate `import.meta.env` against a Zod schema (`VITE_APP_NAME`, `VITE_APP_VERSION`, `VITE_API_BASE_URL`). Throws `ConfigError` with a copy-`.env.example` hint on failure. The cached `getConfig()` is the only sanctioned way to read env at runtime.
- **`src/api/client.ts`** — `apiFetch<T>(path, schema, init?)` is the single fetch primitive. It throws `ApiError` on non-2xx or schema mismatch, never returns raw `unknown`. All Gateway calls go through it.
- **`src/api/schemas.ts`** — Zod schemas for every Gateway response. Numeric fields use `z.coerce.number()` because the Gateway may emit strings. `StrategyInfo.type` is optional (Gateway does not always populate it).
- **`src/api/queries.ts`** — typed functions per endpoint (`fetchOverallPerformance`, `fetchStrategies`, `fetchStrategy{Performance,EquityCurve}`, `fetchPortfolio{EquityCurve,Snapshot}`). Build query strings with `URLSearchParams` and `encodeURIComponent` for path params.
- **`src/hooks/useGateway.ts`** — TanStack Query hooks wrapping each query function. `useOverallPerformance` polls every 5 min with a 4.5-min `staleTime` (poll cadence is intentional; keep them aligned if you change either).
- **`src/components/strategy/StrategyAdapterFactory.tsx`** — registry-based dispatch (`Record<string, ComponentType>`) from `strategy.type` to an adapter (`CSMSetAdapter`, `TFEXAdapter`); unknown types fall back to `DefaultAdapter`. Adding a strategy type is one line in `ADAPTER_MAP` — do not introduce a switch.

### Folder layout under `src/`

`api/` `hooks/` `pages/` `types/` `utils/` `test/` `components/{charts,filters,layout,strategy,ui,widgets}`. Charts (`recharts`) are intended to be lazy-loaded (Phase 5+). Tests are co-located (`Foo.tsx` ↔ `Foo.test.tsx`).

### Dev-server proxy

`vite.config.ts` proxies `/api/*` to `API_UPSTREAM || VITE_API_BASE_URL || http://localhost:8000`. In containers `API_UPSTREAM` should be the service name on `quant-network` (e.g. `http://quant-api-gateway:8000`); on the host use `http://localhost:8080`. App code always calls `/api/v1/...` — never an absolute URL.

## Hard rules (non-negotiable — from `.claude/knowledge/project-skill.md`)

1. **pnpm only.** No `npm`/`yarn`/`bun`.
2. **TypeScript everywhere.** No `.js` in `src/`. `// @ts-ignore` requires a justification comment.
3. **No `any`.** Use `unknown` + type guard, or a Zod schema. Last-resort biome-ignore needs a reason.
4. **Zod at every external boundary** — API responses, `localStorage`, URL params, query strings, `postMessage`, env.
5. **≥80% coverage** (lines, functions, branches, statements) enforced in `vite.config.ts` and CI.
6. **No secrets in repo.** `VITE_`-prefixed env only; `.env.example` is the contract.
7. **Biome clean before commit.** Do not bypass husky.
8. **Conventional Commits.** `feat(scope): …`, imperative, lowercase after prefix.

## Conventions worth knowing

- **TS config is strict-plus:** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noImplicitOverride`, `noUnusedLocals/Parameters`. Index access is `T | undefined`; optional props can't be set to `undefined` implicitly; `import type` is required for type-only imports.
- **Path alias `@/` → `src/`.** Use it; never `../../../`.
- **No `enum`.** Use `as const` object literals.
- **`satisfies` over `as`.**
- **File budgets:** components ≤150 lines, hooks ≤200, utils ≤300, hard ceiling 400. Past that, make a `src/features/<name>/` folder with an `index.ts` public surface.
- **Errors:** `safeParse` + check `.success`; typed `ApiError`/`ConfigError`; never `catch (_) {}`. TanStack Query failures surface via `isError`/`error` (won't reach `ErrorBoundary`); render an inline `ErrorState` and wire Retry to `queryClient.invalidateQueries`. Wrap charts/async sections in an `ErrorBoundary` for render-time crashes additionally.
- **Tests:** Vitest + Testing Library + MSW v2 (project-wide setup in `src/test/mocks/` + `src/test-setup.ts`, `onUnhandledRequest: 'error'`). Use semantic queries (`getByRole`, `getByLabelText`) over `getByTestId`. Use `userEvent`, not `fireEvent`. For query hooks, build a fresh `QueryClient` per test (`retry: false`) via a `makeWrapper()` helper — never import the prod singleton.
- **No `console.log` in committed code.** Biome warns. Use a logger wrapper.
- **Time is UTC internally**, localized only at the display boundary. Store ISO 8601 / epoch ms.
- **Async:** all promises awaited or returned; `useEffect` cleans up; `AbortController` for cancellable fetches.

## Where to look

- `.claude/knowledge/project-skill.md` — Hard Rules + Soft Conventions (read first)
- `.claude/knowledge/coding-standards.md` — naming, TS, file structure, error/test patterns
- `.claude/knowledge/architecture.md` — module boundaries + data flow
- `.claude/knowledge/commands.md` — every `pnpm`/docker/git command
- `.claude/knowledge/stack-decisions.md` — *why* each tool was chosen
- `docs/plans/ROADMAP.md` + `docs/plans/phase_*.md` — 9-phase implementation plan with acceptance criteria
