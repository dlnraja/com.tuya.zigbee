# New diag batch — 2026-08-31 (cross-ref + fix status)

Fetched/analyzed Homey app-diags from Gmail UUID harvest + Athom crashes.

| UUID | Tip | User / symptom | Couple | Verdict |
|------|-----|----------------|--------|---------|
| `60959c24` | 9.0.688 | PresentSky — dimmer OK pair, controls “none” | `_TZE284_m1cvyneb`+TS0601 → `wall_dimmer_tuya` | **FIXED P2333** (DP2≠humidity DynCap/SmartDivisor) + P2322 magic/heal. Need **Test ≥ tip with P2333** (≪ 9.0.744) + re-pair |
| `8c49c683` | 9.0.678 | Adam — crash / AC dead | `wall_thermostat` stack overflow `safeSet` onoff | **FIXED** P2324–P2333 FCU path. Confirmed OK on `e3bf7ffc` @ 9.0.743 (#532 closed) |
| `8cc4aef0` | 9.0.677 | #532 marker only | — | stale / empty |
| `c40705a1` | 9.0.714 | meter91 — Moes 4-way not recognized | `_TZ3000_zgyzgdua` → `scene_switch_4`+TS0044 | **LOCKED** + sacred-keep; tip **≥9.0.738** + re-pair Scene Switch 4 |
| `b3bd114a` | 9.0.719 | Salvagr — Still Zigbee Device | curtain (pre-P2348) | **FIXED P2348** exact `_TZE204_5slehgeo`; tip **≥9.0.744** |
| `4217d5e3` | 9.0.719 | VicHY — presence unknown | `_TZE204_clrdrnya`+TS0601 | sacred-keep exact; tip **≥9.0.744** + re-pair Presence Radar |
| `724d4bc9` | 9.0.741 | Salvagr Unknown | 5slehgeo case miss | **P2348** → tip **9.0.744** |
| `e3bf7ffc` | 9.0.743 | Adam success | FCU DP36 valve | OK — closed #532 |

## Compact survival (post-P2348)
- `curtain_motor`: exact `_TZE204_5slehgeo` ✓
- `wall_dimmer_tuya`: exact `_TZE284_m1cvyneb` ✓
- `scene_switch_4`: exact `_TZ3000_zgyzgdua` ✓
- `presence_sensor_radar`: exact `_TZE204_clrdrnya` ✓

## Gmail IMAP couples (already catalogued)
`_TZE284_iadro9bf`+TS0601 presence · HOBEIAN+ZG-102Z contact · `_TZ3210_w0qqde0g`+TS011F plug · button remotes TS0041/TS004F/TS0043 — no new sacred invent.

## Action for users (silent forum)
Update Universal Tuya Test **≥ 9.0.744**, remove wrong/unknown tiles, re-pair.

## Code this pass (P2350)
- Harden `TuyaEF00Manager` dimmer DP2 skip: also when `dpMappings[2].capability === 'dim'` (driver.id empty at boot).
- Report: `DIAG_BATCH_NEW.md`

## Follow-up P2351 (same day)
- Gmail crash `ZG9101SAC_HP` on 9.0.730/9.0.743 → `safe-get-driver-patch.js` soft-fail `_getDriverManifest` + live drivers rebind.
- Fixed P169 CI: removed Cartesian `p2347` multi-gang registry_force.
- Report: `INBOX_L99_R3_P2351.md`

