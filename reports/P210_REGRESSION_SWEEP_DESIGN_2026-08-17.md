# P210 — Full-stack regression sweep (design → dual-track)

**Date:** 2026-08-17  
**Method:** Search → list → investigate → cross-ref (Z2M/Homey/internet) → suggest → design → implement → enrich CI → push → publish → monitor → recurse

## Dual-track doctrine (non-negotiable)

| Track | Goal | Policy |
|-------|------|--------|
| **master** | Intelligent / avant-garde | Features, ProtocolRxTx, multi-protocol battery, SmartCap, experimental OK after soak |
| **stable-v5** | Ultra-stable / reliability | Surgical BOTH backports only (crash/timer/SDK3/misattr). **Never** copycat full trees or App ID |

Shared Homey App ID → Publish Stable→Test overwrites master Test. Prefer master Auto-Publish for Test soak.

## Stage A — Inventory (regressions)

### P0 (block Test / CI)
1. **mfs_db clrdrnya drift** — Syntax Check fails: registry_force must narrow modelIds to `TS0601` only (`align-mfs-db-intelligent --apply`).
2. **P209 uncommitted** — MultiProtocolBatteryPercent not on remote yet.
3. **Auto-Publish 31978327812** — monitor until Test (expect 9.0.571); P139: no bump-spam on socket hang up.

### P1 (master enrichment)
4. **Gates orphaned** — `layer-coverage-gate.js`, `l14-capability-writers-gate.js`, multi-protocol battery tests not wired in workflows.
5. **Doc drift** — `docs/FORUM_RESPONSES.md` / plans still invent `com.dlnraja.tuya.zigbee.stable`; GLOBAL_INVESTIGATION_PLAN warns against it.
6. **Stale architecture refs** — BaseHybridDevice / HybridSwitchBase still documented as live L7 in places; code uses Unified* / TuyaZigbeeDevice.
7. **Battery scale (Z2M lesson)** — per-device 0–100 vs 0–200 (`dontDividePercentage`); our MultiProtocol + manufacturer quirks align; keep learning, never global force-/2.

### P2 (stable surgical later)
8. IAS sleepy abort / safe-timers / misattr (already BOTH P203–P204) — verify tip parity, no feature managers.
9. TitleFormatted `[[device]]` remaining in app-level compose — gate expand (not forum).

## Stage B — Cross-ref (external)

| Source | Insight applied |
|--------|-----------------|
| Z2M / herdsman | Battery 0–200 vs 0–100 is **device-specific**; wrong global divide halves % (ZG-227Z, IKEA remotes). |
| Homey forum T140352 | Sleepy interview → empty mfr/model; UNSUPPORTED_ATTRIBUTE 0x86 → UnsupportedRegistry + poll fallback (already P92/P207). |
| Homey interview JSON | `acl: readable/reportable` on powerCfg — “acl” in user speak = attribute ACL / IAS ACE → mapped in P209. |

## Stage C — Design (what we implement now)

**Wave 1 (this session — master):**
1. Apply mfs_db clrdrnya registry_force.
2. Land P209 battery multi-protocol + docs.
3. Wire `layer-coverage-gate` + `l14-capability-writers-gate` + battery test into `syntax-check.yml` (non-fatal soft or hard — prefer hard for layer/l14, battery tests in node --test step if present).
4. Soft-correct live identity note in `docs/FORUM_RESPONSES.md` (shared App ID, no fake `.stable`).
5. Push → Auto-Publish → monitor until Test success.
6. **stable-v5:** only if a BOTH crash/misattr delta remains — adapted patch, not tree sync.

**Wave 2 (next):**
- titleFormatted gate for `.homeycompose/flow`
- Doc prune HybridSwitchBase → UnifiedSwitchBase pointers
- WiFi battery path call `ingestBatteryPercent` in LocalWiFi bridge if raw % exists

## Stage D — Success criteria

- Syntax Check green (mfs align applied).
- Homey Test shows version ≥ 9.0.571 with P207–P209.
- Gates run on every push.
- stable untouched unless BOTH reliability item identified.
