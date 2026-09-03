# P2415 PIR / multi-cap presence enrich — 2026-09-03

Silent only. Verified couples only (no invented pids).

## Locks
| Couple | Driver |
|--------|--------|
| `_TZE200_grgol3xp`+`TS0601` | `presence_sensor_radar` (was motion) |
| `_TZE200_uli8wasj`+`TS0601` | `presence_sensor_radar` (was motion) |
| `_TZE204_y8jijhba`+`TS0601` | `presence_sensor_radar` (was illuminance_presence) |
| `_TZE200_muvkrjr5`+`TS0601` | `presence_sensor_radar` sibling |

## Cartesian harden
Removed ZG-204*/ZG-205* productIds from `motion_sensor` (HOBEIAN couples stay on presence).

## Config clean
- Drop curtain `r0jdjrvi` from ZY_M100 radar list
- Drop soil `o9ofysmo`/`xc3vwx5a` (Z2M ZS-301Z) from IADRO9BF radar list
- Drop unverified `zbfmvj13` from KA8 battery radar list (stays curtain until proven)

## Report
```json
{
  "patch": "P2415",
  "addedPresence": 4,
  "removedMotion": 4,
  "removedIllum": 4,
  "removedMotionPids": 10,
  "configFixes": [
    "stripped r0jdjrvi / o9ofysmo / xc3vwx5a / zbfmvj13 from radar configs",
    "misattribution registry +p2415"
  ]
}
```

## Dual-app
**BOTH** — pairing reliability / misroute.

## Broader
Forum silent + apply-mfr-pid dry cycles continue separately for other device classes.

## Soil ZS-301Z
|_TZE284_o9ofysmo/xc3vwx5a+TS0601| soil_sensor (was climate; never radar)|

