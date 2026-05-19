# Coding Standards

The rules below are enforced by Biome and `tsc --strict` where possible; the rest are conventions reviewers will hold the line on. When you find an exception worth keeping, document it inline with a brief justification comment.

---

## Naming

- **Components, types, interfaces, enums:** `PascalCase` (`UserCard`, `PortfolioState`).
- **Functions, variables, hooks:** `camelCase` (`fetchPortfolio`, `useStrategyFilter`).
- **Constants, env var keys:** `SCREAMING_SNAKE_CASE` (`MAX_RETRIES`, `VITE_API_BASE_URL`).
- **Files:** `PascalCase.tsx` for components, `camelCase.ts` for utilities and hooks. Test files mirror the source: `Foo.tsx` ↔ `Foo.test.tsx`.
- **Custom hooks** must start with `use`: `usePortfolioData`, `useStrategyFilter`.
- **Booleans** read like predicates: `isLoading`, `hasError`, `shouldRetry`, not `loading` or `error` alone.
- Avoid abbreviations except well-established domain terms (`pnl`, `api`, `id`, `url`).

---

## TypeScript

- **Full type annotations on every exported function** — parameters and return type, even when inferrable. This is the API contract.
- **No bare `any`.** Use `unknown` + type guard, or an explicit Zod schema. See Hard Rule #3.
- **Prefer `interface` for object shapes** that may be extended; `type` for unions, intersections, mapped types, and tuples.
- **Use `readonly`** on props and data objects that must not be mutated. React props are conceptually readonly — make it explicit.
- **`satisfies` over type assertion.** Use `as const satisfies SomeConfig` to verify a literal matches a type without losing literal-ness. Reach for `as` only as a last resort.
- **Discriminated unions** for state with mutually exclusive shapes (`{ status: 'idle' } | { status: 'loading' } | { status: 'success', data: T } | { status: 'error', error: E }`).
- **No `enum`.** Use `as const` object literals; they tree-shake and don't generate runtime code that breaks `verbatimModuleSyntax`.

---

## Component Structure

Order within a `.tsx` file:

1. Imports (external libs → `@/` aliases → relative `./`)
2. Types and interfaces
3. Constants
4. Helper functions (pure, no hooks)
5. The component function itself
6. Exports (if not inline on the declaration)

```tsx
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { useUser } from '@/hooks/useUser';

interface ProfileCardProps {
  readonly userId: string;
}

const MAX_NAME_LENGTH = 64;

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function ProfileCard({ userId }: ProfileCardProps): JSX.Element {
  const { data } = useUser(userId);
  // ...
}
```

---

## File Size & Complexity

| Kind | Budget |
|---|---|
| Components | ≤ 150 lines (push logic into hooks, not inline) |
| Custom hooks | ≤ 200 lines |
| Utility files | ≤ 300 lines |
| Any `.tsx` / `.ts` | ≤ 400 lines (hard ceiling — split) |

When a file exceeds its budget, group related modules into a feature folder:

```
src/features/portfolio/
  PortfolioCard.tsx
  PortfolioCard.test.tsx
  usePortfolioData.ts
  usePortfolioData.test.ts
  portfolioSchema.ts
  index.ts          ← public surface of the feature
```

---

## Imports

- **Order:** external packages → `@/` aliases → relative (`./`). Biome's `organizeImports` handles this automatically.
- **No wildcard imports from internal modules.** `import * as React from 'react'` is fine. `import * from '@/utils'` is not — be explicit about what you use.
- **Always `@/` for `src/` imports** — never `../../../`. The depth of the relative path is a strong signal you should be using the alias.
- **Type-only imports** use `import type { Foo } from '...'`. `verbatimModuleSyntax` requires it.

---

## Error Handling

- **Define typed errors** or discriminated `Result<T, E>` unions; never throw bare `Error('something')` for control flow.
- **Never swallow errors silently.** `catch (e) {}` is a bug. Either log + rethrow, transform into a `Result`, or surface to the user.
- **Zod uses `safeParse`.** Always check `.success` before reading `.data`. Reserve `parse()` for invariants you're sure of, with a clear error message.

```ts
const parsed = UserSchema.safeParse(raw);
if (!parsed.success) {
  return { ok: false, error: parsed.error };
}
return { ok: true, value: parsed.data };
```

- **`ErrorBoundary` is the render-time safety net; TanStack Query errors don't reach it.** `useQuery` swallows fetch failures into `isError`/`error`. To make a failure recoverable from the UI, render `<ErrorState>` from inside the consuming component and wire the Retry callback to `queryClient.invalidateQueries({ queryKey: [...] })`. Wrap async sections in `<ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => ...}>` *additionally* for render-time crashes (malformed data, chart-library throws). Phase 8 example: `PortfolioSummary` (query error → inline `ErrorState`) and `DashboardPage` (each `<Suspense>` section wrapped in an `ErrorBoundary` whose fallback invalidates the relevant cache key then calls `resetErrorBoundary()`).

---

## Tests

- **One test file per source file**, co-located.
- **One behavior per `it` block.** Read the description as a sentence — `it('disables the submit button when the form is invalid')`.
- **Test behavior, not implementation.** No tests on internal state, private functions, or render counts. Query the DOM as a user would.
- **Prefer semantic queries:** `getByRole`, `getByLabelText`, `getByText`. Reach for `getByTestId` only when nothing semantic exists.
- **Use `@testing-library/user-event`** for interactions — `userEvent.click(button)` rather than `fireEvent.click(button)`. It simulates real user input (focus, events in order).
- **Mock only the network.** Use MSW for HTTP. Real implementations for everything else — date libraries, math, formatters. Mocks rot; real code doesn't.
- **MSW v2 setup is project-wide.** Default handlers + typed fixtures live in `src/test/mocks/handlers.ts`; the `setupServer(...handlers)` instance in `src/test/mocks/server.ts`; lifecycle hooks (`beforeAll(server.listen) / afterEach(server.resetHandlers) / afterAll(server.close)`) wired once in `src/test-setup.ts` with `onUnhandledRequest: 'error'`. Per-test overrides go through `server.use(http.get(..., () => HttpResponse.json(...)))`. `src/test/**` is excluded from coverage.
- **Test TanStack Query hooks with a fresh `QueryClient` per test.** Use a `makeWrapper()` helper that returns `{ wrapper, client }` where `client = new QueryClient({ defaultOptions: { queries: { retry: false } } })`. Run hooks via `renderHook(() => useX(), { wrapper })` from `@testing-library/react`. Never import the production singleton — test isolation depends on it. Cache-key assertions: `client.getQueryCache().findAll()[0]?.queryKey`. `refetchInterval` lives on `QueryObserverOptions`, so assert via `client.getQueryCache().findAll()[0]?.observers[0]?.options.refetchInterval`, not on `query.options`.

---

## Logging & Side Effects

- **No `console.log` in committed code.** Biome warns on this. Use a thin `logger` wrapper that respects `import.meta.env.MODE`.
- **All `useEffect` blocks return a cleanup function** when they subscribe, listen, or set a timer. If there's nothing to clean up, the effect probably shouldn't exist.
- **Side effects belong in hooks**, not in render. Calling `localStorage.setItem` directly inside a component body is a bug waiting to happen.

---

## Accessibility

- All interactive elements have an accessible name (label, `aria-label`, or visible text).
- Color is never the only signal — pair it with text, icons, or position.
- Keyboard navigation works on every interactive element (button, link, custom control). Test with Tab and Enter.
- Tests use `@testing-library/jest-dom` matchers (`toBeInTheDocument`, `toHaveAccessibleName`, `toBeDisabled`).
