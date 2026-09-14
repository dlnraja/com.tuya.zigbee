# Publish SSOT (P2286–P2288 + P2323/P2325/P2326 + P2490–P2495)

Machine SSOT: [`config/architecture/publish-ssot.json`](../../config/architecture/publish-ssot.json)  
Sacred pin list: [`config/architecture/publish-sacred-keep-couples.json`](../../config/architecture/publish-sacred-keep-couples.json)  
Couple doctrine: [`config/architecture/sacred-couple-ssot.json`](../../config/architecture/sacred-couple-ssot.json)  
Forum complementary failover: [`config/architecture/forum-complementary-failover-ssot.json`](../../config/architecture/forum-complementary-failover-ssot.json)  
Workflow policy: [`.github/WORKFLOW_GUIDELINES.md`](../../.github/WORKFLOW_GUIDELINES.md) §M.8–M.12

**Classify:** `BOTH` (master + stable-v5 reliability).

## Canonical publish path

Never upload from **repo root**. Always:

```bash
npm run build
npm run prepare-publish   # P2495 preflight: sacred-keep couples via sacred-couple-pair
npm run publish:direct -- --channel test
# or: npm run publish:temp -- --channel test
```

`direct-api-publish.js` refuses paths outside `homey-publish-temp` unless `HOMEY_ALLOW_REPO_PUBLISH=1` or `--force`.

## Pre-publish gates (P2495)

```bash
npm run check:publish
# = check:p2286 + p2287 + p2288 + p2490 + p2494 + p2495
```

Also run family packs before tip:

```bash
npm run check:p244x && npm run check:p246x && npm run check:p248x && npm run check:p249x
```

Hard-wired in: `auto-publish-on-push.yml`, `auto-fix-and-publish.yml`, `unified-ci.yml`, `validate.yml`.  
Soft: `continuous-flow.yml`, `project-resilience.yml`.  
Stable track: `publish-stable.yml` runs anti-bot + P2138 + p2288 + p2494 + p2495 before prepare.

## Soft-expect (P2286)

Athom races when two publishers hit `createBuild` for the same version.

| When | Action |
|------|--------|
| Same version already `test` | Skip createBuild / upload / promote (exit 0) |
| Same version in-flight | Skip |
| Orphan `processing_failed` + peer `test` | Skip (P139) |

Implementation: `scripts/lib/soft-expect-decision.js` · Gate: `npm run check:p2286`

## Athom hang soft-continue (P2323 / P2325 / P139)

| Signal | Action |
|--------|--------|
| Tip email / Dev Tools `socket hang up` | Do **not** bump-loop |
| `#3184` / `#3187` PF while `#3186` healthy | soft-continue — no spam republish |
| `dashboard-monitor` `Timeout after 10000ms` | Use `HOMEY_API_TIMEOUT_MS=120000` + soft-alert |
| Verify expected version still `draft`/`processing_failed` but older Test healthy | `verify-test-version.js` soft-continues (P2325) |
| Human one-shot retry | `workflow_dispatch` + `force_publish` → `direct-api-publish --force` (P2384) |

Gate: `npm run check:p2325`

## Inbox diag harvest (P2326)

Forum media + GitHub issue diag UUIDs → `tools/ci/inbox-diag-uuid-harvest.js` (wired in `forum-poll.yml`, `fetch-diags.yml`).

Runtime: DynCap must not invent FCU DP36→setpoint; radiator logs curtain misroutes.

Gate: `npm run check:p2326`

## Sacred-keep compaction (P2288 + P2490 + P2494)

`prepare-publish` **preflights** pin list (full `mfr+pid+driverId` only) then runs `compact-zigbee-identifiers.cjs`. Verified couples in `publish-sacred-keep-couples.json` are **re-injected** after budget cuts.

**P2490 lesson (2026-09-14):** Athom compact can drop one verified couple while keeping a sibling (`_TZE200_icka1clh` dropped vs `fodv6bkr` kept → MIAMO Unknown Zigbee). Always pin TZE200/204 siblings that users report, not only the TZE284 form.

Extra pins: `icka1clh` (TZE200/204), `zah67ekd`, `fodv6bkr` TZE200 → `curtain_motor`.

**mfs multi-pid is NORMAL** — never invent pid; never pin mfr-only.

Gates: `npm run check:p2288` · `npm run check:p2490` · `npm run check:p2494` · family `npm run check:publish`

## IAS leftover EF00 (P2287)

Sleepy IAS-only devices must not receive leftover EF00 TX on wake.

- Pure helper: `lib/io/shouldSkipIasOnlyEf00Tx.js`
- Re-exported from `DeviceIOFacade` for runtime
- Gate: `npm run check:p2287`

## AI efficiency on publish bots (P2491)

Workflows set `AI_FORCE_LOCAL=true` / `AI_ALLOW_REMOTE=false` so Auto-Publish does not burn remote AI quota.

## CI gates (unified-ci / validate)

```bash
npm run check:p2284 && npm run check:p2285
npm run check:p2286 && npm run check:p2287 && npm run check:p2288
npm run check:p248x && npm run check:p249x
npm run check:publish
node tools/ci/prune-fp-collision-bleed.js --check
```

## P139 / P2384

Do **not** spam republish on Athom `processing_failed` / `socket hang up`. Soft-expect + wait for healthy Test build.

Controlled override (once): Auto-Publish `workflow_dispatch` with `force_publish=true` sets `HOMEY_FORCE_PUBLISH=1` → `scripts/direct-api-publish.js --force`, with `HOMEY_API_TIMEOUT_MS=120000`, `HOMEY_DRAFT_WAIT_MS=600000`, `HOMEY_HEALTHY_TEST_PATCH_LAG=8`.

### Tip email pattern (P2458 / P2490 — 2026-09-10→14)

Homey tip mail for `com.dlnraja.tuya.zigbee`:

> Your build has failed processing … **socket hang up**  
> Examples: builds **#3140**, **#3142**, **#3184**, **#3187**

| Signal | Meaning | Action |
|--------|---------|--------|
| Tip email `socket hang up` | Athom processor/network flake (P139) | Wait cooldown; **no** bump-loop |
| Local `publish-size-gate` PASS + compacted cartesian ≲20k | Not a local packing bug | Do not “fix” by force republish |
| Healthy older Test still listed | Users can keep soaking last good tip | Soft-expect / soft-alert exit 0 |
| **2026-09-14** #3186 = **9.0.926 test** healthy; #3184/#3187 PF | Git may be ahead (P2490) | Soft-continue; users update Test ≥9.0.926 |
| Human wants one retry after hours | `workflow_dispatch` + `force_publish=true` once | Never cancel in-flight publish |

Gates / helpers:

- `npm run check:p2286` · `test/critical/p2286-soft-expect-publish.test.js`
- `test/critical/processing-failure-republish-check.test.js`
- `test/critical/p2458-tip-email-socket-hang.test.js`
- `.github/scripts/processing-failure-republish-check.js` (refuses transient bump-loop)
- `scripts/lib/soft-expect-decision.js` (`isTransientAthomFailure` / `softAlertDecision`)

See also: [PROTOCOL_TX_RX_SSOT.md](./PROTOCOL_TX_RX_SSOT.md) (IAS skip) · [DUAL_APP_VISION.md](../rules/DUAL_APP_VISION.md)
