# Communication pathfinding (P2270)

Flexible understanding of Zigbee / Tuya device communications for drivers, CI, and AI contributors.

## Pipeline (do not invent a parallel one)

```text
Lexicon (ZclClusterLexicon)
  → Decision tree (IntelligentProtocolDetect)
  → Function table (PROTOCOL_PATHS in ProtocolRxTxChain)
  → Ranker (CommunicationPathFinder.rankPaths)
  → Executors (FallbackChains / ProtocolFallbackChain / DeviceIOFacade)
  → L14 safeSetCapabilityValue
```

## When to use what

| Tool | Use for |
|------|---------|
| `lookupCluster` / `parseClusterMentions` | Normalize `0xEF00`, `manuSpecificTuya2`, forum text |
| `applyIntelligentProtocol` | ZCL vs EF00 vs HYBRID; sacred `zcl_only` first |
| `PROTOCOL_PATHS` | Catalog of TX/RX paths + `sleepySafe` / `cost` / `needsMagic` |
| `rankPaths(ctx)` | Score paths for a device context (no side effects) |
| `FallbackChains` / DeviceIO | Actually read/write when unsupported |

## Hard rules

- Sacred couple = `manufacturerName` + `productId` only — never invent a pid.
- BSEED / `zcl_only` → `tuya_dp` must rank last (PathFinder subtracts 100).
- Sleepy IAS → avoid leftover EF00 TX and configureReporting storms.
- MCU dimmer brightness 0–1000 via `TuyaBrightnessScale`.

## Related

- [LAYERS_CAPABILITY_PROTOCOL.md](./LAYERS_CAPABILITY_PROTOCOL.md)
- [SPAGHETTI_MAP.md](./SPAGHETTI_MAP.md) (if present)
- `npm run discover:discussions` · `test/critical/p2270-discussion-harvest-gate.test.js`
