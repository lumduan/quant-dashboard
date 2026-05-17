# Recurring Bugs

Bugs that the maintainers (or AI agents) have hit more than once. Each entry: symptom you'll observe, the root cause, the fix, and how to keep it from recurring.

---

## Vite HMR does not pick up new `VITE_` env vars

**Symptom:** you add `VITE_NEW_FLAG=true` to `.env`, restart nothing, and `import.meta.env.VITE_NEW_FLAG` is `undefined` in the running dev server.

**Root cause:** Vite reads `.env` files only at server startup. HMR rebuilds modules; it does not re-read environment files.

**Fix:** restart the dev server (`Ctrl-C`, `pnpm dev`).

**Prevention:** when you edit `.env`, restart the dev server as a reflex — same way you'd restart a backend process after changing config. Whenever you add a new var, update `.env.example` in the same commit so other developers know to set it.

---

## Biome formatting fights with the editor's on-save formatter

**Symptom:** save a file in VS Code, see lines reformat differently from what `pnpm format:fix` would produce. CI fails on `pnpm format` after a green local commit.

**Root cause:** an older Prettier or editor default formatter is configured as the default for `.ts` / `.tsx`. The editor's format-on-save runs that formatter; Biome runs in CI. Their outputs disagree on things like quote style, line length, or trailing commas.

**Fix:** in VS Code, set Biome as the default formatter for the relevant languages:

```jsonc
// .vscode/settings.json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[json]": { "editor.defaultFormatter": "biomejs.biome" }
}
```

Install the **Biome** extension. Disable or uninstall the Prettier extension.

**Prevention:** commit a `.vscode/settings.json` (already gitignored in this repo by default — un-ignore it if you want to standardize across the team) and add a note in `README.md` under "Setup."

---

## Vitest `expect` is undefined / `describe` is not a function

**Symptom:** tests fail with `ReferenceError: expect is not defined` or `describe is not a function`.

**Root cause:** Vitest is not configured to provide globals, and the test file does not import them.

**Fix:** either (a) ensure `vite.config.ts` has `test.globals: true` (already set in this template) **and** the `tsconfig.json` types array includes `"vitest/globals"`, or (b) import them explicitly:

```ts
import { describe, expect, it } from 'vitest';
```

The template uses option (a) — globals enabled, types declared — but explicit imports always work and are unambiguous.

**Prevention:** when generating new test files, default to explicit imports. They never break, regardless of config drift.

---

## Docker `dist/` not found in Nginx stage

**Symptom:** `docker build` succeeds; `docker run` starts Nginx but every request returns 403 or "Welcome to nginx!"

**Root cause:** the `COPY --from=builder /app/dist /usr/share/nginx/html` path in `Dockerfile` doesn't match Vite's actual output directory. Common causes:

- `build.outDir` in `vite.config.ts` was changed to something other than `dist`.
- The `.dockerignore` excluded files the build needed (e.g., `index.html`).
- The build stage exited with a non-zero status but Docker still proceeded (rare — typically Docker stops on error).

**Fix:** verify the build stage actually produced files:

```bash
docker build --target builder -t rt-builder .
docker run --rm rt-builder ls -la /app/dist
```

If `dist/` is empty or missing, check `pnpm build` works locally. If the path is different, update the Dockerfile.

**Prevention:** keep `build.outDir` as the default `dist` unless you have a specific reason to change it. If you do change it, update the `Dockerfile` in the same commit.

---

## React 19 + `@testing-library/react` peer dependency warning on install

**Symptom:** `pnpm install` prints a warning that `@testing-library/react@<version>` does not support `react@19`.

**Root cause:** older versions of `@testing-library/react` (≤ 15) declare a peer dep on React ≤ 18.

**Fix:** ensure `@testing-library/react` is at v16 or later (this template pins `^16.0.0`). Run `pnpm update @testing-library/react` if you see this on an older lockfile.

**Prevention:** when upgrading React major versions, audit the testing-library packages first. They typically release a matching major within a few weeks of the React major.

---

## `tsc --noEmit` passes but `vite build` fails on imports

**Symptom:** `pnpm typecheck` is green; `pnpm build` fails with `Could not resolve "@/something"`.

**Root cause:** TypeScript respects `paths` from `tsconfig.json`; Vite respects `resolve.alias` in `vite.config.ts`. If only one is configured, type checking and build disagree.

**Fix:** keep them in sync. The template configures both:

```ts
// tsconfig.json
"paths": { "@/*": ["./src/*"] }

// vite.config.ts
resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } }
```

**Prevention:** when adding a new alias, change both files in the same commit. Run `pnpm build` (not just `pnpm typecheck`) before opening a PR.
