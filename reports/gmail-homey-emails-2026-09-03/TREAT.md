# Homey Gmail emails — treat 2026-09-03

Silent only (T157628). Cascade: L0 IDE unavailable · L1/L2 secrets local-missing · **L3 + GHA IMAP OK**.

## Harvest

| Source | Result |
|--------|--------|
| `gmail-auth-cascade` | L3_local recommended |
| GHA `gmail-diagnostics.yml` | [success](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33688262275) — IMAP fetched **1000** |
| GHA `fetch-diags.yml` | success (×2 dispatch) |
| Crash pattern gate | **verdict ok** (unknown=0) |
| Recursive treat | 126 actionable · 895 bodies (historical) |

## Crash / tip emails (resolved on tip)

| Signal | App on mail | Fix already on tip | User action |
|--------|-------------|--------------------|-------------|
| `Invalid Driver ID: ZG9101SAC_HP` | 9.0.730 / 9.0.743 | **P2351** soft-fail | Update Test ≥9.0.802 |
| `Invalid Driver ID: light` | 9.0.746 | **P2373** Homey class soft-fail | Update Test |
| `Invalid Driver ID: homey:virtualdriverzigbee:driver` | 9.0.677 | **P2351** | Update Test |
| `Maximum call stack` / SAFE-SET onoff | 9.0.678 wall_thermostat | **P2308** depth cap + FCU `_fcuSyncing` | Update Test |
| `auditCapabilities is not a function` | 5.12.70 | DCM guard on tip Stable | Update Stable Test |
| FLOW-GUARD `getDeviceConditionCard` | 9.0.743 (`2b0b4e4f`) | **P2398** | Update ≥9.0.798 |
| Moes curtain idle (`73c6ef18`) | 9.0.794 | **P2399** | Update ≥9.0.800 |
| VicHY flood/battery (`0e28d470`) | 9.0.781 | **P2389/P2391/P2401** | Update ≥9.0.802 |
| Athom `failed processing` (133 mails) | drafts | **P139** — soft-expect; do **not** spam republish | Wait Athom |

## New lock from unmatched FP (Gmail summary)

| Couple | Driver | Evidence |
|--------|--------|----------|
| `_TZ3000_uw3dadam`+`TS0202` | `motion_sensor` | deCONZ #8503 DDF TS0202 presence clone · Z2S IAS zone |

**P2402** — compose + misattribution registry + mfs_db. BOTH tracks.

## Dual-app

| Change | Track |
|--------|-------|
| Crash soft-fail / FLOW-GUARD / radar / cover (prior) | already BOTH on tip |
| `uw3dadam`+TS0202 → `motion_sensor` | **BOTH** |
| Gmail CI harvest / reports | MASTER_ONLY |

## Publish

Master Auto-Publish after P2401 still soaking; Stable Publish P2401 **success**. No extra Stable dispatch (P2400).
