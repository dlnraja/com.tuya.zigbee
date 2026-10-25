# Athom / Homey publish limits — what we know (2026-10-10, Paris)

## Measured facts (our bisects, publish.yml, same pipeline)
| Build | Change vs last Test build | Result |
|---|---|---|
| #3482 v9.0.1364 | baseline (spi + whd02 held) | Test |
| #3483 v9.0.1365 | + `deprecated: true` on wall_remote_4_gang (+18 B) | AggregateError |
| #3485 v9.0.1366 | deprecated reverted, ci/actions-optimization merged | Test |
| #3486 v9.0.1367 (K1) | + one `it` driver name (+38 B) | Test |
| #3487 v9.0.1368 (K2) | + `zigbee_rebind` maintenance action on 319 drivers (~+70 KB app.json) + manifest.version read | Test |
| J4 #3479 / J5 #3481 | I + one new driver (spi / whd02) | AggregateError |

Conclusion: **it is not a byte-size threshold** (K2 added ~70 KB and passed; +18 B deprecated failed).
Every failure changes the **set of pairable driver ids** (a new driver, or a driver hidden via deprecated).
Pure content changes inside existing drivers pass. Note: master already ships 12 deprecated
drivers and passes, so `deprecated` itself is not forbidden; the trigger is a change in the set.
Working hypothesis: Athom's server-side processing (store driver index / images / per-driver
pages) fails when the driver list changes for this very large app. Not documented; to confirm with Athom.

## Our app vs peers
| App | app.json | drivers | manufacturerName entries |
|---|---|---|---|
| ours (master) | 2.39 MB | 448 (446 published) | 19 199 (≈3 600 productId entries) |
| JohanBendz/com.tuya.zigbee (upstream) | 0.35 MB | 113 | 650 |
Other peers (Xiaomi, Sonoff, Hue) raw app.json not fetchable at HEAD (built file not committed).

## Official sources checked (in our words)
- node-homey-lib validator (athombv/node-homey-lib, lib/App/index.js): no limit on app.json size,
  driver count or fingerprint count; only small/large driver images are required (xlarge optional).
- Homey CLI (athombv/node-homey, lib/App.js): build = tar+gzip, no client-side size cap.
- SDK docs, Homey CLI + App Store guidelines (apps.developer.homey.app, Athom): `processing_failed`
  is not a documented validation error; big apps take longer to review.
- Community post by @Attilla (community.homey.app/t/140352/1271, 2026-01-29): `homey app run`
  hit "Payload Too Large" on the remote debug session for this app → a hidden upload size cap exists
  for remote run (separate from store publish).

## Audit (master)
- All 448 drivers have small 75×75 + large 500×500 PNG; none has xlarge (also true for builds that pass).
- Held drivers have correct images, ids < 41 chars (max id length 41), class/capabilities valid.

## Proposed solutions (not applied — need decision)
1. (No Athom contact — user rule.) Keep bisecting from our side only.
2. Change the driver set in one isolated build only (one new driver per build), never mixed with content.
3. Shrink manifest: move the bulk of manufacturerName lists out of app.json is NOT possible for
   pairing (Homey matches on manifest), but case-variant duplicates (~3× per FP) could be removed
   if Homey matching is case-insensitive — must be verified first, else it breaks pairing.
4. Split into satellite apps by family (lights / sensors / switches) — large migration, re-pair cost.
5. Keep runtime data (fingerprints DB, dp registry) in lazy-loaded data files, never in app.json.

## Update 21:50 Paris — K3 and payload forensics
| K3 #3489 v9.0.1370 | master #3488 content + switch_module_whd02 released only | AggregateError |
Confirms: one new driver alone, on current master, fails. Same for J4/J5.

