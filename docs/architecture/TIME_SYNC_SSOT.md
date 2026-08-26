# MCU / time-sync SSOT (P2269)

## Canonical

| Role | Module |
|------|--------|
| Format DB + `guessFormat` / fallback chain | `lib/tuya/TuyaTimeSyncFormats.js` |
| Runtime engine | `lib/tuya/GlobalTimeSyncEngine.js` |
| Root shim | `lib/GlobalTimeSyncEngine.js` → re-exports tuya engine |

## Rules

- Always `guessFormat(deviceInfo)` for unknowns — never hardcode one format
- MCU v3.3+ often needs 10-byte seq response
- ZT08 / some LCD: DP17 commit after time sync
- Homey gap: ZHA/Z2M time-handler TypeErrors → our Formats fallback chain

## Contre quoi

Single hardcoded TUYA_MCU payload → LCD/TRV stuck clock / mesh spam after reboot.
