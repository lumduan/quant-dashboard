# Security Policy

Thank you for helping keep `react-template` and its users safe.

---

## Supported Versions

Only the current `main` branch is actively supported. The template is intended to be forked and customized — security maintenance of forks is the responsibility of fork owners.

| Version | Supported |
|---|---|
| `main` (latest) | Yes |
| Released tags | Best-effort for the most recent minor |
| Older tags | No |

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.** Public disclosure before a fix is available exposes every user of the template.

Instead, report privately via one of:

- **GitHub Private Vulnerability Reporting** (preferred): use the "Report a vulnerability" button under the repo's **Security** tab.
- **Email:** open an issue requesting a security contact, and a maintainer will reach out via a private channel.

In your report, include:

- A description of the vulnerability and its impact.
- Steps to reproduce (proof of concept, exploit code, or affected file/line).
- Affected versions (commit SHA or release tag).
- Any mitigation ideas you've considered.

---

## Response SLA

| Stage | Target |
|---|---|
| Acknowledgement of report | within 48 hours |
| Initial assessment (severity, scope) | within 5 business days |
| Patch released (high/critical) | within 30 days, sooner where feasible |
| Public disclosure (with credit, if desired) | after patch is released |

We will keep you informed at each stage. If we determine the report is not a vulnerability, we'll explain why.

---

## Security Tooling in This Repo

- **`pnpm audit`** — runs weekly in `.github/workflows/security.yml` and on every PR that touches `package.json` or `pnpm-lock.yaml`. Fails on high or critical CVEs.
- **Biome security rules** — `noDangerouslySetInnerHtml`, `noDangerouslySetInnerHtmlWithChildren` are errors; see `biome.json`.
- **Nginx security headers** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` are set in `nginx.conf` for the production image.
- **Docker** — multi-stage build excludes dev dependencies and source from the final image; Nginx runs as non-root for worker processes.
- **`.env`** — gitignored; secrets never enter the repo. `.env.example` is the contract.

---

## Coordinated Disclosure

Once a patch is available, we will:

1. Release the fix in a new tag (`vX.Y.Z`).
2. Publish a GitHub Security Advisory with CVE if applicable.
3. Credit the reporter (with their permission) in the advisory and the CHANGELOG.

Thank you for reporting responsibly.
