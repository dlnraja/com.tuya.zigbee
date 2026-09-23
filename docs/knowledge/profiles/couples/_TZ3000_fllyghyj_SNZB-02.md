# `_TZ3000_fllyghyj` + Homey `SNZB-02` / Z2M `TS0201` (P2666 / P2695)

Bastien live Nodes 9/11 (and Unknown #14 IEEE `a4:c1:38:c1:17:76:42:f4`).

## Identity (sacred couple nuance)
| Field | Homey DevTools (Bastien) | Z2M / Hubitat |
|-------|--------------------------|---------------|
| mfr | `_TZ3000_fllyghyj` | `_TZ3000_fllyghyj` |
| pid / modelId | often **`SNZB-02`** | **`TS0201`** (WSD500A / TH02Z) |
| driver | `climate_sensor` | temp+humidity+battery |

**Both pids stay in compose** (complementary). Do **not** invent a third pid. Never route to Sonoff-only drivers by name alone — lock **mfr+pid**.

## Protocol
- ZCL temperature 0x0402 · humidity 0x0405 · powerCfg
- Sleepy · slow report intervals (Z2M #4202 / HA threads)
- Battery: Z2M prefers voltage→% (`3V_1500_2800`) when % remaining lies

## Cross-ref
- Z2M herdsman: fingerprint `TS0201` + fllyghyj → model WSD500A · whiteLabel TH02Z
- Hubitat: lists fllyghyj+TS0201 alongside eWeLink CK-TLSR7014
- HA community #450863 non-updating → quirk / re-pair
- Contre quoi: `npm run check:p2666`

## Homey UX
- Pair as **Climate Sensor** under Zigbee Bastien — not Homey Virtual
- Unknown #14: remove → re-pair Climate
