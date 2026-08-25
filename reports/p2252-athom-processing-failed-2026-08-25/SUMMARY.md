# P2252 — Master 9.0.646 processing_failed (#2977, socket hang up)

## Verdict
Not a random Athom glitch alone. Upload reached Athom (`Build #2977 has been created`) then **processor hung** expanding an oversized Zigbee identifier matrix.

## Root cause
`scripts/maintenance/compact-zigbee-identifiers.cjs` counted combinations as **unique-lowercase mfr × pid**, but Athom expands **raw** `manufacturerName[] × productId[]` (every CASE form counts).

| Metric (pre-fix) | Value |
|-------------------|------:|
| Source `app.json` combos (raw) | ~574k |
| Compact reported `afterTotal` | ~28k (lie) |
| Actual raw after compact | ~80–100k+ |
| climate_sensor alone | up to ~181k raw |

That expansion load correlates with Athom `processing_failed` / `socket hang up`.

## Fixes (master)
1. **Compact budgets use RAW cartesian**; CASE forms capped (`MAX_CASE_FORMS=2`).
2. **Second pass** until raw total ≤ `HOMEY_ZIGBEE_MAX_TOTAL_COMBOS` (**20 000**).
3. Per-driver raw ≤ **2 000**.
4. Auto-Publish / Auto-Fix / Stable publish env updated.
5. Draft wait default **360s** (`HOMEY_DRAFT_WAIT_MS`).
6. Gate: `test/critical/p2252-athom-combo-budget.test.js`.
7. Docs: `.github/WORKFLOW_GUIDELINES.md` §M item 7.

## Policy unchanged (P139)
Do **not** spam bump+republish while Test is healthy. One clean publish after this compact fix is the recovery path.

## Next
Commit + push master → Auto-Publish once. Expect a new build (9.0.647+) to reach **test** without #2977-class hang.
