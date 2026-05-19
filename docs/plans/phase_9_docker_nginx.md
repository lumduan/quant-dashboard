# Phase 9 — Docker Integration & Nginx (quant-dashboard)

| Field | Value |
|---|---|
| Phase | 9 — Docker Integration & Nginx |
| Date | 2026-05-19 |
| Author | Claude (Opus 4.7), acting on lumduan's behalf |
| Branch | `feature/phase-9-docker-nginx` |
| Target | `main` (github.com/lumduan/quant-dashboard) |
| Linked roadmap | [`ROADMAP.md`](./ROADMAP.md) §Phase 9 (9.1 / 9.2 / 9.3) + §Overall Exit Criteria |

---

## Context

Phase 8 left the dashboard with a complete UI: 195/195 tests, main bundle 104.16 KB gzip, Recharts in lazy chunks, `FilterBar → PortfolioSummary → (EquityCurve | Drawdown) → AllocationBar → StrategyCardGrid → MultiStrategyChart` on the Dashboard page and `StrategyAdapterFactory` routing on the Strategy page. ([`phase_8_dashboard_strategy_pages.md`](./phase_8_dashboard_strategy_pages.md))

Phase 9 is **pure infrastructure** — three files change and no `src/` code is touched:

1. `nginx.conf` — add `/api/` proxy block + `/healthz` exact-match.
2. `Dockerfile` — point `HEALTHCHECK` at `/healthz`.
3. New `docker-compose.yml` at the project root — `dashboard` service on the external `quant-network`.

Reading the actual repo (not the ROADMAP-as-written) sharpens the picture:

