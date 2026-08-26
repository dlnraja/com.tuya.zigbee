# Forum T140352 #2202 — Peter (SHADOW)

**Diag:** `95a7c6e5-969f-4469-be5d-c96b7cb42b60` · App **9.0.661** · Homey Pro Early 2023 · 2026-08-26

## Couples (from diag only — not invented)

| Device | Couple | Driver |
|--------|--------|--------|
| Smartbutton | `_TZ3000_mrpevh8p` + `TS0041` | `button_wireless_1` |
| Waterdetector | `HOBEIAN` + `3315-S` | `water_leak_sensor` (paired; MISATTR false+) |

## Root causes

1. **Water “wrong driver / gone”** — stderr `[MISATTR] HOBEIAN+3315-S → expect soil_sensor`. Runtime used `isForbiddenPlacement(HOBEIAN, water_leak_sensor)` which hit rain case `p2259-hobeian-zg223z-rain` (forbidMode couple) and `lookup(mfr, null)` → soil. **P2282:** couple-first warn + skip couple forbids in placement.

2. **Smartbutton no Homey/flow response** — wake/battery/announce OK; no `[PHYSICAL-RAW]`/`[BUTTON-FLOW]`. IO `_enablePassiveTuyaListen` wrapped `handleFrame` as 1-arg and broke 0xFD catcher chain. **P2282:** preserve arity + re-arm 0xFD on announce; soft-lock couple; `skip8004` on mrpevh8p profile.

## User action (after Test publish ≥ fix)

- Update Universal Tuya Test, then:
  - Water: if still unavailable, remove + re-add as Water leak (do not pick Soil).
  - Smartbutton: press once after update; flows should fire on 0xFD.

## Soft locks (P2282 continued)

- `fingerprints.json`: `_TZ3000_mrpevh8p` → `button_wireless_1` (was generic `button_wireless`)
- `DeviceFingerprintDB`: compound `_TZ3000_mrpevh8p|TS0041` + `HOBEIAN|3315-S`/`3315-Seu`
- Registry: water forbid soil/rain for 3315-S couple; button forbids generic `button_wireless`
- Harvest **D074**; Peter profiles updated (couple no longer ABSENT)

## Dual-app

Classify **BOTH** (reliability). No forum reply (T157628).

**Blocker for Peter:** local only until **commit + push + publish Test**.
