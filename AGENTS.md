# AGENTS.md — Guide for AI Agents working on com.tuya.zigbee

> **Mavis convention**: This file tells future agents (and humans) how the project is structured, what rules to follow, and where to find the canonical tools.

## Project Summary

| Item | Value |
|------|-------|
| **Project** | Universal Tuya Zigbee Device App for Homey Pro |
| **App ID** | `com.dlnraja.tuya.zigbee` |
| **Author** | Dylan Rajasekaram (dlnraja) |
| **License** | GPL-3.0 (was MIT-licensed JohanBendz fork) |
| **Branches** | `master` (preview/dev) + `stable-v5` (production) + `bastien-home` (private house) |
| **Current Version** | Universal git tip **9.0.1195** (P2687/P2689) · Bastien **1.0.66** · Stable LTS **5.12.308** (`com.dlnraja.tuya.zigbee.stable`) |
| **Drivers** | 430 on master, 431 on `stable-v5` |
| **Fingerprints** | 5,471 (audit 2026-07-27; 4,218 entries in mfs_db) |
| **SDK** | Homey SDK v3 (compatibility >= 12.2.0) |
| **Recent tips map** | [`docs/architecture/THREE_APP_RECENT_TIPS.md`](docs/architecture/THREE_APP_RECENT_TIPS.md) |

## The Sacred Couple Doctrine

A **(mfr, pid)** pair = the canonical identity of a Zigbee device.

- **mfr** (manufacturerName): e.g. `_TZE200_aoclfnxz`, `_TZ3000_abc12345`
- **pid** (productId / modelID): e.g. `TS0601`, `TS0505B`, `TS0044`
- mfr alone is ambiguous (one mfr can map to multiple devices).
- **mfs / `mfs_db`:** one manufacturerName may carry **multiple productIds and OEM variants** — each verified `(mfr, pid)` maps to its driver; shared mfr across drivers is expected, not a collision bug.
- pid alone is ambiguous (one pid is shared by many vendors).
- The pair is unique. Cross-reference all sources on this pair, not on individual fields.
- **Every prompt:** look up `docs/knowledge/DEVICE_TRUTH.md` + `docs/knowledge/device-truth.json` (431 drivers, 1-by-1) + `docs/knowledge/PECULIARITIES.md` then confirm compose + `data/user-misattribution-registry.json`.

## Stable vs Master Discipline

| Track | Branch | Athom App ID | Version | Purpose |
|-------|--------|--------------|---------|---------|
| **master** | `master` | `com.dlnraja.tuya.zigbee` | `9.0.x` (≥**9.0.1195**) | Dev/preview, features + soak |
| **stable-v5** | `stable-v5` | `com.dlnraja.tuya.zigbee.stable` | `5.12.x` (≥**5.12.308**) | Production LTS — reliability only |
| **bastien** | `bastien-home` | `com.dlnraja.tuya.zigbee.bastien` | `1.0.x` (≥**1.0.66**) | Private house soak → promote upstream |

> Machine SSOT: [`config/architecture/dual-app-tracks.json`](config/architecture/dual-app-tracks.json) · gates: `npm run check:l99-dual`

> Canonical doctrine: [`docs/rules/DUAL_APP_VISION.md`](docs/rules/DUAL_APP_VISION.md) · cross-prompt: [`docs/rules/CROSS_APP_PROMPT_RULES.md`](docs/rules/CROSS_APP_PROMPT_RULES.md).

