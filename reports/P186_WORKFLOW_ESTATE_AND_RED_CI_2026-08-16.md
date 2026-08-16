# P186 — Workflow estate audit and the permanently-red CI (2026-08-16)

Analysed all 62 workflows, replayed the main CI job locally, and compared the
static picture against the last 200 real runs on GitHub. The run history changed
the priorities completely.

## 1. The canonical CI was failing 26 times out of 27

| Workflow | failures / runs |
|---|---|
| 🛡️ Unified CI/CD Orchestrator | **26 / 27** |
| Auto-Publish on Push | 10 / 26 |
| 🔍 Syntax Check & SDK3 Validation | 8 / 22 |
| 🤖 Auto-Fix + Publish Pipeline | 0 / 28 |
| everything else | 0 |

A CI that is always red carries no information: every push looks the same
whether it is clean or broken. This mattered far more than anything the static
audit found, and it is only visible from the run history.

Two distinct causes, found by pulling the failing step logs:

### Cause A — my own regression from P182

```
ERROR [BATTERY_CAPABILITY_CONFLICT] button_emergency_sos:
Do not expose measure_battery and alarm_battery on the same driver
```

In P182 I added `alarm_battery` to `button_emergency_sos` because the runtime
created it via `addCapability` and the manifest did not declare it. That was the
wrong direction: `scripts/ci/homey-online-guidelines-audit.js` enforces the
project rule (`ZIGBEE_TUYA_RULES.md:69`) that the two capabilities must not
coexist.

Resolved the other way — the capability is gone from both the manifest **and**
`_ensureCapabilities`, so the device no longer creates it at runtime either.
Low battery still reaches flows through the driver's `battery_low` trigger. The
guidelines audit now reports **0 errors**.

### Cause B — pre-existing, since the air_purifier hybrids were deprecated

```
NEW COLLISION _deprecated_air_purifier_hybrid_do_not_pair|TS0601
  -> air_purifier_curtain, air_purifier_siren
```

`_deprecated_..._do_not_pair` is a synthetic sentinel whose entire purpose is to
make sure no hardware ever matches. Two deprecated drivers sharing one is the
deprecation marker working, not a collision.

`.github/scripts/fp-collision-check.js` already exempts the `_hybrid_*_needs_
device_assignment` family but had never been taught about this newer sentinel,
so it failed on **every single push** after P142. One regex entry fixes it;
the check now reports 0 new collisions.

### Cause C — un-applied mfs_db drift (blocked `syntax-check`)

`syntax-check.yml` failed on `align-mfs-db-intelligent.js --check`: two
high-severity `driverHint` drifts had accumulated without being applied.
Applying them produced a two-line change to `data/mfs_db.json`.

That apply also strips the manufacturer from the misattributed driver — and the
tool **strips without adding to the canonical driver**. It removed
`_TZ3000_qeuvnohg` from `lcdtemphumidsensor_plug_energy` and left it claimed by
nobody, even though the registry names `din_rail_switch` as its home and that
driver already carries `TS011F` plus a sibling manufacturer from the same case.

The Z9 rule added in P184 caught it immediately: `humanGaps` went from 0 to 1 for
a manufacturer that appears in the forum scan. Coverage restored on
`din_rail_switch`; back to 0.

### Correction to P185

P185 called `_tz3210_jaap6jeb` a legitimate multi-class manufacturer because
mfs_db lists both `TS0203` and `TS0601` for it. That evidence is **circular**:
`mfs-aggregator.js` derives modelIds from `productIds[0]` of every driver listing
the manufacturer, so mfs_db learned `TS0203` from the `contact_sensor` placement
being audited. The curated registry pins it to `bulb_rgbw`/`TS0505B`, and that
decision stands.

The lesson generalises: for any manufacturer whose mfs_db evidence is
`sources: ["local"]`, the modelId list cannot validate a placement — it was read
back out of the manifests.

### Verified outcome

| Workflow | before | after |
|---|---|---|
| 🛡️ Unified CI/CD Orchestrator | 26 failures / 27 runs | **success** |
| 🔍 Syntax Check & SDK3 Validation | 8 failures / 22 runs | **success** |
| code-quality, Deploy Pages, Auto-Fix+Publish, continuous-flow | green | green |

