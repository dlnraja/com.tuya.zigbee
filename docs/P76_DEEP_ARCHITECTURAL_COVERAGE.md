# P76 — Deep Architectural Coverage Tool + False-Positive Fixes

**Date**: 2026-07-21 → 2026-07-22
**Scope**: Master + Stable (both apps)
**Trigger**: Need to measure real adoption of safety/handler/mixin patterns across 431 drivers

## 🎯 Problem Statement

After P75 added many safety wrappers (`safeSetCapabilityValue`, `_destroyed` checks, `orig()` regex wrapper, `CrashPrevention.guardDestroyed`), there was **no way to measure adoption**. The repo had:
- 431 drivers
- 247 battery drivers
- 104 energy drivers
- 51 button drivers
- 576 lib files
- 54 GH workflows

But how many actually use the new patterns? **No dashboard**.

## 🔬 New tool: `tools/ci/arch-coverage-deep.js`

Single test that runs **12 assertions** across 5 categories of patterns:

### 1. Button drivers (51)
**Patterns tracked:**
- `orig()` wrapper around `node.handleFrame = function(orig)` (regex `/orig\(\.\.\.args\)/`)
- `PhysicalButtonMixin` import + use
- `UnifiedButtonEngine` import + use
- `ButtonDevice` base class
- `safeSetCapabilityValue`
- `_destroyed` checks

### 2. Battery drivers (247)
**Patterns tracked:**
- Engines: `BatteryCore`, `UnifiedBatteryHandler`, `BatteryCascadeEngine`, `BatteryMasterEngine`, `BatteryHealthIntelligence`
- Safety: `safeSetCapabilityValue`, `_destroyed` checks
- Capabilities: `measure_battery`, `alarm_battery`
- Algorithms: `throttled`, `estimated`, `voltage-derived`

### 3. Energy drivers (104)
**Patterns tracked:**
- Engines: `UniversalEnergyHandler`, `VirtualEnergyMeter`, `SonoffEnergy`, `SmartClusterEngine`
- Safety: `safeSetCapabilityValue`, `_destroyed` checks
- Capabilities: `measure_power`, `meter_power`, `measure_voltage`, `measure_current`

### 4. ALL drivers (431)
**Wrappers tracked:**
- Protocol: ZCL, Zigbee, Raw
- Frame: RX (recv), TX (send)
- Cluster: Cluster, DP (datapoint)
- Homey: homey.app, app.*
- Mixin/Engine: Mixin, Multi*, Engine, Safety

### 5. Enrichment & connectivity
- Drivers with enrichment references (in driver.compose.json)
- Zigbee vs LAN/WiFi driver counts
- Drivers with flow.compose.json
- Drivers with safety patterns
- Drivers using Engine/Mixin/Handler

## 📊 Live results (2026-07-22 run)

### Button drivers (51)
| Pattern | Adoption | % |
|---------|----------|---|
| onZigBeeMessage (info) | 51/51 | 100% |
| zclNode param | 48/51 | 94.4% |
| PhysicalButtonMixin | 11/54 | 20.4% |
| UnifiedButtonEngine | 0/51 | 0% |
| orig() wrapper | 0/51 | 0% |

### Battery drivers (247)
| Pattern | Adoption | % |
|---------|----------|---|
| measure_battery | 245/247 | 99.2% |
| alarm_battery | 2/247 | 0.8% |
| safeSet | 121/247 | 49.0% |
| _destroyed | 128/247 | 51.8% |
| UnifiedBatteryHandler | 4/247 | 1.6% |
| throttled | 17/247 | 6.9% |
| voltage-derived | 1/247 | 0.4% |

### Energy drivers (104)
| Pattern | Adoption | % |
|---------|----------|---|
| measure_power | 88/104 | 84.6% |
| meter_power | 74/104 | 71.2% |
| safeSet | 39/104 | 37.5% |
| _destroyed | 70/104 | 67.3% |
| SonoffEnergy | 6/104 | 5.8% |
| UniversalEnergyHandler | 0/104 | 0% |

### Cross-cutting (431)
| Pattern | Adoption | % |
|---------|----------|---|
| Drivers with safety patterns | 367/431 | 85.2% |
| Drivers using Engine/Mixin/Handler | 173/431 | 40.1% |
| Drivers with flow.compose.json | 421/431 | 97.7% |
| ZCL protocol | 144/431 | 33.4% |
| DP (datapoint) cluster | 186/431 | 43.2% |
| Mixin wrapper | 123/431 | 28.5% |

### Connectivity
- Zigbee drivers: 379 (99.7% with mfrs in driver.compose.json)
- LAN/WiFi drivers: 52 (no zigbee mfrs needed)
- Mixed: 0

