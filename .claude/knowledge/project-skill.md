# Project Skill — Operating Rules

This file is the entry point for any AI agent or contributor working in this repository. Read it before editing code, opening a PR, or designing a new feature. The Hard Rules are non-negotiable. The Soft Conventions describe how this codebase prefers to be written.

---

## Hard Rules

1. **Always `pnpm`.** Never `npm`, `yarn`, or `bun` directly. All scripts run via `pnpm <script>`. The `packageManager` field in `package.json` is enforced via Corepack.

2. **TypeScript everywhere.** No `.js` source files in `src/`. All code fully typed. No `// @ts-ignore` without a justification comment on the same or preceding line, and only when no typed workaround exists.

3. **No `any`.** If unavoidable, use `unknown` and narrow with a type guard, a Zod schema, or — as a last resort — `// biome-ignore lint/suspicious/noExplicitAny: <reason>` on the line. Reviewers will ask for the reason.

4. **Zod at boundaries.** All data from external APIs, `localStorage`, URL params, query strings, `postMessage`, `WebSocket` messages, or environment variables must be validated with a Zod schema before use. Never trust raw `unknown` or cast to a domain type.

5. **≥80% test coverage.** Enforced in CI on lines, functions, branches, and statements. New features must include tests in the same PR. Tests live next to the source: `Button.tsx` ↔ `Button.test.tsx`.

6. **No secrets in repo.** All runtime config via `VITE_`-prefixed env vars. `.env` is gitignored. `.env.example` is the contract — update it whenever you add a new variable. Never log env values.

7. **Biome clean before commit.** `pnpm lint` and `pnpm format --check` must pass. husky + lint-staged enforces this on every commit. Do not bypass with `--no-verify`.

8. **Conventional Commits.** Commit subjects use one of: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`, `build:`, `ci:`, `style:`. Include scope when helpful: `feat(auth): add logout button`. Imperative mood, lowercase after the prefix.

---

## Soft Conventions

- **File size target:** ≤ 400 lines per `.tsx` / `.ts` file. Split into a feature folder once exceeded; logic into hooks, presentation into components.
- **Named exports preferred.** Default exports only for page-level route components (so router config reads cleanly).
- **No `console.log` in committed code.** Use a `logger` utility that respects `NODE_ENV`, or remove the debug output. Biome warns on this.
- **Custom hooks own state.** Components should be thin presenters — they receive props and render. Stateful logic, side effects, and derived data belong in hooks (`useXxx`).
- **Co-locate tests.** `src/components/Button/Button.tsx` sits next to `Button.test.tsx`. Integration tests that span modules live in `tests/`.
- **No fire-and-forget async.** All async operations use TanStack Query (when added), or `useEffect` with proper cleanup. Never call an async function in render without handling the promise.
- **Accessibility is a feature, not a polish step.** Interactive elements get ARIA labels; tests use `getByRole` and `getByLabelText` over `getByTestId`.

---

## Where to Look First

| Question | File |
|---|---|
| How do I write code in this repo? | [[coding-standards]] — `coding-standards.md` |
| What commands are available? | [[commands]] — `commands.md` |
| Why was this tool chosen? | [[stack-decisions]] — `stack-decisions.md` |
| Where does code live? How does data flow? | [[architecture]] — `architecture.md` |
| How do I add a feature end-to-end? | `../playbooks/feature-development.md` |
| What should I avoid? | `../memory/anti-patterns.md` |
| Known tricky bugs? | `../memory/recurring-bugs.md` |
| How do I write effective prompts? | `../prompts/Prompt-Engineer.prompt.md` |
| What are React performance best practices? | `../skills/vercel-react-best-practices/SKILL.md` |

When you finish a task, ask yourself: did I learn something here that future-me would want to know? If yes, update the right file in `.claude/`.
