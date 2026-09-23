# `_TZ3000_axpdxqgu` + `TS0041` (P2630)

Bastien live Homey interview (ieee `7c:c6:b6:ff:fe:a3:e1:58`).

## Identity
- manufacturerName: `_TZ3000_axpdxqgu`
- productId / modelId: `TS0041`
- driver: `button_wireless_1` (NOT `remote_button_wireless_wall`)

## Clusters (interview)
| EP | input | output |
|----|-------|--------|
| 1 | basic(0), power(1), onOff(6) | ota(25), time(10) |

- **No** E000 (57344), **no** EF00 (61184), **no** IAS, **no** groups/scenes
- Sleepy enddevice, battery, receiveWhenIdle=false
- batteryVoltage=30 (3.0V), batteryPercentageRemaining=200 → **100%** (ZCL 0–200)

## RX / TX
| Path | Role |
|------|------|
| OnOff mfr cmd **0xFD** | primary press (0=single, 1=double, 2=hold) |
| raw wrapHandleFrame | catcher |
| magic genBasic **0xFFDE=0x13** | Z2M configureMagicPacket (TX once on pair/wake) |
| **Forbidden** | genOnOff **0x8004**, EF00 TX, E000 bind storm |

## Flows
- `button_wireless_1_button_1gang_button_pressed` (+ double / long / multi)
- `button_wireless_1_button_1gang_button_1_pressed` (+ double / long / triple / release)
- `button_wireless_1_battery_low`
- Run listeners must **not** require `args.device`

## Cross-ref
- Z2M TS0041: `tuya.fz.on_off_action` + battery; toZigbee []
- ZHA `TuyaSmartRemote0041TO`: signature `[0,1,6]/[25,10]` — exact match
- Z2M issues #28038 #25720 (axpdxqgu action events)
- Bastien mesh 2026-09-23: still **Unknown Node #3** until remove+re-pair
- Contre quoi: `npm run check:p2630` · `check:p2695`
