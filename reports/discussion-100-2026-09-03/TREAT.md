# Discussion #100 — Pressure band (`_TZ3000_pjb1ua0m`+`TS0203`)

## Claim
Willy0611: seat/pressure band, standard TS0203 door/window profile.

## Cross-ref
- Z2M/ZHA/SmartHomeScene: contact IAS (alarm_contact + battery). Tamper may be phantom.
- Canonical driver: `contact_sensor` (P2300).

## Gap found (P2404)
| Track | Before | After |
|-------|--------|-------|
| master | Locked on `contact_sensor` | Registry forbid `doorwindowsensor_3` |
| stable | Still on `doorwindowsensor_3` mega-list; `contact_sensor` endpoints only cluster 0 | Moved to `contact_sensor`; IAS clusters 0/1/3/1280 + bindings |

## User
Update Test (Universal ≥ tip with P2300; Stable after Publish P2404). Pair as Contact Sensor. Re-pair if stuck on Door & Window Sensor.
