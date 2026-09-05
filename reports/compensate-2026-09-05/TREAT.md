# Compensate incomplete reports — 2026-09-05

Silent only. Soft hypotheses from SSOT — **never invent pid**. No forum POST (T157628).

Elapsed: **102ms** / budget 45000ms

Missing-PID hints: **0** · Hypotheses: **6** · NEED_INTERVIEW: **2** · Applied: **0**

## Soft hypotheses

| Couple | Driver | Conf | Locked | Soft apply |
|--------|--------|-----:|:------:|:----------:|
| `_TZ3218_t9ynfz4x+TS0225` | `motion_sensor_radar_mmwave` | 98 | yes | safe |
| `_TZ3000_xabckq1v+TS004F` | `button_wireless_4` | 90 | yes | doc-only |
| `_TZ3000_kfu8zapd+TS0044` | `scene_switch_4` | 98 | no | safe |
| `_TZE204_5slehgeo+TS0601` | `curtain_motor` | 99 | yes | safe |
| `_TZ3000_4upl1fcj+TS0041` | `button_wireless_1` | 95 | yes | safe |
| `_TZ3000_wkai4ga5+TS0044` | `button_wireless_4` | 95 | no | safe |

## NEED_INTERVIEW (compensate without waiting)

- **_TZ3000_kfu8zapd+TS0044** → `scene_switch_4` — ask: zb_manufacturer_name, zb_model_id (soft-hypothesize until interview confirm)
- **_TZ3000_wkai4ga5+TS0044** → `button_wireless_4` — ask: zb_manufacturer_name, zb_model_id (soft-hypothesize until interview confirm)

## Doctrine
- Continue treating posts even when couple absent
- Class-level fixes ship without pid
- Hang-proof: line-scan + wall-clock; never block cron

