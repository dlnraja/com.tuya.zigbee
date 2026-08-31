# P2359 — Homey Device Updates fusion (2026-09-01)

Silent. News: https://homey.app/en-fr/news/introducing-device-updates/

## Merged with P2357
- SSOT `config/architecture/homey-device-updates.json`
- Runtime helper `lib/ota/HomeyDeviceUpdates.js` (platform ≥13.2, UX)
- Gate: coverage + wakeInstruction + .bin/.zigbee + sacred couple
- Verify orchestrator: gate + Koenkk dry-run detect + helper smoke
- Sleepy wakeInstruction for contact/soil/radiator/TRV
- Changelogs EN/FR point to Settings → Device Updates
- Flow + Maintenance `_checkOtaRoutine` fused to same wording
- CI: `npm run check:firmware` / `firmware:verify` / unified-ci step

## Coverage
- 9/9 SSOT expected drivers with OTA
- Dry-run: 8 safe OEM routes / 18 skipped (generic/wide refuse)

## Dual-app
BOTH — backport helper + wake + UX + bins to stable-v5.
