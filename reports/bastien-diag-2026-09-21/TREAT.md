# Bastien treat — 2026-09-21 evening (P2661)

## Photo / mesh (Developer Tools Zigbee)

Screenshot confirms **Appareil Zigbee** advanced settings:

| Field | Value |
|-------|--------|
| Manufacturer | `_TZ3000_vsxvaj9i` |
| Product ID | `TS0043` |
| Type | enddevice |
| IEEE | `a4:c1:38:f6:3d:2d:c9:79` |

Driver on box: **Homey Virtual Zigbee** (`homey:virtualdriverzigbee:driver`) — **not** Zigbee Bastien.

## Live Homey dump (cloud API + mesh paste)

App installed: **Zigbee Bastien 1.0.34** (tip Athom build #40 = newer; box not updated).

| Device | Mesh couple | Wrong driver | Target Bastien driver |
|--------|-------------|--------------|------------------------|
| Appareil Zigbee | `_TZ3000_vsxvaj9i`+`TS0043` | Homey Virtual | `button_wireless_3` |
| Eclairage salon | `_TZ3000_ltt60asa`+`TS0004` | Homey Virtual | `switch_4gang` |
| Sous sol / chambre principal | `_TZ3000_fllyghyj`+`SNZB-02` | Homey Virtual | `climate_sensor` / `temphumidsensor3` |
| salon/cuisine | eWeLink `CK-TLSR8656-SS5-01(7014)` | Homey Virtual | `climate_sensor` |
| 8× HOBEIAN lights | `HOBEIAN`+`ZG-301Z` | Bastien `switch_1gang` | OK (keep) |
| NodOn radiators | SIN-4-FP-21 | NodOn app | OK (official) |
| Somfy volets | Tahoma | Somfy app | OK (official) |

## Gmail diags (same tip-lag)

| Log ID | Build | Note |
|--------|-------|------|
| 4c0d232b | #37 | 3ch dead + UI error (P2659) |
| 52ef684a | #37 | latest |
| be119f76 | #37 | latest |

## Code shipped (1.0.36)

- P2659 already on tip 1.0.35 (string subcap + no undeclared scene invent)
- P2661: Time/OTA quiet — do not inflate RX-SHED
- P2520 union: `_TZ3000_fllyghyj`+`SNZB-02` on `climate_sensor`; `SNZB-02` on `temphumidsensor3`
- Gate: `npm run check:p2661`

## User actions (no Homey Virtual)

1. Update **Zigbee Bastien** Test ≥ **1.0.36**
2. Remove Virtual tiles: Appareil Zigbee, Eclairage salon, Sous sol, chambre principal (sensor), salon/cuisine
3. Re-pair each under **Zigbee Bastien** only (wake-tap remotes every 2–3s)
4. Keep NodOn / Somfy / HOBEIAN Bastien switches as-is

## Dual-app

Bastien house-only. Reliability mirrors (P2659/P2661 RX quiet / fllyghyj couple) already on master where applicable.
