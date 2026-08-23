# Forum SHADOW fixes — 2026-08-23 (Ship 0)

Policy: **passive GET only**. Never POST / PM / like / paste AI (T157628).

## Processor

- Posts scanned: 204 · need-action: 52
- Majority: `code-fix-stable-candidate` → **fixShipped** on Test **≥9.0.630** (update + re-pair)
- Soft only (no sacred lock): `_TZ3000_xabckq1v`+TS0001 hypothesis; known couple is **TS004F** → `button_wireless_4`
- Do not auto-lock: T99614 SergeP (`_TZ3000_v5498kdm`+TS0001) = Nous/SoPhos app

## Already shipped (verify on Homey Test)

| Couple | Driver | Note |
|--------|--------|------|
| `_TZE284_6ocnqlhn`+TS0601 | `din_rail_meter` | forbid smart_rcbo |
| `_TZE200/204_lsanae15`+TS0601 | `energy_meter_din` | stripped from smart_rcbo |
| `_TZ3000_zgyzgdua`+TS0044 | `scene_switch_4` | 0xFD |
| `_TZ3000_xffhmvhv`+TS004F | `button_wireless_4` | FLOW-GUARD heuristics |

## User action (silent — no forum reply)

Update Universal Tuya Test to **9.0.630+**, remove device, re-pair if driver tile wrong.
