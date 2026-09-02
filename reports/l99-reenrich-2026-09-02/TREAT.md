# L99 re-enrich — forum / GitHub / diags — 2026-09-02

Silent only. Never invent pid. Never forum POST.

## Sources

| Source | Result |
|--------|--------|
| Forum silent multi-scan | 22 topics · 0 new FP invent · digest refreshed |
| Actionable processor | 214 posts · 48 need-action · BOTH 134 |
| Auto NEED_ACTION | 48 investigated · soft hypotheses verified already-in-catalog |
| Gmail/L3 diags | P2398 FLOW-GUARD live gap fixed |
| GitHub open | #536 Lerlink fan (P2396 tip) · #533 Moes curtain (locked curtain_motor; tip soak ≥9.0.720) |
| Resilience / crash-gate | 22/22 · verdict ok |

## Soft hypothesis resolution (no invent)

| Soft couple | Verdict |
|-------------|---------|
| `_TZ3218_t9ynfz4x`+`TS0225` | **LOCKED** `motion_sensor_radar_mmwave` (ZHA #3012) |
| `_TZE204_ogkdpgy2`+`TS0601` | **LOCKED** `air_quality_co2` (Z2M CO2) |
| `_TZ3000_kfu8zapd`+`TS0044` | **LOCKED** `button_wireless_4` |
| `_TZE204_clrdrnya`+`TS0601` | **LOCKED** `presence_sensor_radar` (VicHY) |
| `_TZE204_5slehgeo`+`TS0601` | **LOCKED** `curtain_motor` (Moes ZTS-EUR-C) — user must update Test + re-pair Cover |

## Code shipped this cycle

| Patch | Track | What |
|-------|-------|------|
| **P2398** | BOTH | FLOW-GUARD sibling alias + `_getFlowCard` condition/action order + radar enum value 2 |
| P2395–P2397 | BOTH (prior) | Buttons Lx + Homey UI bidirectional + fan DP2/11 |

## Publish

- Master Universal Tuya **9.0.798** → Auto-Publish Test
- Stable Tuya Unified **5.12.124** → Publish to `.stable` Test (soft-expect / P139 cooldown aware)
