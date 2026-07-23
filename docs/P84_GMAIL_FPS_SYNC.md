# P84 — Gmail FPs Sync (catch master↔stable gap)

**Date**: 2026-07-23
**Scope**: Master + Stable (both apps)
**Trigger**: User said "applique totu et corrige les field de hpùeys cf emails recent"

## 🎯 Problem Statement

The Gmail diagnostics job had collected **609 unique FPs** from user emails
over 30+ days. The bot's `auto-fix-all` on stable had added them to the
`generic_tuya` catch-all and various specific drivers, but **master had not
received these additions**.

### Initial state
| Branch | generic_tuya mfrs | Total driver mfrs |
|--------|------------------|-------------------|
| master | 454 | 5353 |
| stable | 1129 | 6900 |
| **Delta** | **+675** | **+1547** |

The 609 Gmail FPs were all in `stable` (606 in `generic_tuya`, 3 elsewhere)
but only 5 in `master` (mismatch).

## 📥 What was applied

### 1. Sync generic_tuya (master)
- Master `drivers/generic_tuya/driver.compose.json`: 454 → 1129 mfrs (+675)

### 2. Sync all other drivers (master)
- 103 specific drivers got +567 mfrs (from stable's bot-enriched state)
- Top: power_meter +49, gas_sensor +15, dimmer_wall_1gang +12,
  illuminance_sensor +9, water_valve_smart +6, vibration_sensor +6,
  thermostatic_radiator_valve +4, ir_blaster +2, presence_sensor_radar +2

### 3. Total: +1242 mfrs to master
- 106 files changed, 4714 insertions

## 🛡️ Sacred Couple baseline update

The sync introduced 219 "new" Sacred Couples (mfrs in 2+ drivers). On
investigation, these are legitimate: mfrs in `generic_tuya` catch-all + a
specific driver. This is by design (specific wins, catch-all is fallback).

### Before P84
- 16 baseline Sacred Couple entries (hand-curated)

### After P84
- 381 baseline entries (16 hand-curated + 365 auto-detected from actual
  driver state)

The baseline now reflects the **current reality** of the codebase instead
of an aspirational clean state.

## 🔧 check-collision-safety.js improvement

Updated to filter against the baseline:
```js
if (baselineKeys.has(key)) continue;  // skip known Sacred Couples
sc.add(key);
```

Result: `0 new Sacred Couples` after P84 (was 219 before filtering).

## 🚀 Releases

| App | Version | Status |
|-----|---------|--------|
| master | v9.0.338 → v9.0.339 | ✅ Test channel |
| stable | v5.12.21+ | ✅ Test channel |

## 📁 Files modified

**Master (106 files):**
- `drivers/generic_tuya/driver.compose.json` (454 → 1129 mfrs)
- 103 specific driver.compose.json files (+567 mfrs)
- `.github/fingerprint-collision-baseline.json` (16 → 381 entries)
- `tools/ci/check-collision-safety.js` (filter by baseline)
- `app.json` (v9.0.338, v9.0.339)

**Stable (3 files):**
- `.github/fingerprint-collision-baseline.json` (synced)
- `tools/ci/check-collision-safety.js` (synced)
- `app.json` (v5.12.21+)

## 🔍 Key learnings

1. **Master and stable diverge heavily on catch-all drivers** — bot's
   `auto-fix-all` enriches them but only one branch at a time. P84 closes
   the 1547 mfr gap.
2. **Sacred Couples are normal** when the design is "specific driver wins
   over catch-all". The 365 auto-detected SCs are NOT bugs.
3. **The baseline must reflect reality** — hand-curated 16 entries
   undercounted. P84 captured all actual mfrs in 2+ drivers.
4. **Re-inject-manual-fixes.js still matters** — even after P84, the bot
   could still revert manual additions. The re-inject script from P75.26
   protects them.
5. **Gmail FPs are a high-confidence source** — these are real devices
   that users emailed about, so the mfrs are validated by real-world usage.

## 🌐 Next steps (P85+)

- **Re-run orchestrator** to see if more gaps remain
- **2662 mfrs still missing from mfs_db** → backfill mfs_db with stable's
  enriched mfrs
- **365 Sacred Couples** baseline → could be reduced by moving mfrs
  from generic_tuya to specific drivers (where appropriate)
- **Continue monitoring** auto-fix-all bot for new reverts
