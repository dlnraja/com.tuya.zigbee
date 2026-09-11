---
description: Always-on smart unit-test mandate — every prompt / every fix must lock Contre quoi to prevent regressions
alwaysApply: true
---

# Unit tests anti-régression — ALWAYS ON (P2469)

**Mandate (user):** Sur **chaque prompt** et **au fil de l’eau**, ajouter ou étendre des **tests unitaires ciblés** pour éviter le maximum de régressions. Être **smart** — pas de spam de tests vides.

## Default behaviour (every prompt)
1. **Before claiming done** — if you changed runtime behavior (driver, compose clusters, DP map, mixin, flow wire, sacred couple, publish gate), ship a matching `test/critical/pNNNN-*.test.js` (create or extend).
2. **Contre quoi (P215)** — the test must fail if the bug class returns (wrong clusters, invent pid, phantom battery, EF00 never `initialize`, scene-force on rotary, etc.).
3. **Wire npm** — add `check:pNNNN` (and fold into a family `check:pNNNx` when useful). Prefer `node --test`.
4. **Run locally** — `node --test test/critical/pNNNN-*.test.js` (or `npm run check:pNNNN`) before push/publish claims.
5. **Dual-app** — reliability locks = **BOTH**; note if stable backport needs the same test.

## Smart (do) vs noise (don’t)

| Do | Don’t |
|----|--------|
| Lock sacred couple / compose clusters / DP map / RX-TX invariant | Snapshot entire `app.json` |
| Assert interview-shaped clusters (e.g. no forced OnOff `6`) | Invent mfr+pid just to green a test |
| Extend existing `pNNNN` when same bug class grows | Duplicate 10 files for one string |
| Fast filesystem / pure-logic asserts (`node --test`) | Homey hardware E2E in CI for every fix |
| One focused critical test per patch family | Mega flaky integration suites |

## Where tests live
- Primary: `test/critical/pNNNN-<slug>.test.js`
- Gates: `tools/ci/*-gate.js` when matrix/fleet checks belong in CI scripts
- Doctrine: `docs/rules/UNIT_TEST_ANTI_REGRESSION.md`

## Agent checklist (non-negotiable)
```
[ ] Root cause fixed
[ ] test/critical updated or added (Contre quoi)
[ ] npm run check:pNNNN green
[ ] No invent pid / no forum POST
```

## Anti-patterns
- “Fix shipped, tests later”
- “Already covered” without a failing assertion for **this** regression
- Broad mocks that always pass
- Skipping tests because the change “looks small”

See also: `why-interrogation.mdc` (Contre quoi), `l99-deep-investigation-always.mdc`, `user-report-deep-investigation-always.mdc`.
