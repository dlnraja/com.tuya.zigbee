# P77 / P78 / P79 — Battery & Button Cartography + Mega-Crawler Resilience

**Date**: 2026-07-22
**Scope**: Master + Stable (both apps)
**Triggers**:
- P77: Need to measure battery/button enrichment at scale
- P78: Refresh P29.7 temporal-monitor daily
- P79.1: Mega-crawler hanging on Tuya Cloud API timeouts

## 🎯 P77 — Battery & Button Enrichment Analysis Tools

### 247 battery drivers audited

**New tools created (P77):**
- `tools/ci/battery-cartography.js` — maps all 247 battery drivers, finds missing handlers
- `tools/ci/battery-gaps.js` — finds drivers without safeSet / _destroyed
- `tools/ci/battery-summary.js` — top-level summary of battery lib structure
- `tools/ci/button-cartography.js` — maps all 51 button drivers, finds HIGH/LOW issues
- `tools/ci/button-issues-deep.js` — deep dive into button handler patterns
- `tools/ci/check-open-buttons.js` — detects drivers with button count mismatch

### Battery lib structure
```
lib/battery/UnifiedBatteryHandler.js  (class with 247 methods, 1 export)
lib/battery/BatteryCalculator.js      (class with 12 methods, 1 export)
lib/battery/index.js                  (1 export, aggregator)
lib/utils/BatteryCurveFallback.js     (5 utility functions)
```

### Battery enrichment status (P77 snapshot)
- **safeSet adoption**: 121/247 (49.0%)
- **_destroyed check**: 128/247 (51.8%)
- **measure_battery capability**: 245/247 (99.2%)
- **UnifiedBatteryHandler**: 4/247 (1.6%)
- **BatteryCore**: 0/247 (0.0%)
- **throttled algorithm**: 17/247 (6.9%)

### Button cartography findings
- **51 button drivers** total
- **8 drivers with issues** (button count mismatch, HIGH severity)
- `button_wireless_smart`: buttonCount=1 but zigbee endpoints 1,2,3,4 → likely 4 buttons
- `button_wireless_switch`: similar mismatch

## 🎯 P78 — P29.7 Temporal-Monitor Daily Refresh

**Tool**: `tools/ci/temporal-monitor.js` (P29.7) tracks P-iteration activity over time.

**P78 actions:**
- Re-triggered P29.7 daily run (cron `p30-monitor-commits`)
- Refreshed temporal baseline (last P-iter = P77)
- v9.0.327 / v5.12.13 released on both apps

## 🎯 P79.1 — Mega-Crawler Continue-on-Error

**Problem**: `mega-crawler.yml` workflow had 1 step (`tuya-local` API) that timed out (ETIMEDOUT). This caused the entire workflow to fail, losing results from the other 11 steps.

**Root cause**: Default GH Actions behavior is to fail on first error. Multi-step crawlers need `continue-on-error: true` to keep going.

**Fix**: Added `continue-on-error: true` to all 12 mega-crawler steps. Exit code preserved in summary.

**P79.1 also created 2 new tools:**
- `tools/ci/mega-crawl-resilience.js` — runs all crawlers sequentially, recovers from individual failures
- `tools/ci/workflow-error-summary.js` — aggregates errors across workflow runs

## 📊 New P77 tools inventory

| Tool | Purpose | Drivers analyzed |
|------|---------|------------------|
| `battery-cartography.js` | Map all battery drivers | 247 |
| `battery-gaps.js` | Find missing safeSet/_destroyed | 247 |
| `battery-summary.js` | Top-level battery lib | 247 |
| `battery-imports.js` | Find unused battery imports | 247 |
| `enrich-battery-drivers.js` | Apply battery patterns | 247 |
| `find-battery-missing-mfs.js` | Find drivers missing mfrs | 247 |
| `find-battery-name-uses.js` | Audit battery capability names | 247 |
| `find-battery-no-destroyed.js` | v1 — _destroyed audit | 247 |
| `find-battery-no-destroyed-v2.js` | v2 — better regex | 247 |
| `find-battery-no-safeset.js` | v1 — safeSet audit | 247 |
| `find-battery-no-safeset-v2.js` | v2 — better regex | 247 |
| `mark-battery-deprecated.js` | Mark unused patterns | 247 |
| `button-cartography.js` | Map all button drivers | 51 |
| `button-issues-deep.js` | Deep button audit | 51 |
| `check-open-buttons.js` | Detect button count mismatches | 51 |
| `enrich-button-drivers.js` | Apply button patterns | 51 |
| `add-button-flow-cards.js` | Add flow cards to buttons | 51 |
| `apply-button-mode-setting.js` | Apply button mode setting | 51 |
| `add-scene-recall-to-all-buttons.js` | Add scene recall flows | 51 |

## 🚀 Releases

| App | Version | Commits | Status |
|-----|---------|---------|--------|
| master | v9.0.327 | f6d28cec3 | ✅ Test channel |
| master | v9.0.328 | a1e756d3c | ✅ Test channel |
| stable | v5.12.13 | f4d82c9bc | ✅ Test channel |
| stable | v5.12.14 | c61e6ea84 | ✅ Test channel |

## 🔍 Key learnings

1. **Battery adoption is 49% / 52%** — half of battery drivers are still on legacy patterns.
2. **Button cartography catches mismatches** — `button_wireless_smart` reports 1 button but has 4 endpoints.
3. **`continue-on-error: true` is the right pattern** for long-running multi-step workflows (P79.1).
4. **Mega-crawler failures are isolated** — 1 of 12 steps failing shouldn't lose the other 11 results.
5. **GH Actions runs `.yml` for EVERY commit** — a single shell-escape bug breaks the entire pipeline.
6. **temporal-monitor tracks P-iter velocity** — useful for showing "we did N improvements this week".

## 🌐 Next steps (P77 backlog)

- 8 button drivers with count mismatches (HIGH severity)
- 119/247 battery drivers still need _destroyed check
- 242/247 battery drivers don't use `UnifiedBatteryHandler`
- 0 drivers use `BatteryCore` (the unified battery class)
- 0 drivers use `CrashPrevention.guardDestroyed` (universal pattern)
