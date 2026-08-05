# AGENTS.md — Guide for AI Agents working on com.tuya.zigbee

> **Mavis convention**: This file tells future agents (and humans) how the project is structured, what rules to follow, and where to find the canonical tools.

## Project Summary

| Item | Value |
|------|-------|
| **Project** | Universal Tuya Zigbee Device App for Homey Pro |
| **App ID** | `com.dlnraja.tuya.zigbee` |
| **Author** | Dylan Rajasekaram (dlnraja) |
| **License** | GPL-3.0 (was MIT-licensed JohanBendz fork) |
| **Branches** | `master` (preview/dev) + `stable-v5` (production) |
| **Current Version** | v9.0.348 (audit 2026-07-27) |
| **Drivers** | 430 on master, 431 on `stable-v5` |
| **Fingerprints** | 5,471 (audit 2026-07-27; 4,218 entries in mfs_db) |
| **SDK** | Homey SDK v3 (compatibility >= 12.2.0) |

## The Sacred Couple Doctrine

A **(mfr, pid)** pair = the canonical identity of a Zigbee device.

- **mfr** (manufacturerName): e.g. `_TZE200_aoclfnxz`, `_TZ3000_abc12345`
- **pid** (productId / modelID): e.g. `TS0601`, `TS0505B`, `TS0044`
- mfr alone is ambiguous (one mfr can map to multiple devices).
- pid alone is ambiguous (one pid is shared by many vendors).
- The pair is unique. Cross-reference all sources on this pair, not on individual fields.

## Stable vs Master Discipline

| Branch | Purpose | Rule |
|--------|---------|------|
| **`master`** | Dev/preview, new features, experiments, new FPs | Push freely. Auto-publish to Test channel. |
| **`stable-v5`** | Production, zero bugs, zero crashes | **Only** backport from master after master has been verified. |