Local reproduction of the publish payload (scripts/prepare-publish.js, auto-publish env
14000/1500/2, fresh .homeybuild each run — the script mutates .homeybuild, so reruns on the same
dir are NOT comparable):
- base (both held): 347 payload drivers (99 synthetic pruned), 13 987 combos.
- whd02+spi released: only those 2 drivers added, 13 995 combos; no other driver changes.
- wall_remote deprecated: only that driver's `deprecated` flag changes; combos identical.
- So no budget redistribution, no duplicate couple (new couples are unique), no image/format issue
  (all 902 PNG 8-bit RGBA non-interlaced, sizes 75/500), and latest athombv/node-homey-lib validates
  every variant at level `publish` (only `verified` complains: ir_remote has no platforms — not our level).
- CI totals: 13 995 combos / 3.84 MB both on passing and failing builds → not a size or combo cap.
- History: source driver count rose 434 → 446 between v9.0.1317 and v9.0.1330 (Oct 2–4). CI logs of
  that period have expired, so whether each of those builds reached Test is not provable from CI.
Open: the trigger is server-side and specific to driver-set changes; our pipeline and payload are clean.
Next safe probes (bisect branch only): release whd02 with `pair` views copied from a passing socket
driver; and a payload that adds a new driver id cloned 1:1 from a passing driver (rename only).

## Correction 22:45 Paris — always read stateMeta
- #3490 v9.0.1371 and #3492 v9.0.1373 = `processing_failed | stateMeta=socket hang up` (transient
  Athom transport), NOT AggregateError. Retry, never bisect on them.
- R1 #3491 v9.0.1372 (exact #3488 content) → Test. R3 #3493 v9.0.1374 (#3488 + VicHY radar write-once
  only) → Test. The radar change is safe.
- Real AggregateError builds so far: 1331..1361 tips with spi, J3/J4/J5, #3481, #3483 (deprecated
  wall_remote_4_gang), K3 #3489 (whd02 only).
- History (git SSOT): 1330 was accepted and contained ~12 drivers added Oct 2–4 (sound_sensor_tuya,
  light_cct_ts0502b, light_rgbcct_ts0505b, light_dimmable_ts0501a, mc101z_pwm_dimmer, bulb_zbeacon_ts0505b,
  switch_zbeacon_ts0001, temphumidsensor_zcl_th01/ts0601, sensor_ias_zonetype_ewelink,
  panel_switch_cover_tuya, switch_presence_tuya). Adding drivers worked up to 1330.

## Probe P1 / R4 (2026-10-10 ~23:00 Paris)
- **P1** `bisect-p1-copy`: 1:1 rename of accepted `sound_sensor_tuya` → `sound_sensor_tuya_probe` (no manufacturerName, deprecated). Adds a driver id without pairable couple change.
  - #3494 v9.0.1375 = `processing_failed | stateMeta=socket hang up` → **retry** (run 38086030042), do not conclude.
- **R4** `bisect-r4-rename-clone` / `switch_probe_r4_clone` (invented `_TZ3000_r4clonex`+`TS00R4`): Validate failed (compose not in app.json). **Branch deleted** — invented couple must never land on master/stable. Superseded by P1 design.

## Update 23:25 Paris — rename probe passes; fold ready
- R4 run 38085219666 (other worker) = CI failure (probe compose had no app.json entry), never reached Athom.
- P1 #3494 v9.0.1375 = socket hang up (transient); retried → **P1 #3495 v9.0.1376 Test**: a renamed 1:1
  copy of accepted sound_sensor_tuya, deprecated, empty manufacturerName. **Adding a driver id is NOT the trigger.**
- Remaining suspects: what the failing drivers carry (pairable couples / specific couples / content),
  not the driver count. R5 (whd02 + accepted pair views) running: run 38086648519.
- Payload proof: while held, the SPI and WHD02 couples were NOT in the payload at all (switch_1gang /
  wall_switch_1gang_1way lost them in compaction; wall_switch had no TS000F anyway). "Routed via
  switch_1gang" was false in practice.
- Workaround branch `fold-held-couples` (01373da2): SPI couples → led_controller_rgb (same caps) with the
  SPI device class via Driver#onMapDeviceClass; WHD02 couple → switch_1gang (has TS000F). Sacred-keep pins
  retargeted; local prepare-publish shows the couples survive compaction. FP collision gate 0 new,
  fingerprints integrity OK.

