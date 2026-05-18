# Phase 1 — Project Bootstrap (quant-dashboard)

| Field | Value |
|---|---|
| Phase | 1 — Project Bootstrap |
| Date | 2026-05-18 |
| Author | Claude (Opus 4.7), acting on lumduan's behalf |
| Branch | `feat/phase-1-bootstrap` |
| Target | `main` (github.com/lumduan/quant-dashboard) |
| Linked roadmap | `docs/plans/ROADMAP.md` §Phase 1 |

---

## Context

The repo currently holds the **generic `react-template` scaffold** (Vite 6, React 19, TypeScript 5 strict, Biome 1.9, Vitest 3, Zod, husky, multi-stage Docker, Nginx). Phase 1 of `ROADMAP.md` converts that generic scaffold into the **quant-dashboard** domain shell so Phase 2 can plug in Zod schemas, the typed `fetch` client, and TanStack Query hooks without re-litigating tooling decisions.

**What's missing today** (per ROADMAP §1.1–§1.2 unchecked boxes):

- Domain runtime dependencies (TanStack Query, React Router, Recharts, Tailwind v4) are not installed.
- `vite.config.ts` has no `/api` proxy and no Tailwind plugin — so `pnpm dev` can't talk to the Gateway in dev.
- `.env.example` has `VITE_API_BASE_URL` commented out, and there's no Zod-validated `src/config.ts` to make misconfiguration fail fast at startup.
- `README.md` is still the generic template (`OWNER/REPO` badges, "react-template" name).
- `src/` has no feature folders (`api/`, `hooks/`, `pages/`, `types/`, `utils/`, `components/{charts,filters,layout,strategy,ui,widgets}`).
- `package.json` `name`, `index.html` `<title>`/`<meta>` still say "react-template".

**Out of scope for Phase 1** (deferred to later phases per ROADMAP):

- Zod schemas, `apiFetch` client, `useGateway` hooks — Phase 2.
- `<BrowserRouter>` / `<QueryClientProvider>` wiring — Phase 3 (folders are created now; providers come in Phase 3 once routes exist).
- All widgets, charts, adapters, filters — Phases 4–7.
- Nginx `/api/` proxy + `/healthz` + Compose service — Phase 9.

**Outcome:** after Phase 1, `pnpm dev` runs on `:5173` with `/api/*` proxied to `http://localhost:8000`; `pnpm build` and `pnpm quality` stay green; `src/config.ts` Zod-validates env at import; the folder skeleton matches `architecture.md` and the ROADMAP file tree; README is domain-specific.

---

## Scope

### In scope