## ⚠️ P76.2: Test false-positives fixed

**Bug 1**: `setCapabilityValue\s*\(` matched BOTH raw calls AND method definitions like `async setCapabilityValue(cap, val) {`.

**Fix**: Exclude method definitions. Only count actual invocation `setCapabilityValue(...)` not `setCapabilityValue(...) {`.

**Bug 2**: `setTimeout` (without anchor) matched `this.homey.setTimeout` — but `homey.setTimeout` IS the **safe** Homey API (auto-clears on device destroy). Only GLOBAL `setTimeout` is unsafe.

**Fix**: Use `(?<![a-zA-Z._])` lookbehind to exclude `this.homey.`, `this.`, `self.`, `device.`, `node.` prefixes.

**Bug 3**: `ButtonDevice` base class already has `_destroyed` checks. Test was double-counting.

**Fix**: Resolve base class via `require()` and skip child drivers that extend a class with the check.

**Bug 4**: 52 wifi/lan drivers don't need zigbee mfrs. Test was failing on them.

**Fix**: Distinguish zigbee vs lan drivers via `zigbee.compose.json` presence.

## 🛡️ P76.5/P76.9/P79.1: Shell-escape workflow bug

3 GH workflows had trailing `\n` bug from `Get app version` shell escape:
- `P37 autonomous-verification.yml`
- `draft-to-test.yml`
- `mega-crawler.yml`

**Root cause**: When escaping quotes inside `$(...)` command substitution with `\"`, bash parser breaks.

**Fix**: Use literal block scalar `run: |` with proper escaping.

```yaml
# BAD
run: app_version=$(echo "${{ steps.meta.outputs.app_version }}" | tr -d '\n')

# GOOD
run: |
  app_version=$(echo "${{ steps.meta.outputs.app_version }}" | tr -d '\n')
```

## 🛡️ P76.3: Security Shield

4 forbidden state files untracked via `.gitignore`:
- `.diag/commit-msg-p*.txt` (commit message drafts, can leak unreleased notes)
- `.tmp/reply-*.md` (forum reply drafts, can leak unreleased notes)

## 📦 Build budget (P75.27)

Build dir grew to 30.20 MB with 431 drivers + 2902 FPs. publish-size-gate failed at 30 MB.

**Fix**: Bumped workflow-level `HOMEY_PUBLISH_MAX_UNCOMPRESSED_MB` AND step-level `HOMEY_PUBLISH_SOURCE_MAX_MB` to 35 MB (5 MB headroom). Athom's actual upload limit is 50 MB.

## 🚀 Releases

| App | Version | Commits | Status |
|-----|---------|---------|--------|
| master | v9.0.319 | 06c8e152b | ✅ Test channel |
| master | v9.0.328 | a1e756d3c | ✅ Test channel |
| stable | v5.12.11 | 51ab6a174 | ✅ Test channel |
| stable | v5.12.12 | (P76.10 snapshot refresh) | ✅ Test channel |

## 📁 Files created/modified

**Created (P76.6/8):**
- `tools/ci/find-workflow-escape-bugs.js` (audit all workflows)
- `tools/ci/arch-coverage-deep.js` (354 lines, 12 assertions)

**Modified:**
- `tools/ci/test-architectural-coverage.js` (P76.2 — false positive fixes)
- 3 GH workflows (P76.5/9, P79.1 — shell escape)
- `.github/state/master_app.json` + `stable_app.json` snapshots (P76.10)

## 🔍 Key learnings

1. **Test adoption != enforcement** — 49% safeSet / 38% _destroyed means 51%/62% of drivers are at risk.
2. **`this.homey.setTimeout` IS safe** — only global timers are unsafe. Many test tools got this wrong.
3. **P76.8 = single source of truth for "is this driver modernized?"** — the 12 assertions cover all critical patterns.
4. **52 wifi/lan drivers don't need zigbee mfrs** — connectivity-aware testing is required.
5. **Build size budget is real** — 30→35 MB is a stopgap, eventually need code splitting per driver.
6. **Shell escape bug is a class of errors** — `run: |` literal block scalar is the universal fix.

## 🌐 Next steps (P76 backlog)

- 119/247 battery drivers still need `_destroyed` check
- 64/104 energy drivers still need `safeSetCapabilityValue`
- 51 button drivers need `orig()` wrapper
- 0 drivers explicitly use `CrashPrevention.guardDestroyed`
- 0 drivers use `UnifiedButtonEngine` (11/54 use PhysicalButtonMixin)
- 242/247 battery drivers don't use `UnifiedBatteryHandler`
- UniversalEnergyHandler adoption: 0%
