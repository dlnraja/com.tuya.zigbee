# Automation couple guard (2026-10-11)

**Problem.** Bot commit paths kept undoing human-reviewed couple work on stable/bastien:
auto-fix-all removed `heobian` from `ir_blaster` and `HOBEIAN` keys from `mfs_db`, re-added
`_TZE200_vrcfo4i0` (a gas sensor) to `contact_sensor`, and the master→stable sync re-added
cross-brand pids to remote-fleet mfs rows (the P2613 prune).

**Fix.** `tools/ci/automation-couple-guard.js` compares what a bot is about to commit with a base
ref (default `HEAD`) and flags:

| Rule | Meaning |
|---|---|
| PIN_LOST | a couple from `couple-driver-pins.json` or `publish-sacred-keep-couples.json` left its pinned driver |
| PIN_BLEED | a pinned mfr (+pid) newly appears on another driver |
| DENY_READDED | a mfr listed in `config/architecture/curated-couple-removals.json` came back on that driver |
| GOLDEN_LOST | a driver lost any mfr/pid (bots may only grow drivers) |
| MFS_KEY_LOST | a `data/mfs_db.json` key vanished |
| MFS_JUNK | a remote-fleet mfs row regained cross-brand pids (P2613) |

`--revert` restores each offending file from the base, so the bot's change to that file is skipped, then re-checks.
`--check` exits 1. Wired before the commit in `auto-fix-and-publish.yml`, `safe-sync-stable.yml`,
`tools/ci/bastien-promote-upstream.js` (both master and stable targets) and, on master,
`scripts/ci/safe-auto-commit.js` (enrichment workflows). Tests: `test/critical/automation-couple-guard.test.js`
(throw-away git repo, every rule plus the revert path).

**Curated removals.** When a human removes a couple on purpose, add `{driver, mfr[], why, source}` to
`curated-couple-removals.json`. Matching ignores case.

**_TZE204_p3dbf6qs (W4).** Z2M knows `_TZE200_p3dbf6qs` (AVATTO ME167_1, TS0601_thermostat_5) and
`_TZE284_p3dbf6qs` (TS0601_thermostat_3). It has no entry for the `_TZE204_` prefix, and a web search turned up nothing. Our
history kept it beside its `_TZE284` sibling on `device_radiator_valve` (master/stable). Bastien had it on
`smart_lcd_thermostat`, which is the wrong hardware class. Decision: one owner, `device_radiator_valve`, on all three apps. The
sacred-keep entry was moved from `radiator_valve` to `device_radiator_valve`, and both other drivers are in
the denylist. It is still a lead with no confirmation.
