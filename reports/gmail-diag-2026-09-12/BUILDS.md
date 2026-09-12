# Homey builds + Gmail — 2026-09-12 (P2474)

Silent treat. No forum posts. No raw diag dumps committed.

## Athom builds (emails → dashboard)

| App | Build | Email signal | Verdict |
|-----|-------|--------------|---------|
| master | **#3164** | created 01:07Z — Wait+Promote steps **success** | Tip soak; testing mail may lag |
| stable | **#105** | testing 01:15Z | **P2473** EF00-only on Stable Test |
| master | **#3163** | testing 00:49Z | Healthy Test fallback |
| master | #3140–#3145 (Sep 10) | **failed processing: socket hang up** | Transient Athom — keep last healthy Test; no spam republish |

## CI

| Check | Status |
|-------|--------|
| mfs_db P169 FrankEver | Fixed on tip (`f109c59957`) — `align --check` green |
| Syntax-check historical fails | Were uncommitted mfs apply; tip OK |
| e2e-dashboard-test | success (AggregateError gate — not Athom SPA) |
| Auto-Publish P2473 | **success** — Wait + Promote OK (#3164) |

## Diags (thread `1a09051e67db8ee3`)

Already treated in `reports/gmail-diag-2026-09-12/TREAT.md` (Moes tip lag, FrankEver NEED_INTERVIEW, Peter P2470).

## Code harden (P2474)

- `wait-athom-draft-ready.js`: 15m wait default, early soft-continue (3m) on `socket hang up` + healthy Test, fresh dashboard snapshot each poll
- Auto-Publish + Publish Stable: `HOMEY_DRAFT_WAIT_MS=900000`, `HOMEY_DRAFT_EARLY_FAIL_MS=180000`
- Unit tests: created≠failed, hang meta detection

## Dual-app

- Classify: **BOTH** (publish reliability)
- Do **not** bump-loop on Athom `socket hang up` when Test already healthy (P139/P2474)
