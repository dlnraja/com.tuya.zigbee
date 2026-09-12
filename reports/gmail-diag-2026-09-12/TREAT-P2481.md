# Gmail app diagnostics treat — 2026-09-12 night (P2481)

Silent only. No forum posts. No raw excerpts committed.

## App crashes (Homey Pro 2026)

| When UTC | Tip | Error | Stack note | Fix |
|----------|-----|-------|------------|-----|
| 14:01 | 9.0.891 | `Driver Not Initialized: motionsensor` | **inside** `safeGetDriver` (catch soft-fail incomplete) | P2480 message match + **P2481 preempt** |
| 14:02 | 9.0.891 | same | same | same |
| 18:08 | 9.0.895 | `Invalid Driver ID: motionsensor` | `_getDriverManifest` — no safeGetDriver on stack | P2481 preempt on manifest too |
| 18:13 | 9.0.895 | same | build #3168 crashes | same |

Test channel still on **9.0.895** (Athom #3169/#3170 socket hang up). Users need tip ≥**9.0.901** once Athom accepts.

## Diagnostics reports

| Log ID | Tip | User | Couple | Verdict |
|--------|-----|------|--------|---------|
| `48baba36` / `d05e6530` | 9.0.874 | Moes cover not moving | `_TZE204_5slehgeo`+`TS0601` | Tip lag; P2478 mid-% DP2-only + soft timeout (≥9.0.893). TX ACK'd but motor silent on old tip. |
| `8adfe4ce` | 9.0.857 | Still not working | same Moes | Same class — update Test |
| `d9f86fed` / `d6245ab2` / `e96f52aa` | 9.0.874 | FrankEver water valve | **ABSENT** mfr+pid | NEED_INTERVIEW (P2468/P2473 EF00-only paths). Dump = boot FLOW-GUARD noise only. |
| `048cff91` | 9.0.836 | Smartbutton inconsistent | `_TZ3000_mrpevh8p`+`TS0041` | P2470 battery wake / no ZCL storm (≥9.0.888). FLOW-GUARD invent noise. |

## Code this pass

- `lib/utils/safe-get-driver-patch.js` — P2481 preempt `isForeignDriverId` before Homey call
- Tests: `p2481-motionsensor-preempt-soft-fail.test.js` · `npm run check:p2481`
- Dual-app: **BOTH**

## Athom

- Do not bump-spam (P139). One publish after P2481 + cooldown.
