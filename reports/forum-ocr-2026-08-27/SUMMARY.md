# Forum OCR + dual-app triage — 2026-08-27 (P2289)

Silent only. Images OCR'd from T140352 #2202/#2203 (Peter). No forum posts.

## OCR evidence (Peter)

| Post | OCR / screenshot truth |
|------|------------------------|
| #2202 | App **v9.0.661 Experimental**. Waterdetector tile **Niet beschikbaar**. Detail: **Wrong driver (water_leak_sensor). Remove device and re-add – expect soil_sensor.** Smartbutton advanced: `_TZ3000_mrpevh8p` + `TS0041` |
| #2203 | Same wrong-driver banner; water **still triggers flows** (wet=Nee / sabotage=Nee). Smartbutton still dead. Diag `4b1a0dc9-…` |

## Couples

| User | Couple | Track | Action |
|------|--------|-------|--------|
| Peter water | `HOBEIAN`+`3315-S` | BOTH | **fix** P2289: clear stale MISATTR `setUnavailable`; lookup never matches soil without pid |
| Peter Smartbutton | `_TZ3000_mrpevh8p`+`TS0041` | BOTH | **fix** broaden 0xFD cmdId extraction (SDK frame variants) |
| A_Tas / Gabriel | `_TZ3218_t9ynfz4x`+`TS0225` | MASTER | **fix** Linptech settings: mfr-only ES1 path + soft-fail ZCL writes (no Homey save error) |
| Alejandro | `_TZE284_debczeci`+`TS0601` | BOTH | Already on `presence_sensor_radar` — user update Test + re-pair |
| Manfred | `_TZ300_kalzta4`+`TS004F` (typo?) Moes ZT-S02 | BOTH | **watch** — no Z2M hit for `kalzta4`; never invent; need corrected mfr from interview |
| Steampunk | `_TZ3000_xabckq1v`+`TS004F` | BOTH | Already LOCKED → `button_wireless_4` |

## Code shipped (this pass)

- `UserMisattributionRegistry.lookup` — skip productId cases when pid unknown
- `TuyaZigbeeDevice._warnIfMisattributedDriver` — `setAvailable` / `unsetWarning` when couple OK
- `LinptechES1Profile.isLinptechES1` — empty pid OK when mfr matched
- `motion_sensor_radar_mmwave` settings — soft-fail ZCL (A_Tas)
- `PhysicalButtonMixin` raw 0xFD — extra cmdId paths

## User action (silent)

Update **Universal Tuya Test** (≥ this publish). Water: restart app or open device once (stale banner clears). Smartbutton: press after update; re-pair only if still silent. Presence: retry settings save. No Soil re-add for Peter's water.
