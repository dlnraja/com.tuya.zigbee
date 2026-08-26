# Weakness vectors L99 — 2026-08-26 (P2284)

**Classify:** `BOTH` (reliability — handleFrame orphan, MISATTR couple, L0 dedup).  
**Forum:** SHADOW only — no posts.

## Verdict

Critical RX chain orphans (blind `node.handleFrame =` + L0 dedup/shed `return` without `next`) are closed on master. Remaining vectors are tracked with gates; do not invent pids or blind-fill all MISATTR `forbidMode`.

## Vectors studied → action

| # | Vector | Severity | Status |
|---|--------|----------|--------|
| V1 | Blind `node.handleFrame=` orphans Physical 0xFD / IO EF00 | S1 | **FIXED** — `wrapHandleFrame` SSOT (P2283/P2284) |
| V2 | L0 exact-dedup / RX-shed returned without `next` | S1 | **FIXED** — always `next(...args)`; `keepAlways` for OnOff/IAS/EF00 |
| V3 | `UnifiedSwitchBase` / `UnifiedSensorBase` L0 overwrite | S1 | **FIXED** — `super._setupRawFrameFallback()` |
| V4 | Tuya P0 EF00 low-level override | S1 | **FIXED** — tags `tuya-unified-p0-ef00` / `unified-sensor-p0-ef00` |
| V5 | `UniversalZigbeeDevice` early `return` on SKIP/dup | S2 | **FIXED** — wrap + always forward |
| V6 | HOBEIAN multi-device brand MISATTR without `forbidMode:couple` | S1 | **FIXED** — ZG-305Z + existing HOBEIAN couples |
| V7 | Endpoint-level `ep.handleFrame` wraps (DPReceiver / ClusterWrapper) | S3 | **ACCEPT** — different object; still call `orig` |
| V8 | TS0601 cartesian / enricher reinject | S1 | **GATED** — p2138 + softHypothesis (no invent) |
| V9 | IAS sleepy leftover EF00 / zoneStatus | S1 | **PARTIAL** — runtime stack present; wire more gates |
| V10 | Dual publish P139 Stable processing_failed | S2 | **POLICY** — no spam republish |
| V11 | Battery linear / half-percent | S1 | **GATED** — P216 |
| V12 | Double-division energy/temp | S1 | **GATED** — SmartDivisor + adaptive gate |

## Patches landed (this cycle)

- `lib/tuya/TuyaZigbeeDevice.js` — chain L0 + forward on dedup/shed
- `lib/devices/UnifiedSwitchBase.js` / `UnifiedSensorBase.js` — super L0 + P0 wrap
- `lib/devices/TuyaUnifiedDevice.js` — P0 wrap
- `lib/UniversalZigbeeDevice.js` — wrap + always next
- `lib/io/DeviceIOFacade.js` — `io-passive-ef00` (prior)
- `data/user-misattribution-registry.json` — HOBEIAN ZG-305Z `forbidMode:couple`
- Gate: `npm run check:p2284` · `test/critical/p2284-handleframe-chain.test.js`

## Contre quoi (regression)

Without V1–V5: Peter-class remotes wake with battery but no flows; wall switches lose 0xFD after IO passive attach.

## Next (not inventing)

- Surgical `forbidMode:couple` only for verified multi-brand mfrs (never mass-fill)
- ~~Stable backport of P2284 runtime files~~ (done 5.12.94)
- IAS gate list fill in `critical-gaps.json` when tests exist
- **P2286 publish harden** (2026-08-26): changelog inject, refuse repo-root publish,
  soft-expect skip duplicate createBuild, sacred-keep pin list under compaction
