# P194 — firmwareUpdates / OTA / WiFi local-first

Date: 2026-08-16  
Track: OTA path/integrity/subset = **BOTH** (reliability). Generator intelligence + WiFi protocol auto = **MASTER_ONLY**.

## Why Homey Validate failed on OTA

Homey v13.2+ resolves `files[].name` as a basename under `drivers/<id>/assets/firmware/<name>`.
The generator wrote bins in the **driver root** and advertised every productId on the driver.
That is how `wall_curtain_switch` failed Validate (metadata moved, binary left behind) and how
a plug image on `button_wireless_2` could have been offered to TS004x remotes.

## OTA fixes

- Moved breaker / TRV / plug / cover bins into `assets/firmware/`.
- Copied the TRV image onto `thermostatic_radiator_valve` (compose already referenced it).
- Removed the plug OTA from `button_wireless_2` (wrong class).
- Tightened `device.productId`:
  - cover → `TS130F`
  - TRV → `TS0601`
  - breaker/plug → `TS0001` / `TS011F` / `TS0111` only
- Generator now writes `assets/firmware/`, routes via registry + exclusive compose claim,
  refuses class mismatch, never dumps the whole driver productId list.
- New gate: `tools/ci/firmware-updates-gate.js` (wired in Unified CI + weekly sovereign loop).

## WiFi fixes (master-only)

- `LocalWiFiTuyaBridge` refreshes the live session IP on UDP `device-found` / `device-updated`.
- `TuyaLocalDevice` walks 3.1–3.5 when protocol is `auto` **or** the legacy default `3.3`.
- 29 Tuya `wifi_*` drivers expose `auto` in the protocol dropdown (new pairings default to auto).
- New gate: `tools/ci/wifi-local-first-gate.js` — `device_id` + `local_key` + IP + `auto`.

Cloud fallback stays off unless the user opts in. Do not backport feature managers to stable-v5.
