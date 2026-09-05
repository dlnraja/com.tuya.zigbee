# User impact — A_Tas

Generated: 2026-09-03T10:34:10 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T140352 | #2199 | 2026-08-25 | presence | _TZ3218_T9YNFZ4X | request-diag-couple |
| T158757 | #1 | 2026-08-25 | presence | _TZ3218_T9YNFZ4X | request-diag-couple |

## Impacted devices (cross-source)

| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |
|-------------|--------|-------------|--------|----------|-------------|-------------|
| Linptech / Moes mmWave ES1 | motion_sensor_radar_mmwave | — | _TZ3218_t9ynfz4x+TS0225 | presence settings save error on stale EF00 DP9 path; forum #2199 / T158757 #1 omit productId | P2261 Linptech 0xE002 ZCL settings; P2289 mfr-only ES1 detect; P2298 onSettings soft-fail; P2343/P2347 sacred-keep | Update Test ≥9.0.741 / Stable after P2343; re-pair mmWave; use Motion/Static/Distance settings; send Homey diag UUID for live cluster confirm |

## Do not invent

- Do not invent pid onto A_Tas forum posts; Z2M lock is separate from post text

---
Regenerate: `npm run user:impact -- --user=A_Tas`

