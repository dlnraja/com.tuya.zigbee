# User profile — VicHY

> Curated fleet profile

Forum topic: **T140352** · Posts: 2208, 2211, **2222**, **2224**, **2225** (Dylan reply)

## Devices

| Tile | Driver | Couple | User action |
|---|---|---|---|
| Presencia baño principal | presence_sensor_radar | `_TZE204_clrdrnya`+`TS0601` | Update Test ≥ **9.0.797** (P2379/P2386/P2389/P2391) + **restart app** (re-pair only if still curtain UI) |

## #2224 (2026-09-02)

Interview locked in post:
- Manufacter ID: `_TZE204_clrdrnya`
- Model ID: `TS0601`
- Diag: `0e28d470-c67e-4876-9d19-75f816abc7bb` @ **9.0.781**
- Timeline: update → low battery → Zigbee flood (~196 msg/min) → low battery

Root causes (silent):
- Flood = Tuya mmWave firmware chatty (P2389 calm on tip)
- Low battery = phantom Homey Energy / `measure_battery` on **mains** MTG radar (P2391 strip + clear energy)
- App on diag was 9.0.781 — tip has fixes

Diag (from #2208): `4217d5e3-c845-4f0b-a351-5e5a59295cbb`

## #2222 (2026-09-02)

Symptom: UI becomes **blind/curtain** + continuous presence after updates. Fix P2386.

## Flood timeline (~196 msg/min)

Firmware chatty (Z2M#14742). **P2389**: radar RX budget + no Homey flood notification + DP9/DP104 coalesce.

**No forum reply** (T157628).

---
Regenerate: `npm run enrich:sync` + `npm run enrich:profiles`
