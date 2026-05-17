# Contributing

Thanks for your interest in `react-template`. This document covers the development workflow, the quality gate, and the conventions that keep the codebase tidy.

For day-to-day feature development, the 8-step playbook in [`.claude/playbooks/feature-development.md`](./.claude/playbooks/feature-development.md) is the canonical workflow. This file covers the contribution mechanics.

---

## Setting Up Your Dev Environment

```bash
# Prerequisites: Node 20+, Corepack
corepack enable
corepack prepare pnpm@9.15.0 --activate

# Clone and install
git clone https://github.com/OWNER/REPO.git
cd REPO
pnpm install

# Sanity check
pnpm quality       # lint + format + typecheck + test:coverage
pnpm dev           # http://localhost:5173
```

If `pnpm install` succeeds and `pnpm quality` is green, your environment is ready.

---

## Quality Gate

Every PR must pass this gate. Run locally before opening a PR:

```bash
pnpm quality
```

That's equivalent to:

```bash
pnpm lint && pnpm format && pnpm typecheck && pnpm test:coverage
```

If any step fails, fix the source — never lower the threshold or skip the check. Coverage must stay ≥80% on lines, functions, branches, and statements.

The pre-commit hook (husky + lint-staged) runs Biome on staged files automatically — but it only touches what's staged. Run `pnpm quality` once before opening the PR to catch the rest.

---

## Conventional Commits

Commit subjects follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <description>
```

Allowed types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`, `style`.

**Examples:**

```
feat(auth): add logout button
fix(api): retry on 503 with exponential backoff
docs: clarify pnpm setup in README
refactor: extract usePortfolioData hook
chore(deps): bump vite to 6.0.7
test: cover empty-state branch in PortfolioCard
```

**Rules:**

- Imperative mood (`add`, not `added` or `adds`).
- Lowercase after the prefix.
- Subject under 72 characters; the body explains *why*, not *what*.
- One commit per logical change. If you're tempted to write "feat: X and also Y", split it.

---

## PR Process

1. **Branch** off `main` with a descriptive name: `feat/csv-export`, `fix/safari-date-parse`.
2. **Implement** following the [feature-development playbook](./.claude/playbooks/feature-development.md).
3. **Quality gate** locally — `pnpm quality` must be green.
4. **Update `CHANGELOG.md`** under `[Unreleased]` if the change is user-visible.
5. **Open the PR**, filling out the template. The title is your Conventional Commit subject.
6. **CI** runs the full quality gate on Node 20 and 22. Fix any failures.
7. **Review** — address feedback with new commits (don't force-push during review unless asked).
8. **Squash-merge** with a clean Conventional Commit subject. `main` history stays linear and readable.

---

## Adding a Dependency

```bash
pnpm add <pkg>           # Runtime dependency
pnpm add -D <pkg>        # Dev dependency
```

Before adding a new dependency, ask:

- Is this needed, or can the standard library / existing deps do it?
- What's the bundle size impact? Check [bundlephobia.com](https://bundlephobia.com/).
- Is it maintained? Last release, open issues, weekly downloads.
- Does it pull in transitive deps with known CVEs? `pnpm why <pkg>` after install will show.

Commit `package.json` **and** `pnpm-lock.yaml` together. PRs that touch one but not the other will fail CI.

---

## Tests

Tests live next to their source: `Button.tsx` ↔ `Button.test.tsx`. Integration tests that span modules live in `tests/`.

Conventions (from [`coding-standards.md`](./.claude/knowledge/coding-standards.md)):

- One behavior per `it` block.
- Semantic queries (`getByRole`, `getByLabelText`) over `getByTestId`.
- `@testing-library/user-event` for interactions.
- Mock only the network (MSW). Real implementations everywhere else.

Run a single test file:

```bash
pnpm test src/components/Button/Button.test.tsx
```

Run in watch mode:

```bash
pnpm test:watch
```

---

## Documentation

- **`CHANGELOG.md`** — every user-visible change gets a line under `[Unreleased]`.
- **`README.md`** — update if the change affects setup, usage, or commands.
- **JSDoc** — one short line on every new exported function or component.
- **`.claude/`** — if you learn something non-obvious worth remembering, update the relevant file.

---

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By participating, you're expected to uphold it.

---

## Questions?

Open a [discussion](https://github.com/OWNER/REPO/discussions) or a [feature request issue](./.github/ISSUE_TEMPLATE/feature_request.md). For security concerns, see [SECURITY.md](./SECURITY.md).
