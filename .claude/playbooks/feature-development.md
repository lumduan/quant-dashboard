# Feature Development Playbook

A repeatable 8-step workflow for adding a feature end-to-end. Follow the steps in order — they build on each other. Smaller fixes can skip steps 2 and 6 if the change is truly trivial; everything else benefits from the full path.

---

## 1. Read context

Before writing any code:

- Read `.claude/knowledge/project-skill.md` — the Hard Rules and Soft Conventions are the bar you must clear.
- Read the files most directly affected. Trace one full data path (external input → API → hook → component) for the area you're touching.
- Skim `CHANGELOG.md` for related recent changes. If someone removed or replaced a pattern last week, you should know.
- Skim `.claude/memory/anti-patterns.md` — particularly entries near your work.

**Output of this step:** you can describe the existing behavior in one sentence and explain what will change.

---

## 2. Design

Sketch — on paper, in a scratch file, or in a PR description draft — before opening your editor:

- What is the component tree? Which props flow where?
- What hooks does this introduce, and what state do they own?
- What changes at the API boundary? Which Zod schemas need updating?
- Which files change? List them. If the list is long, scope down — split into two PRs.
- Which existing utilities can be reused? Search before writing new ones.

For anything non-trivial, write the design down as a short plan (3–10 bullet points). For trivial fixes, skip this step.

---

## 3. Test first

Write the failing Vitest test that defines the expected behavior before the implementation. This forces you to:

- Name the behavior precisely (`it('disables submit when the form is invalid')`).
- Write to the public API, not the internals.
- See the test fail for the right reason before you make it pass.

Rules:

- One assertion per `it` block where practical. If you have three, ask whether they belong in one block or three.
- Test from the user's perspective — `getByRole`, `userEvent`, `screen.getByText`. No reaching for internal state.
- Co-locate the test with the source: `Foo.test.tsx` next to `Foo.tsx`.

---

## 4. Implement

Write the minimum code needed to make the failing test pass.

- Follow the Hard Rules. No `any`. No unvalidated boundary data. Named exports.
- Stay within the file-size budget (see `coding-standards.md`). Split early.
- If you discover the design from step 2 was wrong, go back and revise — don't paper over it with comments and special cases.
- Resist the temptation to refactor unrelated code in the same PR. Open a separate one.

---

## 5. Quality gate

All four must pass before you move on:

```bash
pnpm lint
pnpm format
pnpm typecheck
pnpm test:coverage
```

Or as a single command:

```bash
pnpm quality
```

If any gate fails, fix the issue in source — never lower the threshold or skip the check. Coverage must stay ≥80% on lines, functions, branches, and statements. New code is expected to add tests; the threshold is a floor.

---

## 6. Document

- Add a `## [Unreleased]` entry to `CHANGELOG.md` describing the user-visible change (Added / Changed / Fixed / Deprecated / Removed).
- Update `README.md` if the change affects setup, usage, or commands.
- Add a JSDoc comment on every new exported function or component — one short line is enough; type signatures already say most of it.
- If you discovered something non-obvious worth remembering, update the appropriate file in `.claude/memory/` or `.claude/knowledge/`.

---

## 7. Commit

Use Conventional Commits format. One commit per logical change is the ideal; two or three small ones is fine; ten micro-commits that need to be squashed is not.

```
feat(portfolio): add CSV export button

Closes #42.

Co-Authored-By: Claude <noreply@anthropic.com>
```

Subject line:
- Imperative mood (`add`, not `added` or `adds`).
- Under 72 chars.
- Lowercase after the prefix.

Body (when needed):
- The *why*, not the *what*. The diff shows the what.
- Link issues with `Closes #N` or `Refs #N`.

Push, open the PR, fill out the template.

---

## 8. Verify in Docker

Before marking a PR ready for review, confirm the production build serves correctly:

```bash
docker build -t react-template:dev .
docker run --rm -p 8080:80 react-template:dev
```

Open `http://localhost:8080`:

- The app renders.
- Browser console has no errors (network, JS, or CSP).
- Refresh on a deep route returns the app, not a 404 — confirms the Nginx SPA fallback is intact.

If the dev server works but Docker doesn't, the gap is almost always in `nginx.conf` or `Dockerfile`. See `.claude/memory/recurring-bugs.md`.

---

## Done

When CI is green, code review is resolved, and you've verified Docker, the change is ready to merge. Squash-merge with a clean Conventional Commit subject so the `main` history reads cleanly.
