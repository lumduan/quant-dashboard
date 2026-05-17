# Skills

Agent skills for this repository. Each skill is a self-contained directory with a `SKILL.md` entry point that AI agents load to absorb domain knowledge.

## Available Skills

### Vercel React Best Practices (`vercel-react-best-practices/`)

Production performance guidelines from Vercel Engineering. 70+ rules across 8 categories:

1. **Eliminating Waterfalls** (CRITICAL) — async-parallel, async-defer-await, async-suspense-boundaries
2. **Bundle Size Optimization** (CRITICAL) — barrel imports, dynamic imports, conditional loading
3. **Server-Side Performance** (HIGH) — React.cache, LRU cache, RSC serialization
4. **Client-Side Data Fetching** (MEDIUM-HIGH) — SWR dedup, passive listeners, localStorage schemas
5. **Re-render Optimization** (MEDIUM) — memo, transitions, deferred value, lazy init
6. **Rendering Performance** (MEDIUM) — content-visibility, hydration, conditional rendering
7. **JavaScript Performance** (LOW-MEDIUM) — early exit, Set/Map lookups, batch DOM writes
8. **Advanced Patterns** (LOW) — useEffectEvent, useLatest, init-once

**To use:** point your AI agent at `.claude/skills/vercel-react-best-practices/SKILL.md`. The skill will load and the agent will apply the rules when generating, reviewing, or refactoring React code.

**Updating:** the canonical source is https://github.com/vercel-labs/agent-skills. To update:

```bash
npx skills add vercel-labs/agent-skills
# or manually:
git clone https://github.com/vercel-labs/agent-skills.git /tmp/agent-skills
cp -r /tmp/agent-skills/skills/react-best-practices/rules/* \
  .claude/skills/vercel-react-best-practices/rules/
```

## Adding a New Skill

Create a directory under `.claude/skills/<skill-name>/` with:

```
<skill-name>/
  SKILL.md              # YAML frontmatter + markdown body (the entry point)
  metadata.json         # Version, author, references
  README.md             # (optional) human-readable overview
  rules/                # (optional) individual rule files
    rule-name.md
```

The `SKILL.md` frontmatter must include `name`, `description`, and `license` fields.
