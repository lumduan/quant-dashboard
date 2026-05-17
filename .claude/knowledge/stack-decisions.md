# Stack Decisions

Why each tool was chosen, and the trade-offs we accepted. Read this before swapping anything out — most decisions are load-bearing.

---

## Package Manager

- **pnpm** — fastest installs of any popular manager; strict, symlink-based hoisting prevents phantom dependencies; deterministic lockfile (`pnpm-lock.yaml`); first-class workspace support if you later split into a monorepo. **Trade-off:** slightly less ubiquitous than `npm` — fresh machines need `corepack enable`. The `packageManager` field in `package.json` pins the version so this is one-time setup.

---

## Build Tool

- **Vite 6** — HMR in milliseconds (esbuild for dev, Rollup for prod), native ESM, modern output by default, plugin ecosystem mature. **Trade-off:** dev uses esbuild while prod uses Rollup — bundling edge cases can surface only on production build. The `pnpm build` step in CI catches these before merge.

---

## Framework

- **React 19** — concurrent features (`useTransition`, `useDeferredValue`), `use()` hook, Server Components ready, the largest ecosystem of any framework. **Trade-off:** React's release cadence makes deprecations a recurring chore; `react-template` pins majors and surfaces upgrade decisions explicitly.

---

## Language

- **TypeScript 5 (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`)** — eliminates entire classes of bugs at compile time. Index access returns `T | undefined`; optional props can't be set to `undefined` accidentally. **Trade-off:** higher initial setup cost and a steeper learning curve for teammates from looser languages. Worth it on any project larger than 2 files.

---

## Lint + Format

- **Biome 1.9** — a single Rust binary that replaces ESLint + Prettier; 10–100× faster; zero config drift between the lint and format passes; supports JS/TS/JSX/TSX/JSON. **Trade-off:** smaller plugin ecosystem than ESLint, and some rules differ from `eslint-plugin-react` conventions. We accept this for the speed and the single source of truth.

---

## Testing

- **Vitest 3** — shares Vite's config (one less thing to maintain), native ESM, fast watch mode, Jest-compatible API so most "how do I…" answers transfer. **Trade-off:** younger than Jest; a handful of edge cases (fake timers, snapshots in workspaces) differ subtly.
- **@testing-library/react** — tests from the user's perspective; semantic queries (`getByRole`, `getByLabelText`) push you toward accessible UIs. **Trade-off:** requires discipline not to fall back on `getByTestId` when a component is hard to query — usually the cure is fixing the component, not the test.
- **@vitest/coverage-v8** — uses V8's built-in coverage; faster than Istanbul-based; thresholds enforced in `vite.config.ts`.

---

## Data Validation

- **Zod** — TypeScript-first schema validation; types are inferred from the schema, so the schema *is* the source of truth; composable; tiny API surface. **Trade-off:** ~12 KB minified+gzipped — acceptable for boundary validation. If bundle size becomes critical, schemas can be tree-shaken aggressively or moved to a worker.

---

## Containerization

- **Docker multi-stage** (`node:20-alpine` builder → `nginx:1.27-alpine` server) — final image under 30 MB; Nginx serves static assets with correct MIME types, gzip, cache headers, and the SPA fallback. **Trade-off:** Nginx config is one more thing to maintain — see `nginx.conf` for the security headers and caching rules baked in.

---

## Pre-Commit

- **husky + lint-staged** — runs Biome on staged files only; fast and incremental. Wired up by the `prepare` script in `package.json`. **Trade-off:** requires `pnpm install` to run on every clone so that the husky hook is installed. The CI gate is the safety net.

---

## What We Deliberately Don't Use

- **`npm` / `yarn`** — replaced by `pnpm`. Faster, stricter, deterministic.
- **ESLint + Prettier** — replaced by Biome. One tool, one config, one binary.
- **Jest** — replaced by Vitest. Same API, faster, shares Vite's config.
- **`create-react-app`** — deprecated; replaced by Vite.
- **`axios`** — not included. Native `fetch` + a Zod response schema gives type-safe responses with no extra dependency. Reach for a wrapper only when you need request cancellation patterns that `fetch` makes awkward.
- **Redux / MobX** — not included. Most apps start fine with `useState` + context; add TanStack Query for server state when you need it. Pull in a global store only when you have a concrete problem it solves.
- **CSS-in-JS runtime libraries** (Emotion, styled-components) — left to forker's choice. Tailwind, CSS modules, or vanilla CSS all work out of the box; runtime CSS-in-JS has known performance trade-offs in React 19.

---

## When to Reconsider These Choices

Each tool is here because it answered a question better than its alternatives at the time of writing. Reconsider if:

- A core dependency we depend on drops support for the tool (e.g., React Native if you go cross-platform).
- The trade-off above stops being acceptable (bundle size of Zod becomes the bottleneck; Biome's plugin gap blocks a specific rule you need).
- A clearly better alternative emerges with mature tooling and a migration path.

Don't swap a tool because it's newer. Swap it because the rationale above no longer holds.