## Athom failure kinds (read `stateMeta`, never just "processing_failed" or GHA green)
| stateMeta | Meaning | Action |
|---|---|---|
| `AggregateError` | Athom processing rejected the content | real failure → bisect content; never auto-retry |
| `socket hang up` | Athom transport dropped (#3490, #3492, #3494) | transient → one retry with a NEW version |
| `The specified key does not exist.` | upload/S3 side lost the archive (#3496 R5) | transient → one retry with a NEW version |
Pipeline: `.github/scripts/transient-publish-retry.js` + step "Transient Athom failure - single retry" in
publish.yml re-dispatches publish.yml once (`transient_retry=true`, which disables a second retry).
Both transient strings are in TRANSIENT_RE (processing-failure-republish-check) and build-error-diag-v2.
The Auto-Fix doctrine (P139: no bump loops while an older Test is healthy) is unchanged.
## Fold + R5 (2026-10-10 ~23:38 Paris)
- **Fold** `fold-held-couples` v9.0.1378 #3497 = `socket hang up` → **retry** (do not conclude). Couples folded into existing drivers; SPI/WHD02 drivers stay held.
- **R5** #3496 = `The specified key does not exist` (whd02 unhold+pair). R5 retry cancelled to prioritize fold retry.
- Live Test still **9.0.1376 #3495** (P1) until a later build promotes.

## Fold SUCCESS (2026-10-10 ~24:00 Paris)
- `fold-held-couples` → **Test v9.0.1380 #3499** (after socket-hang retries on #3497/#3498).
- Held drivers stay out of payload; couples shipped via existing drivers (WHD02→`switch_1gang`, SPI→`led_controller_rgb` + onMapDeviceClass).
- R5 whd02 unhold still fails (#3496 key-missing) — do not unhold until a clean release probe passes.
- P1 proved new driver ids can pass; fold is the shipping path for held couples.

## Update 2026-10-25 (Paris) — P3024b combo cap vs pairing regression
- `HOMEY_ZIGBEE_MAX_TOTAL_COMBOS` (14000 since 8e9914e2ee, 17000 before) is OUR heuristic, not an
  Athom limit (see above: 13 995 combos on passing and failing builds; P2252 failures were 100k+).
- Counting is raw mfr × pid per driver, every case form counted: in the 9.0.1597 candidate 52 % of
  combos are extra case forms. Homey pairing matches byte-exact, so no case form is dropped blindly.
- Regression: 9.0.1574 (build #3655, last Test package) → candidate lost 259 couples (192 mfrs), e.g.
  52 on device_radiator_valve. Cause: a pin protects its whole case key, so case variants added to
  the source later (ts0203/Ts0203 beside TS0203) became uncuttable and the cut fell on real couples.
- Fix: every couple of test/fixtures/athom-last-test-package-couples.json (1574 + candidate) is pinned
  exactly; pass 2 trims unpinned case variants first; orphan couples are re-pinned on their shipped
  driver; prepare-publish 5a2b fails if one couple would disappear. Cap 15500 (fits the pinned floor
  ~15 340; below the old 17000/20000 ceilings); app.json stays ~3.3 MB < 4 MB. Driver set unchanged.
- Refresh the baseline after each Test build: `node scripts/maintenance/build-publish-baseline.cjs
  <payload app.json> --merge --label "..."` (additive).

## Update 2026-10-25 (Paris) — P3036 measured combo ceiling and TS0601 top-up
- Lead L-P3037-01 (forum pass, master 2dc7ff9ac3): the compaction drops TS0601 couples that the
  composes declare. Re-measured on master after P3038 (db128e34f0): at 15500/1500/2 the payload has
  15 498 combos, 357 of 459 drivers, app.json 1.77 MB; 2 955 manufacturers (case-insensitive) have
  their (mfr, TS0601) couple in NO payload driver (2 702 of them could go into a payload driver that
  already carries TS0601). The forum's 1 643 counted fewer drivers; the order of magnitude is the same.
  P3038 freed nothing in the payload: the 9 drivers had no manufacturer left, so they were already
  pruned (0 combos).
- Why: the cost is cartesian per driver. climate_sensor: source 2 005 mfrs × 61 pids, pass 1 keeps
  58 × 34 observed pids, pass 2 ends at 19 × 12 = 228 combos. One more real TS0601 manufacturer
  there costs 2 case forms × 12 pids = 24 combos. The 1574 baseline pins (14 282 couples, pinned exactly
  by P3024b) already fill ~15 340 of the 15 500 cap, leaving ~160 combos for everything else.
- What Athom really accepted (payload rebuilt with each commit's own compactor and caps; these are
  "align/sync to Test" commits, so close to but not proven byte-identical with the uploaded payload):
  9.0.664 Test (fbcb2246c6, caps 20000/2000) 20 000 combos, app.json 3.03 MB; 9.0.698 Test
  (e961b1f6cf) 19 986 combos, 3.04 MB; 9.0.914 Test #3177 (e65e7fab16, 17000/2000) 16 986 combos.
  Rejected: P2252 at 100k+ raw. October rejections at 13 995 were not combo related. So the highest
  ceiling we have evidence for is ~20 000 combos; nothing between 20k and 100k has been tried.
- Putting all 2 955 groups back into their current drivers would cost ~63 700 extra combos (~79k total;
  switch_1gang 12.8k, climate_sensor 11.9k, presence_sensor_radar 10.2k, curtain_motor 3.6k): far above
  anything accepted. Raising the plain cap to 20000 gains 4 485 couples but only 226 TS0601 groups,
  because pass 2 spends the room on other pids.
- Fix (additive): scripts/maintenance/ts0601-topup.cjs runs after the compaction in prepare-publish and
  only ADDS missing (mfr, TS0601) groups, mfs_db-observed first then cheapest, into payload drivers that
  already carry TS0601 and whose compose lists that manufacturer; up to HOMEY_ZIGBEE_TOPUP_MAX_TOTAL
  (20000, clamped to the measured maximum unless HOMEY_ZIGBEE_TOPUP_ALLOW_UNMEASURED=1) and
  HOMEY_ZIGBEE_TOPUP_MAX_DRIVER (2000). Same driver set, no productId added, max 2 case forms, nothing
  removed (test: p3036-ts0601-topup). Result on master: +540 groups (+4 501 combos, all seen in mfs_db),
  15 498 → 19 999 combos, app.json 1.79 MB; 2 162 groups still out. Disable: set the ceiling to "0".
- To bring ALL of them in without passing 20k, the cartesian cost must go: a TS0601-only carrier
  (sibling driver with productId ["TS0601"] only: ~2 combos per manufacturer, ~6k for all 2 955) or a
  per-driver split. That changes the driver set (new driver ids were an AggregateError suspect, disproved
  by P1 / P3034), so it is a proposal for the owner, not done here. Measuring above 20k needs real
  uploads (one step per allowed slot under P3036 spacing: 22k, 25k, 30k), also an owner decision.

## Update 2026-10-25 16:55 (Paris) — P3036b measured limits, base cap 17000, KB couple top-up
- Measured on every build we could rebuild (payload rebuilt with that commit's own compactor and caps):

  | Build | Athom outcome | Caps | Total combos | Largest driver | Other |
  |---|---|---|---|---|---|
  | 9.0.664 | Test | 20000/2000 | 20 000 | 272 | largest mfr list 206 |
  | 9.0.698 | Test | 20000/2000 | 19 986 | | largest mfr list 270 |
  | 9.0.914 | Test #3177 | 17000/2000 | 16 986 | 290 | |
  | 9.0.1364 | accepted | 14000/1500 | 13 995 | 882 | |
  | 9.0.1365 | AggregateError | 14000/1500 | 13 995 (same payload as 1364) | | not combo related |
  | 9.0.1426 | AggregateError | 14000/1500 | 14 000 | | not combo related |
  | 9.0.1520 | accepted | 14000/1500 | 13 996 | 1 008 (presence_sensor_radar) | app.json uploaded 3.93 MB |
  | 9.0.1599 | Test | 15500/1500 | 15 499 | 180 | upload 13:52 → draft 13:57 (~5 min) |
  | stable 5.12.449 | accepted | 14000/1500 | 13 998 | 1 008 | archive 38.33 MB |
  | stable 5.12.504 | Test | 15500/1500 | 15 497 | | |

  Largest productId list 48–51 everywhere. Rejected for size: only P2252 (100k+ raw). So the measured
  accepted maxima are ~20 000 total combos, 1 008 per driver, app.json 3.93 MB; processing ~5 min.
- Why P3038c did not fit 15500: a sacred pin keeps its manufacturer's whole row (mfr × every kept pid of
  the driver), so 81/77 pins cost ~700 combos and pushed the total to 16 216 (master) / 15 753 (stable);
  on bastien-home it fit (15 499) but pushed out 794 unguaranteed couples, 72 of them known by the KB.
- Fix (additive): base `HOMEY_ZIGBEE_MAX_TOTAL_COMBOS` 17000 (≤ 9.0.914's 16 986 + margin, far below
  20 000) in auto-publish-on-push, publish-stable and bastien-publish; then
  `scripts/maintenance/kb-couple-topup.cjs` (`HOMEY_ZIGBEE_KB_TOPUP_MAX_TOTAL` 20000, clamped to 20 000
  total and 1 008 per driver) ADDS KB couples (`data/kb/couples.json`, exact bytes) that a payload driver's
  compose declares. Tier 1: `config/architecture/kb-topup-priority.json` (KB couples the P3038c pins
  pushed out: master 91, stable-v5 117, bastien-home 72), a trimmed productId may be restored for these;
  FATAL in prepare-publish if one cannot be put back. Tier 2: the other KB couples, one manufacturer form
  per (driver, mfr), only where the productId is already shipped. Never a new driver. Runs before the
  TS0601 top-up (master), which now gets the little room left.
- Simulated on the three trees (17000 + KB 20000): master 16 996 → 19 997 (+737 KB couples), stable-v5
  16 987 → 19 996 (+712), bastien-home 17 000 → 19 997 (+797). KB couples shipped vs before P3038c:
  744 → 1 538, 762 → 1 522, 755 → 1 626; KB couples lost vs before P3038c: 0 on all three.
  Still out: ~1 000–1 200 KB couples for lack of room, 273–378 unplaceable (productId or driver not in
  the payload). Not done: case-form dedup (waits for P3027) and phantom-combination pruning.

## Update 2026-10-25 17:20 (Paris) — P3036c single cap source, SPM02V1-GT pin, coverage target
- One source: `config/publish-caps.json` (`caps` + the `measured` block above), read through
  `scripts/lib/publish-caps.cjs` by prepare-publish, the compactor defaults, the platform budget gate
  (`limitFrom.capsFile`), `scripts/kb/z2m-coverage.js`, the tests and the workflows
  (`platform-budget.yml` runs `node scripts/lib/publish-caps.cjs --github-env`). The publish workflows no
  longer set any `HOMEY_ZIGBEE_*` cap (they said 15500 while a simulation used 17000). An env var with the
  historical name still overrides for a manual run. Guard: `test/critical/p3036c-single-cap-source.test.js`.
- Values: base 17000, per driver 1008 (= measured accepted max), 2 case forms, KB top-up 20000/1008,
  TS0601 top-up 20000/1008 on master (0 = dormant on stable-v5 / bastien-home).
- Simulated full pipeline (sanitize → compact → KB top-up → TS0601 top-up): master 16 997 → 20 000,
  stable-v5 16 987 → 19 996, bastien-home 17 000 → 19 997; sacredMissing 0; KB priority couples
  91/117/72 all back. Uploaded app.json +14–17 KB (master 1.787 → 1.801 MB, bastien 3.198 → 3.214 MB),
  ~93.4 % of the 4 MB gate, under the 3.93 MB accepted.
- `wjk6rurm|TS0601` (SPM02V1-GT, exact forms `_TZE200/_TZE204/_TZE284_wjk6rurm`) pinned on power_meter
  (master, after P3039a fd00ad088e); shipped in the simulated payload.
- Coverage target (data/kb/z2m-coverage.json, master: 2 254 couples known by sources but compacted):
  now shipped 731 (651 byte-exact); stable-v5 810/2 318, bastien-home 923/2 303. Putting back every
  remaining one would need ~44 600 combos (measured by a top-up with no ceiling), more than twice the
  accepted 20 000, because each couple costs its whole mfr row × the driver's productIds. Next levers,
  not done: case-form dedup once P3027 is merged, a per-driver split (owner decision: new driver ids),
  or a measured probe above 20k (owner decision: real uploads).
- Per driver: presence_sensor_radar is 1 364 combos on master (1 403 stable, 1 281 bastien), above the
  measured 1 008. Not new: origin/master already shipped 1 078 there because the P3024b baseline pins
  (lower-case pid twins included) are exact and bypass the per-driver cap; P3038c adds to it. No Athom
  rejection has ever been tied to a per-driver count; the case dedup after P3027 is the fix.

## Update 2026-10-25 17:45 (Paris) — P3036d raised caps, the real bound is the uploaded app.json

Owner decision 17:29 (t523u) and rule 17:31 (t524u). 15500 was our own heuristic. Measured on the CI and on the accepted builds:

- The "93 %" of `upload_app_json_mb` was the intermediate app.json that prepare-publish checks against its own 4 MB gate (3.73 MB). That file still contains the orphan flow cards that P2930 removes afterwards. The app.json actually uploaded was 3.13 MB at 19976 combos (platform-budget run of 17:15 Paris, master). #3682 (9.0.1599, 15499 combos, largest driver 180) went to Test.
- Largest app.json Athom accepted: 3.93 MB (9.0.1520, archive measure). Combos: 20000 accepted (9.0.664). The only combo rejection was P2252, at 100k+.
- Caps (single source `config/publish-caps.json`):
  - base compaction: 20000 total, 1500 per driver;
  - top-ups (KB, coverage matrix, TS0601): up to 45000 total and 2000 per driver (`allowAboveMeasuredCombos` 1). 45000 is under 90 % of the only rejection.
  - binding check: `maxUploadAppJsonBytes` 3537000 (90 % of 3.93 MB), tested by FATAL(P3036d) on the final uploaded app.json. The intermediate 4 MB check only warns when this cap is set.
- New tier 1b in `kb-couple-topup.cjs`: the couples `data/kb/z2m-coverage.json` lists as compacted out (on the ports, the snapshot `data/kb/coverage-compacted-couples.json`). It puts them back one exact mfr+pid couple at a time, on the cheapest driver whose compose declares the couple byte-exact (adding its productId if needed), cheapest first, within the ceilings.
  - Nothing is ever removed.
  - No manufacturer leaves a driver because it exists elsewhere.
  - Case forms with different productIds are never merged.
- Measured with the real `prepare-publish.js`:

  | | master | stable-v5 | bastien-home (27 house drivers) |
  |---|---|---|---|
  | combos | 44972 | 36830 | 17633 |
  | uploaded app.json | 3323603 B (94.0 % of the cap) | 2923217 B | 521399 B |
  | coverage couples compacted out, now shipped | 1781/2254 (was 651) | 1826/2318 | 1163/2303 |

  P3024b: 0 lost on all 3. Bastien: 0 couple lost vs before P3038c, KB couples 182 → 1339. No byte reduction was needed: the payload is already minified, has no duplicate byte-identical forms, and its empty fields weigh 4 KB.
- Rollback: if Athom refuses the next normal master upload (not a transient error), restore `decision.rollback.caps` in the config (17000 / 1008 / 20000 / 1008) and set `allowAboveMeasuredCombos` to 0. The bisect does the rest. No manual Athom upload.
