# P90 — Bot Regression Removal (auto-fix-all)

**Date**: 2026-07-25
**Trigger**: User asked to verify 2 apps are pushed to dashboard + fix everything
**Branch**: master + stable-v5

## Summary

The auto-fix-all bot (run 30127705895 on master) introduced **11 new Sacred Couples**
in the v9.0.347 build by adding mfrs to wrong drivers. P90 removes the regressions
and re-publishes both apps.

## Bot regressions detected

### Run 30127705895 (master, 2026-07-24 21:25:59) — FAILED

The auto-fix job added these mfrs to wrong drivers:

| Mfr | Wrong driver added | mfs_db canonical | Mfr PID |
|-----|---------------------|------------------|---------|
| `_TZ3000_b3mgfu0d` | `button_wireless_4` | `button_wireless_2` | 01MINIZB |
| `_TZ3000_b3mgfu0d` | `switch_1gang` | `button_wireless_2` | 01MINIZB |
| `_TZ3000_abrsvsou` | `button_wireless_4` | `switch_4_gang_metering` | TS0004 |
| `_TZ3000_abrsvsou` | `power_meter` | `switch_4_gang_metering` | TS0004 |
| `_TZ3000_4fjiwweb` | `button_wireless_4` | `switch_4_gang_metering` | TS0004 |
| `_TZ3000_4fjiwweb` | `power_meter` | `switch_4_gang_metering` | TS0004 |

### Run 30127705906 (Unified CI/CD Orchestrator) — FAILED

The orchestrator detected 11 new Sacred Couples (8 productIds for `_TZ3000_b3mgfu0d`,
plus 1 each for `_TZ3000_abrsvsou`, `_TZ3000_4fjiwweb`, `_TZ3000_7VGTTNA6`).

## P90 fixes shipped

### Files changed
- `drivers/button_wireless_4/driver.compose.json`: removed 3 mfrs (b3mgfu0d, abrsvsou, 4fjiwweb)
- `drivers/switch_1gang/driver.compose.json`: removed `_TZ3000_b3mgfu0d`
- `drivers/power_meter/driver.compose.json`: removed `_TZ3000_abrsvsou` + `_TZ3000_4fjiwweb`

### Result
- 0 new Sacred Couples
- 3 collisions fixed
- 28/28 architectural tests PASS
- Compact: 21034 combos (under 30000)

## Versions

| App | Pre-P90 | Post-P90 |
|-----|---------|----------|
| master | v9.0.347 (bot) | v9.0.348 (commit bdbd30cd4) |
| stable | v5.12.26 | v5.12.27 (commit 6d1deaa1d) |

## Commits

- **master**:
  - `8a090ae17` fix(P90): remove auto-fix-all bot regressions
  - `bdbd30cd4` rebase+push (after conflict resolution)
- **stable**:
  - `0c9bbc3b0` fix(P90): cherry-picked from master
  - `6d1deaa1d` v5.12.27 [skip ci]

## Key learnings (P90)

- **5th time the auto-fix-all bot reverts manual fixes** — but this time it's
  introducing NEW Sacred Couples (not just reverting). The bot's source of truth
  for routing is `mfs_db.json` + community sync, not the actual device interview.
- **The Unified CI/CD Orchestrator is doing its job** — it caught the 11 new
  collisions and marked the build as failed. This is a safety net working.
- **re-inject-manual-fixes.js is the only permanent solution** — the bot
  keeps adding bad mfrs because the dedup logic doesn't check `mfs_db.json`
  for the canonical driverId.
- **The bot's `_TZ3000_4fjiwweb` and `_TZ3000_abrsvsou` are for `switch_4_gang_metering`** —
  these are real devices, just not for the drivers the bot added them to.

## Open P91+ TODOs

1. **Re-run auto-fix-all** to verify it doesn't re-introduce these collisions
2. **Update bot's auto-fix-all logic** to check mfs_db.json canonical driverId
   before adding mfrs to a driver
3. **Add 11 Sacred Couple entries to baseline** for these mfrs (instead of
   removing the bot's additions, baseline them for back-compat)
4. Investigate why the bot's "Resource not accessible by integration" error
   blocked the commit step