- **`nginx.conf`** already ships SPA fallback (`try_files $uri $uri/ /index.html`), the five security headers (X-Frame-Options DENY, X-Content-Type-Options nosniff, X-XSS-Protection, Referrer-Policy, Permissions-Policy), gzip on for the canonical text/* + application/* set, `/assets/` immutable cache, `/index.html` no-cache, and `server_tokens off`. **Missing:** the `/api/` proxy block and the `/healthz` location.
- **`Dockerfile`** is final apart from one line: `HEALTHCHECK ... CMD wget -qO- http://localhost/ ...` needs to target `/healthz`.
- **No `docker-compose.yml` exists in `quant-dashboard/`** and **no umbrella compose exists** at `/Users/sarat/Code/quant-trading-system/`. The sibling repos each own a compose file:
  - `quant-api-gateway/docker-compose.yml` — service name `api-gateway`, `container_name: quant-api-gateway`, port 8000, healthcheck on `/health`. Joins network via `networks.default: { name: quant-network, external: true }`.
  - `quant-infra-db/docker-compose.yml` — defines Postgres + MongoDB. **Creates and owns `quant-network`** (the network's `external: true` declaration here is the canonical pattern; the network is actually pre-created out-of-band, typically `docker network create quant-network`).
- **Cross-compose DNS on `quant-network` resolves by container name, not compose service name.** That's why `proxy_pass http://quant-api-gateway:8000` (the container name) is correct and `proxy_pass http://api-gateway:8000` (the service name from a different compose file) would fail.
- **Cross-compose `depends_on` is a no-op.** Docker Compose only honors `depends_on` for services declared in the **same** compose file. The prompt's literal YAML (`depends_on: api-gateway: condition: service_healthy`) is forward-compatible with a future umbrella merge but doesn't fire when `docker compose up -d dashboard` runs from this repo standalone. The Nginx `/healthz` healthcheck still independently reports the dashboard as healthy.

Phase 9 is verified locally via `pnpm quality` (unchanged from Phase 8 — no `src/` edits) + `docker build` + a `/healthz` smoke test against the running container. Live `/api/` end-to-end stays deferred until `quant-api-gateway` Phase 6 ships.

---

## Scope

### In scope

1. **`nginx.conf`** — insert before the SPA `location /` fallback:
   - `location /api/ { proxy_pass http://quant-api-gateway:8000; ...4 headers + 30s read timeout }`
   - `location = /healthz { access_log off; return 200 'ok'; add_header Content-Type text/plain; }`
2. **`Dockerfile`** — replace `HEALTHCHECK` CMD URL from `http://localhost/` to `http://localhost/healthz`.
3. **New `docker-compose.yml` at `quant-dashboard/docker-compose.yml`** — verbatim YAML from the prompt with one inline comment noting that `api-gateway` must match the service name in `quant-api-gateway/docker-compose.yml`.
4. **`docs/plans/phase_9_docker_nginx.md`** — this plan + verbatim embedded agent prompt + Progress / Completion section appended after implementation.
5. **`docs/plans/ROADMAP.md`** — tick all §9.1 / §9.2 / §9.3 `[ ]` items as `[x]`, advance Current Status, update Next step, tick the Docker-related Overall Exit Criteria boxes (with a note that live Gateway verification stays deferred).

### Out of scope

- **Any `src/` changes** — Hard scope boundary (Phase 9 is infra only). Pre-existing build/quality failures unrelated to Phase 9 get logged in §Progress, not fixed.
- **New tests** — no new component, hook, or util to test. Existing 195/195 stay green.
- **Umbrella `docker-compose.yml`** — does not exist; per ROADMAP fallback, the new compose lives in this repo's root.
- **`start_period:` on Docker HEALTHCHECK** — nginx-alpine cold-start is sub-second; the existing 30s interval handles it cleanly.
- **TLS termination** — handled by an upstream reverse proxy or load balancer; out of scope at this layer.
- **`X-Forwarded-Proto` header** — irrelevant while the dashboard serves over HTTP; add when TLS terminator lands.
- **Live end-to-end against `quant-api-gateway`** — blocked until that project's Phase 6 ships. Smoke test ends at `/healthz` returning `200 ok`.
- **`.claude/knowledge/*` updates** — re-evaluated post-implementation; modified only if a genuinely new pattern emerges. Existing knowledge is unlikely to need a new entry for a single 6-line nginx block.

---

## Architecture decisions & constraints

| Decision | Why |
|---|---|
| **`proxy_pass http://quant-api-gateway:8000` uses container name, not service name** | Cross-compose DNS on `quant-network` resolves by container name (`container_name: quant-api-gateway`); compose service names only resolve inside the same compose file. The dashboard compose file does **not** include the gateway as a service. |
| **`/api/` block placed before SPA `location /`** | Nginx evaluates locations by best-match precedence, not source order, so order is technically irrelevant — but readability puts API routes above the catch-all fallback. |
| **`/healthz` uses `location = /healthz` (exact match)** | Exact-match (`=`) locations are the highest-precedence Nginx location form. Guarantees the healthcheck never hits the SPA fallback, asset caching, or proxy. |
| **`access_log off;` on `/healthz`** | Healthchecks every 30s would otherwise flood `access.log` with thousands of identical entries per day. The probe is enough; we don't need a paper trail. |
| **`return 200 'ok'` with explicit `Content-Type: text/plain`** | Simplest possible response; no upstream call, no file read. `add_header Content-Type text/plain;` because `return` doesn't set Content-Type automatically. |
| **HEALTHCHECK CMD uses `wget -qO- http://localhost/healthz \|\| exit 1`** | `wget` is BusyBox-built-in in `nginx:1.27-alpine` (no `curl` install needed). `-q` silences output; `-O-` writes body to stdout (discarded by the shell); non-2xx → `wget` exits non-zero → `\|\|` triggers `exit 1`. Same idiom as the existing Dockerfile. |
| **`proxy_read_timeout 30s`** | Gateway responses are cache-backed and well under a second in normal operation. 30s is a generous ceiling that still surfaces hung backends in the dashboard's `<ErrorState>` rather than letting the browser time out. |
| **The four forwarded headers (`Host`, `X-Real-IP`, `X-Forwarded-For`, no `X-Forwarded-Proto`)** | Standard reverse-proxy hygiene; the Gateway uses `X-Forwarded-For` for rate limiting / audit logs. `X-Forwarded-Proto` deferred until TLS terminator lands. |
| **New compose file at `quant-dashboard/docker-compose.yml`** | No umbrella compose exists at `/Users/sarat/Code/quant-trading-system/`; each sibling project (`quant-api-gateway`, `quant-infra-db`, `csm-set`) owns its own compose file. The ROADMAP explicitly permits this fallback. |
| **`networks: [quant-network]` long-form + `networks.quant-network.external: true`** | Matches the prompt's verbatim YAML. Explicit service-level attachment rather than the `default:` shortcut used by sibling repos — the dashboard only ever lives on `quant-network`. |
| **`depends_on: api-gateway: condition: service_healthy` retained verbatim** | Forward-compatible with a future umbrella compose file. **No-op when run standalone from this repo** (the `api-gateway` service is not defined in this compose). The Nginx `/healthz` healthcheck still ensures the dashboard reports `healthy` based on its own state. Documented in §Risks. |
| **Inline comment in `docker-compose.yml` noting cross-compose service-name match** | Prompt instruction: "use `api-gateway` as specified in the ROADMAP and add a comment noting it must match." |
| **Image base + multi-stage layout untouched** | `node:20-alpine` builder + `nginx:1.27-alpine` server is final. Builder layer caches `package.json` + `pnpm-lock.yaml` first; source layers re-build only when source changes. Final image is the server stage only — builder is discarded. |
| **No new dependencies (`pnpm` or otherwise)** | Hard Rule reminder from the prompt: "No new npm/pnpm dependencies for Phase 9 (pure infra changes)". |

---

## Deliverables

### Created

| Path | Purpose |
|---|---|
| `docs/plans/phase_9_docker_nginx.md` | This plan; verbatim agent prompt at the bottom; Progress / Completion section appended after implementation |
| `docker-compose.yml` (project root) | `dashboard` service: build context `.`, container_name `quant-dashboard`, `3000:80`, depends_on api-gateway healthy (cross-compose no-op), external `quant-network`, healthcheck on `/healthz` |

### Modified

| Path | Change |
|---|---|
| `nginx.conf` | Add `location /api/ { proxy_pass http://quant-api-gateway:8000; ... }` block (4 forwarded headers + `proxy_read_timeout 30s`); add `location = /healthz { access_log off; return 200 'ok'; add_header Content-Type text/plain; }`. Insert **before** the existing `location /` SPA fallback. Existing security headers / gzip / `/assets/` caching / `/index.html` no-cache / `server_tokens off` remain byte-identical. |
| `Dockerfile` | Swap one line: `HEALTHCHECK ... CMD wget -qO- http://localhost/ >/dev/null 2>&1 \|\| exit 1` → `HEALTHCHECK ... CMD wget -qO- http://localhost/healthz \|\| exit 1`. Preserves interval / timeout / retries. |
| `docs/plans/ROADMAP.md` | Tick all §9.1 / §9.2 / §9.3 `[ ]` items as `[x]`; advance "Current Status — Current phase" out of Phase 9; add Phase 9 completion entry under "Completed" with date + link; update "Next step" to "All phases complete; live Gateway verification deferred until quant-api-gateway Phase 6 ships"; tick the Docker / Nginx-relevant items under §Overall Exit Criteria (with the deferred-verification caveat noted inline). |

### Untouched

- `src/**` — Hard scope boundary.
- `package.json`, `pnpm-lock.yaml` — no new dependencies.
- `.dockerignore` (already excludes `node_modules`, `dist`, `coverage`, `.git`, `.env`, etc.) — build context is already minimal.
- `.gitignore`, `biome.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts` — unchanged.
- `.github/workflows/*` — CI doesn't change; the existing docker-publish workflow handles the new image transparently.
- `index.html`, `public/**`, `README.md` — no doc changes outside the plan + ROADMAP.
- `.claude/knowledge/**` — re-evaluated post-implementation; only updated if a new reusable pattern emerges (unlikely for this slim a change).

---

## Acceptance criteria (mirrored from ROADMAP.md §Phase 9 + Overall Exit Criteria)

- [ ] `nginx.conf` proxies `/api/` to `http://quant-api-gateway:8000` with `Host` / `X-Real-IP` / `X-Forwarded-For` headers + `proxy_read_timeout 30s`.
- [ ] `nginx.conf` exposes `/healthz` returning HTTP 200 body `ok`, `Content-Type: text/plain`, `access_log off`.
- [ ] Existing SPA fallback (`try_files $uri $uri/ /index.html`), security headers, gzip config, `/assets/` cache, `/index.html` no-cache, and `server_tokens off` remain intact.
- [ ] `Dockerfile` `HEALTHCHECK` CMD targets `/healthz`; interval/timeout/retries unchanged.
- [ ] `docker-compose.yml` defines a `dashboard` service: `build: context: ./quant-dashboard`, container_name `quant-dashboard`, port `3000:80`, depends_on `api-gateway: service_healthy`, network `quant-network` external, healthcheck `wget -qO- http://localhost/healthz \|\| exit 1` at 30s/5s/3.
- [ ] `pnpm typecheck` zero errors (no `src/` changes; expected pass).
- [ ] `pnpm lint` zero findings.
- [ ] `pnpm format` no drift.
- [ ] `pnpm test:coverage` — **195/195** tests passing; coverage thresholds preserved at Phase 8 levels.
- [ ] `pnpm build` succeeds; main bundle stays at **104.16 KB gzip** (unchanged from Phase 8 — no src delta).
- [ ] `docker build -t quant-dashboard .` succeeds; final image **< 50 MB**.
- [ ] `docker compose config` parses the new compose file cleanly; the `dashboard` service surfaces.
- [ ] Smoke: `docker run -d -p 3001:80 quant-dashboard && curl -sS http://localhost:3001/healthz` returns `ok`; `curl http://localhost:3001/` returns the SPA shell.
- [ ] **Deferred** — `docker compose up -d dashboard` → status `healthy` and live `/api/v1/overall-performance` round-trip. Blocked until `quant-api-gateway` Phase 6 ships and the gateway is running on `quant-network`. Documented inline in §Progress.
- [ ] `docs/plans/ROADMAP.md` Phase 9 boxes ticked; Current Status updated; Next step reflects all phases complete (with live-Gateway caveat).
- [ ] `docs/plans/phase_9_docker_nginx.md` includes Progress / Completion section after implementation.
- [ ] Branch `feature/phase-9-docker-nginx` cut off `main`; commit follows Conventional Commits; PR opened to `main`.

---

## Implementation order

1. `git checkout -b feature/phase-9-docker-nginx`
2. Write this plan file at `docs/plans/phase_9_docker_nginx.md`. Commit `docs(phase-9): add implementation plan for docker integration & nginx`.
3. **`nginx.conf`** — insert the two new `location` blocks before the SPA fallback. Do not reformat or reorder surrounding directives.
4. **`Dockerfile`** — swap the single HEALTHCHECK CMD line.
5. **`docker-compose.yml`** (new) — paste the prompt's literal YAML at the project root; add a single inline comment above `depends_on` explaining the `api-gateway` service-name pinning.
6. `pnpm quality` → expected green (zero `src/` edits = no avenue for breakage).
7. `pnpm build` → confirm `dist/` produced; main 104.16 KB gzip (unchanged).
8. `docker build -t quant-dashboard .` → image builds. Record `docker images quant-dashboard --format '{{.Size}}'` for Progress notes.
9. `docker compose config` → YAML valid.
10. Smoke test: `docker run -d --rm -p 3001:80 --name qd-test quant-dashboard && sleep 2 && curl -sS http://localhost:3001/healthz && curl -sSI http://localhost:3001/ && docker stop qd-test`.
11. Append Progress / Completion section to this plan with image size, smoke output, deferred items, and any deviations.
12. **`docs/plans/ROADMAP.md`** — tick the four `[ ]` items in §9.1 + §9.2 + §9.3, advance "Current Status" / "Next step", tick the Docker-related Overall Exit Criteria boxes (annotating any deferred ones).
13. Re-evaluate `.claude/knowledge/*` — add a small note **only** if a new, reusable pattern emerges (likely skip — the change is too small).
14. Commit implementation + docs:
    ```
    feat: Phase 9 — Docker Integration & Nginx

    - nginx.conf: add /api/ proxy_pass to quant-api-gateway:8000
    - nginx.conf: add /healthz location returning 200 ok
    - Dockerfile: update HEALTHCHECK to use /healthz endpoint
    - docker-compose.yml: add dashboard service on quant-network
    - docs/plans/phase_9_docker_nginx.md: plan + completion notes
    - docs/plans/ROADMAP.md: mark Phase 9 complete, update status
    ```
15. `git push -u origin feature/phase-9-docker-nginx`.
16. `gh pr create --base main --title "feat: Phase 9 — Docker Integration & Nginx" --body …` (body from the prompt's Step 7).

---

## Critical files (reuse, don't recreate)

- **`nginx.conf`** — already contains SPA fallback, security headers, gzip, asset caching; **insert** two location blocks, don't rewrite or reformat. Reference: lines 1–53 of the existing file.
- **`Dockerfile`** — multi-stage `node:20-alpine` → `nginx:1.27-alpine` is final. Only the single `HEALTHCHECK ... CMD ...` line at the end changes. Reference: `Dockerfile:31-32`.
- **`quant-api-gateway/docker-compose.yml`** (sibling repo, read-only reference) — confirms `service: api-gateway`, `container_name: quant-api-gateway`, port 8000, network attachment via default. Source of the proxy_pass target hostname.
- **`quant-infra-db/docker-compose.yml`** (sibling repo, read-only reference) — owns `quant-network` declaration; the dashboard joins it as `external: true`.
- **`.dockerignore`** — already minimal; no edits needed.
- [`phase_8_dashboard_strategy_pages.md`](./phase_8_dashboard_strategy_pages.md) — format template + baseline numbers (195 tests, 104.16 KB gzip).
- [`phase_2_zod_schemas_fetch_client.md`](./phase_2_zod_schemas_fetch_client.md) — explicit format reference per the prompt (Phase / Context / Scope / Architecture / Deliverables / Acceptance / Implementation / Critical / Tests / Risks / Verification / Embedded prompt / Progress).

---

## Testing strategy

| Layer | What's tested | How |
|---|---|---|
| Static (Nginx syntax) | `nginx.conf` parses cleanly | `docker run --rm -v "$(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:1.27-alpine nginx -t` (optional pre-flight; the `docker build` step exercises the same parser indirectly). |
| Static (Compose) | `docker-compose.yml` valid + dashboard service surfaces | `docker compose config` prints the parsed config; non-zero exit = invalid YAML. |
| Build | Image builds, size budget met | `docker build -t quant-dashboard .` exits 0; `docker images quant-dashboard --format '{{.Size}}'` < 50 MB. |
| Runtime (no Gateway) | `/healthz` returns 200 `ok` | `docker run -d --rm -p 3001:80 --name qd-test quant-dashboard && sleep 2 && curl -sS http://localhost:3001/healthz`. |
| Runtime (no Gateway) | SPA fallback intact | `curl -sSI http://localhost:3001/` returns 200 + `text/html`; deep route `curl -sS http://localhost:3001/strategy/csm-set-01` returns the SPA shell (because of `try_files ... /index.html`). |
| Runtime (no Gateway) | `/api/` proxy hits Gateway → 502 (expected) | `curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3001/api/v1/overall-performance` → 502 (correct — Gateway not on the network). The 502 confirms the proxy is wired; only the upstream is missing. |
| Existing test suite | No regressions from infra changes | `pnpm quality` → 195/195 (unchanged). |
| Deferred | Live `/api/v1/*` end-to-end | Requires `quant-api-gateway` Phase 6 + `quant-network` joined by both containers. Documented as deferred in §Progress. |

**No new Vitest cases.** Phase 9 doesn't touch any `src/` file.

---

## Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Cross-compose `depends_on: api-gateway: service_healthy` is a silent no-op** | Certain (architectural) | Medium | Documented in §Architecture decisions + §Context. When `docker compose up -d dashboard` runs from `quant-dashboard/`, the `api-gateway` service isn't in this file → `depends_on` doesn't fire. Dashboard still starts; Nginx still reports `healthy` on `/healthz`. `/api/` returns 502 until the gateway is up — this is correct, surfaced as `<ErrorState>` in the UI. Resolution path: a future umbrella compose or `docker compose -f` multi-file invocation. |
| **`quant-network` not pre-created → compose-up fails with `network quant-network declared as external, but could not be found`** | Medium | Medium | Network is owned by `quant-infra-db`. Document the prerequisite in §Progress: bring up `quant-infra-db` first, or run `docker network create quant-network` standalone for local testing. |
| **`quant-api-gateway:8000` DNS resolution fails until the gateway is running on `quant-network`** | High during partial bring-up | Low | Independent of Nginx healthcheck. `/api/` proxies return 502, surfaced as `<ErrorState onRetry={...} />`. Expected behavior; no mitigation required at this layer. |
| **Image size creeps over 50 MB** | Low | Medium | Base `nginx:1.27-alpine` ≈ 20 MB; `dist/` < 400 KB; no extra packages installed. Headroom is large. Verified post-build (`docker images ... --format '{{.Size}}'`). If it does drift, investigate via `docker history quant-dashboard --human`. |
| **HEALTHCHECK fails because `wget` is missing inside the container** | Low | High (image-level break) | `nginx:1.27-alpine` ships BusyBox which provides `wget`. The current Dockerfile already uses `wget -qO-` on `/`; only the URL changes. No new packages needed. |
| **`proxy_read_timeout 30s` cuts off a slow Gateway response** | Low | Low | Gateway responses are cache-backed sub-second. 30s is a generous ceiling that still surfaces hung backends in the UI's `<ErrorState>` rather than letting the browser timeout. Per-location override is easy if long-poll endpoints land later. |
| **Missing `X-Forwarded-Proto` header breaks future TLS-aware backend logic** | Low | Low | Dashboard serves over HTTP today; no TLS layer yet. Add `proxy_set_header X-Forwarded-Proto $scheme;` in a follow-up when an HTTPS terminator (Traefik / Caddy / nginx ssl_module) lands. |
| **`pnpm quality` regresses due to an unrelated pre-existing issue** | Low | Medium | Phase 9 makes zero `src/` edits — no avenue for breakage from this work. If quality fails, the user's prompt is explicit: "note it in the plan file but do not fix unrelated issues — scope is Phase 9 only." |
| **Existing CI `docker-publish` workflow breaks on new HEALTHCHECK / nginx.conf** | Low | Low | Workflow builds the image; HEALTHCHECK is image metadata, nginx.conf is content. The local `docker build` proves the parser accepts both. |
| **Browser hits the `/api/` proxy with a request body > Nginx default body limit** | Very Low | Low | Gateway is read-only (GET only — confirmed by `src/api/queries.ts`). No POST/PUT body to forward. Default `client_max_body_size 1m` is more than enough for query strings. |
| **Local smoke `docker run -p 3001:80` collides with a process on host 3001** | Very low | Negligible | Trivial to swap the host port; record the actual port used in §Progress. |
| **`location =/healthz` exact-match accidentally caught by an `add_header` from a parent block** | Low | Low | Nginx `add_header` directives don't inherit into a `location` that defines its own `add_header`. `/healthz` doesn't set any headers other than `Content-Type` — security headers from `server {}` block carry through, which is fine for a health endpoint. |

---

## Verification plan (copy-paste sequence)

```bash
git checkout feature/phase-9-docker-nginx
pnpm install                                # picks up no new deps
pnpm quality                                 # 195/195 tests; ≥80% coverage; lint/format clean
pnpm build                                   # dist/ produced; main 104.16 KB gzip (unchanged from Phase 8)

# Build + size budget
docker build -t quant-dashboard .            # exits 0
docker images quant-dashboard --format '{{.Size}}'   # < 50 MB

# Static compose validation
docker compose config                        # YAML valid; dashboard service surfaces

# Standalone runtime smoke (no Gateway / network needed):
docker run -d --rm -p 3001:80 --name qd-test quant-dashboard
sleep 2
curl -sS  http://localhost:3001/healthz                                 # → "ok"
curl -sSI http://localhost:3001/                                        # → HTTP/1.1 200; Content-Type: text/html
curl -sS  -o /dev/null -w 'GET /api/...: %{http_code}\n' \
         http://localhost:3001/api/v1/overall-performance               # → 502 (correct: no upstream Gateway)
docker stop qd-test

# Deferred — requires quant-api-gateway Phase 6 + quant-network running:
# docker network create quant-network 2>/dev/null || true
# (cd ../quant-infra-db   && docker compose up -d)
# (cd ../quant-api-gateway && docker compose up -d)
# docker compose up -d dashboard
# curl -sS http://localhost:3000/api/v1/overall-performance | jq .
# docker compose ps           # quant-dashboard should be 'healthy'
```

---

## Agent prompt (verbatim, embedded for reproducibility)

> You are implementing Phase 9 — Docker Integration & Nginx for the quant-dashboard project. Follow these steps precisely and in order.
>
> ---
>
> ## Step 1 — Read Knowledge Base
>
> Before anything else:
> 1. Read `.claude/knowledge/project-skill.md` — internalize all Hard Rules and Soft Conventions.
> 2. Read `.claude/skills/vercel-react-best-practices/SKILL.md` — note any Docker/build relevant rules.
> 3. Read `docs/plans/ROADMAP.md` in full, focusing on Phase 9 — Docker Integration & Nginx (sections 9.1, 9.2, 9.3) and the Overall Exit Criteria.
> 4. Read `docs/plans/phase_8_dashboard_strategy_pages.md` to understand the last completed state (195 tests, 104.16 KB gzip).
>
> ---
>
> ## Step 2 — Create Git Branch
>
> ```bash
> git checkout -b feature/phase-9-docker-nginx
> ```
>
> ---
>
> ## Step 3 — Write the Plan First (No Code Yet)
>
> Create `docs/plans/phase_9_docker_nginx.md` using the same format as phase_2_zod_schemas_fetch_client.md as a reference template.
>
> The plan must include:
> - Phase title, date started, status
> - Scope and objectives
> - Deliverables list (nginx.conf, Dockerfile, docker-compose.yml, docs updates)
> - Acceptance criteria (mirrored from ROADMAP.md Phase 9)
> - Implementation steps with file-by-file detail
> - Risk notes (e.g., quant-api-gateway must be healthy for depends_on; quant-network must be pre-created by quant-infra-db)
> - The full AI agent prompt (this prompt text) embedded in the plan
>
> Save the file before writing any implementation code.
>
> ---
>
> ## Step 4 — Implement Phase 9
>
> Only after the plan file is saved, make the following changes:
>
> ### 4.1 — nginx.conf: Add /api/ proxy and /healthz
>
> Add inside the `server {}` block, before the SPA fallback location:
>
> ```nginx
> location /api/ {
>     proxy_pass         http://quant-api-gateway:8000;
>     proxy_set_header   Host              $host;
>     proxy_set_header   X-Real-IP         $remote_addr;
>     proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
>     proxy_read_timeout 30s;
> }
>
> location = /healthz {
>     access_log off;
>     return 200 'ok';
>     add_header Content-Type text/plain;
> }
> ```
>
> Verify the existing SPA fallback (`try_files $uri $uri/ /index.html`), security headers, gzip, and caching config remain intact.
>
> ### 4.2 — Dockerfile: Fix HEALTHCHECK
>
> Replace the existing HEALTHCHECK line with:
>
> ```dockerfile
> HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
>   CMD wget -qO- http://localhost/healthz || exit 1
> ```
>
> ### 4.3 — docker-compose.yml: Add Dashboard Service
>
> Locate or create the appropriate `docker-compose.yml` (check if one exists at the repo root or in the project root). Add the dashboard service:
>
> ```yaml
> services:
>   dashboard:
>     build:
>       context: ./quant-dashboard
>     container_name: quant-dashboard
>     restart: always
>     ports:
>       - "3000:80"
>     depends_on:
>       api-gateway:
>         condition: service_healthy
>     networks:
>       - quant-network
>     healthcheck:
>       test: ["CMD-SHELL", "wget -qO- http://localhost/healthz || exit 1"]
>       interval: 30s
>       timeout: 5s
>       retries: 3
>
> networks:
>   quant-network:
>     external: true
> ```
>
> Note: The `api-gateway` service name must match whatever name the quant-api-gateway service uses in the umbrella Compose file. If unsure, use `api-gateway` as specified in the ROADMAP and add a comment noting it must match.
>
> ---
>
> ## Step 5 — Verify Build Quality
>
> Run these commands and ensure all pass:
>
> ```bash
> pnpm quality          # lint + format + typecheck + test:coverage ≥80%
> pnpm build            # must succeed; check dist/ output sizes
> docker build -t quant-dashboard .   # final image must be < 50 MB
> ```
>
> If `pnpm quality` or `pnpm build` fails due to any pre-existing issue unrelated to Phase 9, note it in the plan file but do not fix unrelated issues — scope is Phase 9 only.
>
> ---
>
> ## Step 6 — Update Documentation
>
> ### 6.1 — Update docs/plans/phase_9_docker_nginx.md
>
> Add a "Progress & Completion" section with:
> - Date completed (2026-05-19 or current date)
> - Actual test count (should remain 195 — no new tests added in Phase 9)
> - Final build size
> - Docker image size
> - Any issues encountered or deviations from the plan
> - Mark all acceptance criteria as ✅ or note any that remain pending (e.g., live Gateway verification)
>
> ### 6.2 — Update ROADMAP.md
>
> - Mark all Phase 9 checkboxes as `[x]`:
>   - `[ ]` Add `/api/` proxy_pass → `[x]`
>   - `[ ]` Add `/healthz` route → `[x]`
>   - `[ ]` Point HEALTHCHECK at `/healthz` → `[x]`
>   - `[ ]` Add `dashboard` service to docker-compose.yml → `[x]`
>   - `[ ]` Verify `docker compose up -d dashboard` → `[x]` (note: live Gateway verification deferred)
> - Update the **Current Status** section:
>   - Change "Current phase: Phase 9" to reflect completion
>   - Add Phase 9 completion entry with date and link to `phase_9_docker_nginx.md`
>   - Update Overall Exit Criteria checkboxes for Docker/Nginx items
> - Update the "Next step" entry to indicate all phases complete
>
> ### 6.3 — Update .claude/* if applicable
>
> If any reusable patterns are identified (e.g., Nginx proxy_pass pattern for Docker service mesh, HEALTHCHECK wget pattern), add them to the appropriate knowledge file. If nothing new, skip this step.
>
> ---
>
> ## Step 7 — Commit and Open PR
>
> Stage all changes and commit:
>
> ```bash
> git add -A
> git commit -m "feat: Phase 9 — Docker Integration & Nginx
>
> - nginx.conf: add /api/ proxy_pass to quant-api-gateway:8000
> - nginx.conf: add /healthz location returning 200 ok
> - Dockerfile: update HEALTHCHECK to use /healthz endpoint
> - docker-compose.yml: add dashboard service on quant-network
> - docs/plans/phase_9_docker_nginx.md: plan + completion notes
> - docs/plans/ROADMAP.md: mark Phase 9 complete, update status"
> ```
>
> Push and open a PR to main:
>
> ```bash
> git push -u origin feature/phase-9-docker-nginx
> gh pr create \
>   --title "feat: Phase 9 — Docker Integration & Nginx" \
>   --body "Implements Phase 9 per docs/plans/ROADMAP.md.
>
> ## Changes
> - \`nginx.conf\`: /api/ proxy_pass to quant-api-gateway:8000 + /healthz endpoint
> - \`Dockerfile\`: HEALTHCHECK now targets /healthz
> - \`docker-compose.yml\`: dashboard service on quant-network (depends_on api-gateway healthy)
> - \`docs/plans/phase_9_docker_nginx.md\`: plan and completion notes
> - \`docs/plans/ROADMAP.md\`: Phase 9 marked complete
>
> ## Verification
> - \`pnpm quality\` passes
> - \`pnpm build\` succeeds
> - \`docker build -t quant-dashboard .\` succeeds, image < 50 MB
> - Live end-to-end against quant-api-gateway deferred until Phase 6 of that service ships
>
> Closes Phase 9." \
>   --base main
> ```
>
> ---
>
> ## Files to Modify
> - nginx.conf
> - Dockerfile
> - `docker-compose.yml` (root or project root — locate first)
> - `docs/plans/phase_9_docker_nginx.md` (NEW)
> - ROADMAP.md
> - `.claude/knowledge/*.md` (only if new reusable patterns found)
>
> ## Hard Rules Reminder (from project-skill.md)
> - No new npm/pnpm dependencies for Phase 9 (pure infra changes)
> - No `any` in TypeScript — not applicable here (infra only)
> - No `console.log` in committed code — not applicable here
> - Scope is strictly Phase 9 — do not touch src/ files unless a pre-existing build error blocks the docker build
>
> ## Acceptance Criteria (from ROADMAP.md)
> - Nginx proxies /api/ to quant-api-gateway:8000 ✓
> - /healthz returns 200 ✓
> - SPA routing still works ✓
> - docker build succeeds, image < 50 MB ✓
> - docker compose up -d dashboard → status healthy (live verification deferred — note in docs)

---

## Progress / Completion

### Completion date

2026-05-19.

### Quality-gate output

```
pnpm quality        → 195/195 tests passing across 29 files
                      Coverage (project-wide):
                        All files                            98.93 stmts | 95.87 branch | 98.63 funcs | 98.93 lines
                        (unchanged from Phase 8 — no src/ edits)
pnpm build          → 778 modules transformed
                      dist/index.html                                 0.68 KB (gzip 0.42 KB)
                      dist/assets/index-*.css                        17.94 KB (gzip 4.29 KB)
                      dist/assets/EquityCurveChart-*.js               1.29 KB (gzip 0.75 KB)
                      dist/assets/MultiStrategyChart-*.js             9.17 KB (gzip 3.28 KB)
                      dist/assets/DrawdownChart-*.js                 13.97 KB (gzip 5.14 KB)
                      dist/assets/LineChart-*.js                     25.36 KB (gzip 7.73 KB)
                      dist/assets/CartesianChart-*.js               336.79 KB (gzip 101.50 KB)
                      dist/assets/index-*.js                        347.45 KB (gzip 104.16 KB)
                      (identical to Phase 8 baseline)
docker build        → success; tag quant-dashboard:latest
docker images       → 81.6 MB (multi-arch manifest sum, misleading)
docker image inspect → 21.86 MB (real single-arch size; arm64/linux)
docker compose config → parses cleanly; dashboard service surfaces
```

### Standalone runtime smoke

```
docker run -d --rm -p 3001:80 --name qd-smoke quant-dashboard
curl /healthz                       → "ok"
HEAD /                              → HTTP/1.1 200, Content-Type: text/html
GET /strategy/csm-set-01            → 200 (SPA fallback intact)
GET /api/v1/overall-performance     → 502 (correct — no upstream Gateway)
HEALTHCHECK status after 32s        → "healthy", FailingStreak: 0, two consecutive "ok" probes
```

### Acceptance criteria check

- ✅ `nginx.conf` proxies `/api/` to `http://quant-api-gateway:8000` with `Host` / `X-Real-IP` / `X-Forwarded-For` headers + `proxy_read_timeout 30s` (using the resolver + variable pattern — see Deviation #2).
- ✅ `nginx.conf` exposes `/healthz` returning HTTP 200 body `ok`, `Content-Type: text/plain`, `access_log off`.
- ✅ Existing SPA fallback, security headers, gzip, `/assets/` cache, `/index.html` no-cache, `server_tokens off` retained.
- ✅ `Dockerfile` `HEALTHCHECK` CMD targets `/healthz`; interval / timeout / retries preserved.
- ✅ `docker-compose.yml` exists at project root with the `dashboard` service (commented-out `depends_on` — see Deviation #3).
- ✅ `pnpm typecheck` zero errors.
- ✅ `pnpm lint` zero findings.
- ✅ `pnpm format` no drift.
- ✅ `pnpm test:coverage` — 195/195 tests; coverage unchanged from Phase 8.
- ✅ `pnpm build` succeeds; main bundle 104.16 KB gzip (identical to Phase 8).
- ✅ `docker build -t quant-dashboard .` succeeds; **real image 21.86 MB** (well under 50 MB).
- ✅ `docker compose config` parses cleanly after the cross-compose `depends_on` was commented out.
- ✅ Standalone smoke: `/healthz` returns `ok`; SPA shell on `/`; SPA fallback on deep route; `/api/` returns 502 (expected — no upstream); container HEALTHCHECK reports `healthy`.
- ⏳ **Deferred** — live `docker compose up -d dashboard` against a running `quant-api-gateway`: blocked until `quant-api-gateway` Phase 6 ships. The path is documented in §Verification plan.
- ✅ ROADMAP.md Phase 9 boxes ticked; Current Status / Next step updated; Overall Exit Criteria ticked for Docker / Nginx items (with deferred-verification caveats).

### Deviations from the plan

1. **`docker-compose.yml` `build.context: .` instead of `./quant-dashboard`.** The prompt's literal YAML assumes an umbrella compose file at `/Users/sarat/Code/quant-trading-system/`. No such file exists; sibling projects each own their compose file (verified). Per the prompt's explicit fallback ("Locate or create the appropriate docker-compose.yml [at] the project root"), the new file lives at `quant-dashboard/docker-compose.yml` — and the build context relative to that location is `.`, not `./quant-dashboard`. A header comment in the file documents how to flip this when merging into a future umbrella compose.

2. **`nginx.conf` `/api/` block uses `resolver 127.0.0.11` + variable `proxy_pass`, not a literal hostname.** The first build started but the container crashed with `host not found in upstream "quant-api-gateway" in /etc/nginx/conf.d/default.conf:49`. Nginx resolves literal hostnames in `proxy_pass` at config-parse time (startup) — when the gateway isn't already on `quant-network`, the dashboard refuses to start. The production-correct fix is to defer resolution to request time via Docker's embedded DNS (`127.0.0.11`) + a `set $upstream_gateway http://quant-api-gateway:8000;` + `proxy_pass $upstream_gateway;`. This:
   - Lets the dashboard come up before / during gateway rollouts (essential for rolling deploys).
   - Preserves the literal upstream URL / hostname / port as a string value.
   - Makes the §Risks entry "DNS resolution fails — Independent of Nginx healthcheck" actually true (it wasn't before this fix).
   - Adds 2 lines to nginx.conf, all inside Phase 9 scope.

3. **`depends_on: api-gateway: condition: service_healthy` commented out, not removed.** First `docker compose config` rejected the file: `service "dashboard" depends on undefined service "api-gateway": invalid compose project`. Per the prompt's "use `api-gateway` as specified and add a comment noting it must match" — and per user confirmation via AskUserQuestion mid-implementation — the depends_on block is commented out with explicit instructions for re-enabling it when the dashboard service is merged into an umbrella compose file alongside `api-gateway`. The smoke test confirms cross-compose `depends_on` is a no-op anyway — Nginx `/healthz` is the dashboard's own healthcheck.

4. **No new `.claude/knowledge/*` entries.** The `resolver` + variable `proxy_pass` pattern is genuinely reusable (any service-mesh Nginx fronting a containerized backend on a shared Docker network needs it), but `.claude/knowledge/` is React/TypeScript-focused; adding a Docker-only pattern would create a new content category. Logged here in §Progress instead; can be promoted to a dedicated `infra-patterns.md` later if other services need to repeat the pattern.

### Patterns established or reinforced (Phase 9)

- **Nginx `resolver` + `proxy_pass $variable` for service-mesh upstreams.** Always required when the upstream is a container name on a user-defined Docker network. Without it, the proxy container fails to start whenever the upstream isn't already up — fatal for rolling deploys and standalone smoke tests.
- **Multi-arch image sizes are misleading in `docker images`.** On Apple Silicon with default buildkit, `docker images <name>` reports the **sum** of all platform variants + attestation manifests (in our case ~81.6 MB). The actually-deployed single-arch size is given by `docker image inspect <name> --format '{{.Size}}'` (here: 21.86 MB). Use the latter for size-budget verification.
- **Cross-compose `depends_on` is invalid YAML in standalone files.** Compose validates references at parse time, even though `depends_on` semantics would be a no-op anyway. Either keep the reference inside an umbrella file or comment it out.
- **`location = /healthz` is the correct exact-match form** for Docker HEALTHCHECK targets — it has the highest Nginx location precedence and never bleeds into SPA fallback or asset caching.
- **`access_log off;` on `/healthz`** prevents probe-flood pollution in production logs (one probe / 30s × N days = thousands of identical entries otherwise).

### Time spent

~30 minutes end-to-end (plan validation, three rounds of compose / Nginx fixes for the standalone-vs-umbrella mismatch, smoke test, docs).
