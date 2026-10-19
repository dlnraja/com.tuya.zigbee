# Athom `processing_failed | socket hang up` — evidence, conclusion, fixes (2026-10-19)

Question from the user: "it is an app size problem". This note records what the run logs of 2026-10-18/19
show, what we changed on our side, and what stays unproven. Nothing here involved contacting Athom.

## Evidence (CI run logs, one row per Athom build)

Master (`auto-publish-on-push.yml`, upload with the Homey CLI, archive = what the CLI reports):

| version | build | CLI archive | files | app.json | outcome |
|---|---|---|---|---|---|
| 9.0.1516 | 3597 | 35.83 MB | 4536 | 3.93 MB | Test |
| 9.0.1517 | 3598 | 35.83 MB | 4536 | 3.93 MB | Test |
| 9.0.1518 | 3599 | 35.83 MB | 4536 | 3.93 MB | Test |
| 9.0.1519 | 3600 | 35.84 MB | 4537 | 3.93 MB | **socket hang up** |
| 9.0.1520 | 3601 | 35.85 MB | 4537 | 3.93 MB | Test |
| 9.0.1521 | 3602 | 35.85 MB | 4537 | 3.93 MB | Test |
| 9.0.1522 | 3603 | 35.85 MB | 4537 | 3.93 MB | **socket hang up** |
| 9.0.1523 | 3604 | 35.86 MB | 4542 | 3.93 MB | Test (whd02 released) |
| 9.0.1524 | 3605 | 35.85 MB | 4537 | 3.93 MB | **socket hang up** |
| 9.0.1525 | 3606 | 35.87 MB | 4547 | 3.93 MB | **socket hang up** (spi released) |
| 9.0.1526 | 3607 | 35.87 MB | 4547 | 3.93 MB | **socket hang up** (spi released) |

Stable (`publish-stable.yml`, Homey CLI): 38.18–38.52 MB, 4610–4631 files, app.json 3.50 MB.
`#339 v5.12.445` F, `#341 v5.12.447` F, `#343 v5.12.449` T with the **same** 38.33 MB / 4631-file archive.

Bastien (`bastien-publish.yml`, direct Apps API upload): 21.1–21.5 MB raw, 5.1 MB gz, 2667–2673 files, ~30 drivers.
Builds #170–#176 (v1.0.162–1.0.168): 7 of 7 reached Test, "ready as test" about 2 s after upload.

## Findings

1. **Within one app the size does not decide the outcome.** Archives that are byte-for-byte the same size
   (±0.02 MB, same file count) flip between Test and socket hang up (master 3601/3602 T vs 3603 F; stable 343 T
   vs 339/341 F). So size is not a deterministic cause and no per-app threshold exists in the data.
2. **Across apps there is a weak correlation.** The small app (30 drivers, 5 MB gz) never fails; the two big
   apps (335–346 drivers, 4,500+ files, 35–38 MB raw) fail about 40–45 % of the time. That fits "Athom's
   processing of a big app times out sometimes" (volume/complexity raises the odds) better than a hard size limit.
   It is not proof; only a controlled series would show it.
3. `stateMeta=socket hang up` is written by Athom **after** our upload was accepted. Upload retries/backoff on
   our side therefore cannot prevent it; the only remedy on our side is a new build (new version) of the same content.
4. Not the cause (checked): runner network (upload accepted every time), concurrency with other apps (a failing master
   upload at 23:55:52 and a succeeding stable upload at 23:56:11 overlapped), token/session (same session in the
   same run), the 4 MB app.json limit (3.93 MB passes; it was already compacted before every build).
5. The pipeline was **not retrying**: `assert-athom-final` turned the job green via SOFT-EXPECT while an older Test
   stayed healthy, and `transient-publish-retry` (P2831) refused to retry whenever any Test existed. Net effect: three
   master builds in a row stayed failed and Test lagged the source by 4 versions. This is the part we could fix.

## What dominates the payload (master, after prepare-publish, MiB)

drivers 15.3 (2893 files: js 4.2, png 3.5, html 2.7, svg 2.3, firmware .bin 2.5), lib 10.4 (1034 files),
app.json 3.9, node_modules 1.9 after prune, data 1.1, config 0.5. About 6.4 MiB of drivers/ is byte-identical
duplicates (png/svg/html). They are **not** safe to dedupe: `LearnmodeTemplates` resolves `{{driverAssetsPath}}/icon.svg`
and `ButtonVisual` reads the driver `large.png` by path at runtime, and pair views cannot be shared between drivers.

## Changes (additive, lossless)

- `scripts/maintenance/prune-publish-payload.cjs`: drop `.html` pair/repair views a driver does not declare in app.json
  (the hyphenated `select-driver.html` twins; about 80 files). Payload only, sources untouched. Test p2830d.
- `scripts/ci/footprint-report.js` + `config/footprint-budgets.json`: ROM (payload, files, app.json, lib, drivers,
  node_modules, data, duplicates), RAM (module-load heap upper bound via `scripts/perf/boot-heap.js`: 43.5-45.7 MB with all 899
  modules loaded) and CPU-ish static signals (130 `setInterval` sites, 12 `process.memoryUsage` sites in the payload).
  Warn-only; runs before every master publish and writes the step summary. The ledger line gets payloadMB/files/appJsonMB.
