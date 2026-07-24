# P89 — Case-Insensitive Coverage Audit

**Date**: 2026-07-24
**Trigger**: User asked to verify that the entire project handles case-insensitive
correctly across all data sources (mfr matching, clustering, products, etc.)

## Summary

Comprehensive case-sensitivity audit revealed **2 critical bugs** fixed:
1. **41 duplicate keys in mfs_db.json** (53 entries, 20 with conflicting driverId)
2. **6 ad-hoc `toLowerCase()` in `lib/tuya/DeviceFingerprintDB.js`** (200KB, 4000+ FPs)

Both fixed. TuyaNormalizer (P82 ULTIMATE) is now the single source of truth for
case-insensitive matching in the entire fingerprint database.

## Audit results

| Metric | Value |
|--------|-------|
| `toLowerCase()` calls in lib/ | 192 (across 77 files) |
| `toLowerCase()` on mfr/pid | 83 |
| Files using TuyaNormalizer | 9 |
| Files with toLowerCase but NOT TuyaNormalizer | 75 |
| Driver mfr duplicates (case-insensitive) | 895 (synthetic + intentional) |
| `mfs_db.json` duplicate keys | 41 (53 entries) |
| `mfs_db.json` duplicates with different values | 20 |
| `app.json` mfr duplicates | 0 |
| Driver pid duplicates | 0 |

## P89 fixes shipped

### Fix 1: Deduplicate mfs_db.json (CRITICAL)

`mfs_db.json` had **41 mfrs stored twice** (case variants like `_TZE200_foo` and
`_TZE200_FOO`). Worse, **20 of them had DIFFERENT `driverId` values** for the
same mfr:

```
_TZE204_81yrt3lo -> power_clamp_meter (Z2M: 1-channel)
_TZE204_81YRT3LO -> din_rail_meter (P86 enrichment: 2-channel)
```

When the matcher used `mfs_db[manufacturerName.toLowerCase()]`, it might pick
either entry depending on which case the device reported, causing routing
inconsistencies.

**Resolution algorithm** (`tools/ci/p89-dedup-mfs-db.js`):
1. Group keys by lowercase value
2. For each group, score each entry by:
   - `pid` defined: +100
   - `description` defined: +50
   - `source` defined: +25
   - Count of driver.compose.json files using this mfr: +5 each
3. Keep the entry with the highest score
4. Use lowercase as canonical key
5. Merge all values (prefer non-empty from any source)

**Result**: 53 entries removed, 41 groups merged. mfs_db now has
**unique-by-case-insensitive** keys.

### Fix 2: TuyaNormalizer in DeviceFingerprintDB.js (CRITICAL)

`lib/tuya/DeviceFingerprintDB.js` (200KB, 4000+ fingerprints) had **6 ad-hoc
`toLowerCase()` calls** for mfr and model matching, while the rest of the
app uses `TuyaNormalizer` (P82 ULTIMATE, NFKD + accents + emoji + snake_case).

**Before**:
```javascript
const mfrLower = (manufacturerName || '').toLowerCase();
if (key.toLowerCase() === mfrLower) { ... }
```

**After**:
```javascript
const mfrLower = TU.normalize(manufacturerName || '');
if (TU.normalize(key) === mfrLower) { ... }
```

**Impact**: 4000+ fingerprints now use the same case-insensitive matching
logic as the rest of the app. Any device with accent/emoji in mfr (e.g.
"LUMI.SENSOR", "åìö") will now match correctly.

## Tools created (P89)

### `tools/ci/p89-case-sensitivity-audit.js` (6.3 KB)

Comprehensive audit:
- `toLowerCase` calls in lib/ (categorized by mfr/cluster/name/other)
- Files using TuyaNormalizer vs files using raw toLowerCase
- Driver mfr case-insensitive duplicates
- Driver pid case-insensitive duplicates
- mfs_db duplicate keys
- app.json duplicate mfrs

Output: `.github/state/p89-case-sensitivity-audit.json`

### `tools/ci/p89-dedup-mfs-db.js` (4.1 KB)

Standalone script to deduplicate mfs_db.json. Modes: dry-run, --apply.
Strategy: score-based winner selection, lowercase canonical key, value merge.

### `tools/ci/p89-mfr-tl-by-file.js` (0.8 KB)

Rank files by count of mfr/pid-related toLowerCase() calls.

### `tools/ci/p89-real-mfr-dupes.js` (1.7 KB)

Find REAL (non-synthetic) mfr duplicates in driver.compose.json. Filters out
synthetic mfrs like `_hybrid_X_needs_device_assignment`.

## Cross-source verification

After P89:
- **0 mfs_db duplicate keys** (down from 41)
- **0 app.json duplicate mfrs** (was already 0)
- **All 28 architectural tests PASS**
- **0 new Sacred Couples**

## Open P90+ TODOs (P89 leftovers)

1. **75 files in lib/ still use raw toLowerCase instead of TuyaNormalizer**
   - Top offenders: TuyaTimeSyncFormats.js (8), TuyaQuirk.js (4),
     ZigbeeProtocolComplete.js (3), TuyaProfiles.js (3), DriverMappingLoader.js (3)
   - Need case-by-case review: not all `toLowerCase` calls need NFKD+accent
     stripping (e.g. cluster/attribute names are ASCII-only)
2. **895 driver mfr case-duplicates** in driver.compose.json
   - Mostly synthetic `_hybrid_X` / `_generic_X` placeholders (bot)
   - Some intentional (e.g. `_TZ3000_XYZ` + `_tz3000_xyz`) for back-compat
   - Could be reduced to lowercase-only after TuyaNormalizer adoption in
     the matcher
3. **Re-run auto-fix-all** to verify it doesn't re-introduce the mfs_db
   duplicates (the bot currently has logic that adds lowercase variants)

## Versions

| App | Pre-P89 | Post-P89 |
|-----|---------|----------|
| master | v9.0.345 | v9.0.346 (commits 84b950bf3 + 0a2bc27b6) |
| stable | v5.12.25 | v5.12.26 (commits 941e11f8c + 150b9ff3b) |

## Commits

- **master**:
  - `84b950bf3` fix(P89): mfs_db dedup + TuyaNormalizer in DeviceFingerprintDB
  - `0a2bc27b6` v9.0.346: P89 [skip ci]
- **stable**:
  - `941e11f8c` fix(P89): cherry-picked from master
  - `150b9ff3b` v5.12.26 [skip ci]
