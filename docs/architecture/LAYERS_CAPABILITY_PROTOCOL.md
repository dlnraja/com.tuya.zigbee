# Capability / protocol layers (maintainable map)

Short map of how Universal Tuya turns raw Zigbee/Tuya bytes into Homey capabilities.
Prefer editing these modules over copying logic into every `device.js`.

## Vertical stack (raw → Homey)

| Layer | Role | Canonical modules |
|-------|------|-------------------|
| L0 Raw TX/RX | Cluster frames, EF00 payloads | `zigbee-clusters`, `lib/TuyaSpecificCluster*`, `lib/io/DeviceIOFacade` |
| L1 Lexers / parsers | DP id/type/length/value; ZCL attrs | Tuya DP decode in EF00 managers |
| L2 Translators | Scale, polarity, units | `SmartDivisorManager`, `UnifiedBatteryHandler`, polarity settings |
| L3 Protocol route | DP vs ZCL vs proprietary overlay | `IntelligentProtocolRouter`, `ProtocolAutoOptimizer`, `ZigbeeProtocolComplete` |
| L4 Time / MCU | Epoch + format guess | `lib/tuya/GlobalTimeSyncEngine`, `TuyaTimeSyncFormats` |
| L5 Capability write | L14 sanity + anti-flood | **`safeSetCapabilityValue()`** on `TuyaZigbeeDevice` |
| L6 UI / flows | Virtual ↔ physical, flow cards | `VirtualButtonMixin`, `PhysicalButtonMixin`, `FeatureFlowCards`, `driver.flow.compose.json` |

**Spine base (required for L3–L6):** `lib/tuya/TuyaZigbeeDevice.js`

**Soft attach for lineages that skip Unified* bases:** `lib/layers/UniversalLayerBootstrap.js` (called from `TuyaZigbeeDevice.onNodeInit`) — ProtocolAutoOptimizer + IntelligentProtocolRouter + EF00 time sync when missing.

### Driver lineage coverage (P206)

| Base | Extends | Notes |
|------|---------|--------|
| `UnifiedSwitchBase` / Sensor / Light / … | `TuyaZigbeeDevice` (via Unified) | Full stack + optimizer in base |
| `TuyaZigBeeLightDevice` | `TuyaZigbeeDevice` | Stub RGB/tunable bulbs |
| `lib/tuya/TuyaSpecificClusterDevice` | `TuyaZigbeeDevice` | EF00 DP writers |
| `lib/TuyaSpecificClusterDevice` | `TuyaZigbeeDevice` | Legacy path (same L14) |
| `generic_diy` / `ir_blaster` | `TuyaZigbeeDevice` | Was bare `ZigBeeDevice` |
| Orphan `lib/GlobalTimeSyncEngine.js` | re-exports `lib/tuya/…` | Do not fork |

Gate: `node tools/ci/layer-coverage-gate.js` · test: `test/critical/layer-coverage.test.js`

## Energy & battery

- **Never** linear `(V - 2.5) / 0.5`.
- Prefer `BatteryMasterEngine` / `UnifiedBatteryHandler` (`normalizeZigbeeValue`, `tuyaDpToPercent`, anti-flood).
- ZCL `batteryPercentageRemaining` is often 0–200 → divide by 2 inside normalizer.
- Mains devices: `get mainsPowered() { return true; }` and strip phantom `measure_battery`.
- Writers must use `safeSetCapabilityValue` (see P205 / `tools/ci/l14-capability-writers-gate.js`).
- Virtual estimates (no hardware meter): `VirtualEnergyMeterMixin` — never overwrite real power; no compose `energy.approximation` with `measure_power`/`meter_power`. Detail: [`LAYERS_ENERGY_BUTTONS_FLOWS.md`](LAYERS_ENERGY_BUTTONS_FLOWS.md).
- Live fingerprint OTA overlay: `LiveDataUpdater` (CI Pages feed) — capped store; must not OOM Homey heap (P148).

## Buttons (multi-gang, app + wall)

1. Virtual UI → `_safeSetCapability` + `markAppCommand(gang)` before ZCL/DP send.
2. Physical wall → `PhysicalButtonMixin` debounce / sliding window; ignore marked app echoes.
3. Flow IDs: `{driver}_physical_gang{N}_{on|off}` — no `titleFormatted` with `[[device]]`.
4. App-level fallback: `button_pressed` / `virtual_button_pressed` (P205).

## Pairing identity

Sacred couple = `(manufacturerName + productId)`. Same mfr in two drivers is OK only with different productIds. Same couple in two drivers = pairing conflict.
Misattribution cases: `data/user-misattribution-registry.json` (+ matcher force).

## Dual-app

| Track | Rule |
|-------|------|
| `master` | Static compose + dynamic JSON (features OK) |
| `stable-v5` | Static + reliability only |

## CI vs Homey runtime

| Layer | Owns |
|-------|------|
| GitHub Actions | Crawl, Gmail diags, gates, Auto-Publish to Test |
| App runtime | Zigbee/DP/ZCL, caps, flows, safe timers — **not** self-mutating repair bots |
| Cursor / humans | Surgical code fixes → push → CI publish |

Do **not** auto-generate Homey `Homey.Driver` skeletons from Z2M search into PRs without sacred-couple review.

User troubleshooting: [`docs/guides/USER_TROUBLESHOOTING.md`](../guides/USER_TROUBLESHOOTING.md)  
Contribute: [`.github/CONTRIBUTING.md`](../../.github/CONTRIBUTING.md) · [`docs/CONTRIBUTING.md`](../CONTRIBUTING.md)  
`lib/` map: [`lib/README.md`](../../lib/README.md)

## Anti-slop checklist

- No marketing banners / emoji walls in runtime logs or public Pages heroes.
- Store name: **Universal Tuya** (honest scope).
- Deprecated hybrids: sentinel mfrs, not empty catch-alls.
- Document *why* in the module header; keep device.js thin.
- Forum: silent by default (T157628); human drafts only when asked.
