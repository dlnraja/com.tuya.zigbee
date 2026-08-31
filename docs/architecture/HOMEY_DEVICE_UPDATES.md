# Homey Device Updates (P2357)

Homey announced **Device Updates** (Aug 2026): Matter / Z-Wave / Zigbee firmware
can be installed from Homey without the manufacturer app.

Source: https://homey.app/en-fr/news/introducing-device-updates/

## Requirements (Athom)

- Homey Pro / mini / Self-Hosted / Cloud with **firmware ≥ 13.2.0**
- Homey Mobile App **≥ 9.10.0**
- Zigbee images provided by the **Homey app** (`firmwareUpdates` + `assets/firmware/`)

## Where users look

1. Homey → **More (…) → Settings → Device Updates**
2. Or device → **Maintenance** → Check Device Updates

## What Universal Tuya ships

| Piece | Role |
|-------|------|
| `drivers/*/driver.compose.json` → `firmwareUpdates` | Couples (mfr+pid) + image metadata |
| `drivers/*/assets/firmware/*.bin` | OEM Zigbee OTA images (Koenkk index, SHA-verified) |
| `tools/ci/build-firmware-updates.js` | Refresh catalog (`--apply`) |
| `tools/ci/firmware-updates-gate.js` | CI: path / sha / header / class-tight pid |
| `TuyaZigbeeDevice._checkOtaRoutine` | Maintenance UX → Device Updates wording |
| Flow `ota_check_updates` | Same wording via notification |

## Safety (never brick)

- Class-tight productIds only (no plug image on TS0041 / TS130F)
- Skip generic / universal / bulb routes without registry lock
- Gate refuses wrong placement or sha mismatch

## Dual-app

**BOTH** — reliability / Homey native OTA. Backport catalog + messaging to `stable-v5` when shipping.

## Moes curtain note

`curtain_motor` (_TZE204_5slehgeo+TS0601) is **EF00 MCU** — Device Updates OTA applies to Zigbee stack images we publish for matching ZCL couples (e.g. `wall_curtain_switch` TS130F). MCU DP improvements remain app-side (P2356).
