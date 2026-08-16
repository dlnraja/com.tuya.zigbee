# Capability / protocol layers (maintainable map)

Short map of how Universal Tuya turns raw Zigbee/Tuya bytes into Homey capabilities.
Prefer editing these modules over copying logic into every `device.js`.

## Vertical stack (raw → Homey)

| Layer | Role | Canonical modules |
|-------|------|-------------------|
| 0 Raw TX/RX | Cluster frames, EF00 payloads | `zigbee-clusters`, `lib/TuyaSpecificCluster*` |
| 1 Lexers / parsers | DP id/type/length/value; ZCL attrs | Tuya DP decode in EF00 managers |
| 2 Translators | Scale, polarity, units | `SmartDivisorManager`, `BatteryMasterEngine`, polarity settings |
| 3 Capability write | L14 sanity + anti-flood | `safeSetCapabilityValue()` on `TuyaZigbeeDevice` |
| 4 UI / flows | Virtual ↔ physical, flow cards | `VirtualButtonMixin`, `PhysicalButtonMixin`, `driver.flow.compose.json` |

## Energy & battery

- **Never** linear `(V - 2.5) / 0.5`.
- Prefer `BatteryMasterEngine` (`normalizeZigbeeValue`, `tuyaDpToPercent`, anti-flood).
- ZCL `batteryPercentageRemaining` is often 0–200 → divide by 2 inside normalizer.
- Mains devices: `get mainsPowered() { return true; }` and strip phantom `measure_battery`.

## Buttons (multi-gang, app + wall)

1. Virtual UI → `_safeSetCapability` + `markAppCommand(gang)` before ZCL/DP send.
2. Physical wall → `PhysicalButtonMixin` debounce / sliding window; ignore marked app echoes.
3. Flow IDs: `{driver}_physical_gang{N}_{on|off}` — no `titleFormatted` with `[[device]]`.

## Pairing identity

Sacred couple = `(manufacturerName + productId)`. Same mfr in two drivers is OK only with different productIds. Same couple in two drivers = pairing conflict.

## Dual-app

| Track | Rule |
|-------|------|
| `master` | Static compose + dynamic JSON (features OK) |
| `stable-v5` | Static + reliability only |

## Anti-slop checklist

- No marketing banners / emoji walls in runtime logs or public Pages heroes.
- Store name: **Universal Tuya** (honest scope).
- Deprecated hybrids: sentinel mfrs, not empty catch-alls.
- Document *why* in the module header; keep device.js thin.
