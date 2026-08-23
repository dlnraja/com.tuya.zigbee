# Capability / protocol layers (maintainable map)

Short map of how Universal Tuya turns raw Zigbee/Tuya bytes into Homey capabilities.
Prefer editing these modules over copying logic into every `device.js`.

## Vertical stack (raw → Homey)

| Layer | Role | Canonical modules |
|-------|------|-------------------|
| L0 Raw TX/RX | Cluster frames, EF00 payloads | `zigbee-clusters`, `lib/TuyaSpecificCluster*`, `lib/io/DeviceIOFacade` |
| L1 Lexers / parsers | DP id/type/length/value; ZCL attrs | Tuya DP decode in EF00 managers |
| L2 Translators | Scale, polarity, units | `SmartDivisorManager`, `UnifiedBatteryHandler`, polarity settings |
| L3 Protocol route | DP vs ZCL vs proprietary overlay | `IntelligentProtocolDetect`, `IntelligentProtocolRouter`, `ProtocolAutoOptimizer`, `ZigbeeProtocolComplete` |
| L3b Redundancy | Compensate unsupported / interview gaps; confirm I/O | `CrossLayerRedundancy`, `UnsupportedRegistry`, `FallbackChains`, `SmartDataValidator`, `ReceptionManager`, `HomeyCompensationLayer` / `ProtocolFallbackChain` |
| L3c RX/TX bus | Inventaire + enchaînement tous chemins | **`ProtocolRxTxChain`** (`device.tx` / `device.rx`) — DP, ZCL, tuya_bound, cluster_bound, raw, MCU, IAS, magic |
| L4 Time / MCU | Epoch + format guess | `lib/tuya/GlobalTimeSyncEngine`, `TuyaTimeSyncFormats` |
| L5 Capability write | L14 sanity + anti-flood | **`safeSetCapabilityValue(cap, value, { source })`** on `TuyaZigbeeDevice` |
| L6 UI / flows | Virtual ↔ physical, flow cards | `VirtualButtonMixin`, `PhysicalButtonMixin`, `FeatureFlowCards`, `driver.flow.compose.json` |

**Spine base (required for L3–L6):** `lib/tuya/TuyaZigbeeDevice.js`

**Soft attach for lineages that skip Unified* bases:** `lib/layers/UniversalLayerBootstrap.js` (called from `TuyaZigbeeDevice.onNodeInit`) — **IntelligentProtocolDetect** + ProtocolAutoOptimizer + IntelligentProtocolRouter + EF00 soft-attach + EF00 time sync + **CrossLayerRedundancy** + ProtocolRxTxChain.

### Intelligent ZCL ↔ EF00 detection (P214)

Single source of truth: `lib/protocol/IntelligentProtocolDetect.js` — used by all Unified* `_detectProtocol()` and by bootstrap for bare drivers.

| Priority | Rule | Result |
|----------|------|--------|
| 1 | Sacred / profile `zcl_only` (BSEED wall switches) | ZCL only — never force EF00 |
| 2 | EF00 + useful ZCL clusters | **HYBRID** listen; TX via cascade |
| 3 | EF00 only | `TUYA_DP` |
| 4 | ZCL only | `ZCL` |
| 5 | `TS0601` without EF00 but with ZCL | ZCL escape (PIR / IAS variants) |
| 6 | Ambiguous `_TZE*` / `TS060x` | HYBRID listen until optimizer learns |

Gates: `node tools/ci/p214-intelligent-protocol-gate.js` · `test/critical/p214-intelligent-protocol-detect.test.js`

### Cross-layer signal fusion (P211)

When the **same** capability arrives on two protocol layers (ZCL + DP, IAS + DP, …):

| Guard | Behaviour |
|-------|-----------|
| Cross-layer echo | Soft-equal value within window → **one** Homey write; second marked agree |
| Same-layer spam | Identical repeat → drop |
| Phantom block | `estimated` / `cached` cannot overwrite fresh hardware |
| Priority hold | Lower-trust source cannot thrash higher-trust inside the window |

Module: `lib/layers/LayerSignalFusion.js` — used by `confirmInbound` and `safeSetCapabilityValue({ source })`.
ReceptionManager soft-dedups cross-channel; EventDedup window extended (soft numeric).

Wire parsers to `confirmInbound(cap, value, source)` so fusion + SmartCap + L14 all see the source tag.

### Cross-layer redundancy (P207)

Goal: make ZCL↔DP↔raw↔IAS redundant so interview “unsupported”, incomplete Homey clusters, and crash/diag noise do not kill a driver.

| Access point | Role |
|--------------|------|
| `device.confirmInbound(cap, value, source, confidence)` | Multi-source agree → L14 write |
| `device.confirmOutbound(cap, expected, opts)` | Optimistic UI + soft peer confirm |
| `device.unsupportedRegistry` | Negative cache for `UNSUPPORTED_ATTRIBUTE` |
| `device.readSensorWithFallbacks(...)` | named ZCL → numeric raw → DP |
| `safeSetCapabilityValue(cap, val, { source })` | Bookkeep source into SmartCap / RX dedup |

### Protocol RX/TX chain (P208)

All protocol entry points are inventoried and cascaded:

| Path | TX | RX | Notes |
|------|----|----|--------|
| `tuya_dp` | ✓ | ✓ | EF00 sendDP / requestDP / query_all |
| `zcl` | ✓ | ✓ | writeZcl / readZcl / attr reports |
| `tuya_bound` | ✓ | ✓ | 0xE000 / E001 / E002 / ED00 / E004 |
| `cluster_bound` | ✓ | ✓ | bindCluster + configureReporting |
| `raw_frame` / `raw_value` | ✓ | ✓ | sendRaw + unhandled frames |
| `mcu` / `magic` | ✓ | ✓ | MCU version, magic handshake, query_all |
| `ias` | | ✓ | 0x0500 / 0x0501 zone status |
| `ui` | ✓ | | Homey UI / virtual |

API: `await this.tx({ kind:'dp', dp:1, value:true, capability:'onoff' })` · `await this.rx({ capability, cluster, attrs })` · `this.protocolRxTx.inventory()`.

Wire new parsers to `confirmInbound` / `this.tx` / `this.rx` instead of bare `setCapabilityValue`.

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
- **Multi-protocol % (P209):** `lib/battery/MultiProtocolBatteryPercent.js` — single normalize+commit for ZCL / Tuya DP / WiFi / IAS·ACE (`acl`) / voltage / raw / MCU.
  - API: `device.ingestBatteryPercent(raw, { protocol: 'zcl'|'tuya-dp'|'wifi'|'ias'|'voltage'|… })`
  - Commits via `confirmInbound` → L14; SmartBatteryManager + UnifiedBatteryHandler route through it.
- ZCL `batteryPercentageRemaining` is **spec 0–200 (0.5% steps)**. Many Tuya/IKEA devices already send **0–100**. Blind `/2` turns 100% into 50%. Always use `normalizeZclBatteryPercent()` (`lib/battery/zcl-percent.js`): ≤100 keep, 101–200 ÷2, 200→100%, 255→null.
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

## Complementary enrichment (P2224)

This L0–L6 map coexists with pipeline L0–L11, BYPASS L1–L9, and button L1–L8 — do not collapse.

- Glossary: [`config/resilience/layer-glossary.json`](../../config/resilience/layer-glossary.json)
- Domains: [`config/resilience/domains.json`](../../config/resilience/domains.json)
- Doctrine: [`COMPLEMENTARY_ENRICHMENT.md`](./COMPLEMENTARY_ENRICHMENT.md)
