# Bastien — COMPLETE L99 treat (all prior prompts) — 2026-09-21

## Scope closed

| Prior ask | Status |
|-----------|--------|
| Bastien app not updated / tip-lag | Tip Athom **Build #42 testing** (1.0.36); **1.0.37** publishing. Box still **1.0.34** (autoupdate true but Homey Test needs **manual Update** — API cannot force store install). |
| Recover diags | Log IDs: e8d98608, 4d4e1684, af98752d, **4c0d232b**, **52ef684a**, **be119f76** (all on ≤1.0.34). |
| Deep fix devices | Couples locked; P2659/P2660/P2661/P2662 shipped. |
| Cookies / tokens | `HOMEY_BASTIEN_API` cloud OK (Homey `65d495eb…`); `HOMEY_PAT_APPS` Athom me OK; Chrome Cookies locked by Chrome (EBUSY); session.jwt stale. **No secrets committed.** |
| Local-first | P2660 SSOT + gate (Bastien + master). |
| Photo Paramètres Avancés | `vsxvaj9i`+`TS0043` — Homey Virtual Energy dashes = false warnings. |
| Warnings intelligents | P2662 blank-pid HOBEIAN heal + anti-Virtual learnmode. |
| Push + publish | bastien-home 1.0.36+1.0.37 pushed; Publish Zigbee Bastien workflows running/queued. BOTH: P2661/P2662 → master. |
| No Homey generic | Re-pair matrix below. Official NodOn/Somfy kept. |

## Live fleet matrix (Homey API + Zigbee tools)

| Device | Couple | App/driver now | Action |
|--------|--------|----------------|--------|
| Appareil Zigbee | `_TZ3000_vsxvaj9i`+`TS0043` | Homey Virtual socket | **Remove → Bastien `button_wireless_3`** |
| Eclairage salon | `_TZ3000_ltt60asa`+`TS0004` | Homey Virtual | **Remove → Bastien `switch_4gang`** |
| Sous sol / chambre principal (sensor) | `_TZ3000_fllyghyj`+`SNZB-02` | Homey Virtual | **Remove → Bastien `climate_sensor`** |
| salon/cuisine | eWeLink `CK-TLSR8656-SS5-01(7014)` | Homey Virtual | **Remove → Bastien `climate_sensor`** |
| 8× lights HOBEIAN | `HOBEIAN`+`ZG-301Z` | Bastien `switch_1gang` | **Update ≥1.0.37 + Repair** (P2662 fill pid + strip phantom power) |
| Radiateurs | NodOn SIN-4-FP-21 | NodOn | Keep (official) |
| Volets | Somfy Tahoma | Somfy | Keep (official) |
| Unknown Node | IEEE `a4:c1:38:bb:8f:37:ee:17` | orphan | Interview / remove if dead |

## Code shipped

| Patch | Track | Contre quoi |
|-------|-------|-------------|
| P2659 | Bastien 1.0.35+ | boolean→string subcap; no undeclared scene invent |
| P2660 | BOTH | local-first doctrine |
| P2661 | Bastien 1.0.36 + master | Time/OTA quiet RX-SHED |
| P2662 | Bastien 1.0.37 + master | HOBEIAN blank pid → ZG-301Z heal |

## User / Bastien box (cannot automate)

1. Homey → Apps → **Zigbee Bastien** → **Update** to ≥ **1.0.37** (Test).
2. Restart app or Repair each HOBEIAN light.
3. Delete the 5 Homey Virtual Zigbee tiles → re-add under **Zigbee Bastien** only (wake-tap remotes).
4. Do **not** choose Homey Zigbee / « Appareil Zigbee ».

## Dual-app

Bastien house App ID only for house publish. Reliability P2661/P2662 ALSO on master Universal.
