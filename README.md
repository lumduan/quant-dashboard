# quant-dashboard

React 19 SPA for the quant trading system. Displays **Portfolio Performance**, **Equity Curves**, and **Strategy Details**, fed by [`quant-api-gateway`](https://github.com/lumduan/quant-api-gateway) over REST.

> **Principle:** Gateway computes everything. Dashboard only receives JSON and renders it.

---

## Stack

- **React 19** + **Vite 6** + **TypeScript 5** (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`)
- **TanStack Query** for client cache + dedup
- **React Router** for routing
- **Recharts** for charts (lazy-loaded in Phase 5)
- **Tailwind CSS v4** (CSS-first via `@tailwindcss/vite`)
- **Zod** at every external boundary (Hard Rule #4)
- **Biome 1.9** for lint + format (replaces ESLint + Prettier)
- **Vitest 3** + `@testing-library/react` + `@vitest/coverage-v8` (≥80% gate)
- **pnpm 9** pinned via Corepack — no `npm` / `yarn` / `bun`

---

## Prerequisites

- Node.js 20+
- pnpm 9 via Corepack (bundled with modern Node):

  ```bash
  corepack enable
  corepack prepare pnpm@9.15.0 --activate
  ```

- Docker — optional, for the containerized build (full Compose stack lands in Phase 9).

---

## Local development

```bash
# 1. Clone and install
git clone https://github.com/lumduan/quant-dashboard.git
cd quant-dashboard
pnpm install

# 2. Configure environment
cp .env.example .env
# .env points VITE_API_BASE_URL at the Gateway; default is http://localhost:8000

# 3. Start the dev server (HMR on http://localhost:5173)
pnpm dev
```

`pnpm dev` proxies `/api/*` to whatever `VITE_API_BASE_URL` is set to in `.env` (default `http://localhost:8000`), so dashboard code can call `/api/v1/...` paths without worrying about CORS in development.

To see real data you also need [`quant-api-gateway`](https://github.com/lumduan/quant-api-gateway) running on `quant-network` — Phase 9 will wire both into a single `docker compose up`.

---

## Scripts

| Task | Command |
|---|---|
| Dev server (HMR) | `pnpm dev` |
| Production build | `pnpm build` |
| Preview production build | `pnpm preview` |
| Lint | `pnpm lint` |
| Lint + auto-fix | `pnpm lint:fix` |
| Format check | `pnpm format` |
| Format write | `pnpm format:fix` |
| Type check | `pnpm typecheck` |
| Tests (one shot) | `pnpm test` |
| Tests in watch mode | `pnpm test:watch` |
| Tests + coverage report | `pnpm test:coverage` |
| **Full quality gate (CI parity)** | `pnpm quality` |

The pre-commit hook runs Biome on staged files via husky + lint-staged.

---

## Docker (preview)

The full multi-service `docker compose up -d dashboard` workflow lands in **Phase 9** (see `docs/plans/ROADMAP.md`). The current image build still works standalone:

```bash
docker build -t quant-dashboard:dev .
docker run --rm -p 8080:80 quant-dashboard:dev
# open http://localhost:8080
```

The image is multi-stage: `node:20-alpine` builds, `nginx:1.27-alpine` serves the SPA with security headers, gzip, hashed-asset caching, and an SPA fallback. See `Dockerfile` + `nginx.conf`.

---

## Project structure

```
quant-dashboard/
├── .claude/                       # AI agent knowledge, skills, memory
├── docs/plans/
│   ├── ROADMAP.md                 # 9-phase plan (current: Phase 1)
│   └── phase_1_bootstrap.md       # this phase's plan + acceptance criteria
└── src/
    ├── main.tsx                   # React 19 entry
    ├── App.tsx                    # Phase 1 placeholder; replaced by AppLayout in Phase 3
    ├── config.ts                  # Zod-validated env (loadConfig / getConfig)
    ├── index.css                  # Tailwind v4 entry (@import "tailwindcss";)
    ├── api/                       # fetch wrappers + Zod schemas (Phase 2)
    ├── hooks/                     # TanStack Query + UI hooks (Phase 2+)
    ├── pages/                     # Route-level components (Phase 8)
    ├── types/                     # z.infer types (Phase 2)
    ├── utils/                     # formatters, palette (Phase 4+)
    └── components/
        ├── charts/                # Recharts wrappers, React.lazy in Phase 5
        ├── filters/               # Strategy selector, date range (Phase 7)
        ├── layout/                # AppLayout, Sidebar, Header (Phase 3)
        ├── strategy/              # Strategy adapter components (Phase 6)
        ├── ui/                    # Loading/Error/NotFound states (Phase 8)
        └── widgets/               # MetricCard, PortfolioSummary, etc. (Phase 4)
```

Empty folders currently hold a `.gitkeep` placeholder; placeholders are removed naturally as each phase populates its folder.

---

## AI agent workflows

`.claude/` is the entry point for any AI agent (Claude Code, Copilot, Cursor) working on this repo:

| File | Purpose |
|---|---|
| [`.claude/knowledge/project-skill.md`](./.claude/knowledge/project-skill.md) | Hard Rules + Soft Conventions |
| [`.claude/knowledge/coding-standards.md`](./.claude/knowledge/coding-standards.md) | Naming, typing, structure |
| [`.claude/knowledge/commands.md`](./.claude/knowledge/commands.md) | Every `pnpm` / docker / git command |
| [`.claude/knowledge/stack-decisions.md`](./.claude/knowledge/stack-decisions.md) | Why each tool was chosen |
| [`.claude/knowledge/architecture.md`](./.claude/knowledge/architecture.md) | Module boundaries, data flow |
| [`.claude/skills/vercel-react-best-practices/SKILL.md`](./.claude/skills/vercel-react-best-practices/SKILL.md) | Vercel's 70+ React performance rules |
| [`docs/plans/ROADMAP.md`](./docs/plans/ROADMAP.md) | 9-phase implementation plan |

Point your agent at `.claude/knowledge/project-skill.md` first. Everything else links from there.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow, Conventional Commits format, quality gate, and PR process.

---

## License

[MIT](./LICENSE)