> The user has been burned before by bot auto-publish reverting fixes — see P19 lessons in memory.
>
> **2026-07-27 — git history purge**: history was rewritten with `git-filter-repo` to remove sensitive/operational paths (see `reports/HISTORY_PURGE.md`). The first visible commit is now the v9.0.192 snapshot (2026-07-10) and the `origin` remote was dropped by the purge — it must be re-added before any push.
>
> **2026-08-04 — Stable vision (forum-driven)**: stable-v5 must differ from master on PURPOSE — master carries advanced features (flow engines, smart features), stable carries ONLY reliability. Forum sentiment analysis (2039 posts, topic 140352):
> - **Best-perceived versions**: 7.4.9 (4👍/1👎), 5.5.256→5.5.270 (2👍/0), 5.7.15/16, 5.8.25/40, 5.11.25, 5.11.146, 9.0.258 (« no crashes anymore », Peter #2111)
> - **Worst-perceived**: 5.11.152 (4👎, crashes), 7.4.6/7.4.1 (app crashes), 5.11.166, 5.11.138
> - **Promotion policy**: backport a master fix to stable only if (1) it is a crash/reliability/data fix (never a feature), (2) it has run clean on the master Test channel without new forum crash reports, (3) tests are 100% green on both branches. Feature managers (availability, suppression, presence sim, circadian, cascade, fallback router…) are **master-only, forever**.

## Data Sources (15 external)

All orchestrated via `tools/ci/mega-crawler.js` + GHA `mega-crawl.yml` (daily 02:00 UTC).

| Tier | Source | Script |
|------|--------|--------|
| 1 (Heavy) | zigbee.blakadder.com | `scripts/sync/crawl-blakadder.js` |
| 1 (Heavy) | JohanBendz issues/PRs | `tools/ci/johan-dump.js` |
| 1 (Heavy) | Gmail crash logs | `tools/ci/gmail-diagnostics.js` (via GHA `gmail-diagnostics.yml`) |
| 1 (Heavy) | Homey forum topic 140352 | `tools/ci/forum-fetch-140352.js` |
| 1 (Heavy) | Z2M converters | `scripts/sync/crawl-z2m.js` |
| 1 (Heavy) | ZHA quirks | `scripts/sync/crawl-zha.js` |
| 2 (Medium) | deCONZ | `scripts/sync/crawl-deconz.js` |
| 2 (Medium) | TinyTuya | `scripts/scanners/tinytuya-scanner.js` |
| 2 (Medium) | Tuya-Local | `scripts/scanners/tuya-local-scanner.js` |
| 3 (Light) | Hubitat | `scripts/scanners/hubitat-scanner.js` |
| 3 (Light) | SmartThings | `scripts/scanners/smartthings-scanner.js` |
| 3 (Light) | openHAB | `scripts/scanners/openhab-scanner.js` |
| 3 (Light) | Domoticz | `scripts/scanners/domoticz-scanner.js` |
| 3 (Light) | Xiaomi MIoT | `scripts/scanners/xiaomi-miot-scanner.js` |
| 3 (Light) | CSA-IoT | `scripts/scanners/csa-iot-scanner.js` |
| Cross-check | Forum RSS feeds (Agent Reach) | GHA `agent-reach.yml` (weekly; `agent-reach doctor` health + feedparser cross-check vs the Discourse JSON scrapers) |

## Tools (CI/Analysis)

- `tools/ci/blakadder-fetch.js` — extended Blakadder fetcher (alt variant)
- `tools/ci/blakadder-cross-ref.js` — cross-ref Blakadder vs mfs_db/Johan/Gmail/drivers
- `tools/ci/apply-blakadder-new.js` — apply new candidates (dry-run by default)
- `tools/ci/apply-mfr-pid-cross-ref.js` — Sacred Couple applier
- `tools/ci/add-sacred-couples.js` — Sacred Couple builder
- `tools/ci/johan-dump.js` — read-only JohanBendz dumper
- `tools/ci/forum-fetch-140352.js` — paginate Discourse topic 140352
- `tools/ci/mega-crawler.js` — orchestrate all 15 crawlers
- `tools/ci/safe-timers.js` / `lib/utils/safe-timers.js` — race-condition-safe setTimeout
- `lib/scraper/smart-fetch.js` + `lib/scraper/reader-fallback.js` — unified smart scraper; when the origin blocks a fetch, falls back to free readers (Jina Reader keyless, then Firecrawl if `FIRECRAWL_API_KEY` is set). Disable with `SMART_FETCH_READER_FALLBACK=0`.

## Key Files

| Path | Purpose |
|------|---------|
| `app.json` / `.homeycompose/app.json` | App manifest (auto-generated from .homeycompose) |
| `data/mfs_db.json` | Master fingerprint DB (5.7MB, 4149 mfrs) |
| `data/fingerprints.json` | Curated fingerprint list |
| `data/manufacturers.json` | Manufacturer list |
| `drivers/*/driver.compose.json` | 431 driver manifests (manufacturerName, productId, capabilities) |
| `drivers/*/device.js` | Device logic (careful with setTimeout → use `lib/utils/safe-timers.js`) |
| `lib/tuya/` | Tuya DP protocol implementation |
| `lib/utils/fingerprint-matcher.js` | Caseless heuristic FP matcher, scored tiers (env `TUYA_FP_VERBOSE`, `TUYA_FP_HEURISTIC`) |
| `lib/wifi/LocalFirstResolver.js` + `lib/tuya/LocalWiFiTuyaBridge.js` | WiFi local-first resolution (bridge v2) |
| `lib/utils/safe-timers.js` | `safeSetTimeout`, `safeSetInterval`, `isDestroyed` helpers |
| `scripts/maintenance/` | sync-appjson-zigbee (canonical resync, wired in auto-fix-all), sanitize-manifest (`normalizeFlowCardIds`), compact-zigbee-identifiers (mfs_db-priority, `HOMEY_ZIGBEE_MAX_*` budgets) |
| `scripts/ci/resolve-collisions.js` | Baseline-aware FP collision resolver (`.github/fingerprint-collision-baseline.json`) |
| `scripts/ULTIMATE_CHECK.js` | Verbose check orchestrator (`--verbose`) |
| `.github/scripts/generate-{device-finder,wifi-page,dashboards-page}.js` | GitHub Pages generators (Device Finder, wifi.html, dashboards.html + 6 dashboards → `.github/pages-build/`) |
| `tools/ci/` | All CI/diagnostic/analysis tools |
| `scripts/sync/` | Source crawlers (blakadder, z2m, zha, deconz) |
| `scripts/scanners/` | Scanners (tinytuya, hubitat, etc.) |
| `.github/workflows/` | 54 GHA workflows (see `reports/kimi-2026-07-28/workflows-audit.md`) |
| `.github/state/` | Per-source state (gitignored, populated by crawlers) |

## Common Bug Patterns to Watch

1. **setTimeout with destroyed device** → use `safeSetTimeout(this, cb, ms)` from `lib/utils/safe-timers.js`
2. **Class extends value undefined** → missing import, check `require()` paths
3. **registerRunListenerasync is not a function** → typo, should be `registerRunListener(async`
4. **setTimeout is undefined** → `this.homey.setTimeout(...)` when homey is destroyed

## Naming Conventions

- **Driver folder name** = lowercase, snake_case, descriptive (`switch_1gang`, `climate_sensor`)
- **Manufacturer ID** = always uppercase (`_TZE200_AOCLFNXZ`)
- **Capability IDs** = Homey standard names (`onoff`, `dim`, `measure_temperature`, `alarm_motion`)
- **Flow card IDs** = `{driver}_{action}_{target}` (`button_pressed`, `set_temperature`)

## Cron / Schedule Strategy

- Source crawlers: **daily 02:00 UTC** (`mega-crawl.yml`)
- Blakadder: **daily 04:00 UTC** (`blakadder-fetch.yml`)
- Gmail: **daily** (`gmail-diagnostics.yml`)
- Recurrent orchestrator: **daily 03:30 UTC** (`recurrent-orchestrator.yml`)
- Stale issues: **weekly** (`stale.yml`)

## When Asked to Add a New Source

1. Create `scripts/sync/crawl-NEW.js` following the pattern of `crawl-blakadder.js`
2. Register the scanner ID in `scripts/scanners/scanner-cache.js` if it has TTL
3. Add the crawler to `tools/ci/mega-crawler.js` CRAWLERS array
4. Create or update a GHA workflow with a `schedule:` block
5. Document it in the README "Data Sources" table
6. Cross-ref with mfs_db to find new candidates

## When Asked to Apply New FPs

1. Use `tools/ci/apply-blakadder-new.js` (or similar) in **dry-run** mode first
2. Review the candidate list
3. Confirm with the user before `--apply` (modifies 6-30 driver.compose.json files)
4. Always on `master`, never on `stable-v5`
5. Commit + push; the auto-publish bot will create the test build

## When Reading Discourse / Homey Community Forum

**No Puppeteer needed!** A simple browser User-Agent bypasses all rate limits:

```js
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const headers = {
  'User-Agent': UA,
  'Accept': 'application/json',
  'Accept-Encoding': 'identity',  // No brotli (Node 22 doesn't decompress by default)
  'Referer': 'https://community.homey.app/',
};
```

For full pagination, use the **per-post endpoint** (not `/posts.json?topic_id=` which is broken):

```
GET /t/{id}/posts.json?post_ids[]=645524&post_ids[]=645540&...
→ {"post_stream": {"posts": [...]}}
```

Note: the response is at `data.post_stream.posts`, NOT `data.posts`. (P53 discovery.)

This fetches all 2032 posts of topic 140352 in ~5 minutes with 100% success.

## Don't Do

- **Don't** push to `stable-v5` directly. Wait for master to be verified.
- **Don't** skip the pre-push gate. If `--no-verify` is needed, document why.
- **Don't** add mfrs to a driver that doesn't match its device class.
- **Don't** use `setTimeout` directly in device.js — use `safeSetTimeout` from `lib/utils/safe-timers.js`.
- **Don't** leak GitHub PATs, Gmail passwords, or Homey tokens in commits or logs.

## Lessons from Memory

- **P18**: OAuth client_secret for Google is not publicly documented — use IMAP with App Password.
- **P19**: Auto-publish bot can revert manual fixes in version bumps. Always re-apply after bot bumps.
- **P22**: Discourse search API is rate-limited. Use `/t/{id}.json` for full topic reads.
- **P23**: Publish size gate: app.json MB=4, publishUncompressed=32, publishSource=24. Use `find -regex` for `*.bak.<digits>` cleanup.
- **P38.6**: Auto-apply needs dry-run by default. The user will review before `--apply`.
- **P51**: Stable is now a separate branch (`stable-v5`). Sync master→stable-v5 only when master is verified.

## Contact / Channels

- **GitHub issues**: https://github.com/dlnraja/com.tuya.zigbee/issues
- **Forum**: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/
- **Gmail (diagnostics)**: compte Gmail des diagnostics (secret repo `GMAIL_EMAIL`)
- **PayPal**: paypal.me/dlnraja
- **Revolut**: revolut.me/dylanoul
