# P2347 Batch — Gabriel / A_Tas / Cam / Peter (2026-08-31)

Silent enrichment only. No forum posts.

## Gabriel #2173 Zemismart (30+ NOT_IN_CATALOG)

**Verdict:** Cartesian OEM dump — lock **1 verified pid per mfr** only.

| Class | Couples | Driver |
|-------|---------|--------|
| 1-gang | OVYAISIP, PK8TGTDB + **TS0001** | `wall_switch_1gang_1way` |
| 2-gang | YWUBFUVT, KGXEJ1DV, JJDKHUEQ + **TS0002** | `wall_switch_2gang_1way` |
| 3-gang | YERVJNLJ, VJHCENZO, QXCNWV26, EQSAIR32, F09J9QJB, FAWK5XJV, OK0GGPK7 + **TS0003** | `wall_switch_3gang_1way` |
| 4-gang ZCL | lwthnp7j + **TS0004** | `wall_switch_4gang_1way` |
| 4-gang MCU | SHKXSGIS TZE200/284, AAGRXLBD TZE204 + **TS0601** | `wall_switch_4_gang_tuya` |
| 6-gang MCU | R731ZLXK TZE200/284 + **TS0601** | `wall_switch_6_gang_tuya` |

**DO_NOT_LOCK:** all other mfr×pid combos from the spreadsheet (TS0002/3/0601 on 1-gang mfrs, etc.). Soft OEM siblings TZE204_SHKXSGIS / TZE284_AAGRXLBD / TZE204_R731ZLXK kept for compact only.

Shipped: sacred-keep +9 pins, catalog Cartesian stubs purged, PECULIARITIES, registry `p2347-gabriel-zemismart-verified-only`.

## A_Tas `_TZ3218_t9ynfz4x`

- Forum: mfr-only **MISSING_PID**
- Lock source: Z2M ES1ZZ(TY) + Gabriel T158757 #2 → **TS0225** → `motion_sensor_radar_mmwave`
- Settings: **0xE002** (not EF00 DP9) — already P2261/P2289/P2343
- Gmail: **no A_Tas diag UUID** found → NEED_DIAG for live confirm
- Catalog updated with `needDiag: true`

## Cam smart button

- Motion: **HOBEIAN+ZG-204ZL** locked (P2340) — keep
- Button: couple **ABSENT** in T146735 #8; hist `4d7b45a5` not re-proven
- Soft hypothesis `_TZ3000_5bpeda8u`+TS0041 in sacred-keep + compose — **NEED_DIAG**
- Do not invent from Peter radar posts

## Peter (Werkhoven / Kawa / N)

- #2190 tiles: SOS / contact / water / smartbutton — **couple null**; diag `0cea6870` extract empty
- Forbidden invent: k4ej3ww2, mrpevh8p, TS0207
- Reliability BOTH already shipped
- Peter_N: `_TZE200_myd45weu`+TS0601 → **soil_sensor** (catalog stub fixed off wall_dimmer)
- Peter_Kawa: NEED_DIAG, no lock

## Tests

`node --test test/critical/p2347-gabriel-atas-cam-peter-batch.test.js` → 8/8 pass

## Dual-app

`BOTH` — sacred-keep SSOT synced to stable clone.