> The user has been burned before by bot auto-publish reverting fixes — see P19 lessons in memory.
>
> **2026-07-27 — git history purge**: history was rewritten with `git-filter-repo` to remove sensitive/operational paths (see `reports/HISTORY_PURGE.md`). The first visible commit is now the v9.0.192 snapshot (2026-07-10) and the `origin` remote was dropped by the purge — it must be re-added before any push.
>
> **2026-08-04 — Stable vision (forum-driven)**: stable-v5 must differ from master on PURPOSE — master carries advanced features (flow engines, smart features), stable carries ONLY reliability. Forum sentiment analysis (2039 posts, topic 140352):
> - **Best-perceived versions**: 7.4.9 (4👍/1👎), 5.5.256→5.5.270 (2👍/0), 5.7.15/16, 5.8.25/40, 5.11.25, 5.11.146, 9.0.258 (« no crashes anymore », Peter #2111)
> - **Worst-perceived**: 5.11.152 (4👎, crashes), 7.4.6/7.4.1 (app crashes), 5.11.166, 5.11.138
> - **Promotion policy**: backport a master fix to stable only if (1) it is a crash/reliability/data fix (never a feature), (2) it has run clean on the master Test channel without new forum crash reports, (3) tests are 100% green on both branches. Feature managers (availability, suppression, presence sim, circadian, cascade, fallback router, free-scrape, AlarmPolarity smart-learn, CapabilityCommandRouter parallelDiscover…) are **master-only, forever** unless a human explicitly promotes them.
> - **Shared App ID warning**: if both tracks publish the same Homey App ID, **Publish Stable → Test** can overwrite master Test (e.g. 5.12.70 replacing 9.0.x). Prefer distinct store IDs or never promote stable onto the shared Test slot while soaking master.

## Data Sources (15 external + free-scrape / forum-silent in mega)

Orchestrated via `tools/ci/mega-crawler.js` + GHA `mega-crawl.yml` (**workflow_dispatch only** — cron disabled 2026-08-04; daily coverage is `blakadder-fetch`, `forum-poll`, `gmail-diagnostics`, `auto-enrich-closed-loop`).

| Tier | Source | Script |
|------|--------|--------|
| 1 (Heavy) | zigbee.blakadder.com | `scripts/sync/crawl-blakadder.js` |
| 1 (Heavy) | JohanBendz issues/PRs | `tools/ci/johan-dump.js` |
| 1 (Heavy) | Gmail crash logs | `tools/ci/gmail-diagnostics.js` → `.github/scripts/fetch-gmail-diagnostics.js` |
| 1 (Heavy) | Homey forum topic 140352 | `tools/ci/forum-fetch-140352.js` (+ silent: `forum-silent-multi-scan.js`) |
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

- `tools/ci/blakadder-cross-ref.js` — cross-ref Blakadder vs mfs_db/Johan/Gmail/drivers
- `scripts/sync/crawl-blakadder.js` — canonical Blakadder crawl (CI `blakadder-fetch.yml`)
- `tools/ci/gmail-diagnostics.js` — thin wrapper → `.github/scripts/fetch-gmail-diagnostics.js`
- `tools/ci/apply-blakadder-new.js` — apply new candidates (dry-run by default)
- `tools/ci/apply-mfr-pid-cross-ref.js` — Sacred Couple applier
- `tools/ci/add-sacred-couples.js` — Sacred Couple builder
- `tools/ci/johan-dump.js` — read-only JohanBendz dumper
- `tools/ci/forum-fetch-140352.js` — paginate Discourse topic 140352
- `tools/ci/mega-crawler.js` — orchestrate all 15 crawlers
- `tools/ci/safe-timers.js` / `lib/utils/safe-timers.js` — race-condition-safe setTimeout
- `tools/ci/p2448-rotary-knob-gate.js` — ERS-10/ZG-101ZD command/dimmer + KNOB_MFR (`npm run check:p2448`)
- `tools/ci/p2449-declared-flow-wire-gate.js` — declared flow cards must be wirable (`npm run check:p2449` / `check:p244x`)
- `lib/scraper/smart-fetch.js` + `lib/scraper/reader-fallback.js` — unified smart scraper; when the origin blocks a fetch, falls back to free readers (Jina Reader keyless, then Firecrawl if `FIRECRAWL_API_KEY` is set). Disable with `SMART_FETCH_READER_FALLBACK=0`.

## Key Files

| Path | Purpose |
|------|---------|
| `config/architecture/dual-app-tracks.json` | Dual-app classification SSOT (BOTH / MASTER_ONLY / STABLE_ONLY) |
| `config/architecture/rotary-knob-ssot.json` | P2448/P2449 rotary couples + flow UX required cards |
| `docs/architecture/KNOB_FLOW_WIRING_SSOT.md` | Human knob + declared-flow wiring doctrine |
| `config/architecture/publish-ssot.json` | Publish path, soft-expect, sacred-keep, IAS gate refs (P2286–P2288) |
| `docs/architecture/PUBLISH_SSOT.md` | Human publish doctrine (points to machine SSOT) |
| `lib/flow/DeclaredFlowCardAutoWire.js` | Fleet auto-wire set_brightness / scene_recall / brightness_changed / rotate |
| `lib/mixins/SmartKnobRotationMixin.js` | Knob rotate RX + press_and_rotate + dim UX |
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
| `settings/index.html` + `settings/zigbee-map.js` | App Settings UI including retractable Zigbee spider map |
| `lib/features/ZigbeeMeshMap.js` | Passive mesh snapshot for GET `/zigbee-map` (no ZDO flood) |
| `.github/state/` | Per-source state (gitignored, populated by crawlers) |

## Unit tests anti-régression (P2469 — every prompt)

Every behavior fix **must** create or extend `test/critical/pNNNN-*.test.js` locking Contre quoi (P215). Smart locks only (compose clusters, DP maps, sacred couples) — no invent pid, no mega snapshots.

- Rule: `.cursor/rules/unit-test-anti-regression-always.mdc`
- Doctrine: `docs/rules/UNIT_TEST_ANTI_REGRESSION.md`
- Run: `npm run check:p246x` (also `check:p2467` / `p2468` / `p2469`)

## Common Bug Patterns to Watch

1. **setTimeout with destroyed device** → use `safeSetTimeout(this, cb, ms)` from `lib/utils/safe-timers.js`
2. **Class extends value undefined** → missing import, check `require()` paths
3. **registerRunListenerasync is not a function** → typo, should be `registerRunListener(async`
4. **setTimeout is undefined** → `this.homey.setTimeout(...)` when homey is destroyed
5. **Fix without critical unit test** → P2469 regression; tip/auto-fix-all will silently undo you

## Naming Conventions

- **Driver folder name** = lowercase, snake_case, descriptive (`switch_1gang`, `climate_sensor`)
- **Manufacturer ID** = always uppercase (`_TZE200_AOCLFNXZ`)
- **Capability IDs** = Homey standard names (`onoff`, `dim`, `measure_temperature`, `alarm_motion`)
- **Flow card IDs** = `{driver}_{action}_{target}` (`button_pressed`, `set_temperature`)

## Cron / Schedule Strategy

- Source crawlers: **dispatch-only** `mega-crawl.yml` (cron off; use blakadder/forum/gmail/enrich for daily commits)
- Blakadder: **daily 04:00 UTC** (`blakadder-fetch.yml`)
- Gmail: **daily** (`gmail-diagnostics.yml`)
- Recurrent orchestrator: **daily 03:30 UTC** (`recurrent-orchestrator.yml`)
- Forum public poll: **every 4h at :15** (`forum-poll.yml`) — silent scan + media + PM harvest, never POST
- Forum PM dedicated: **07:50 and 19:50 UTC** (`forum-pm-read.yml`) — inbox/sent + optional one deep-diag UUID
- Stale issues: **weekly** (`stale.yml`) — mark only, never close
- Bot/[Auto] issues: **daily 04:45 UTC** (`auto-bot-issue-triage.yml`) — treat FPs → close
- Batch analyze & respond: **daily 05:45 UTC** (`auto-close-supported.yml`) — labels/comments; human closes stay manual
- Monthly Z2M scan: **1st 00:43 UTC** (`monthly-scan.yml`) — upsert auto-scan issue then immediate bot triage/close

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

**Default: silent enrichment — do not reply on the forum.** Fix the app and workflows instead.
Community mandate: never paste unchecked AI answers
(https://community.homey.app/t/stop-pasting-unchecked-ai-answers-in-the-homey-community/157628).
Auto forum posters are forced dry-run. `REPLY_TOPICS=140352` only if a maintainer ever re-enables posting.

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

- Silent multi-topic scan: `node tools/ci/forum-silent-multi-scan.js`
- Forum PM harvest (never POST): `node tools/ci/forum-pm-read-only.js`
- Forum media/screenshots: `node tools/ci/forum-media-deep-scan.js --max=40`
  (topics 140352, 146735, 26439, 89271, 43287, 157628, 157859 — READ-ONLY except policy on 140352).
- RF coexistence (Zigbee/Thread ≠ Wi-Fi numbering): `docs/guides/RF_CHANNEL_COEXISTENCE.md`
  · `lib/utils/rf-channel-coexistence.js` · smoke `tools/ci/rf-channel-coexistence-smoke.js`
- AI-paste gate: `node tools/ci/forum-ai-paste-gate.js --scan-defaults`
- Voice: `docs/responses/FORUM_STYLE_GUIDE.md` · doctrine: `docs/rules/FORUM_SILENT_HUMANIZE.md`

## Don't Do

- **Don't** push to `stable-v5` directly. Wait for master to be verified.
- **Don't** skip the pre-push gate. If `--no-verify` is needed, document why.
- **Don't** add mfrs to a driver that doesn't match its device class.
- **Don't** use `setTimeout` directly in device.js — use `safeSetTimeout` from `lib/utils/safe-timers.js`.
- **Don't** leak GitHub PATs, Gmail passwords, or Homey tokens in commits or logs.
- **Don't** paste unchecked AI answers into Homey Community (T157628).
- **Don't** auto-reply on satellite forum threads; prefer silent code enrichment.
- **Don't** ship a behavior fix without a `test/critical` lock (P2469).

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

<!-- CONSTITUTION:BEGIN (generated by scripts/gen/agent-rules.js — edit the constitution, not this block) -->
# Universal Tuya Zigbee — Constitution

Structure follows GitHub Spec Kit (github/spec-kit): `constitution → spec → plan → tasks`.
Specs live in `specs/NNN-*/{spec,plan,tasks}.md`. This file overrides any spec/plan.

## Identity (non-negotiable)
- I1. App IDs are frozen: `com.dlnraja.tuya.zigbee` (master, "Universal Tuya Test"),
  `com.dlnraja.tuya.zigbee.stable` (branch `stable-v5`), `com.dlnraja.tuya.zigbee.bastien`.
- I2. A master push without `[skip ci]` auto-publishes — batch pushes, few publishes.

## Device behaviour
- D1. **Native first.** Homey-native clusters/capabilities (homey-zigbeedriver + zigbee-clusters)
  are the primary path. Tuya DP (0xEF00), 0xE000/0xE001 and manufacturer-specific clusters are
  fallbacks, never mandatory for pairing.
- D2. **Fallbacks are additive.** Never degrade existing behaviour; a fallback that fails disables
  itself and never blocks pairing or init.
- D3. **No invented fingerprints.** Every manufacturerName/productId comes from a real interview,
  diag, issue or a cited upstream source. A mfr+pid couple lives on exactly one driver.
- D4. **Firmware quirks are opt-in** per mfr+pid and require ≥2 independent sources.
- D5. **Case-insensitive** matching at runtime for mfr/pid.
- D6. **No perceptible latency.** Dedupe/anti-flood passes the leading edge immediately; windows
  are short and configurable.

## Maintainer clarifications (2026-10-03)
- M1. Dedupe/anti-flood windows are chosen by comparing Z2M, ZHA, Johan's apps, deCONZ and localtuya and taking the
  most accurate value; they are dynamic per device type and per driver / mfr+pid profile, adaptive per case.
- M2. Double/triple-click detection is enabled automatically only where needed (remotes that do not send a native
  press type); otherwise it is off (no added latency).
- M3. Existing phantom/dual couples are kept as-is (frozen baseline); act only when a user reports a conflict
  (forum, threads, issues).
- M4. Lights without a driver (TS0502A/B, TS0505B, TS0501A): add to existing light drivers, unless that would conflict
  with another driver (e.g. TS0501A vs dimmer_wall_1gang) — then create a dedicated driver.
- M5. External PRs are merged intelligently in an enrichment mindset: keep the best of both, never degrade.
- M6. Stable publishes are grouped (batched), never one per fingerprint.

## Code & data
- C1. No copy-paste from other projects/people. Read, understand, rewrite as our own rules/quirks;
  keep only source link + author/project. Raw dumps do not stay in the repo. GPL code is never copied.
  Credit ideas in CREDITS.md.
- C2. `app.json` < 4 MB; large data is lazy-loaded from `data/`/`lib/` at runtime.
- C3. All gates pass before push, incl. `homey app validate --level publish` on Node 22.
- C4. Neutral commit wording.

- C5. **Deep reading for every source.** Forum threads (all posts + images), our issues/PRs, Johan's repo, other apps'
  threads, Z2M/ZHA/deCONZ/localtuya, Homey docs, diags/crash mails, forks, changelogs: read and understand finely
  (symptoms, context, firmware, interviews, DP logs, workarounds, regressions, conflicts, screenshots), reason,
  then write our own rules/code/SSOT. Regex/AI pre-extraction is only a helper, never the decision.

## Communication
- X1. Agents never post on GitHub/forum or reply to emails on behalf of the maintainer.

## Workflow
- W1. Rebase before each push (concurrent workers). Use a dedicated git worktree per agent;
  never run `git checkout -- .`/`git clean` in a shared checkout.
- W2. Long queues keep a resumable checkpoint in `data/leads/resume-checkpoint.json`;
  items are deferred, never skipped.
  Its `master_queue` is the single checklist of every user request since the start
  (rules, queues, harvests, forum, Johan, flows, conflicts, layers, workflows, size, specs);
  every daily resumption reads it FIRST, and an item is ticked `verified` only with evidence.
- W3. Progress ledger (nothing is done twice). `data/progress/ledger.json` is the machine SSOT:
  key `<namespace>:<id>` (johan-issue:N, dlnraja-issue:N, forum-post:T/P, diag:<hash>,
  task:<id>, …) → status (pending | in-progress | deferred | done | skipped-not-applicable),
  commit, date, content hash and/or upstream updatedAt. Every workflow and agent (forum poll,
  Johan scanner, enrich, diags, fleet-enrich, deep reads, maintenance queues) reads it before
  working (`shouldProcess` in `scripts/lib/ledger.js`, or `node scripts/progress/ledger-cli.js
  check <key> [updatedAt]`) and records after (`record`). Items already done and unchanged are
  skipped; changed items (new hash / newer updatedAt) are re-processed. Humans read
  `docs/progress/JOURNAL.md` (dated entries, newest first). Older checkpoints
  (resume-checkpoint, deep-read-checkpoint, deep-read-log) stay as cursors linked from the
  ledger's `checkpoints` map.
- W4. Driver conflicts are researched, not deleted. For every mfr+pid couple claimed by two or
  more drivers (ledger namespace `conflict:<mfr>|<pid>`) and every user-reported conflict: look up
  the real hardware (Z2M converters/device pages, ZHA quirks, deCONZ, Blakadder, Homey forum,
  Johan's repo, other Homey/ST/Hubitat/Jeedom apps), then, per pid, keep the couple in the single
  driver matching that hardware (native first, never degrade, never invent mfr/pid, the 3 app IDs
  stay intact). Create a new driver/category only when existing drivers truly conflict. Apply the
  same placement on master and stable. Write the reasoning in our own words with links + credits
  in `docs/rules/` and the ledger. Phantom cross-product couples are left alone unless they
  actually collide or a user reports a conflict. Work frugally: a few couples per daily run,
  user-reported and source-backed couples first; cursor in `data/leads/resume-checkpoint.json`.
- W5. Interviews are the MINIMUM baseline for pairing. Never degrade a driver or remove
  capabilities because an interview shows less than what is implemented. Only
  interview-observed clusters may be required for pairing; every extra DP, cluster or
  capability is optional and complementary and must never block pairing. Enrichment is
  additive only.
- W6. Never degrade any driver. Every driver/device follows dynamic, self-adaptive enrichment:
  capabilities, DPs and clusters are added at runtime when the device actually reports them
  (additive, optional, never blocking pairing), and nothing that works today is ever removed.
  This applies to all conflict (W4) and interview (W5) work: moving a couple is allowed only
  when the old placement has no working couple or the new one is a strict superset in
  behaviour; existing paired devices keep their driver.
- W7. Polysemic DPs. When one DP number means different things per mfr, pid, variant or
  firmware, the app adapts per device: variant profiles keyed by mfr+pid(+firmware), value
  range/type detection and cross-validation with other DPs. No DP is ever neglected (unknown
  ones are logged and learned), internal cross-checks are used when ambiguous, and fallbacks
  are additive — never degrading a working mapping.
- W8. Reuse our own tooling. The project's parsers, scrapers and scanners (scripts/*, tools/*,
  .github/scripts/*) are inventoried; unused or broken ones are fixed or retired, and their
  outputs feed the ledger and SSOT (docs, workflows, automations). Done frugally with
  checkpoints.
- W9. Alternative paths for partial native support. When a DP, cluster or attribute is not
  fully supported natively, provide alternative paths — lower level (raw ZCL frames,
  manufacturer-specific commands) and/or higher level (Tuya DP layer, app-side logic, polling,
  virtual capabilities) — orchestrated with circuit breakers so a failing path self-disables.
  Anything not native per the interviews, the Homey SDK, zigbee-clusters or the Homey docs stays
  optional and is never mandatory for pairing.
- W10. Self-improving, free. Scheduled GitHub Actions regularly ingest technical changes from
  sources (Z2M/ZHA/deCONZ converters, Homey SDK/docs, forum, Johan, other apps) and turn only
  CHANGED items (ledger W3) into SSOT/rule proposals. Everything runs free: no paid APIs, local
  or free tiers only (AI_ALLOW_PAID=false). Extend existing workflows before adding new ones.
- W11. Proprietary layers, local-first. Manufacturer layers on top of Zigbee (Tuya 0xEF00/0xE000/
  0xE001, MOES, Smartlife, Legrand 0xFC01/0xFC40, Lexman/Enki, Sonoff 0xFC11/0xFC57, Xiaomi/Aqara
  0xFCC0, IKEA, Philips 0xFC03, Schneider, …) are supported fully and locally, with no cloud
  dependency, as optional additive layers with circuit breakers that never block pairing, and are
  registered in the native/non-native matrix. Sources (Z2M, ZHA, deCONZ) are credited by name.

## Preferences (PC harvest round 2, 2026-10-04)
- P1. Case-insensitive everywhere (mfr/pid/lookups).
- P2. Wi-Fi: tuya-local first, inspired by the Tuya cloud Homey apps.
- P3. Heuristic multipliers/divisors (auto scale detection) rather than fixed values.
- P4. Regular automatic reorganisation of files/folders.
- P5. Always read diagnostic log IDs posted on forum/GitHub/chat.
- P6. Branches: keep master, stable-v5 and gh-pages; merge or clean the rest only with approval.
- P7. Communication: French, tables, action over explanation, no needless questions, continuous flow.

## Rules (PC harvest round 3, 2026-10-04)
Merged without changing W1–W11 / P1–P7; where they overlap, they make an existing rule explicit.
- R1. Secrets (keys, PATs, tokens) never go online, in code, logs, issues or reports; only in GitHub Secrets.
- R2. Stay within included plans and AI quotas (flat-rate/token plans); prefer free sources and caches.
  Only still-active subscriptions within their included quota: hard rate limits, a daily request cap,
  automatic disable for the day on 429/quota errors, never on-demand tokens, credits or overage billing
  (user decision 2026-10-04; enforced in `.github/scripts/ai-helper.js`).
- R3. Each app keeps its own purpose: master (`.tuya.zigbee`, fast enrichment), stable-v5 (`.stable`,
  device compatibility, grouped publishes), bastien-home (`.bastien`, friend's test app). Port fixes
  as adapted enrichments, never wholesale copies; couple placement stays the same (W4).
- R4. Every fix ships with a unit test that locks it (regression guard); mirrored in agent prompts.
- R5. Non-native DPs/clusters are complements (rx/tx, raw, stream), never mandatory (extends W5/W9).
- R6. Never invent productIds or manufacturerNames (Green Power included). New compose clusters only
  from a real interview; Zigbee 4.0 awareness is not evidence.
- R7. MCU time sync never hardcodes one format (epoch 1970/2000, local/UTC, timezone per device).
- R8. RF coexistence: Wi-Fi channels 1/6/11 vs Zigbee 15/20/25 in advice and diagnostics.
- R9. Workflows tolerate missing sources (never block), use a fetch cache and incremental diffs,
  and stay polite with servers (extends W10).
- R10. Enrichments are variants/alternatives, never degradations, on every app (explicit form of W6).
- R11. A couple missing from a log is never invented: ask for the next diagnostic with mfr+pid.
  A guess is allowed only as a labelled hypothesis, then verified.
- R12. Product rules for batteries: SOS/alarm buttons get an inverted-signal setting with automatic
  detection; sleepy devices follow the battery-saving policy (lib/battery/*, PowerClusterPolicy).
- R13. Workflows run fully without AI: deterministic algorithms first. AI subscriptions are an
  optional complementary layer (user decision 2026-10-04): keys only in GitHub Secrets, never in
  code; the AI step is skipped when its secret is absent; quota rules of R2 apply (extends W10/R9).
- R14. stable-v5 is the hardened, reliable line, inspired by the versions that worked best (forum
  feedback); master carries advanced features. Never copy one onto the other (clarifies R3).
- R15. Scraping stays within free tiers (e.g. firecrawl free); prefer free tools and caches (R2).
- R16. Malformed or synthetic manufacturerNames (e.g. `_TZE2841000000_*`, `_TZE28C1000000_*` from
  PR #512) are never added and are rejected by the fingerprint gate.
- R17. GitOps automation only as draft PRs on dlnraja's own repository: no auto-merge, no issue or
  comment posting; gates decide; publishing stays batched (user decision 2026-10-04).
- R18. Comments on third-party repositories (e.g. JohanBendz) are never deleted or edited by agents;
  that stays a manual user action.
- R19. No blind cross-product of brand names (e.g. HOBEIAN) over mfr/pid lists; only verified couples.
- R20. Robust identifier normalization (extends P1): manufacturerName, productId, modelId and device
  strings are compared through one normalizer at read and match time (case, whitespace/NUL padding,
  trailing \u0000, Latin-1/UTF-8/ASCII, zero-width/invisible and look-alike characters, length-prefixed
  Zigbee strings, `_`/`-` variants), while prefixes such as `_TZE200`/`_TZE204`/`_TZE284` stay distinct.
  Originals are kept for display and diagnostics, data is not duplicated, and anything that matches
  today must still match; a gate flags colliding normalized couples and malformed entries.
- R21. Memory and runtime safety: no unbounded recursion; every cache/map has a cap or TTL; timers,
  intervals and listeners are cleaned up in onDeleted/onUninit; no duplicate listener registration;
  big data is lazy-loaded and shared (never copied per device); queues and retries are bounded.
  Static check `npm run check:runtime-safety` (tools/ci/runtime-safety-gate.js) runs on new and
  changed lib/drivers/scripts files; apply it to all new code.
- R22. Modular architecture: small services, modules and functions; data loaded dynamically in small
  chunks (sharded fingerprint/mfs data per pid or prefix, on demand, LRU-bounded cache); lazy and
  progressive module loading (require on first use, non-critical layers after init). Migrate
  incrementally without degrading anything and measure boot time and heap before/after (spec 010).

## Agent safety (generated)
- Never post, comment, reply or send on GitHub, the Homey forum, email or chat on your own: draft and ask the maintainer.
- Never force-push or rewrite published history; never break the three app IDs.
- Read `data/progress/ledger.json` before working and record after (W3).
<!-- CONSTITUTION:END -->
