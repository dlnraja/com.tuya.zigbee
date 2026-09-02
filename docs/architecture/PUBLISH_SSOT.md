# Publish SSOT (P2286–P2288 + P2323/P2325/P2326)

Machine SSOT: [`config/architecture/publish-ssot.json`](../../config/architecture/publish-ssot.json)  
Sacred pin list: [`config/architecture/publish-sacred-keep-couples.json`](../../config/architecture/publish-sacred-keep-couples.json)  
Workflow policy: [`.github/WORKFLOW_GUIDELINES.md`](../../.github/WORKFLOW_GUIDELINES.md) §M.8–M.11

**Classify:** `BOTH` (master + stable-v5 reliability).

## Canonical publish path

Never upload from **repo root**. Always:

```bash
npm run build
npm run prepare-publish
npm run publish:direct -- --channel test
# or: npm run publish:temp -- --channel test
```

`direct-api-publish.js` refuses paths outside `homey-publish-temp` unless `HOMEY_ALLOW_REPO_PUBLISH=1` or `--force`.

## Soft-expect (P2286)

Athom races when two publishers hit `createBuild` for the same version.

| When | Action |
|------|--------|
| Same version already `test` | Skip createBuild / upload / promote (exit 0) |
| Same version in-flight | Skip |
| Orphan `processing_failed` + peer `test` | Skip (P139) |

Implementation: `scripts/lib/soft-expect-decision.js` · Gate: `npm run check:p2286`

## Athom hang soft-continue (P2323 / P2325)

| Signal | Action |
|--------|--------|
| Tip email / Dev Tools `socket hang up` | Do **not** bump-loop |
| `dashboard-monitor` `Timeout after 10000ms` | Use `HOMEY_API_TIMEOUT_MS=120000` + soft-alert |
| Verify expected version still `draft`/`processing_failed` but older Test healthy | `verify-test-version.js` soft-continues (P2325) |
| Human one-shot retry | `workflow_dispatch` + `force_publish` → `direct-api-publish --force` (P2384) |

Gate: `npm run check:p2325`

## Inbox diag harvest (P2326)

Forum media + GitHub issue diag UUIDs → `tools/ci/inbox-diag-uuid-harvest.js` (wired in `forum-poll.yml`, `fetch-diags.yml`).

Runtime: DynCap must not invent FCU DP36→setpoint; radiator logs curtain misroutes.

Gate: `npm run check:p2326`

## Sacred-keep compaction (P2288)

`prepare-publish` runs `compact-zigbee-identifiers.cjs` on the temp manifest. Verified `(mfr, pid, driverId)` couples in `publish-sacred-keep-couples.json` are **re-injected** after budget cuts.

Gate: `npm run check:p2288`

## IAS leftover EF00 (P2287)

Sleepy IAS-only devices must not receive leftover EF00 TX on wake.

- Pure helper: `lib/io/shouldSkipIasOnlyEf00Tx.js`
- Re-exported from `DeviceIOFacade` for runtime
- Gate: `npm run check:p2287`

## CI gates (unified-ci)

```bash
npm run check:p2284 && npm run check:p2285
npm run check:p2286 && npm run check:p2287 && npm run check:p2288
node tools/ci/prune-fp-collision-bleed.js --check
```

## P139 / P2384

Do **not** spam republish on Athom `processing_failed` / `socket hang up`. Soft-expect + wait for healthy Test build.

Controlled override (once): Auto-Publish `workflow_dispatch` with `force_publish=true` sets `HOMEY_FORCE_PUBLISH=1` → `scripts/direct-api-publish.js --force`, with `HOMEY_API_TIMEOUT_MS=120000`, `HOMEY_DRAFT_WAIT_MS=600000`, `HOMEY_HEALTHY_TEST_PATCH_LAG=8`.

See also: [PROTOCOL_TX_RX_SSOT.md](./PROTOCOL_TX_RX_SSOT.md) (IAS skip) · [DUAL_APP_VISION.md](../rules/DUAL_APP_VISION.md)