1. **Domain dependencies**
   - Runtime: `@tanstack/react-query`, `react-router-dom`, `recharts`.
   - Dev: `tailwindcss`, `@tailwindcss/vite` (Tailwind v4 — CSS-first, no `tailwind.config.js`).
   - No `axios` ([stack-decisions.md §What We Deliberately Don't Use](../../.claude/knowledge/stack-decisions.md)).

2. **`vite.config.ts`** — switch to function form with `loadEnv`, add `tailwindcss()` plugin, add `/api` proxy reading `VITE_API_BASE_URL` with fallback `http://localhost:8000`, preserve existing Vitest config + coverage thresholds.

3. **`.env.example`** — activate `VITE_API_BASE_URL=http://localhost:8000`, update `VITE_APP_NAME` to `quant-dashboard`.

4. **`src/config.ts`** — Zod-validated env (`VITE_APP_NAME`, `VITE_APP_VERSION`, `VITE_API_BASE_URL`) using `safeParse` per [coding-standards.md §Error Handling](../../.claude/knowledge/coding-standards.md); throws a typed error at startup on misconfiguration. Co-located `src/config.test.ts`.

5. **`src/vite-env.d.ts`** — promote `VITE_API_BASE_URL` from optional to required (now activated).

6. **Tailwind v4 wiring**
   - `src/index.css` — single `@import "tailwindcss";` line (v4 CSS-first).
   - `src/main.tsx` — import `./index.css`.

7. **Folder skeleton** (ROADMAP §1.2) — create empty directories with `.gitkeep`:

   ```
   src/api/.gitkeep
   src/hooks/.gitkeep
   src/pages/.gitkeep
   src/types/.gitkeep
   src/utils/.gitkeep
   src/components/charts/.gitkeep
   src/components/filters/.gitkeep
   src/components/layout/.gitkeep
   src/components/strategy/.gitkeep
   src/components/ui/.gitkeep
   src/components/widgets/.gitkeep
   ```

   No barrel `index.ts` files (Vercel `bundle-barrel-imports`); the lone exception (`src/components/charts/index.ts` for `React.lazy` re-exports) lands in Phase 5.

8. **Branding cleanup** (so the new README isn't lying)
   - `package.json` → `name: "quant-dashboard"`, `description` updated; preserve all script names and dep versions.
   - `index.html` → `<title>quant-dashboard</title>` + `<meta name="description">` for the dashboard.
   - `src/App.tsx` → heading + tagline updated to reflect quant-dashboard (placeholder remains; replaced wholesale in Phase 3 by `AppLayout` + `<Routes>`).
   - `src/App.test.tsx` → matching assertion update.

9. **`README.md`** — replace template README with quant-dashboard-specific:
   - Project description (React 19 SPA for portfolio performance, equity curves, strategy details; talks to `quant-api-gateway` over REST).
   - Prerequisites (Node 20+, pnpm 9 via Corepack, optional Docker).
   - `pnpm dev` / `pnpm build` / `pnpm quality` / `pnpm test:coverage`.
   - Dev proxy explanation (`/api` → `VITE_API_BASE_URL`).
   - Docker run sketch (`docker compose up -d dashboard` — full Compose lands in Phase 9; link forward).
   - Links to `.claude/knowledge/*` and `docs/plans/ROADMAP.md`.

10. **`docs/plans/phase_1_bootstrap.md`** — this plan file.

### Out of scope

- Provider wiring (`QueryClientProvider`, `BrowserRouter`) — Phase 3 needs routes to exist first; wiring them in Phase 1 would leave dead code paths and untestable error states.
- Any `src/api/*.ts`, `src/hooks/*.ts`, page components, widgets — Phase 2+.
- Nginx `/api/` proxy, `/healthz`, Docker Compose service — Phase 9.
- CHANGELOG entry — keep `[Unreleased]` minimal until Phase 9 ships the runnable dashboard.

---

## Architecture decisions & constraints

| Decision | Why |
|---|---|
| Tailwind v4 via `@tailwindcss/vite`, **no `tailwind.config.js`** | v4 is CSS-first; config (theme, content scan) is declarable in CSS via `@theme` if/when needed. Adding a JS config file now would be cargo-culted from v3. |
| `src/config.ts` uses **`safeParse` + throw**, not `parse()` | Coding-standards.md §Error Handling: reserve `parse()` for invariants. Env *is* an invariant, but `safeParse` lets us format a readable error showing which key is missing — better DX on first-clone misconfiguration. |
| `vite.config.ts` proxy target reads `loadEnv(mode, cwd(), '')` | The `VITE_` prefix is for client bundling; the proxy runs in the node process and needs the raw env, hence the empty prefix. Documented in Vite docs. |
| Folder skeleton via `.gitkeep` | Git doesn't track empty dirs. ROADMAP §1.2 explicitly lists the folders as Phase 1 deliverables; `.gitkeep` is the standard idiom. Files land naturally in Phase 2+ and the placeholders get deleted as folders populate. |
| Don't wire `<QueryClientProvider>` yet | Without hooks calling it, the provider would be untested dead code. Phase 3 owns the wiring once routes + hooks exist. |
| `package.json` name change *now* | The README references `quant-dashboard` and `pnpm` scripts log the name. Drift between metadata and docs makes the new contributor experience worse on day 1. |
| Update `App.tsx` heading text only | Don't refactor for refactoring's sake — App.tsx will be replaced by AppLayout in Phase 3. But the heading saying "react-template" while the README says "quant-dashboard" is a visible inconsistency in `pnpm dev`. |

---

## Deliverables

### Created

- `docs/plans/phase_1_bootstrap.md` — this plan
- `src/config.ts` — Zod-validated env
- `src/config.test.ts` — config schema positive + negative tests
- `src/index.css` — Tailwind v4 entry (`@import "tailwindcss";`)
- `src/api/.gitkeep`
- `src/hooks/.gitkeep`
- `src/pages/.gitkeep`
- `src/types/.gitkeep`
- `src/utils/.gitkeep`
- `src/components/charts/.gitkeep`
- `src/components/filters/.gitkeep`
- `src/components/layout/.gitkeep`
- `src/components/strategy/.gitkeep`
- `src/components/ui/.gitkeep`
- `src/components/widgets/.gitkeep`

### Modified

- `package.json` — `name`, `description`; add `@tanstack/react-query`, `react-router-dom`, `recharts` to dependencies; add `tailwindcss`, `@tailwindcss/vite` to devDependencies
- `pnpm-lock.yaml` — regenerated by `pnpm install`
- `vite.config.ts` — `defineConfig(({ mode }) => …)` + `loadEnv` + `tailwindcss()` plugin + `/api` proxy
- `.env.example` — activate `VITE_API_BASE_URL`, update `VITE_APP_NAME`
- `src/vite-env.d.ts` — `VITE_API_BASE_URL` becomes required
- `src/main.tsx` — `import './index.css'`
- `src/App.tsx` — branding cleanup (heading + tagline)
- `src/App.test.tsx` — matching assertion update
- `index.html` — `<title>` + `<meta>` updated
- `README.md` — full replacement with quant-dashboard content
- `docs/plans/ROADMAP.md` — tick Phase 1 boxes, update "Current Status" section

### Untouched

- `tsconfig.json`, `tsconfig.node.json`, `biome.json`, `.gitignore`, `.dockerignore`, `.editorconfig`
- `Dockerfile`, `nginx.conf` — Phase 9 owns these
- `.husky/`, `.github/workflows/` — generic scaffold is correct as-is
- `LICENSE`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`
- `public/favicon.svg` — visual rebrand deferred

---

## Acceptance criteria

- [x] `pnpm install` succeeds; `pnpm-lock.yaml` updated and committed (2026-05-18)
- [x] `pnpm dev` starts Vite on `:5173`; `curl -sI localhost:5173/` → `HTTP/1.1 200 OK` (2026-05-18)
- [x] `/api/*` requests in dev proxy to `http://localhost:8000` — verified by `curl -sI localhost:5173/api/v1/strategies` returning `server: uvicorn` header (upstream actually responded; the proxy is wired) (2026-05-18)
- [x] `pnpm build` succeeds; `dist/` produced; no Tailwind warnings — JS 195 KB / gzip 61 KB, CSS 7.7 KB / gzip 2.3 KB (2026-05-18)
- [x] `pnpm typecheck` — zero errors (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`) (2026-05-18)
- [x] `pnpm lint` — zero findings (2026-05-18)
- [x] `pnpm format` — no drift (2026-05-18)
- [x] `pnpm test:coverage` — 8/8 passing; 100% lines / 100% statements / 100% functions / 90% branches (2026-05-18)
- [x] `pnpm quality` — full gate green (2026-05-18)
- [x] No `any`, no `console.log`, no hardcoded URLs in `src/`
- [x] `.env.example` activated; `.env` still gitignored
- [x] Folder skeleton matches ROADMAP §1.2 file tree
- [x] README reflects quant-dashboard (no `react-template` strings, no `OWNER/REPO` placeholders)
- [x] `docs/plans/phase_1_bootstrap.md` exists and acceptance-criteria boxes are ticked
- [x] `docs/plans/ROADMAP.md` §Phase 1 boxes ticked; "Current Status" advanced to Phase 2
- [x] PR opened `feat/phase-1-bootstrap` → `main` on github.com/lumduan/quant-dashboard — [PR #1](https://github.com/lumduan/quant-dashboard/pull/1) (2026-05-18)

---

## Implementation order

1. `git checkout -b feat/phase-1-bootstrap`
2. Write `docs/plans/phase_1_bootstrap.md` (this file)
3. `pnpm add @tanstack/react-query react-router-dom recharts`
4. `pnpm add -D tailwindcss @tailwindcss/vite`
5. Update `package.json` `name` + `description`
6. Update `vite.config.ts` — `loadEnv` + `tailwindcss()` + `/api` proxy (keep Vitest config + coverage thresholds intact)
7. Update `.env.example` — activate `VITE_API_BASE_URL`, set `VITE_APP_NAME=quant-dashboard`
8. Update `src/vite-env.d.ts` — `VITE_API_BASE_URL: string` (required)
9. Create `src/config.ts` (Zod + safeParse + throw on failure)
10. Create `src/config.test.ts` (happy path + missing var + invalid URL)
11. Create `src/index.css` (`@import "tailwindcss";`)
12. Update `src/main.tsx` — `import './index.css'`
13. Update `src/App.tsx` heading + tagline
14. Update `src/App.test.tsx` assertions
15. Update `index.html` title + meta description
16. Create folder skeleton (`.gitkeep` files under `src/api/`, `src/hooks/`, `src/pages/`, `src/types/`, `src/utils/`, `src/components/{charts,filters,layout,strategy,ui,widgets}/`)
17. Replace `README.md` with quant-dashboard content
18. Run `pnpm quality` — fix anything red until green
19. Run `pnpm dev` in one terminal; verify dashboard loads on `:5173` and `/api/v1/strategies` proxies (will surface upstream connection error if Gateway not running — that's the success signal for Phase 1; Phase 2 verifies live responses)
20. Run `pnpm build` — verify `dist/` produced cleanly
21. Tick acceptance-criteria boxes in `docs/plans/phase_1_bootstrap.md`; add "Progress / Notes" section with final dependency versions + any deviations
22. Update `docs/plans/ROADMAP.md` — tick §1.1/§1.2 boxes, advance "Current Status" to Phase 2
23. Update `.claude/*` if new patterns emerged
24. `git add` (selectively — never `-A`), conventional-commits commit
25. `git push -u origin feat/phase-1-bootstrap`
26. `gh pr create --base main --title "feat: Phase 1 — Project Bootstrap" --body …`

---

## Critical files (reuse, don't recreate)

- `vite.config.ts` — keeps Vitest config + coverage thresholds verbatim; only the top-level `defineConfig` shape changes
- `biome.json` — already enforces import order, single quotes, semicolons, `noConsole`, `noExplicitAny: warn`, a11y rules; no changes needed
- `tsconfig.json` — `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax` already set; `@/*` alias configured
- `src/test-setup.ts` — `@testing-library/jest-dom` matchers + cleanup; reused by `config.test.ts`
- `.claude/knowledge/project-skill.md` — Hard Rules (pnpm, TS, no `any`, Zod at boundaries, ≥80% coverage, no secrets, Biome clean, Conventional Commits)
- `.claude/knowledge/coding-standards.md` — naming, file-size budgets, error handling, `safeParse` pattern
- `.claude/knowledge/architecture.md` — `src/config.ts` Zod pattern (the reference snippet)
- `.claude/skills/vercel-react-best-practices/SKILL.md` — `bundle-barrel-imports` (no barrels), `bundle-dynamic-imports` (Recharts lazy in Phase 5), `async-parallel`, `rerender-no-inline-components`

---

## Risk assessment and mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Tailwind v4 syntax differs from teammate's v3 muscle memory | Medium | Low | README links to Tailwind v4 docs; the only v4 file is `src/index.css` with the single `@import "tailwindcss";` line. |
| `loadEnv` mode confusion (`mode: 'development'` vs `'production'`) | Medium | Low | Use the function form of `defineConfig` and pass `mode` explicitly; fall back to `'http://localhost:8000'` if `VITE_API_BASE_URL` unset. |
| `src/config.ts` Zod parse runs at import — fails tests if env not set | High | Medium | Vitest reads `.env.test` if present and falls back to `.env`; we set the required vars in the `.env.example` shape, and tests that exercise `config.ts` set env via `vi.stubEnv` per [coding-standards.md §Tests](../../.claude/knowledge/coding-standards.md). |
| Coverage threshold dips below 80% from new `config.ts` | Low | Medium | `config.test.ts` covers happy path + missing-var + invalid-URL → ≥3 branches; offsets by `> 95%` on the small file. |
| `.gitkeep` files break Biome's file scan | Low | Low | Biome already ignores unknown files (`files.ignoreUnknown: true` in `biome.json`). |
| `App.tsx` rename breaks existing `App.test.tsx` | High | Low | Touch both in the same commit; CI on the PR catches it. |
| Branding change to `package.json` `name` ripples into Docker tag references | Low | Low | Dockerfile references `pnpm install`/`pnpm build` (no `name` dependency); CI workflows tag by repo, not by package name. |
| PR reviewer asks "why no `QueryClientProvider` yet?" | High | Low | Plan + PR body explicitly defer to Phase 3; rationale documented above. |

---

## Testing approach

- **Unit (Vitest)**
  - `src/config.test.ts` — happy path (all env vars present → parsed config returns expected shape), missing `VITE_API_BASE_URL` → throws with a readable message, invalid URL → throws. Uses `vi.stubEnv` + `vi.unstubAllEnvs` per test.
  - `src/App.test.tsx` — existing two assertions updated.
- **Type check** — `pnpm typecheck` confirms `src/config.ts` exports a strongly-typed `config` object inferred from the Zod schema (no `any`, no `unknown`).
- **Lint + format** — `pnpm lint && pnpm format` clean; Biome's `organizeImports` enforces import order.
- **Coverage** — `pnpm test:coverage` ≥80% on every metric; `config.ts` aims for 100%.
- **End-to-end smoke (manual)**
  1. `pnpm dev` → browser → `http://localhost:5173` shows the placeholder shell with Tailwind styles applied (white background, sans-serif font).
  2. In DevTools Network tab, `fetch('/api/v1/strategies')` → status 502/connection-refused from `localhost:8000` (Gateway not running). The error shape *proves* the proxy is wired — Phase 2 will verify a real 200 response once Gateway is up.
  3. `pnpm build` → `dist/` produced; `pnpm preview` → preview server serves the built SPA without errors.
- **Cross-check after commit** — `pnpm quality` runs the same gate CI runs; if it's green locally, the PR CI will be green.

---

## Verification plan (copy-paste sequence)

```bash
git checkout feat/phase-1-bootstrap
pnpm install
pnpm typecheck
pnpm lint
pnpm format
pnpm test:coverage   # ≥80% all metrics
pnpm build           # produces dist/

# Smoke (separate terminal)
pnpm dev &
sleep 2
curl -sI http://localhost:5173                    # 200 OK (SPA shell)
curl -sI http://localhost:5173/api/v1/strategies  # 502 / connection refused — proxy is wired
kill %1
```

---

## Agent prompt (verbatim, embedded for reproducibility)

> You are implementing Phase 1 — Project Bootstrap for the quant-dashboard project. Follow this exact workflow — no deviation.
>
> ---
>
> ## Step 1: Read Knowledge Base First
>
> Before doing anything else:
> 1. Read `.claude/knowledge/project-skill.md` fully — internalize all engineering standards, coding conventions, skill definitions (especially vercel-react-best-practices), and workflow expectations.
> 2. Read `docs/plans/ROADMAP.md` completely — focus on Phase 1 scope, deliverables, acceptance criteria, dependencies, and success metrics.
>
> Do not proceed until both files are fully understood.
>
> ---
>
> ## Step 2: Create a New Git Branch
>
> Create a new git branch following the project's branch naming convention (infer from project-skill.md or use `feat/phase-1-bootstrap` if not specified).
>
> Do not commit any code changes until the plan is complete.
>
> ---
>
> ## Step 3: Draft the Implementation Plan
>
> Before writing any implementation code, create a detailed plan markdown file at:
>
> `docs/plans/phase_1_bootstrap.md`
>
> Use the reference format from:
> https://github.com/lumduan/quant-api-gateway/blob/main/docs/plans/phase_1_bootstrap/phase_1_bootstrap.md
>
> Your plan must include:
> - Phase name and number
> - Objective and scope (derived from ROADMAP.md Phase 1 section)
> - Full list of deliverables with acceptance criteria
> - Architecture decisions and constraints
> - Implementation steps in order
> - Risk assessment and mitigation
> - Testing approach
> - This full AI agent prompt embedded in the plan
>
> Save the file. Do not begin implementation until this file exists on disk.
>
> ---
>
> ## Step 4: Implement Phase 1 — Project Bootstrap
>
> Implement all Phase 1 deliverables as defined in `docs/plans/ROADMAP.md`, applying the following standards throughout:
>
> **React + Vercel Best Practices (vercel-react-best-practices skill):**
> - Use React 18+ patterns (concurrent features where appropriate)
> - Strict TypeScript — no `any`, full type annotations, Zod or similar for runtime validation where needed
> - Component architecture: co-located types, hooks, and tests
> - Environment variables via `.env.local` / Vercel env config — never hardcode secrets
> - Optimize for Core Web Vitals: code splitting, lazy loading, image optimization
> - Use `next/font` or equivalent for font optimization if Next.js is in the stack
> - API routes or server components for data fetching — no client-side secrets exposure
> - Error boundaries at appropriate component levels
> - Consistent import ordering and file structure per project conventions
>
> **General Engineering Standards (from project-skill.md):**
> - All async operations use async/await with proper error handling
> - No unused imports, variables, or dead code
> - All components/functions have clear, single responsibilities
> - Follow naming conventions exactly as defined in project-skill.md
>
> ---
>
> ## Step 5: Update Documentation
>
> After implementation is complete:
>
> 1. **Update `docs/plans/phase_1_bootstrap.md`**:
>    - Mark each deliverable as ✅ completed or ⚠️ partial with notes
>    - Add implementation date (today's date)
>    - Document any issues, workarounds, or deviations from the plan
>    - Add notes on anything future phases should be aware of
>
> 2. **Update `docs/plans/ROADMAP.md`**:
>    - Mark Phase 1 as completed with checkmarks
>    - Add completion date and any relevant notes
>    - Update any dependencies or notes for Phase 2+
>
> 3. **Update `.claude/*` if needed**:
>    - If new patterns, conventions, or learnings emerged during implementation, update the relevant `.claude/knowledge/`, `.claude/playbooks/`, or memory files
>    - Document any vercel-react-best-practices patterns discovered that should be reused
>
> ---
>
> ## Step 6: Commit and Open PR
>
> Create a single commit with all changes (implementation + documentation + .claude updates) using a standards-compliant commit message.
>
> Commit message format (follow project-skill.md convention, or use):
> ```
> feat(phase-1): bootstrap project — React foundation, routing, config, and tooling
>
> - Implements all Phase 1 deliverables per ROADMAP.md
> - Adds plan at docs/plans/phase_1_bootstrap.md
> - Updates ROADMAP.md with Phase 1 completion
> - Applies vercel-react-best-practices throughout
> ```
>
> Then open a Pull Request to the `main` branch on GitHub (lumduan/quant-dashboard) with:
> - Title: `feat: Phase 1 — Project Bootstrap`
> - Description: summary of what was implemented, link to `docs/plans/phase_1_bootstrap.md`, and any notes for reviewers
>
> ---
>
> ## Files to Reference and/or Create/Modify:
> - `.claude/knowledge/project-skill.md` — read first; update if needed
> - `docs/plans/ROADMAP.md` — read; update with Phase 1 completion
> - `docs/plans/phase_1_bootstrap.md` — CREATE this plan before coding
> - All Phase 1 source files as defined in ROADMAP.md
> - `.claude/*` — update knowledge/playbooks as needed
>
> ## Absolute Rules:
> 1. Read knowledge base BEFORE anything else
> 2. Create plan markdown BEFORE writing any implementation code
> 3. Apply vercel-react-best-practices to every file touched
> 4. Update all three doc targets after implementation
> 5. Single commit + PR to close the loop

---

## Progress / Notes

### Final resolved dependency versions (2026-05-18)

Runtime (from `pnpm list --depth 0`):

- `@tanstack/react-query@5.100.10`
- `react@19.2.6` (`react-dom@19.2.6`)
- `react-router-dom@7.15.1`
- `recharts@3.8.1`
- `zod@3.25.76`

Dev:

- `@tailwindcss/vite@4.3.0`, `tailwindcss@4.3.0`
- `@biomejs/biome@1.9.4`
- `vite@6.4.2`
- `vitest@3.2.4`, `@vitest/coverage-v8@3.2.4`
- `typescript@5.9.3`
- `@vitejs/plugin-react@4.7.0`
- `@testing-library/react@16.3.2`
- `@types/react@19.2.14`, `@types/react-dom@19.2.3`

### Quality-gate output (2026-05-18)

```
pnpm lint           → Checked 8 files in 12ms. No fixes applied.
pnpm format         → Checked 8 files in  5ms. No fixes applied.
pnpm typecheck      → (no output / zero errors)
pnpm test:coverage  → 8/8 tests passing
                      Coverage:  100% stmts | 90% branch | 100% funcs | 100% lines
pnpm build          → 29 modules, dist/index.html 0.68 kB,
                      dist/assets/index-*.css 7.69 kB (gzip 2.31 kB),
                      dist/assets/index-*.js 194.93 kB (gzip 61.01 kB)
```

### Decisions taken vs. the plan

- **`loadConfig(env: unknown)` instead of `env: ImportMetaEnv`**: Vite's built-in `ImportMetaEnv` type forces `BASE_URL`, `MODE`, `DEV`, `PROD`, `SSR` on every test fixture — properties the schema doesn't care about. Since Zod is the runtime guard, the function parameter is `unknown` and Zod narrows to `Config` via `safeParse`. Test fixtures stay focused on the keys under test.
- **`getConfig()` + cached pattern instead of module-level `export const config = parse(...)`**: the architecture.md example uses module-level parsing, but that throws at *import time*, which (a) breaks tests that haven't stubbed env yet, and (b) couples test ordering. Lazy + cached preserves "fail fast at first use" while keeping tests deterministic. The cache reset helper (`resetConfigCache()`) is internal-only — primarily for tests.
- **No `tailwind.config.js`**: Tailwind v4 is CSS-first. Adding a JS config file would be cargo-culted from v3 muscle memory. Theme tokens, when needed, will go in `@theme` blocks inside `src/index.css`.
- **`src/App.tsx` placeholder kept minimal with light Tailwind classes** (`min-h-screen p-8`, `text-2xl font-bold`) so the rebrand reads cleanly and confirms Tailwind is actually applied during dev. Replaced wholesale by `AppLayout` + `<Routes>` in Phase 3.
- **Test fixture uses plain `as const` object, not `ImportMetaEnv` cast**: matches the `unknown` parameter type; cleaner than struct-casts.

### Deviations from the plan

- **Tailwind warnings**: none. `pnpm build` produced 7.69 kB of CSS (gzip 2.31 kB) — Tailwind v4's content scan picked up `min-h-screen p-8 text-2xl font-bold mt-2 text-gray-600` from `App.tsx` without any extra config.
- **`/api` proxy smoke test**: the success signal in the plan was "502 / connection refused from `localhost:8000`" assuming the Gateway wasn't running. The Gateway *was* running locally during verification, so `curl -sI /api/v1/strategies` returned `HTTP/1.1 404` with `server: uvicorn` — even stronger evidence the proxy is wired (request actually hit the upstream).

### Anti-patterns avoided / patterns established

- `getConfig()` lazy + cached, rather than module-level side effect — matches the same "avoid hidden globals" instinct in [.claude/memory/anti-patterns.md] (Python project sibling); keeps tests deterministic.
- `loadConfig(env: unknown)` accepting `unknown` and letting Zod narrow — Hard Rule #4 ("Zod at boundaries"); the function signature reflects that Zod is the validator, not TypeScript.
- `.gitkeep` placeholders for empty feature folders so ROADMAP §1.2 file tree exists in git on day 1; placeholders disappear naturally as each phase populates its folder.

### Notes for Phase 2 and later

- `src/config.ts` already exports `getConfig()` returning a typed `Config` with `VITE_API_BASE_URL`. Phase 2's `src/api/client.ts` should `import { getConfig } from '@/config'` and use `getConfig().VITE_API_BASE_URL` *only if it needs the absolute URL* — the dev proxy makes relative `/api/*` paths work without it, so prefer relative paths in `apiFetch`.
- `<QueryClientProvider>` + `<BrowserRouter>` are intentionally **not** wired in `src/main.tsx` yet. Phase 3's §3.1 wiring step will add them — at that point `App.tsx` gets replaced by `AppLayout` + `<Routes>`, and `getConfig()` first runs from somewhere in the import chain.
- Tailwind v4 theme tokens (brand colors, font family, etc.), if needed in Phases 3–8, go in `@theme` blocks inside `src/index.css` — not in a separate config file.
- No barrel `index.ts` files exist in `src/components/*/`. The single allowed barrel — `src/components/charts/index.ts` for `React.lazy` chart re-exports — lands in Phase 5.

### Time spent

~45 min end-to-end (planning, implementation, quality-gate iteration, docs).
