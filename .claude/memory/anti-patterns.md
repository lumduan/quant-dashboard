# Anti-Patterns

Each entry: what the bad code looks like, why it's bad, what to do instead. Skim this before opening a PR.

---

## `any` without justification

**Bad:**
```ts
const data: any = await response.json();
return data.user.name;
```

**Why:** `any` opts every downstream caller out of type checking. If `data.user` is `undefined` at runtime, TypeScript can't warn you. The cost of the bug compounds the further it spreads.

**Right:**
```ts
const UserResponseSchema = z.object({ user: z.object({ name: z.string() }) });
const parsed = UserResponseSchema.safeParse(await response.json());
if (!parsed.success) return null;
return parsed.data.user.name;
```

If `any` truly is unavoidable (rare — usually a third-party type gap), use `// biome-ignore lint/suspicious/noExplicitAny: <reason>` on the line so reviewers see the justification.

---

## Unvalidated external data

**Bad:**
```ts
const user = JSON.parse(localStorage.getItem('user') ?? '{}') as User;
```

**Why:** `as` is a lie to the compiler. The string in `localStorage` could be anything — written by an old version of your app, hand-edited by a developer, corrupted. At best you crash on `user.name`; at worst you silently render garbage.

**Right:**
```ts
const raw = localStorage.getItem('user');
const parsed = UserSchema.safeParse(raw ? JSON.parse(raw) : null);
const user = parsed.success ? parsed.data : null;
```

Hard Rule #4: every boundary (localStorage, URL, env, network) gets a Zod schema.

---

## Logic inside JSX

**Bad:**
```tsx
return (
  <ul>
    {items
      .filter(i => i.status !== 'archived' && (i.owner === currentUser || i.shared))
      .sort((a, b) => (a.priority - b.priority) || a.name.localeCompare(b.name))
      .map(i => i.status === 'urgent'
        ? <UrgentRow key={i.id} item={i} />
        : <NormalRow key={i.id} item={i} />)}
  </ul>
);
```

**Why:** JSX should read like a structure, not an algorithm. The reader can't tell at a glance what filters apply, the test surface is the whole component, and adding a fourth condition makes it unreadable.

**Right:** extract the data transformation into a hook or a helper.
```tsx
function useVisibleItems(items: Item[], currentUser: string): Item[] {
  return useMemo(() => items
    .filter(i => i.status !== 'archived' && (i.owner === currentUser || i.shared))
    .sort(byPriorityThenName), [items, currentUser]);
}

return (
  <ul>
    {visibleItems.map(i => <ItemRow key={i.id} item={i} />)}
  </ul>
);
```

---

## `useEffect` without cleanup

**Bad:**
```tsx
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);
```

**Why:** every re-mount adds a new listener; in `StrictMode` you get them in pairs from the first render. Memory leak, duplicated handlers firing, occasional `setState`-on-unmounted-component warnings.

**Right:** return the cleanup function.
```tsx
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

If the effect subscribes, listens, sets a timer, or starts a request, it has cleanup.

---

## `console.log` in committed code

**Bad:**
```ts
console.log('user is', user);
return user;
```

**Why:** clutters production console, can leak sensitive data, and Biome warns on it. CI will flag this.

**Right:** delete the log when you're done debugging, or use a `logger` that respects `NODE_ENV`:
```ts
logger.debug('user resolved', { userId: user.id });
```

The logger should be a thin wrapper that no-ops in production unless you opt in.

---

## Hard-coded API URLs

**Bad:**
```ts
const res = await fetch('http://localhost:3000/api/users');
```

**Why:** breaks in staging, breaks in prod, breaks for every developer with a different local port. Hard Rule #6 — runtime config comes from `VITE_` env vars.

**Right:**
```ts
const res = await fetch(`${config.VITE_API_BASE_URL}/users`);
```

Where `config` is the Zod-validated env object (see `architecture.md`).

---

## Default-export everything

**Bad:**
```tsx
// Button.tsx
export default function ({ children }: Props) { return <button>{children}</button>; }
```

**Why:** the import name is whatever the importer types. Renames don't propagate. Tooling (IDE rename, ESLint/Biome) can't help. Three files later you have `Button`, `MyButton`, and `Btn` all importing the same component.

**Right:** named export.
```tsx
export function Button({ children }: Props): JSX.Element {
  return <button>{children}</button>;
}
```

Reserve default exports for page-level route components, where the convention reads cleanly in route configs.

---

## Mocking implementation details in tests

**Bad:**
```ts
const setState = vi.spyOn(component, 'setState');
button.click();
expect(setState).toHaveBeenCalledWith({ count: 1 });
```

**Why:** the test now fails if you refactor `setState` to `useReducer`, even if the rendered output is identical. The user doesn't care how state is stored; the test shouldn't either.

**Right:** assert on what the user sees.
```ts
const { user } = renderWithUser(<Counter />);
await user.click(screen.getByRole('button', { name: 'Increment' }));
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

Mock only the network (MSW). Use real implementations everywhere else.

---

## Refactor + feature in one PR

**Bad:** one PR with title `feat: add CSV export` whose diff also renames 12 files, restructures `src/utils/`, and rewrites three hooks "while I was in there."

**Why:** review becomes impossible. If the export feature has a bug, you can't revert without losing the refactor. The history reads like a guessing game.

**Right:** two PRs. Open the refactor first as `refactor: extract usePortfolioData hook`, merge it, then open `feat: add CSV export` on top. Both are reviewable; both are revertable independently.

---

## Skipping TypeScript strict checks

**Bad:**
```ts
// @ts-nocheck
// quick fix, will clean up later
```

**Why:** "later" is "never." `@ts-nocheck` disables checking for the entire file, silently masking every future bug in it.

**Right:** fix the actual type error. If you genuinely can't right now (third-party type gap), use `// @ts-expect-error: <reason and link>` on the specific line so the suppression fails when the underlying issue is fixed.

---

## Trusting `import.meta.env` shape

**Bad:**
```ts
const apiUrl: string = import.meta.env.VITE_API_URL;
```

**Why:** if the env var is missing, `apiUrl` is `undefined` but typed `string`. Every downstream `apiUrl.startsWith(...)` crashes at runtime.

**Right:** validate with Zod at startup (see `architecture.md`).
```ts
const config = EnvSchema.parse(import.meta.env);
```

This fails loudly on app boot if config is wrong — the right place to fail.
