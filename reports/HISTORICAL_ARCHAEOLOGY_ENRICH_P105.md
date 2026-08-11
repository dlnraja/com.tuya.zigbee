# Historical Code Archaeology Enrichment — 2026-08-11 (P105)

## Scope

Git history was purged (first visible ~v9.0.192). Recovered high-value modules deleted as “dead” or left under-wired, and folded them into current bases — not mass-pasted into 430 drivers.

## Restored / rewired

| Gem | Origin | Where it lands now |
|-----|--------|--------------------|
| `MagicPacketRegistry` | pre-P92.17 (`ffdfa39af^`) | `lib/tuya/MagicPacketRegistry.js` + Path D in `TuyaMagicPacket` |
| `MCUVersionHelper` | same | `lib/tuya/MCUVersionHelper.js` |
| `EventDeduplicationLayer` | stable-v5 era, file existed but unused | wired in `TuyaZigbeeDevice.safeSetCapabilityValue` + destroy on uninit/delete |
| `DriverFlowCardSupport` runListener guard | `codex-diag-timeouts` | `HomeyCompensationLayer.safeGetFlowCard` + `ZigBeeDriverFlowCardPatch` |
| Button mixin safe-timers | crash lessons (setTimeout after destroy) | `PhysicalButtonMixin` / `VirtualButtonMixin` |

## Behaviour notes

- Magic MCU profiles: ZT08 / LCD `_TZE20x_`+`TS0601` / BSEED / Xiaomi keepalive stub / TS0601 standard — **specific before general**.
- EventDedup: 300ms window per `(deviceId, capability, value)` — fail-open if layer errors.
- Flow cards: duplicate `registerRunListener` swallowed (already-registered + global Set).

## Not in this pass (deferred)

- Full IAS type/WD elevate from deleted UniversalIasDevice (exotic profiles already cover many cases).
- Mass bare-`ZigBeeDevice` → DeviceIOFacade (gate + allowlist remain; incremental).
- Stable-v5 reliability backport — only after Test channel clean.

## Version

master → **9.0.458**
