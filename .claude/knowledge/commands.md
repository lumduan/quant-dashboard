# Commands

Every command you will need to operate this repo. All `pnpm` scripts are defined in `package.json`.

---

## Dev

| Task | Command |
|---|---|
| Start dev server (HMR) | `pnpm dev` |
| Build for production | `pnpm build` |
| Preview production build locally | `pnpm preview` |

The dev server listens on `http://localhost:5173` by default.

---

## Quality Gate

| Task | Command |
|---|---|
| Run all tests | `pnpm test` |
| Run tests with coverage | `pnpm test:coverage` |
| Watch tests during dev | `pnpm test:watch` |
| Run a single test file | `pnpm test src/components/Button/Button.test.tsx` |
| Type check | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Lint + auto-fix | `pnpm lint:fix` |
| Format check | `pnpm format` |
| Format write | `pnpm format:fix` |
| Full quality gate | `pnpm quality` |
| Pre-commit | runs automatically on `git commit` (via husky + lint-staged) |

The `pnpm quality` script is the same gate that CI runs. If it passes locally, the PR will pass CI.

---

## Package Management

| Task | Command |
|---|---|
| Install all deps (uses `pnpm-lock.yaml`) | `pnpm install` |
| Install with a frozen lockfile (CI mode) | `pnpm install --frozen-lockfile` |
| Add a runtime dep | `pnpm add <pkg>` |
| Add a dev dep | `pnpm add -D <pkg>` |
| Remove a dep | `pnpm remove <pkg>` |
| Upgrade one package | `pnpm update <pkg>` |
| Upgrade all (interactive) | `pnpm update -i` |
| Audit for CVEs | `pnpm audit` |
| Audit failing only on high/critical | `pnpm audit --audit-level=high` |
| List installed packages | `pnpm list` |
| Why is package X installed? | `pnpm why <pkg>` |

If `pnpm` is missing on a fresh machine: `corepack enable && corepack prepare pnpm@9.15.0 --activate`.

---

## Docker

| Task | Command |
|---|---|
| Build image | `docker build -t react-template:dev .` |
| Run container | `docker run --rm -p 8080:80 react-template:dev` |
| Build + run | `docker build -t react-template:dev . && docker run --rm -p 8080:80 react-template:dev` |
| Open shell in container | `docker run --rm -it --entrypoint /bin/sh react-template:dev` |
| Tail container logs | `docker logs -f <container-id>` |
| Show image size | `docker images react-template` |

The container exposes port 80 inside; map it to whatever you like on the host (8080 in the examples above).

---

## Git

| Task | Command |
|---|---|
| Initial commit (new repo) | `git init && git add . && git commit -m "chore: initial scaffold"` |
| Tag a release | `git tag v0.1.0 && git push --tags` (triggers Docker Publish workflow) |

---

## Combined Quality Gate (copy-paste ready)

```bash
pnpm lint && pnpm format --check && pnpm typecheck && pnpm test:coverage
```

Or simply:

```bash
pnpm quality
```
