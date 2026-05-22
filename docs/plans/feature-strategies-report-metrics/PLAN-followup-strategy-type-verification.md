# Follow-up — quant-dashboard — Strategy type end-to-end verification

| Field | Value |
|---|---|
| Track | Follow-up to `feature-strategies-report-metrics` Phase 4 |
| Date | 2026-05-21 |
| Author | Claude (Opus 4.7), acting on lumduan's behalf |
| Branch | none (verification-only; no code changes expected) |
| Target | n/a |
| Linked roadmap | `../../../plans/feature-strategies-report-metrics/ROADMAP.md` |
| Companion plans | `quant-api-gateway/docs/plans/feature-strategies-report-metrics/PLAN-followup-strategy-type-field.md`, `strategies/csm-set/docs/plans/feature-strategies-report-metrics/PLAN-followup-http-ingestion-migration.md` |
| Plan file location (in repo) | `docs/plans/feature-strategies-report-metrics/PLAN-followup-strategy-type-verification.md` |

---

## Context

During Phase 4 verification on 2026-05-21 the dashboard rendered the
`CSM SET Strategy` page with the warning:

> Strategy type "(unknown)" has no adapter — falling back to generic
> metrics.

Behaviour is correct per the existing fallback contract in
`src/components/strategy/StrategyAdapterFactory.tsx:20`:

```ts
const Adapter = ADAPTER_MAP[strategy.type ?? ''] ?? DefaultAdapter;
```

The dashboard's `StrategyInfo.type` is documented as **optional** in
`CLAUDE.md` ("Gateway does not always populate it"). The current Zod
schema (`src/api/schemas.ts`) reflects that — `type` is optional and the
factory degrades gracefully.

The fix is **server-side** (gateway exposes `type` on the
`/api/v1/strategies` response). This plan covers the dashboard-side
verification work once the gateway change ships. **No dashboard code
change is expected** unless the verification surfaces a regression.

---

## Scope

### In scope

1. **Manual browser verification** that
   - The "(unknown)" warning no longer appears for `csm-set`.
   - `CSMSetAdapter` renders (not `DefaultAdapter`).
   - The page remains functional when the user navigates between
     `Metrics`, `Report`, and `List of trades` tabs.
2. **Cache-busting**: confirm the dashboard's TanStack Query cache picks
   up the new field within one `staleTime` window (4.5 min for
   `useOverallPerformance`) — or document the operator workflow for a
   force-refresh.
3. **Zod schema audit** — confirm `src/api/schemas.ts::StrategyInfo`
   still validates the **new, populated** `type` field. If we tighten
   the schema (make `type` required) that is a separate breaking change
   and **out of scope here**.
4. **Negative-path check** — load the dashboard with a hypothetical
   second strategy whose `type` is **not** in `ADAPTER_MAP`; confirm the
   warning still fires and `DefaultAdapter` renders. (Use a temporary
   strategies.json with two entries on a side-deployment.)
5. **Screenshot capture** for the umbrella roadmap's "before / after"
   record at `plans/feature-strategies-report-metrics/screenshots/` (if
   that directory exists; otherwise attach to the PR description of the
   gateway change).

### Out of scope

- Any dashboard code change. The dashboard already handles the field
  correctly; if a code change is needed (e.g. Zod tightening) it lives
  in its own subsequent plan.
- Adding new adapters / registering new strategy types. The current
  registry has only `csm-set`.
- Test additions for the factory beyond what already exists in
  `src/components/strategy/StrategyAdapterFactory.test.tsx`.

---

## Deliverables

### Created

- `docs/plans/feature-strategies-report-metrics/PLAN-followup-strategy-type-verification.md`
  (this plan).

### Modified

- None expected.

### Untouched

- All of `src/`. If a code change becomes necessary, it must be
  proposed in a new plan, not slipped into verification.

---

## Implementation Order

1. **Wait** until the gateway plan
   (`quant-api-gateway/.../PLAN-followup-strategy-type-field.md`) lands
   on `main` and the local `quant-api-gateway` container is recreated.
2. **Confirm the wire format** before opening the browser:
   ```bash
   curl -s http://localhost:8080/api/v1/strategies | jq '.[0].type'
   # → "EQUITY_MOMENTUM"
   curl -s http://localhost:3000/api/v1/strategies | jq '.[0].type'
   # → "EQUITY_MOMENTUM" (through the dashboard's dev/prod proxy)
   ```
