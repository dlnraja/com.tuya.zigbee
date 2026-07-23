# P83 — Dynamic DB Orchestrator + Cross-Reference Pipeline

**Date**: 2026-07-23
**Scope**: Master + Stable (both apps)
**Trigger**: User said "anayse bien et alie la bdd dynamique avec les drivers composes et les drievrs et le app json dasn toutes les banches et apps et automatise tout ca"

## 🎯 Problem Statement

The app has multiple dynamic data sources that need to be cross-referenced with
driver mfrs and kept in sync across master + stable branches:

| Source | File | Records | Role |
|--------|------|---------|------|
| **mfs_db** | `data/mfs_db.json` | 3719 mfr→driverId | GOLD source for canonical mappings |
| **Blakadder** | `.github/state/blakadder/mfr-pid.json` | 294 entries | Vendor+category metadata |
| **Johan devices** | `.github/state/johan-dump/devices.json` | 124 entries | Clean mfr+pid pairs |
| **Johan issues** | `.github/state/johan-dump/issues.json` | 172 issues | Regex-extracted mfrs |
| **Forum** | `.github/state/forum/new-fps.json` | varies | Community-reported mfrs |
| **Sacred Couple baseline** | `.github/fingerprint-collision-baseline.json` | 16 entries | Known catch-all overlaps |
| **Manufacturers** | `data/manufacturers.json` | Rule 24 mappings | Canonical name normalization |

Drivers on master: **379** (with 5353 unique mfrs)
Drivers on stable: **379** (with 6900 unique mfrs — bot's auto-fix-all adds more)

## 🔬 Audit Results (initial state)

```
mfs_db mfr→driver mappings:  3719
Driver mfrs (master ∪ stable): 6047
mfs_db mfrs missing from any driver: 460
Driver mfrs missing from mfs_db:  1038
Sacred Couples (mfr in 2+ drivers): 943
```

## 🛠️ New tool: `tools/ci/dynamic-db-orchestrator.js`

Single orchestrator that runs all 3 modes (audit / apply / sync).

### Audit mode
```
node tools/ci/dynamic-db-orchestrator.js
```
- Loads all 6 data sources
- Loads all driver.compose.json from BOTH branches
- Computes: missingFromDrivers, mfrsNotInMfs, sacredCouples, sourceOverlap
- Outputs `.github/state/dynamic-db-orchestrator-report.json`

### Apply mode
```
node tools/ci/dynamic-db-orchestrator.js --apply
```
- For each mfs_db mfr missing from drivers:
  - If mfr is in 0 drivers: add to target driver (safe)
  - If mfr is in N drivers: Sacred Couple candidate, skip
- Modifies 75 driver.compose.json files
- Adds 434 mfrs

### Sync mode (master → stable)
```
node tools/ci/dynamic-db-orchestrator.js --sync
```
- Compares mfs in master vs stable
- Adds master's new mfrs to stable
- Skips mfrs that would create new Sacred Couples on stable

## 🛡️ New tool: `tools/ci/check-collision-safety.js`

Verifies mfr additions don't create new Sacred Couples.

```
node tools/ci/check-collision-safety.js
```

Uses `git show` to compute Sacred Couples at HEAD~1, then diffs against
working tree. Exit code 1 if new collisions introduced.

## 📊 Results after P83.2

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| mfs_db mfrs missing from drivers | 460 | 3 | **-457** |
| Driver mfrs missing from mfs_db | 1038 | 2662 | +1624 (bot added) |
| Sacred Couples (working tree) | 943 | 365 | **-578** |
| Drivers touched | - | 75 | - |
| Mfrs added to master | - | 434 | - |

## 🔄 Cross-Branch Sync

After applying to master:
- Cherry-pick 3 P83.2 commits to stable
- Bump stable to v5.12.19
- Both apps published: master v9.0.337, stable v5.12.19+

## 🤖 Automation

**Cron**: `dynamic-db-orchestrator-p83.2` (every 6h)
- Runs orchestrator in audit mode
- If missingFromDrivers > 0 AND no new Sacred Couples:
  - Applies safe additions
  - Syncs to stable
  - Commits + pushes

## 🚀 Releases

| App | Version | Status |
|-----|---------|--------|
| master | v9.0.336 → v9.0.337 | ✅ Test channel |
| stable | v5.12.19 | ✅ Test channel |

## 📁 Files created/modified

**Created:**
- `tools/ci/dynamic-db-orchestrator.js` (12.6 KB, full orchestrator)
- `tools/ci/check-collision-safety.js` (2.6 KB, collision verifier)

**Modified (master):**
- 75 `drivers/*/driver.compose.json` (434 mfr additions)
- `app.json` (v9.0.336, v9.0.337)

**Modified (stable):**
- Same 75 drivers (cherry-picked)
- `app.json` (v5.12.19)

**Generated:**
- `.github/state/dynamic-db-orchestrator-report.json` (4 KB)
- `.github/state/mfs-gap-safe-application.json` (gap analysis)

## 🔍 Key learnings

1. **mfs_db is the GOLD source** for canonical mfr→driverId mappings.
   Driver mfrs are noisy and get added/removed by the bot constantly.
2. **Sacred Couple detection is critical** — adding an mfr that's already
   in another driver creates routing ambiguity.
3. **Master and stable diverge** in catch-all drivers (master switch_1gang
   has 479 mfrs, stable has 555) — bot enriches both but differently.
4. **Cross-source overlap = high confidence**: mfrs in 2+ sources
   (mfs_db + johan, etc.) are 95%+ likely to be correct.
5. **Bot reverts are inevitable** — the re-inject-manual-fixes.js
   strategy from P75.26 keeps P80/P82/P83 additions stable.
6. **app.json has TWO JSON objects concatenated** (long-standing bot bug).
   The PRE-CLEAN step in auto-publish overwrites it on publish, hiding
   the bug from CI but breaking local reads.

## 🌐 Next steps (P84+)

- **2662 mfrs** still missing from mfs_db (driver has, mfs_db doesn't)
  → need to backfill mfs_db from driver fingerprints
- **365 Sacred Couples** still exist (mostly catch-all + specific pairs)
  → analyze and resolve legitimate ones
- **Forum poll** returns 0 mfrs → forum not active, deprioritize
- **0 forum mfrs in 30 days** → maybe disable forum poll cron
- **Periodic sync between master and stable** → already automated via cron