- `transient-publish-retry.js` (P2830e): reach-Test policy. Transport failures (socket hang up, specified key, ...) get
  2 bumped retries per chain even when an older Test is healthy (`ATHOM_REACH_TEST=0` restores P2831). invalid_state keeps
  1 retry after the idle wait. AggregateError keeps 2 retries (it flips on identical content) and then prints
  `[transient-retry] BISECT` plus a ledger flag instead of retrying. Exponential backoff 60/120/240 s plus 0-30 s jitter before
  each re-dispatch. The version always comes from the floor script (strictly above every Athom build incl. failed drafts).
- `auto-publish-on-push.yml` final gate: SOFT-EXPECT now also triggers the retry decision (job stays green when the
  old Test is healthy, but a retry is dispatched).
- Ledger: the writer now appends to `docs/knowledge/athom-publish-outcomes.jsonl` (bot commit stages `docs`).
- Version alignment gate `test/critical/p2830f-version-alignment.test.js`: app.json = .homeycompose/app.json = package.json =
  package-lock; floor file never above; changelog never ahead; app.js reads `homey.manifest.version`; no workflow bumps twice.
- Held-driver release (`release_held`, P2830c) stays a manual dispatch input; it shares the same retry chain.

## Still open

- Whether the 4,500-file / 35 MB volume itself raises the failure rate is unproven. Next lever if retries are not enough:
  split the heavy per-driver assets (firmware .bin 2.5 MB, 2.3 MB svg) into lazily fetched data, and a controlled series of
  4-6 builds of one smaller payload.
- Unrelated to size: the 9.0.1523 -> 1526 failures also hit builds without the released drivers, so SPI is not implicated.

## Update 2026-10-19 morning — results after the fixes (times Paris)

| app | build | version | archive / files | outcome | how |
|---|---|---|---|---|---|
| master | 3608 | 9.0.1527 | 35.87 MB / 4547 | socket hang up | push 2c15b18728 (06:54) |
| master | 3609 | 9.0.1528 | 35.37 MB / 4461 | **Test** | automatic retry 1 (P2830e, 68 s backoff) |
| master | 3610 | 9.0.1529 | ~35.4 MB / ~4462 | socket hang up | push 4114da52 (other worker) |
| master | 3611 | 9.0.1530 | ~35.4 MB / ~4462 | socket hang up | automatic retry 1 |
| master | 3612 | 9.0.1531 | 35.38 MB / 4462 | **Test** | automatic retry 2 (120 s backoff) |
| master | 3613 | 9.0.1532 | ~35.4 MB / ~4462 | socket hang up | manual dispatch (aim: 2nd consecutive Test) |
| stable | 344, 345, 346 | 5.12.450-452 | 38.34 MB / 4632-4633 | **Test** x3 | pushes |
| stable | 347 | 5.12.453 | after prune (194 items, 1.25 MB removed) | socket hang up | push ab6f3e1fe2 |
| stable | 348 | 5.12.454 | same | **Test** | in-run re-upload (new patch, backoff) |
| bastien | 177 | 1.0.169 | 20.92 MB / 2669, 5.11 MB gz | **Test** | push |
| bastien | 178 | 1.0.170 | 19.90 MB / 2501, 4.92 MB gz (prune) | **Test** | dispatch |

- The removal of ~80-170 dead files (undeclared pair views + node_modules docs on stable/bastien) did not change the
  master/stable failure rate in this small sample. Size reduction alone is not the fix.
