# MCU / time-sync SSOT (P2269 + P2360)

## Canonical

| Role | Module |
|------|--------|
| Format DB + `guessFormat` / fallback chain | `lib/tuya/TuyaTimeSyncFormats.js` |
| Runtime engine | `lib/tuya/GlobalTimeSyncEngine.js` |
| Root shim | `lib/GlobalTimeSyncEngine.js` → re-exports tuya engine |
| MCU version init | `lib/tuya/MCUVersionHelper.js` (skip 0x10 when battery-cover / DISABLE_MCU_VERSION_RESPONSE) |
| Firmware quirks | `lib/tuya/MCUFormatDatabase.js` (`FORCE_UPDATE`, `DP17_COMMIT`, …) |
| Brightness MCU scale | `lib/tuya/TuyaBrightnessScale.js` (0–1000 clamp) |

## Rules

- Always `guessFormat(deviceInfo)` for unknowns — never hardcode one format
- MCU v3.3+ often needs **10-byte seq** response (`TUYA_SEQ_10` / `_E2K`) — never map to 9-byte `TUYA_MCU`
- `GlobalTimeSyncEngine.syncTime` must `buildPayload` + `getFallbackChain`; echo `sequenceNumber` on device request
- ZT08 / some LCD: DP17 commit after time sync
- ZTH05Z (`vvmbj46n`): `FORCE_UPDATE` hourly via `schedulePeriodicSync`
- Homey gap: ZHA/Z2M time-handler TypeErrors → our Formats fallback chain
- Battery covers (ZM16EL class): **dataQuery only** — never `mcuVersionRequest` (Z2M #28655)

## Contre quoi

Single hardcoded TUYA_MCU / `{utc,local}`-only TX → LCD/TRV stuck clock / mesh spam after reboot.
Unconditional 0x10 → battery cover drain.
`dim * 1000` without clamp → MCU reboot (Z2M #32305).