3. **Hard-refresh the browser** (Cmd/Ctrl + Shift + R) to bypass the
   service-worker / Vite cache. If the page already shows
   `CSMSetAdapter`, the change has taken effect and the TanStack staleTime
   has passed; otherwise wait up to 4.5 min or invalidate manually via
   the React-Query devtools.
4. **Walk the three tabs**:
   - **Metrics** — must show CSMSetAdapter's metric grid (not the
     generic DefaultAdapter strip).
   - **Report** — will still 404 until the csm-set companion plan
     ships. Confirm the **error state** is reachable and Retry works.
   - **List of trades** — same as Report; verify error state.
5. **Capture screenshots** of all three tabs (before + after the
   gateway fix) for the PR.
6. **Zod audit** — open `src/api/schemas.ts`, confirm
   `StrategyInfo.type: z.string().min(1).optional()` (or equivalent)
   still passes through the populated value; no code change.
7. **Done** — append the screenshots + a short verification note to
   the gateway PR (since the dashboard PR is empty).

---

## Critical Files (reference only — do not modify)

- `src/components/strategy/StrategyAdapterFactory.tsx` lines 14–20 —
  registry-based dispatch; the `EQUITY_MOMENTUM` key is the contract.
- `src/api/schemas.ts::StrategyInfo` — Zod schema; `type` is optional.
- `src/api/queries.ts::fetchStrategies` — fetch path used by
  `useStrategies`.
- `src/hooks/useGateway.ts::useStrategies` — the consumer; verify the
  `staleTime` cadence in case the operator needs to force-refresh.
- `src/components/strategy/CSMSetAdapter.tsx` — the adapter that should
  render after the fix.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Browser / Vite caches an older bundle and the change appears not to take effect | Hard-refresh (Cmd/Ctrl + Shift + R) and clear the React-Query cache via devtools. Document in the verification note. |
| Gateway returns `type` but with a value not in `ADAPTER_MAP` (e.g. typo or future strategy) | The `DefaultAdapter` fallback handles it; the existing warning is informative. No dashboard code change. If we want stricter behaviour (e.g. surface a typed error), file a separate plan. |
| Zod schema rejects the new field because of `noUncheckedIndexedAccess` or unknown-key handling | `StrategyInfo` uses `z.object({...}).passthrough()` or equivalent — verify before the gateway change lands; flag if it's `.strict()`. Today it is not strict, so the new field flows through. |
| Two strategies in `strategies.json` collide on the same `type` | Out of scope; only `csm-set` ships today. Flag for future work when TFEX is added. |
| Operator deploys the dashboard against an older gateway that does not yet expose `type` | The dashboard's optional handling means it degrades gracefully (current behaviour). No regression. |

---

## Acceptance Criteria

- [ ] `curl http://localhost:8080/api/v1/strategies | jq '.[0].type'` →
      `"EQUITY_MOMENTUM"`.
- [ ] Dashboard's `CSM SET Strategy` page renders **CSMSetAdapter**
      (not DefaultAdapter); the "(unknown)" warning no longer appears
      in the browser console.
- [ ] Tab navigation between Metrics / Report / List of trades works
      with no client-side errors (Report + List of trades may still
      show their inline error state pending the csm-set companion
      plan).
- [ ] Screenshots attached to the gateway PR.
- [ ] No commits required in this repo for this follow-up.

---

## Verification Plan

```bash
# 1. Verify gateway response
curl -sf http://localhost:8080/api/v1/strategies | jq '.'

# 2. Verify dashboard proxy response (same data, different host)
curl -sf http://localhost:3000/api/v1/strategies | jq '.'

# 3. Browser walkthrough — see Implementation Order step 4.

# 4. Optional: run the existing factory tests to confirm no regression
pnpm test src/components/strategy/StrategyAdapterFactory.test.tsx
```

---

## Sequencing with companion plans

This plan is intentionally last in the sequence:

1. `quant-api-gateway/.../PLAN-followup-strategy-type-field.md` — must
   land first; defines the wire format.
2. `strategies/csm-set/.../PLAN-followup-http-ingestion-migration.md` —
   independent track; unblocks the Report tab data path. Verification
   here only covers the **adapter dispatch** path, not the Report tab
   data path.
3. **This plan** — final dashboard sign-off.

If the gateway plan ships and the csm-set plan does not, this plan is
still completable: Metrics renders, Report shows the documented error
state. That's the intended graceful-degradation behaviour.
