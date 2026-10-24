# P3023 — memory budget and smarter (bounded) layers

Goal: keep the app well inside Homey's per-app heap (≈70–100 MB) while making the
unknown-device layers smarter. Everything is **additive**: no capability is removed, nothing
is sent at pairing, and no manufacturer / model ID is invented (couple keys are exact
`manufacturerName|modelId` pairs taken from the device itself).

## Memory

| Layer | Bound |
|---|---|
| `lib/memory/BoundedMap` | generic LRU + TTL map used by the new layers |
| `lib/memory/CatalogStore` | DP catalogue lazily loaded from 32 hashed shards (`lib/zigbee/data/dp-shards`), couple LRU 256, 4 shards in memory; full catalogue only as fallback when shards are stale; one instance per app |
| RawFrameDeduplicator | 128 keys LRU per device (was unbounded in time window) |
| UnknownCommandEngine | recent 32 / lastFlow 48 / lastLog 48 / lastDpVal 32, hashed values |
| UnknownCommandSink | ring 16 × 96 hex chars, lastFlow 32 |
| UnsupportedRegistry | soft counters 48 (persisted keys unchanged at 200) |
| ZigbeeCommandPacer | ≤ 32 pending commands per device, background lanes shed first |
| MethodChain | working copy cached per device, dropped by `trim()` |
| CoupleKnowledge | 128 couples × 16 chain winners × 24 patterns, ≤ 48 KB persisted, versioned |
| ValueAnomaly | ≤ 12 capabilities × 8 samples per device |

`lib/memory/MemoryBudget` samples the heap once a minute (unref'd timer) and degrades in order:
`elevated` 45 MB → release catalogue caches; `high` 60 MB → trim per-device soft state and
background TX queues, re-probes ×2 slower; `critical` 75 MB or Homey `memwarn` → heuristics
paused, re-probes ×4 slower. Core control paths and capabilities are never touched.
`UnknownLifecycle.releaseDevice` now also detaches EndpointCoverage listeners and frees the
pacer queue, dedup cache, method-chain copy and anomaly state on delete / uninit.

Simulation: `node --expose-gc tools/perf/p3023-memory-sim.js . 150 10000`.
CI guard: `test/critical/p3023-memory-bounded.test.js` fails if per-device state keeps
growing after warm-up.

## Smarter (soak on master, flags in `lib/smart/SoakFlags.js`)

- **ConfidenceModel** — Beta-posterior confidence per tier (exact > user > catalogue > family > heuristic), updated by confirmations / contradictions.
- **CoupleKnowledge** — app-level learning per exact couple (method-chain winners, confirmed button patterns); a device's own history always wins.
- **AdaptiveBackoff** — re-probe delay from per-step success history; battery / sleepy devices never get probes faster than 1 h.
- **ValueAnomaly** — range / rate / scale checks; auto-correction only after the same ×10ⁿ scale is seen 3 times, never for power / energy (left to the energy guards).
- **Adaptive dedup windows** in RawFrameDeduplicator learned from real repeat gaps.
- **Prioritised command queue** — user commands before polls / re-probes, with backpressure.

On stable-v5 and bastien-home all flags are `false`: only the memory fixes and the pure
helpers ship there.

## Credits (ideas, re-implemented — no code copied)

- Zigbee Home Automation (ZHA / zigpy): quirk matching by exact manufacturer/model, bounded
  request queues with priorities.
- Zigbee2MQTT / zigbee-herdsman(-converters): Tuya DP tables as the source of the DP catalogue,
  per-device debounce and value calibration ideas.
- deCONZ: polling back-off for sleepy end devices and confidence in learned behaviour.
