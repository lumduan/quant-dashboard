# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-17

### Added
- Initial project scaffold with Vite 6 + React 19 + TypeScript 5 (strict)
- Biome 1.9 for lint and format (replaces ESLint + Prettier)
- Vitest 3 with @testing-library/react and @vitest/coverage-v8 (>=80% enforced)
- Docker multi-stage build (node:20-alpine -> nginx:1.27-alpine, <30 MB)
- nginx.conf with SPA fallback, security headers, gzip, and cache TTLs
- GitHub Actions CI (lint + format + typecheck + test:coverage on Node 20/22)
- GitHub Actions Docker publish (ghcr.io on semver tag push)
- GitHub Actions security scan (weekly pnpm audit, fail on high/critical)
- husky + lint-staged pre-commit hook (Biome on staged .ts/.tsx)
- Complete .claude/ directory for AI agent workflows (knowledge, playbooks, prompts, memory)
- Vercel React Best Practices skill integration (`.claude/skills/vercel-react-best-practices/`)
- Zod 3.23 for boundary data validation
- Issue templates (bug report, feature request) and PR template
- Supporting docs: CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, CHANGELOG.md
- MIT license
