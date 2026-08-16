# P157 — Analyst pack: accept prevention, refuse wrong versions / naive guards (2026-08-16)

## Fact check (again)

| Analyst claim | Reality |
|---------------|---------|
| Fixes in **v8.5.7–v8.5.14** | **No** — LiveData + sleepy DP harden = **P148** on **9.0.541+** |
| Cause = `fingerprints.json` 11.5MB | **No** — LiveData **Pages segments → Homey settings** |
| Skip all `device.class === 'sensor'` DP poll | **Dangerous** — breaks Tuya MCU sensors (soil/climate EF00) |

Zigbee sleepy poll anti-pattern = **valid**. Prefer IAS push + skip EF00 when no cluster.

## What we ship (this pass)

1. **CI** `tools/ci/homey-heap-json-gate.js`  
   - FAIL: `drivers|assets|settings` JSON > 2MB  
   - FAIL: `data/*.json` > 2MB **not** in `.homeyignore`  
   - WARN: large ignored files (e.g. `mfs_db`) — must never be settings-merged  
2. **Runtime** `DataRecoveryManager`  
   - Explicit `_shouldSkipAggressiveTuyaDpPoll()` (IAS without EF00 / battery without mappings)  
   - No COMMON_DPS fallback on battery/sleepy  
   - Keep EF00 poll for real MCU sensors  

## Refuse

- New emoji workflow named only for “memory-check” hype if gate already runnable in existing CI  
- Blanket sensor skip pseudo-code from the analyst paste  
- Forum paste of this pack  

## Commands

```bash
node tools/ci/homey-heap-json-gate.js
node tools/ci/homey-heap-json-gate.js --json
```
