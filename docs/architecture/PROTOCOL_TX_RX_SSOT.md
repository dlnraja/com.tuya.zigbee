# Protocol TX/RX SSOT (P2269)

Canonical order for Homey Zigbee/Tuya I/O. Prefer these modules over new cascades.

## Runtime spine

1. **Lexicon** — `lib/zigbee/ZclClusterLexicon.js` (normalize cluster id/name)
2. **Detect** — `lib/protocol/IntelligentProtocolDetect.js` (ZCL / EF00 / HYBRID; sacred `zcl_only` first)
3. **Path table** — `PROTOCOL_PATHS` in `lib/layers/ProtocolRxTxChain.js`
4. **Rank** — `lib/protocol/CommunicationPathFinder.js` (`rankPaths` — no side effects)
5. **Execute** — `DeviceIOFacade` + `ProtocolFallbackChain` + `FallbackChains`
6. **Commit** — `safeSetCapabilityValue` (L14)

## LowLevelBridge (P34 legacy)

`lib/LowLevelBridge.js` remains as a thin compatibility layer that should delegate toward `ProtocolFallbackChain`. Do not invent a parallel 6-level cascade.

## Hard rules

- Never force `tuya_dp` on sacred BSEED / `zcl_only`
- Sleepy IAS: skip leftover EF00 TX — **`lib/io/shouldSkipIasOnlyEf00Tx.js`** (P2287 pure helper; re-exported from `DeviceIOFacade`)
- Brightness MCU 0–1000 via `TuyaBrightnessScale`

See also: [COMM_PATHFINDING.md](./COMM_PATHFINDING.md), [LAYERS_CAPABILITY_PROTOCOL.md](./LAYERS_CAPABILITY_PROTOCOL.md), [PUBLISH_SSOT.md](./PUBLISH_SSOT.md).
