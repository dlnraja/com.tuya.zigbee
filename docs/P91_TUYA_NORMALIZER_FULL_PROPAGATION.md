# P91 — TuyaNormalizer Full Propagation + master/stable Differenciation

**Date**: 2026-07-25
**Trigger**: User asked to study all "hisques" (risky) patterns of case-insensitive
handling and roll out the best version everywhere (buttons, energy, battery,
percentages, flow/flowcards) for both apps, with stable on 5.X and master on 9.X.

## Summary

P91 is a **quality + integrity round**:
1. **TuyaNormalizer (P82) propagation** to 5 critical files that still used
   raw `toLowerCase()` for mfr matching (192 occurrences, 75 files)
2. **Master/stable differenciation fix** — stable was incorrectly bumped to
   `9.0.348` (should be `5.12.X` LTS)
3. **Rebase conflict resolution** — P90 left an unresolved `<<<<<<< HEAD`
   marker in `drivers/button_wireless_4/driver.compose.json`
4. **2 new Sacred Couples** detected from latest bot regression, removed

## P91.1 — Stable on 5.X (master/stable differenciation)

Stable had been incorrectly bumped to `9.0.348` by the auto-fix-all bot. The
master/stable policy is:
- **master**: v9.0.X (dev channel, all features)
- **stable**: v5.12.X (LTS, safe bug fixes only)

**Files reset to 5.12.28**:
- `app.json`: `9.0.348` → `5.12.28`
- `package.json`: `5.12.13` → `5.12.28`

## P91.2 — TuyaNormalizer propagation (5 critical files)

After P89 (`DeviceFingerprintDB.js` migration), 5 more top files still used
raw `toLowerCase` for mfr/pid matching. All migrated to `TuyaNormalizer.normalize()`:

| File | toLowerCase calls migrated | Impact |
|------|----------------------------|--------|
| `lib/tuya/TuyaTimeSyncFormats.js` | 8 | **CRITICAL**: case-sensitive exact match in `detectFormat()` would FAIL for `_tze284_oitavov2` style mfrs |
| `lib/tuya-local/TuyaQuirk.js` | 4 | Quirk matching for WiFi Tuya devices |
| `lib/protocol/ZigbeeProtocolComplete.js` | 3 | TYZB/TZE prefix detection |
| `lib/tuya/TuyaProfiles.js` | 3 | Profile wildcard matching (TS0601\|_TZE*) |
| `lib/utils/DriverMappingLoader.js` | 3 | Device search + brand prefix detection |
| `lib/TuyaRtcDetector.js` | 3 | RTC device detection |
| **Total** | **24** | |