- Since 2026-10-18 23:53 Paris (21:53 UTC, from build 3605) master fails about 7 of 9 builds, while stable (smaller
  app.json: 3.50 vs 3.93 MB, 6.1k vs fewer flow cards) fails 1 of 7 and Bastien 0 of 9. Content between a passing (3604)
  and a failing (3605) master build differed only in version/changelog. The strongest remaining correlate is **app.json
  complexity on Athom's processing side**: master app.json is 65 % flow cards (6,073 cards, 5,890 device-filtered per-driver
  cards, 2.56 MB). That part cannot be shrunk losslessly (card ids are referenced by users' flows), so it stays as is.
- What makes the apps reach Test reliably now is the automation: every chain retries up to twice with a new version and
  exponential backoff + jitter; stable re-uploads in-run; all versions come from the floor script and are strictly higher than
  every uploaded build, failed drafts included (ledger + alignment gate p2830f).

## Update 2026-10-19 09:40 (Europe/Paris): measure the uploaded app.json, shrink it losslessly (P2830h)

**Wrong artifact.** `homey app validate/build` writes `.homeybuild/app.json` (and on stable the root
`app.json`) with every driver Flow card merged in. That file is not uploaded: prepare-publish sanitizes,
compacts the Zigbee matrix and syncs the prepared manifest back. When a job stopped before
prepare-publish (master run 39212802011, guidelines error), the metadata-commit pre-commit hook judged
the raw 4.75 MB build and failed. Stable's pre-step judged the 4.34 MB composed root (warn-only step).
The gate now projects such a file through sanitize + compact + strip, the same steps as prepare-publish,
and fails only if the projection is above 4.00 MB.

| app | raw build app.json | upload app.json before | after P2830h | strip saved | cards stripped |
|---|---|---|---|---|---|
| master 9.0.1536 | 4.75-4.80 MB | 3.92-3.93 MB | 3.46-3.48 MB | 0.467 MB | 4930 |
| stable 5.12.459 | 4.29-4.34 MB | ~3.5 MB | 3.07-3.08 MB | 0.439 MB | 4679 |
| bastien | 4.47 MB | ~0.64 MB | 0.56 MB | 0.080 MB | 761 |

**Lossless strip.** `scripts/maintenance/strip-redundant-title-formatted.cjs` removes `titleFormatted` only
when homey-lib `App._validateFlowCard` ignores it: no argument other than the first `driver_id`-filtered
device argument, no droptoken, and no `[[..]]`. The Flow UI then renders the title. Card ids, args,
tokens and titles are unchanged. `homey app validate --level publish` gives the same 116 titleFormatted
warnings before and after on master. It runs on the publish copy only; the compose sources are not
modified.

**Results:**
- master #3617 v9.0.1536 Test (upload 3.46 MB, archive 34.95 MB / 4468 files); Test streak #3615-#3617;
- stable #352 v5.12.458 socket hang up, then an in-run re-upload gave #353 v5.12.459 Test. A smaller
  app.json does not by itself prevent the hang, which is consistent with the earlier finding; the
  retry chain remains the fix.

Other options checked and not taken:
- i18n values equal to `en`: 0.046 MB, relies on runtime fallback;
- settings hints: 0.235 MB, lossy;
- merging per-driver cards: changes card ids and breaks user flows.

## P2884 — Orchestrator red after P2883 (19/10, 10:10 Paris)
- Cause: P2883 moved P2138 in pr-gate / validate / syntax-check / code-quality into the shared `.github/actions/rules-gates` step (`only: ...,p2138,...`). The P2281 lineage gate still grepped each workflow for the literal script name `p2138-sacred-couple-matrix-gate`, so it reported "missing P2138 matrix" although P2138 still ran hard.
- Fix: the gate now also accepts a rules-gates step, but only if it is hard (no `soft: true`, no `continue-on-error: true`), selects `p2138` via `only:` or a profile that contains it, and `scripts/ci/rules-gates.js` maps `p2138` to the same script. Not weakened: dropping p2138 from `only:` or making the step soft still fails (test/ci/p2884-lineage-rules-gates.test.js).

## P2885 — further lossless shrink of the uploaded package (19/10, 10:30 Paris)

Measured on a local reproduction of the CI publish dir (node 22, `homey app build` → optimise → `prepare-publish`
→ `npm ci --omit=dev` → `prune-publish-payload`), isolated TMPDIR.

| app | payload before | after P2885 | files | tar.gz |
|---|---|---|---|---|
| master | 30.54 MiB | 29.53 MiB (-1.00) | 4467 → 4399 | 8.53 → 8.39 MB |
| stable | 32.22 MiB | 31.26 MiB (-0.96) | 4415 → 4339 | 10.86 → 10.70 MB |

What was done (`scripts/maintenance/lossless-shrink-payload.cjs`, called from `prune-publish-payload.cjs`):
- JSON in data/, config/, lib/, locales/, capabilities/ minified, only when the parse result is identical (master 327 files, -0.475 MB).
- lib JS proven unreferenced removed (master 68 files, -0.53 MB; stable 76, -0.58 MB): not reachable by any static
  require/import from app.js, api.js, driver/device/pair/repair/widgets/settings; basename (case-insensitive) not
  mentioned in any other payload text file, iterated to a fixed point; lib/clusters never touched; any unreviewed
  dynamic `require(expr)` disables the step. A Homey-less load check (app.js + every driver.js/device.js) runs
  before and after; any new "Cannot find module" restores every file. `homey app validate --level publish` OK on the result.

What was checked and kept, with the reason:
- **Firmware (.bin, 2.54 MB, 10 files)**: the SDK requires them in `drivers/<id>/assets/firmware/` and lists them in
  `driver.firmware.compose.json`; Athom stores them separately at upload and Homey downloads them only when an
  update starts. No runtime/remote loading API exists → kept. The 3 identical pairs cannot be shared across drivers.
- **Duplicate driver images/SVG/pair views (5.61 MB byte-identical)**: Homey needs per-driver assets by path
  (`drivers/<id>/assets/...`); `LearnmodeTemplates` and `ButtonVisual` read them by path; the archive has no
  sanctioned link mechanism → kept.
- **SVG whitespace/comments/metadata**: only 0.11 MB possible → not worth the render risk.
- **data/config/assets not named in code (0.40 MB)**: contains false positives (locales are loaded by Homey by
  language; config/architecture files are read by computed names) → not removed.
- **JS minification**: would change crash line numbers in user diagnostics → not done.

Conclusion so far: the package is about 97 % runtime-required content; lossless levers are now exhausted
at about -3 %. Failure-rate comparison: see the controlled series below.