## 2. Local replay of the CI gate sequence

Replayed the sixteen gates of the "Universal Validation" job locally, skipping
only the two steps that need the Homey CLI:

```
PASS  YAML policy gate            PASS  Metadata consistency
PASS  Timer context guard         PASS  FP collision
PASS  Voice safety                PASS  Anti-bot regression
PASS  Flow card uniqueness        PASS  Bare ZigBeeDevice
PASS  Homey guidelines            PASS  Unbound catch gate
PASS  Fleetwood pre-commit        PASS  Double-division hard
PASS  Regression lessons          PASS  Zero defect audit (190s)
PASS  SDK3 strict linter
PASS  Architectural audit         → 16/16
```

Worth noting the zero-defect audit takes 190 seconds on its own, about 95% of the
whole sequence.

## 3. Workflow-level defects fixed

**`deploy-pages.yml`** declared `workflow_run` on
`"🌌 UNIFIED ENGINE — Daily Galaxy Orchestrator"`. No workflow carries that name,
so the trigger could never fire — it had been dead since the producing workflow
was renamed or deleted. Removed: the daily schedule and the path-filtered `push`
already cover every case it was meant to catch.

**`continuous-flow.yml`** committed and pushed without `[skip ci]` and without a
rebase. The loop risk was smaller than it looks — the step is gated on
`inputs.mode == 'apply'`, which is empty on schedule and push triggers, so it
only runs on manual dispatch. The collision risk was real though, since it writes
to master inside the busiest scheduling window. Now rebases and marks the commit.

**`smart-update.yml`** ran three `node` steps with no `actions/setup-node` and no
`npm ci`, so any `require()` of a dependency would have thrown. Added both,
pinned to the SHA already used by 51 other workflows in this repo rather than a
new one.

## 4. Cron congestion — measured, not fixed

The project rule is to stagger schedules by 30+ minutes. Reality:

| Time (UTC) | Workflows firing |
|---|---|
| 00:00 | `gmail-diagnostics`, `auto-enrich-closed-loop` |
| 08:00 | `auto-enrich`, `publish-self-heal`, `gmail-token-keepalive` |
| 12:00 | `validate`, `publish-self-heal`, `gmail-diagnostics`, `auto-enrich` |

plus a chain through 03:00–05:45 where fifteen pairs sit under 30 minutes apart.
Monday 03:41–05:45 packs eight scheduled workflows into two hours.

Not changed in this pass. Most of these writers already go through
`scripts/ci/verified-git-push.sh`, which rebases, so the collisions degrade into
retries rather than failures — and the run history confirms it: **zero failures**
across all the scheduled enrichment workflows. Re-timing 20 crons is a change
whose blast radius exceeds its measured benefit right now.

## 5. Estate observations

- **62 workflows**, all with `permissions`, `concurrency`, job `timeout-minutes`
  and `defaults.run.shell: bash`. That part of the discipline holds.
- **Every referenced script path exists.** A full verification pass over every
  `node …` / `bash …` invocation found no broken reference.
- **Two reusable workflows are orphans**: `upstream-guard.yml` and
  `gmail-token-keepalive.yml` both expose `workflow_call` and nobody calls them —
  the logic was inlined at the call sites instead.
- **Eight workflows have their schedule commented out** and a further three had
  it removed; they are dispatch-only now. Several duplicate a canonical sibling
  (`mega-crawl` vs `recurrent-orchestrator`, `publish.yml` vs
  `auto-publish-on-push`, `activity-monitor`/`temporal-monitor` vs
  `recurrent-orchestrator`). Consolidation candidates, left alone here.
- **Secret guards are the exception**: only three workflows check a secret is
  non-empty before using it. The publish cluster fails loudly rather than
  silently, so this is untidy rather than dangerous.

## Commands

```bash
node scripts/ci/validate-all-yaml.js
node scripts/ci/validate-github-actions-policy.js
node scripts/ci/homey-online-guidelines-audit.js
node .github/scripts/fp-collision-check.js --baseline .github/fingerprint-collision-baseline.json
gh run list --repo dlnraja/com.tuya.zigbee --limit 50
```
