# Driver Mapping Policy

## Core Rule
> **Same `manufacturerName` + `productId` must exist in ONLY ONE driver.**

## Collision Types
| Type | Example | Action |
|------|---------|--------|
| Critical | sensor ↔ switch | Fix immediately |
| Medium | 3+ drivers | Review |
| Low | 2 similar | Acceptable |

## TS0601 Categories
- **Sensors**: climate_sensor, presence_sensor
- **Controls**: button_wireless_*, scene_switch_*
- **Outputs**: plug_smart, switch_*gang
- **Climate**: thermostat_*, radiator_valve

## Adding Devices
1. Get device interview JSON
2. Search existing: `grep -r "manufacturerName" drivers/`
3. Add to correct driver with UPPER and lowercase variants

## Generic Brands (Acceptable in multiple drivers)
eWeLink, SONOFF, MOES, Tuya, HOBEIAN
