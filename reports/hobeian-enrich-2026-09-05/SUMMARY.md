# P2421 — HOBEIAN internet / Z2M enrich (2026-09-05)

## Source
- zigbee-herdsman-converters 	uya.ts (local mirror .firecrawl/tuya-converters.ts)
- Cross-check: deCONZ / prior DEVICE_TRUTH HOBEIAN brand matrix

## Models locked (mfr + pid only)

| Model | Verified mfrs | Driver | Key DPs / clusters |
|-------|---------------|--------|--------------------|
| ZG-204ZM | 2aaelwxk, kb5noeto, tyffvoij, yflzeeqj | presence_sensor_radar | DP1 presence, 2 static sens, 4 dist/100, 101 motion_state, 102 fading, 106 lux, 107 indicator, 121 battery, 122 mode, 123 sens; ZCL illuminance |
| ZG-204ZH | vuqzj1ej, hdih4foa | presence_sensor_radar | + temp/10 DP111, humid DP101, motion_state DP103 |
| ZG-302ZM | kccdzaeo, s7rsrtbg, tmszbtzq, bfmfhxra, ahpcyzth, kijxnb8q | presence_sensor_radar | presence + switch1/2/3 (101-103), distance DP4 |
| ZG-302ZL | khzbklyh, df04ghrb, toeldckg, cqtamhh5, xlnzk169, llvwkkde | presence_sensor_radar | presence DP101, switches DP1-3 |
| ZG-303Z | wqashyqo + HOBEIAN\|ZG-303Z | soil_sensor | already OK |
| ZG-227Z/ZL | HOBEIAN brand | climate_sensor ZCL | already OK |
| ZG-305Z | HOBEIAN brand | switch_2gang ZCL | already OK (not Z2M TZE284 light SKU) |

## Fixes
1. Aligned HOBEIAN_ZG204ZM dpMap to Z2M (removed invented large/small/micro DPs).
2. Added HOBEIAN_ZG204ZH, HOBEIAN_ZG302ZM, HOBEIAN_ZG302ZL configs + routing.
3. Moved ZH/ZM/302 mfrs onto presence; stripped from climate + vibration.
4. Removed ZG-204*/ZG-302* cartesian productIds from power_clamp_meter, motion_sensor, radar_sensor_ceiling.
5. Registry + DeviceFingerprintDB sacred couples; dual-app p2421_* BOTH.

## User action
Update Homey Test tip + **re-pair** if device was on climate / vibration / clamp tile.
