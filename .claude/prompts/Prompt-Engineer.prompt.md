# Prompt Engineer

How to write prompts that get useful work done in this repository.

This file is for humans driving AI agents (Claude Code, Copilot, Cursor) on this codebase. It's not a generic prompt-engineering tutorial — it's a list of the patterns that work *here*.

---

## The single most important rule

**Tell the agent what you've already learned.** Agents start with no context. If you've already ruled out an approach, say so. If you've already read three files, name them. The difference between "fix the test" and "fix `App.test.tsx` — the assertion is querying for role `heading` but the component renders an `<h2>`" is the difference between five tool calls and one.

---

## Anatomy of a good prompt for this repo

A good prompt for `react-template` has four parts:

1. **Goal** — one sentence on what you want to be true after.
2. **Constraints** — pointers to the relevant Hard Rules (`project-skill.md`) and the files involved.
3. **What you've tried / ruled out** — saves the agent from re-treading dead ends.
4. **Success criteria** — how you'll know it worked (tests pass, dev server renders, etc.).

Example:

> Add a dark-mode toggle. Constraints: must work without flashing on initial load (handle in inline script in `index.html`), state lives in a `useTheme` hook, Tailwind not present yet so use CSS custom properties on `:root`. I've already added an `--bg` variable to `index.html` style. Done when: clicking the toggle persists across reload, `useTheme.test.ts` covers the toggle action, `pnpm quality` is green.

---

## Patterns that work

- **Cite files by path.** "Update `src/api/userApi.ts` so the response schema includes `lastLoginAt`" beats "update the user API."
- **Name the Hard Rule when it's relevant.** "Per Hard Rule #4, the response must be validated with Zod before use." This puts the agent on rails.
- **Be explicit about scope.** "Do not refactor unrelated code in this PR" is a useful sentence. Agents will tidy by default.
- **Ask for the plan before the change** on anything non-trivial. "Show me your plan first, then implement." This catches design mistakes before they ship.
- **Use the playbooks.** "Follow the feature-development playbook" is a complete brief on its own for most features.

---

## Patterns that fail

- **"Make it better."** No goal, no constraint, no success criterion. The agent will guess, and it will guess wrong.
- **Walls of context with no signal.** Pasting a 2000-line file when only one function matters. Pull out the relevant snippet.
- **"Why doesn't this work?" with no error message.** Always include the actual error, the actual command you ran, and the actual file you ran it against.
- **Implicit constraints.** "Use the standard library only" is a constraint; "no `axios`" only works if you also say "no other HTTP libraries either." Be exhaustive.

---

## Prompts for common tasks in this repo

### New component

> Create a `<Button>` component at `src/components/Button/Button.tsx` with co-located `Button.test.tsx`. Props: `children`, `onClick`, `variant?: 'primary' | 'secondary'` (default `'primary'`), `disabled?: boolean`. Named export. Tests cover: renders children, calls `onClick` when clicked, does not call `onClick` when disabled. Follow `coding-standards.md`.

### New API boundary

> Add `fetchUser(userId: string)` to `src/api/userApi.ts`. Endpoint: `GET ${VITE_API_BASE_URL}/users/:id`. Response shape: `{ id: string, name: string, email: string, lastLoginAt: string (ISO) }`. Validate with Zod (Hard Rule #4). Return `Result<User, FetchError>`. Co-located tests use MSW; mock the network only.

### Bug fix

> `pnpm test` fails in `App.test.tsx` with `TestingLibraryElementError: Unable to find an accessible element with the role "heading"`. The component currently renders `<div>` instead of `<h1>`. Update `App.tsx` to use `<h1>`. Don't change the test. Confirm `pnpm test:coverage` is green after.

### Refactor

> Split `src/App.tsx` (currently 420 lines, exceeds the 150-line component budget). The logic for portfolio filtering belongs in a `usePortfolioFilter` hook; the table belongs in `PortfolioTable`. Keep behavior identical; tests must pass without modification. Don't add new features in this PR.

---

## When the agent gets stuck

If the agent has tried 3+ times and is still wrong, the problem is usually:

- A constraint you assumed was obvious but wasn't stated (e.g., "this needs to work in Safari, which doesn't support `<dialog>` natively").
- A file you didn't realize was relevant (e.g., a global Vite plugin that rewrites imports).
- A version mismatch (e.g., the agent is writing React 18 patterns; this repo is React 19).

Stop and re-brief. Don't keep retrying with the same prompt.

---

## Where to point the agent

When asking the agent to absorb context, send it to these files in this order:

1. `.claude/knowledge/project-skill.md` — the rules.
2. `.claude/knowledge/architecture.md` — where things live.
3. The specific source files involved.
4. `.claude/memory/anti-patterns.md` — what not to do.

This is enough to get useful work back on the first response in most cases.
