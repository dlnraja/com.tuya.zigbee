# Homey Device Updates (P2357 / P2359)

Homey announced **Device Updates** (Aug 2026): Matter / Z-Wave / Zigbee firmware
can be installed from Homey without the manufacturer app.

Source: https://homey.app/en-fr/news/introducing-device-updates/  
SDK: https://apps.developer.homey.app/wireless/zigbee/zigbee-firmware-updates

## Requirements (Athom)

- Homey Pro / mini / Self-Hosted / Cloud with **firmware ≥ 13.2.0**
- Homey Mobile App **≥ 9.10.0**
- Zigbee images provided by the **Homey app** (`firmwareUpdates` + `assets/firmware/`)

## Where users look

1. Homey → **More (…) → Settings → Device Updates**
2. Or device → **Maintenance** → Check Device Updates

## Architecture (fused)

| Piece | Role |
|-------|------|
| `config/architecture/homey-device-updates.json` | SSOT: sources, safety, expected drivers, wake texts |
| `lib/ota/HomeyDeviceUpdates.js` | Runtime + CI helper (platform gate, UX strings) |
| `drivers/*/driver.compose.json` → `firmwareUpdates` | Couples (mfr+pid) + image metadata |
| `drivers/*/driver.firmware.compose.json` | `wakeInstruction` (sleepy) + optional updates |
| `drivers/*/assets/firmware/*` | OEM Zigbee OTA images (Koenkk index, SHA-verified) |
| `tools/ci/build-firmware-updates.js` | Refresh catalog (`--apply`); dry-run detect |
| `tools/ci/firmware-updates-gate.js` | CI: path / sha / header / class-tight / wake / coverage |
| `tools/ci/verify-homey-device-updates.js` | Full verify: gate + source dry-run + helper smoke |
| `TuyaZigbeeDevice._checkOtaRoutine` | Maintenance UX → Device Updates wording |
| Flow `ota_check_updates` | Same wording via notification |

## Sources & detection

1. **Primary:** Koenkk `zigbee-OTA` index (SHA512)
2. **Intersect:** `mfs_db` fingerprints (our catalog only)
3. **Route:** misattribution registry + exclusive compose claim (refuse generic/universal)
4. **Lock:** class-tight productIds only (never dump whole driver pid list)
5. **Verify:** OTA magic `0x0BEEF11E`, header ↔ manifest, sha256, size

## Safety (never brick)

- Class-tight productIds only (no plug image on TS0041 / TS130F)
- Skip generic / universal / bulb routes without registry lock
- Gate refuses wrong placement, sha mismatch, missing wakeInstruction on sleepy OTA drivers
- MCU EF00 devices (e.g. Moes curtain `_TZE204_5slehgeo`) improve via app DP — stack OTA only when OEM ZCL image exists

## CI commands

```bash
npm run check:firmware      # gate + coverage
npm run firmware:verify     # gate + dry-run source detect + helper
npm run firmware:build      # dry-run catalog refresh
npm run firmware:apply      # write bins + compose (review first)
```

## Dual-app

**BOTH** — reliability / Homey native OTA. Backport catalog + messaging + helper to `stable-v5` when shipping.