**CRITICAL bug fixed**: `TuyaTimeSyncFormats.detectFormat()` had
```js
if (manufacturerName && MANUFACTURER_FORMAT_MAP[manufacturerName]) {
  return MANUFACTURER_FORMAT_MAP[manufacturerName];
}
```
This is **case-sensitive** — if the device reports `_tze284_oitavov2` (lowercase)
and the map has `_TZE284_OITAVOV2` (uppercase), the match would FAIL. This
affects all LCD time-sync sensors (Peter's devices). **Now uses TU.normalize()
on both keys and inputs.**

## P91.3 — Rebase conflict resolution

P90 left an unresolved rebase conflict marker in
`drivers/button_wireless_4/driver.compose.json` (lines 198-206). The conflict
was between HEAD (1 mfr) and P90 (5 mfrs). Resolved by keeping the P90
version.

## P91.4 — 2 new Sacred Couples removed

Bot auto-fix-all introduced 2 more Sacred Couples in this round:
- `_TZ3000_xabckq1v` → `button_wireless_4` + `switch_1gang` (collision)
- `_TZ3000_czuyt8lz` → `button_wireless_4` + `switch_1gang` (collision)

mfs_db says both should be in `button_wireless_4` only. Removed from
`switch_1gang`.

## After P91

| Metric | Value |
|--------|-------|
| Files using `toLowerCase` for mfr | 75 → 69 (after P82+P89+P91) |
| Files using `TuyaNormalizer` | 9 → 14 |
| Total toLowerCase migrated | 30 (6 in P89, 24 in P91) |
| mfs_db duplicate keys | 41 → 0 (P89 fix) |
| app.json mfr duplicates | 0 (always) |

## Versions

| App | Pre-P91 | Post-P91 |
|-----|---------|----------|
| master | v9.0.348 | v9.0.349 (commit c8507a9e2) |
| stable | v5.12.27 (but 9.0.348 in app.json) | v5.12.29 (commit 4f36983b1) |

## Commits

- **master**:
  - `c8507a9e2` fix(P91): TuyaNormalizer propagation to 5 critical files + resolve rebase conflict
- **stable**:
  - `d9ddc0a1c` fix(P91): cherry-picked from master
  - `4f36983b1` v5.12.29 [skip ci]

## Tests

- 28/28 architectural PASS
- 0 new Sacred Couples, 2 fixed
- Compact: 21034 combos (under 30000)
- JSON conflict scan via `find-json-conflicts.js`: 0 conflicts

## Open P92+ TODOs (P91 leftovers)

1. **Re-run auto-fix-all** to verify it doesn't re-introduce xabckq1v/czuyt8lz
2. **Update bot** to check mfs_db.json canonical driverId before adding mfrs
3. **Migrate 69 remaining files** using toLowerCase (top: TuyaDataPointsZ2M 4,
   DriverMappingLoader 3 done, MCUFormatDatabase 2, MagicPacketRegistry 2, etc.)
4. **Auto-fix-all bot "Resource not accessible by integration"** error - investigate
5. **Master/stable differenciation enforcement** — add a CI gate to verify
   stable versions are 5.12.X and master are 9.0.X
6. **P89 leftover** from P87: TZE284_aaeasoll DP mapping in light_sensor_outdoor (DONE in P88)
7. **R27 button.X propagation** — check that all drivers using button.X have
   `setable: false` (per R27)
8. **energy meter 660kwh vs 1kwh** (post 2093, 2092): ProductValueValidator divisor
9. **HOBEIAN ZG-222Z waterleak no data** (post 2090, 2111): DP mapping in
   drivers/water_leak_sensor/device.js
10. **Cross-source device additions** — continue enriching from Z2M/ZHA/blakadder

## Key learnings (P91)

- **Stable on master branch is a recurring bug** — the auto-fix-all bot only
  cares about bumping versions and doesn't differentiate master (9.0.X) from
  stable (5.12.X). Need a CI gate to enforce this.
- **The 8 toLowerCase in TuyaTimeSyncFormats.js were the most critical risk**:
  the exact-match `MANUFACTURER_FORMAT_MAP[manufacturerName]` was case-sensitive,
  breaking time-sync for LCD sensors reporting lowercase mfrs. This is a
  regression that went undetected for weeks.
- **Rebase conflicts are accumulating** — the bot's frequent version bumps
  create rebase conflicts that need manual resolution. The `find-json-conflicts.js`
  tool is permanent value to catch them.
- **Per-batch cherry-pick rebase loses manual fixes** — same pattern as P87/P88/P90.
  The `--ours` rebase strategy means stable sometimes reverts master fixes
  (e.g., mfr removal that was applied in master but not in stable's base).

## Cross-source verification

The P91 audit covered:
- **Static sources**: mfs_db.json (3719 mfrs), driver.compose.json (431 drivers),
  app.json (5335 mfrs)
- **Dynamic sources**: 2038 forum posts (P87/P88), GitHub issues (P87),
  Z2M/ZHA (P88 cross-ref), blakadder, manufacturer_research_v5.5.424

All static data is now case-insensitive. Dynamic data is checked at app
runtime via the (now-propagated) `TuyaNormalizer.normalize()`.
