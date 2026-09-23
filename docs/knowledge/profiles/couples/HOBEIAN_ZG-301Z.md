# `HOBEIAN` + `ZG-301Z` (P2430 / P2667 / P2695)

Bastien live: Nodes 5–8, 10, 12, 15, 16 (all routers / lights).

## Identity
- manufacturerName: `HOBEIAN` (case variants)
- productId: `ZG-301Z` (1-gang wall module) — siblings `ZG-301Z-2CH` / `ZG-301Z-3CH` / `ZG-302Z1` → other drivers
- driver: `switch_1gang`
- **Not** climate / soil / radar / curtain (couple-aware forbid)

## Protocol (Z2M)
- Exposes: `state`, `countdown`, `power_on_behavior`, `switch_type` (`toggle`|`state`|`momentary`)
- **No** electrical metering (voltage/current/power) — Homey must not invent Energy approximation
- Z2M family also maps many `_TZ3000_*`+TS0001 under WHD02 with HOBEIAN whiteLabel

## Cross-ref
- https://www.zigbee2mqtt.io/devices/ZG-301Z.html
- P2662–P2665 mesh calm (flood) · P2667 `setClass('light')`
- Contre quoi: hobeian-consistency · P2692 brand≠pid

## Homey UX
- Settings: countdown clear + switch_type=`state` if auto-off ~5s
- Tip ≥1.0.42+ Repair after update
