# T26439 deep harvest → OUR app (P2571)

Silent only. Highest **#5514**. Stream harvested **1204** posts. Couples (raw cartesian) **6751**. Images **868**.

Policy: target `com.dlnraja.tuya.zigbee` only — never Johan repo, never forum POST, complementary union only, never invent pid.

## Tip actionable locks (Z2M cross-ref)

| Couple | Driver | Note |
|--------|--------|------|
| `_TZE284_c8ipbljq`+TS0601 | `wall_switch_6_gang_tuya` | Hejhome Pika 3/6 — moved off `switch_3gang` |
| `_TZE284_tgeqdjgk`+TS0601 | `wall_dimmer_tuya` | TS0601 knob dimmer — moved off `switch_1gang` |
| `_TZE200_vvmbj46n`+TS0601 | `lcdtemphumidsensor` | stripped from `_3` collision |
| `_TZE204_ex3rcdha`+TS0601 | `presence_sensor_radar` | Z2M presence/lux — NOT 4-gang |
| `_TZE200/204_seq9cm6u`+TS0601 | `bed_sensor` | pressure/bed pad |
| `_TZE284_myd45weu` / `oitavov2` / `npj9bug3` / `aao3yzhs` / `nt4pquef`+TS0601 | `soil_sensor` | soil family |
| `_TZE284_aaeasoll`+TS0601 | `light_sensor_outdoor` | lux |
| `_TZE284_debczeci`+TS0601 | `presence_sensor_radar` | iHseno PIR presence |
| `_TZ3210_eymunffl`+TS0101 / `_TZ3000_*`+TS0049 | `smart_garden_irrigation_control` | Kai quote list |

## Skip / NEED_INTERVIEW

- `_TZE28C100000_rzdkn5rx` — garbage OCR, never invent
- `_Tze204_1Dxkck` — typo; real couple `_TZE204_1v1dxkck` already on `wall_dimmer_tuya`

## Gates

```bash
npm run check:p2571
npm run enrich:t26439
```
