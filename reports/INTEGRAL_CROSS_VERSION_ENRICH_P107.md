# P107 — Integral cross-version enrichment (2026-08-11)

## Method

Cross-referenced:
- Branches: `master`, `stable-v5`, `codex-diag-timeouts`, tags `v9.0.*`
- Docs: `SLEEPY_TUYA_56_YEARS_BUG`, P105/P106 reports, Phoenix SmartDivisor rules
- Stable still carries `IASZoneEnhanced`, `MCUFormatDatabase`, `SmartDivisorManager`
  — present on master but **under-wired** into EF00 / DeviceIO / negotiate paths

## Applied integrally (bases)

| Gap | Source | Fix |
|-----|--------|-----|
| Adaptive `/100` temp vs Tuya ×10 | SmartDivisor rules + EF00 comments | `TuyaEF00Manager` prefers `smartParse` before Adaptive converters |
| IAS zoneType/status unused | `IASZoneEnhanced` (stable era) | DeviceIO `_installIasZoneEnhanced` after CIE enroll; L14 `safeSetCapabilityValue` |
| fuseSos only bool/object | IAS Zone bitmasks | Numeric `zoneStatus` bit decode + tamper/battery |
| Sleepy "56 years ago" | docs/rules/SLEEPY_TUYA | `runInterviewCompensation` forces passive EF00 for TS02/TS004/TS130/TS0601/_TZE |
| MCU time format | `MCUFormatDatabase` | `HomeyCompensationLayer.negotiateMcu` lookup before `guessFormat` |

## Explicitly not done (policy)

- Mass FP dump / bare-driver inheritance rewrite ×26
- Feature managers onto stable-v5
- Stable backport until Test channel clean on 9.0.461+

## Version

master → **9.0.461**
