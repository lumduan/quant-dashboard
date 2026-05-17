# react-template

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)
[![Docker Publish](https://github.com/OWNER/REPO/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/docker-publish.yml)
[![Security Scan](https://github.com/OWNER/REPO/actions/workflows/security.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Universal React project template — pnpm-native, Docker-ready, AI-agent enabled.

---

## Features

- **pnpm-native** — single `package.json` as source of truth; `packageManager` field pins the version via Corepack
- **Docker** — multi-stage build, `node:20-alpine` builder → `nginx:1.27-alpine` server, under 30 MB final image
- **Type-safe** — `tsc --strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` on all source code
- **Linted & formatted** — Biome with lint + format in one tool, one config, one binary
- **≥80% coverage** — Vitest + `@vitest/coverage-v8` enforced in CI (lines, functions, branches, statements)
- **Security scanning** — weekly `pnpm audit` in GitHub Actions, fail on high/critical
- **Pre-commit hooks** — Biome lint + format on staged files via husky + lint-staged
- **AI-agent ready** — `.claude/` directory with knowledge, playbooks, memory, and prompt-engineering guidance

---

## Directory Structure

```
react-template/
├── .claude/                      # AI agent knowledge, playbooks, memory
│   ├── knowledge/                # Operating rules, standards, architecture
│   ├── playbooks/                # Repeatable workflows (feature dev, etc.)
│   ├── prompts/                  # Prompt-engineering guidance
│   ├── memory/                   # Anti-patterns, recurring bugs
│   └── skills/                   # Agent skills (Vercel React Best Practices)
├── .github/
│   ├── workflows/                # CI, Docker publish, security scan
│   ├── ISSUE_TEMPLATE/           # Bug report, feature request
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── FUNDING.yml
├── .husky/
│   └── pre-commit                # lint-staged hook
├── src/
│   ├── main.tsx                  # React 19 entry point
│   ├── App.tsx                   # Root component
│   ├── App.test.tsx              # Co-located test
│   ├── test-setup.ts             # Vitest setup (jest-dom matchers)
│   └── vite-env.d.ts             # Vite client types
├── public/
│   └── favicon.svg
├── Dockerfile                    # Multi-stage build
├── nginx.conf                    # SPA fallback, security headers, gzip, cache
├── biome.json                    # Lint + format
├── tsconfig.json                 # Strict TypeScript
├── tsconfig.node.json
├── vite.config.ts                # Vite + Vitest config
├── package.json
├── index.html
├── .env.example
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE                       # MIT
├── README.md
└── SECURITY.md
```

---

## Prerequisites

- **Node.js 20+** (22 is also tested in CI)
- **pnpm 9+** via Corepack — comes bundled with modern Node:

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

- **Docker** (optional, for containerized builds)

---

## Installation

```bash
# Use this template on GitHub, then clone your new repo
git clone https://github.com/OWNER/REPO.git
cd REPO

# Install
pnpm install

# Start dev server (HMR on http://localhost:5173)
pnpm dev
```

---

## Running with Docker

```bash
docker build -t react-template:dev .
docker run --rm -p 8080:80 react-template:dev
# open http://localhost:8080
```

The image is multi-stage: `node:20-alpine` builds, `nginx:1.27-alpine` serves. Final image stays under 30 MB. See `Dockerfile` and `nginx.conf` for the details (security headers, SPA fallback, asset caching).

---

## Testing

```bash
pnpm test               # Run once
pnpm test:watch         # Watch mode (dev)
pnpm test:coverage      # With coverage report
```

Coverage thresholds (≥80% on lines, functions, branches, statements) are enforced by Vitest and fail CI if not met. The threshold is a floor — well-tested modules should exceed 95%.

Tests live next to their source files (`Foo.tsx` ↔ `Foo.test.tsx`). Integration tests that span modules live in `tests/`.

---

## Linting, Formatting, and Type Checking

```bash
pnpm lint               # Biome lint
pnpm lint:fix           # Lint + auto-fix
pnpm format             # Biome format check
pnpm format:fix         # Format write
pnpm typecheck          # tsc --noEmit
pnpm quality            # All of the above + tests with coverage
```

The pre-commit hook (`husky`) runs `lint-staged`, which auto-fixes Biome issues on staged `.ts` / `.tsx` files. The CI workflow runs the full quality gate on every push to `main` and every PR.

---

## Using `.claude/` for AI Agent Workflows

The `.claude/` directory contains structured knowledge that any AI agent (Claude Code, Copilot, Cursor) can absorb to understand and contribute to this repo without hand-holding.

| File | Purpose |
|---|---|
| `.claude/knowledge/project-skill.md` | Hard Rules + Soft Conventions — the operating rules |
| `.claude/knowledge/coding-standards.md` | Naming, typing, file structure conventions |
| `.claude/knowledge/commands.md` | All commands reference (pnpm, docker, biome) |
| `.claude/knowledge/stack-decisions.md` | Why each tool was chosen + trade-offs |
| `.claude/knowledge/architecture.md` | Module boundaries, data flow, where code lives |
| `.claude/playbooks/feature-development.md` | 8-step workflow for adding features |
| `.claude/prompts/Prompt-Engineer.prompt.md` | How to write effective prompts for this repo |
| `.claude/memory/anti-patterns.md` | What NOT to do + why + the right approach |
| `.claude/memory/recurring-bugs.md` | Known tricky bugs and their fixes |
| `.claude/skills/vercel-react-best-practices/` | Vercel Engineered performance rules (70+ rules, 8 categories) |

**How to use:** point your agent at `.claude/knowledge/project-skill.md` first. Everything else links from there. When you discover something worth remembering, add it to the appropriate file — `.claude/` is a living document.

---

## Security Scanning

A weekly `pnpm audit --audit-level=high` runs in GitHub Actions (`.github/workflows/security.yml`) and fails on high or critical vulnerabilities. The same scan runs on every PR that touches `package.json` or `pnpm-lock.yaml`.

To run locally:

```bash
pnpm audit                       # All severities
pnpm audit --audit-level=high    # CI-equivalent
```

See `SECURITY.md` for the vulnerability disclosure process.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow, Conventional Commits format, quality gate, and PR process.

The 8-step development workflow lives in [`.claude/playbooks/feature-development.md`](./.claude/playbooks/feature-development.md).

---

## Security

To report a vulnerability, see [SECURITY.md](./SECURITY.md). Please **do not** open a public issue for security reports.

---

## License

[MIT](./LICENSE)
