# P3072 — Wi-Fi devices: one IP, follow IP changes, honest repair

Status: master (soak), then port. Ideas credited in `CREDITS.md` (tuya-local, localtuya, tinytuya); text and code are ours.

## Problem
- Tuya Wi-Fi devices kept their IP in up to three settings keys (`ip`, `device_ip`, `ip_address`).
  Repair wrote one key, the client read another: the device stayed "unavailable" after a fix.
- The UDP discovery saw a new DHCP address but only rewrote settings; the live TCP client kept
  dialling the old IP until the app restarted. No rate limit, no bound.
- `wifi_ir_remote` and every `wifi_sonoff_*` driver had a repair view without handlers.
- Ten `wifi_sonoff_*` drivers extended `ZigBeeDriver` or plain `Homey.Driver`, so their LAN pair
  view had no `configure` / `list_devices` handler: pairing could not finish.

## What changed
| Step | Change | Where |
|------|--------|-------|
| A | One effective IP (`effectiveIp`), every write mirrored to all keys present, one-time boot heal; `onSettings` reconnects with the *new* values | `lib/tuya-local/LocalIpSettings.js`, `TuyaLocalDevice.js` |
| A | Repair handlers for `wifi_ir_remote` and eWeLink/Sonoff | `lib/ewelink-local/eweLinkRepair.js` |
| A' | `wifi_sonoff_*` extend `EweLinkLocalDriver` (pair + repair + mDNS), own flow cards kept | `drivers/wifi_sonoff_*/driver.js` |
| B | `LanRebindRouter`: UDP `device-found`/`device-updated` → mirror IP + rebind live client (`onLanIpChanged` or `updateIP`); 60 s cooldown per device; 256-entry table; never throws; legacy loop kept as fallback | `lib/wifi/LanRebindRouter.js`, `app.js` |
| C | Repair status line (connected, IP, protocol, UDP last seen, IP mismatch, last error, key present — never the key) and **Find device on the network** (one burst probe, ≤15 s, adopts the answering IP) | `lib/tuya-local/LanRepairStatus.js`, 32 Tuya repair views |

## Rules kept
- Nothing new is mandatory at pairing; no behaviour change for devices whose IP never moves.
- Bounded memory and time: tables capped (256), one burst per re-probe, no timers left running.
- Zero manifest bytes (views and libs only).

## Tests
`test/critical/p3072-wifi-repair-coherence.test.js`, `p3072-sonoff-lan-pairing.test.js`,
`p3072b-lan-rebind-router.test.js` (includes a 20 000-announcement soak), `p3072c-lan-repair-status.test.js`.

## User-facing
`docs/user/FAQ_WIFI_LOCAL.md` §2 and §9.
