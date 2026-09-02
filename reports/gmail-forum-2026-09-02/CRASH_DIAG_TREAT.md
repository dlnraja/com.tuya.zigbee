# Crash + diag treat — 2026-09-02 (publish cycle)

Silent only. No forum posts.

## Harvest

| Source | Result |
|--------|--------|
| Local Gmail L3 | 30 emails (IMAP secrets absent in IDE) · 1 crash_report · 4 interviews |
| GHA | `Gmail Diagnostics Auto-Analysis` + `Fetch Homey Diagnostics` dispatched |
| Crash pattern gate | **verdict ok** — all fatal patterns known-fixed |
| Recursive treat | 1004 sources · 384 cases · 126 actionable (historical + live) |

## Interview couples (today L3)

| Couple | Runtime `getDriverId` | Note |
|--------|----------------------|------|
| `_TZE284_iadro9bf`+`TS0601` | `presence_sensor_radar` | Z2M ZY-M100-S_2; mfs compound had stale `generic_tuya` → corrected |
| `_TZE204_gkfbdvyx`+`TS0601` | `presence_sensor_radar` | OK |
| `HOBEIAN`+`ZG-102Z` | `contact_sensor` | OK |

## Live tip diags already treated this soak

| UUID | Issue | Fix / tip |
|------|-------|-----------|
| `cfbf687f` | Peter Smartbutton Flows silent | **P2381** (≥9.0.782) |
| `60959c24` | PresentSky dimmer TX / DynCap humidity | P2314/P2333 + **P2382** HYBRID skip |
| `ab5aaf04` | Cover stop | **P2380** |
| Athom `processing_failed` / socket hang | Publish emails | **P139** — do not spam republish |

## Code this cycle (BOTH)

1. **P2382** — `HybridProtocolManager` skip 15-min disable for EF00 wall dimmers
2. **mfs** — `_tze284/204_iadro9bf|ts0601` compound driver → `presence_sensor_radar`

## Publish

- Master Auto-Publish after push (Universal Tuya Test)
- Stable-v5 surgical backport of P2382 (reliability)
