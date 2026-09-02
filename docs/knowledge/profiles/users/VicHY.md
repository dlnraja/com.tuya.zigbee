# User profile — VicHY

> Curated fleet profile

Forum topic: **T140352** · Posts: 2208, 2211, **2222**

## Devices

| Tile | Driver | Couple | User action |
|---|---|---|---|
| 24G presence radar | presence_sensor_radar | `_TZE204_clrdrnya`+`TS0601` | Update Test ≥ tip (P2379/P2386) — restart app; re-pair only if UI still curtain/blind |

## #2222 (2026-09-02)

Symptom: after delete+re-pair OK, later (≈ after app updates) UI becomes **blind/curtain** + continuous presence/motion; timeline notifications on both sensors.

Root: DynCap store restore / async Homey cap re-apply of `windowcoverings_*` from radar settings DPs (DP2/3/102). **Silent fix P2386** — no forum reply.

Diag (from #2208): `4217d5e3-c845-4f0b-a351-5e5a59295cbb`

---
Regenerate: `npm run enrich:sync` + `npm run enrich:profiles`
