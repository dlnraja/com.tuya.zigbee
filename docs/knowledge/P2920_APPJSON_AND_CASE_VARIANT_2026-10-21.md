# P2920 — built app.json committed + all-caps case variant (21/10/2026)

## 1. Built app.json in a source commit (red CI on 2ccd47a301)
- `homey app validate` (and `homey app build`) rewrite the root `app.json` into the
  built manifest: driver flow cards are merged into the root `flow` (3721 triggers)
  and the file grows from 4.4 MB to 8.9 MB.
- Commit P2919 carried that form. Effects: `Syntax Check` size gate (7 MB) red and
  `Node 22 runtime tests` red (`newdrv-valve-controller-5zone` asserts driver cards stay
  driver-scoped).
- Fix: the publish write-back (dc54499920, v9.0.1575) already replaced it with the source form (2.4 MB, 61 root triggers). New pre-commit guard refuses a staged `app.json` above 7 MB.
- Rule: after a local validate, run `git checkout -- app.json` (or re-apply only the
  intended change) before committing.

## 2. `_TZ3000_TONRAPSK` writer
- Writer: `tools/ci/p2268-apply-parallel-couple-fixes.js` (sync phase of
  `silent-enrichment-orchestrator`, run by forum-poll). Its `variants()` mints every
  case form and `addMfrs()` compared case-sensitively, so the all-caps form was
  re-added on each run while the published manifest never carried it.
- Fix at read: `addMfrs()` now compares lower-cased; a spelling present in any case
  counts as present. No existing entry is removed.
- Test: `test/critical/p2920-p2268-no-case-variant.test.js` (fails on the old script).

## 3. HEIMAN leads (exact ids, not applied)
- Keyfob: manufacturerName `HEIMAN`, modelId `RC-EF-3.0` (Z2M model HM1RC-2-E;
  Koenkk/zigbee-herdsman-converters PR #2182 by arnaud-gouder; deCONZ issue #3828).
  Uses IAS ACE arm/disarm/emergency; our `button_emergency_sos` only maps emergency.
- Siren: manufacturerName `HEIMAN`, modelId `WarningDevice` and `WarningDevice-EF-3.0`
  (Z2M HS2WD-E; genBasic dump in zigbee-herdsman-converters #3429; deCONZ DDF #6400 by
  BabaIsYou). Native IAS WD 0x0502 fits `siren`.
- Blocker: Homey matches mfr x pid as a cartesian product. `universal_zigbee` already
  lists `HEIMAN` with TS0216/TS0601/TS0215(A)/TS0218, which `siren` and
  `button_emergency_sos` also list, so adding `HEIMAN` there would create duplicate
  couples. Needs a decision (dedicated small driver or a pid-scoped split).

## 4. Memory
- `node --expose-gc scripts/ci/memory-budget.js --budget-mb 30`: 26.4 MB code heap
  (app 2.2 + drivers 24.1/24.2), 1349 modules, 449 drivers, 0 load errors.
