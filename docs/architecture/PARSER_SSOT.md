# DP / parser SSOT (P2269)

## Canonical decode + scale

| Role | Module |
|------|--------|
| Frame / typed decode (preferred new code) | `lib/utils/data/*` (`TuyaProtocolParser`, `DPMappingEngine`) |
| EF00 manager (live RX hub) | `lib/tuya/TuyaEF00Manager.js` |
| Scale / anti double-division | `lib/managers/SmartDivisorManager.js` (`smartParse`) |
| Facade | `lib/utils/UniversalDataHandler.js` |

## LEGACY / dead

- `lib/tuya/UniversalTuyaParser.js` — **quarantined** (no live requires; do not import)
- Prefer not to grow `AdaptiveDataParser` scale paths that re-divide after SmartDivisor

## Contre quoi

`AdaptiveDataParser` `/100` then mapping `/100` again → double-division gate (`npm run check:double-division`).

## Couple knowledge

`data/dp_couple_knowledge.json` + `npm run sync:dp-knowledge` — never invent productId.
