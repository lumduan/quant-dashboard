# Architecture

How code is organized, how data flows, and the rules that keep the structure from rotting as the app grows.

---

## Top-Level Layout

| Path | Purpose |
|---|---|
| `src/` | All application source code |
| `src/components/` | Reusable UI components (each in its own folder, with its test co-located) |
| `src/hooks/` | Custom React hooks (stateful logic, no JSX) |
| `src/pages/` | Route-level components (one per route) |
| `src/api/` | API client functions + Zod response schemas |
| `src/utils/` | Pure utility functions (no React, no I/O) |
| `src/types/` | Shared TypeScript types and interfaces |
| `tests/` | Integration-level tests that span multiple modules |
| `public/` | Static assets served verbatim (favicon, robots.txt) |
| `.claude/` | Agent knowledge, playbooks, memory, prompt guidance |
| `.github/` | CI/CD workflows, issue and PR templates |

The folders under `src/` appear as features are added — the initial scaffold ships with only `App.tsx` to keep the starting point minimal. Use the conventions above when creating them.

---

## Module Boundaries (Data Flow)

```
External API / localStorage / URL / postMessage / env
       │
       │  Zod schema validation
       ▼
   src/api/          (fetch, validate, transform)
       │
       │  typed data objects
       ▼
   src/hooks/        (stateful logic, caching, derived state)
       │
       │  typed props
       ▼
   src/components/   (render, user events)
       │
       │  composed into screens
       ▼
   src/pages/        (route-level assembly)
```

**Rules:**

- `components/` must not import from `pages/`.
- `utils/` must not import from `hooks/`, `components/`, or `pages/`.
- `api/` must not import from `components/`, `hooks/`, or `pages/`.
- Anywhere data crosses a boundary (external → internal, or untyped → typed), a Zod schema validates it.

These rules prevent circular dependencies and keep each layer testable on its own.

---

## Configuration

- All runtime config is read from `import.meta.env.VITE_*`. The `vite-env.d.ts` declares the shape so usage is typed.
- `.env` is gitignored. `.env.example` is the documented contract — update it whenever you add a variable.
- No hard-coded URLs, magic numbers, or environment-specific strings in source. Hoist them to a typed `config.ts` module that reads from `import.meta.env` with Zod validation.

```ts
// src/config.ts
import { z } from 'zod';

const EnvSchema = z.object({
  VITE_APP_NAME: z.string().min(1),
  VITE_APP_VERSION: z.string(),
  VITE_API_BASE_URL: z.string().url().optional(),
});

export const config = EnvSchema.parse(import.meta.env);
```

---

## Cross-Cutting Conventions

- **Time zones:** always UTC internally; localize only at the display boundary. Store timestamps as ISO 8601 strings or epoch milliseconds; never as locale-formatted strings.
- **Errors:** discriminated union `Result<T, E>` or typed Error subclass. Never swallow with `catch (_) {}`.
- **Logging:** no `console.log` in committed code. A thin `logger` wrapper respects `import.meta.env.MODE` (silent in prod by default, verbose in dev).
- **Accessibility:** every interactive element has an accessible name; tests assert it via `getByRole`/`getByLabelText`.
- **Async:** all promises are awaited or returned. No fire-and-forget — `useEffect` cleanups, `AbortController` for in-flight requests, TanStack Query for server state (when added).
- **Imports:** alphabetical within groups (external → `@/` → relative). Biome's `organizeImports` enforces this.

---

## Where Feature Code Lives

For non-trivial features, prefer a feature folder over scattering files across `components/`, `hooks/`, and `api/`:

```
src/features/portfolio/
  PortfolioCard.tsx
  PortfolioCard.test.tsx
  usePortfolioData.ts
  usePortfolioData.test.ts
  portfolioSchema.ts          ← Zod schemas + inferred types
  portfolioApi.ts             ← fetch + parse, returns typed data
  index.ts                    ← public surface (only re-export what callers need)
```

The `index.ts` defines the feature's API. Other features import only from `index.ts`; internal files stay private. This is the same principle as `__all__` in Python or `pub`/`pub(crate)` in Rust — encapsulation by convention.

---

## Testing Topology

- **Unit tests** live next to source (`Foo.tsx` ↔ `Foo.test.tsx`). They cover one module's behavior in isolation.
- **Integration tests** live in `tests/` and cover flows that span multiple modules (a user filling a form, an API client retrying on 503, etc.).
- **No end-to-end tests in this template by default** — add Playwright if your app warrants it. Plan for a separate `e2e/` folder with its own config.

Coverage thresholds (≥80% on lines, functions, branches, statements) are enforced by Vitest in CI. The threshold is a floor, not a ceiling — well-tested modules often exceed 95%.
