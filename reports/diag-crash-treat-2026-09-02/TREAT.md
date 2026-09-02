# Diag / crash harvest + treat — 2026-09-02 (P2398)

Silent enrich only. Never invent mfr+pid. No forum POST.

## Harvest

| Source | Result |
|--------|--------|
| Gmail MCP (L0) | unavailable |
| IMAP/OAuth (L1/L2) | secrets missing locally |
| L3 local cascade | OK — 30 emails reprocessed |
| Recursive treat | 1048 sources · 391 cases · 126 actionable · 845 gmail bodies |
| Crash pattern gate | **verdict ok** (fatal patterns known-fixed) |
| Resilience critical | **22/22 domains ok** |

### Fresh interviews (L3)

| Couple | Driver | Note |
|--------|--------|------|
| `_TZE284_iadro9bf`+`TS0601` | `presence_sensor_radar` | Locked; tip ≥9.0.797+ P2398 enum2 |
| `_TZE204_gkfbdvyx`+`TS0601` | `presence_sensor_radar` | Ceiling 24G; enumMap 0/1/2 |
| `HOBEIAN`+`ZG-102Z` | `contact_sensor` | IAS contact |

## Live UUID scan (open vs tip-soak)

| UUID | App | Signal | Verdict |
|------|-----|--------|---------|
| `2b0b4e4f` | 9.0.743 | FLOW-GUARD `water_valve_garden_is_open` + Invalid payload schema | **Fixed P2398** (condition getter fallback) · LiveData schema = soft reject not crash |
| `cfbf687f` | 9.0.779 | Peter smartbutton / TS0041 | Tip soak P2381+ / P2397 — update ≥9.0.798 |
| `0e28d470` | 9.0.781 | VicHY radar | Tip soak P2379–P2391 — update ≥9.0.798 |
| `f20dc4f0` | 9.0.491 | `_TZE284_m1cvyneb`+TS0601 on **climate_sensor** | Sacred → `wall_dimmer_tuya`; **remove + re-pair** after update |
| `634f7b19` | 5.12.70 | `auditCapabilities is not a function` | Stable-era; DCM method present on tip; BOTH backport already |

## Root fix shipped (P2398) — BOTH

1. **`app.js` FLOW-GUARD** — missing `getDeviceConditionCard` / `getDeviceActionCard` aliases to `getConditionCard` / `getActionCard`; true noops marked `__flowGuardNoop`; missing-method log once.
2. **`BaseZigBeeDriver._getFlowCard`** — conditions/actions prefer non-Device getters; skip `__flowGuardNoop`.
3. **Radar `transformPresence`** — enum value **2** = present (gkfbdvyx / iadro9bf DP104 fallback).
4. **Tests** — `test/critical/p2398-flow-guard-condition-fallback.js`

Versions ready: master **9.0.798** · stable **5.12.124** (do not spam Stable republish while Athom `processing_failed` cooldown — P139).

## Dual-app

| Change | Track |
|--------|-------|
| FLOW-GUARD + BaseZigBeeDriver + radar enum2 | **BOTH** |
| CI/report only | MASTER_ONLY |

## User tip (no forum reply)

Update Homey Test to **≥9.0.798**. Re-pair only when wrong driver (e.g. dimmer stuck as climate). Garden valve flow conditions should register without FLOW-GUARD spam after app restart.
