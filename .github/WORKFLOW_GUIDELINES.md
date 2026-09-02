# Workflow Guidelines & Rules

> Prevent common traps, conflicts, and errors in GitHub Actions YML files.

---

## A. Secret Dependencies

| Secret | Required For | Get From |
|--------|-------------|----------|
| `HOMEY_PAT` | Publish, draft→test | https://tools.developer.homey.app/me |
| `GH_PAT` | Cross-repo (forks, triage) | GitHub Settings → Tokens (scopes: repo, read:org) |
| `GOOGLE_API_KEY` | AI analysis (Gemini) | https://aistudio.google.com/apikey |
| `HOMEY_EMAIL` + `HOMEY_PASSWORD` | Forum SSO login | Athom account credentials |

### Rules
1. **NEVER hardcode tokens** in YML or JS
2. **Guard missing secrets**: `if [ -z "$SECRET" ]; then exit 0; fi`
3. **Use `continue-on-error: true`** for optional-secret steps
4. **`GITHUB_TOKEN`** is auto-provided, never add manually
5. **Fallback**: `${{ secrets.GH_PAT || secrets.GITHUB_TOKEN }}`

---

## B. YML Structure Rules

### Every workflow MUST have `defaults: run: shell: bash`:
```yaml
defaults:
  run:
    shell: bash
```
**WHY**: Prevents PowerShell from blocking on `>>` and `<<` operators. All 32 workflows have this.

### Every job running scripts MUST have:
```yaml
- uses: actions/checkout@v5
- uses: actions/setup-node@v5
  with:
    node-version: '22'
- run: npm ci --prefer-offline --no-audit || npm install
```
**TRAP**: Job without `npm ci` will crash on `require('./retry-helper')` imports!

### Always include (least privilege):
```yaml
permissions:
  contents: read  # default — add write scopes ONLY when a step actually needs them
concurrency:
  group: workflow-name
  cancel-in-progress: true
```
**WHY**: Every workflow MUST declare an explicit `permissions:` block (otherwise `GITHUB_TOKEN` inherits repo defaults). Start at `contents: read`; add `contents: write` only for `git push`, `issues: write` / `pull-requests: write` only when the workflow creates/comments issues or PRs. Never use write-for-all.

### Always set timeout:
```yaml
timeout-minutes: 30  # Increase for multi-step jobs (60 for nightly, 90 for daily)
```

---

## C. Common Traps

### 1. Git Push Rejected
Multiple workflows push concurrently. **Fix**: always rebase first:
```bash
git pull --rebase origin master || true
git push || true
```

### 2. Cron Conflicts
Stagger by 30+ min. Verified no conflicts exist.
Key schedule: daily-everything 02/08/14/20, nightly 03:30, auto-close 04:15, hub 01/07/13/19, sunday 07:00.

### 3. `needs:` + failed jobs
Jobs with `needs:` skip if parent failed. **Fix**: add `if: always()`.

### 4. Step ID references
Use `id: my_step` (snake_case). Reference: `steps.my_step.outcome`.

### 5. Shell = bash on Ubuntu
No PowerShell syntax. Use `${VAR}` not `$env:VAR`.
All workflows have `defaults: run: shell: bash` to enforce this.

### 6. Discourse CSRF
After `getForumAuth()`, ALWAYS call `refreshCsrf()` or all POST/PUT/DELETE get 403 BAD CSRF.

### 8. Discourse DELETE rate limit
~2/min. Use EDIT to replace spam content instead (no rate limit on edits).

### 9. Large state files
`comprehensive-scan.json` (~22MB) is in `.gitignore`. Always `git reset HEAD` if staged.

### 10. REPLY_TOPICS — CRITICAL (updated P108 / T157628)
**Default: do NOT post.** Prefer silent code/CI enrichment from all scanned threads.
**If posting is ever re-enabled, bot may ONLY post on T140352** (our own thread). NEVER post on other people's threads.
```yaml
env:
  REPLY_TOPICS: "140352"
  FORUM_AUTO_POST: "0"   # keep dry-run / blocked
```
**ALL scripts that post to forum — verified T140352 only + forced dry-run:**
| Script | Guard |
|--------|-------|
| `forum-responder.js` | `REPLY_TOPICS` + `dry=true` forced + postReply blocked |
| `forum-respond-requests.js` | DEPRECATED |
| `post-forum-update.js` | Forced dry-run return at top of `main()` |
| `post-lasse-reply.js` | `topic_id:140352` hardcode |
| `update-forum-first-post.js` | `TOPIC=140352` hardcode |
| `forum-updater.js` | `TOPIC=140352` hardcode |
| `monthly-comprehensive.js` | `postToForum(140352,...)` |
| `github-issue-manager.js` | `topic_id:140352` hardcode |

**Anti AI-paste (Homey T157628):**
- Never paste unchecked LLM answers into Homey Community
- Humanize rare drafts (`docs/responses/FORUM_STYLE_GUIDE.md`)
- Gate: `node tools/ci/forum-ai-paste-gate.js --scan-defaults`
- Doctrine: `docs/rules/FORUM_SILENT_HUMANIZE.md`
- Silent multi-scan: `tools/ci/forum-silent-multi-scan.js` (wired in `forum-poll.yml`, `auto-enrich-closed-loop.yml`, `fetch-diags.yml`)
- **P2394 — GitHub humanize:** no AI-slop issue walls — silent reopen, diag-resolver dry-run (`docs/rules/GITHUB_HUMANIZE.md`)
- **P2210 — Forum actionable processor:** `tools/ci/forum-actionable-processor.js` (`npm run forum:process`)
  - Runs **after** `multi-silent-digest.json` exists (scan step above)
  - Processes every actionable post **one-by-one**: sacred couple extraction, misattribution registry, `KNOWN_ROUTES`, `device-truth.json`, dual-app track (`BOTH` / `MASTER_ONLY` / `REVIEW`)
  - Writes `.github/state/forum/actionable-processor-report.json` + `reports/forum-verify-YYYY-MM-DD/PROCESS.md`
  - Chains dry-run `apply-forum-silent-multi.js` + `extract-forum-couples-once.js --out=reports/forum-verify-*`
  - **Never posts** — silent enrichment only (T157628). Use `--apply-routes` only after human review.
  - Wired in: `forum-poll.yml`, `auto-enrich-closed-loop.yml`, `fetch-diags.yml`
- **P2211 — Diagnostic content enricher:** `lib/diagnostics/DiagContentEnricher.js`
  - Extracts Log ID, user message, sacred couples, driver lines, known signals (IAS coerce, SOS battery spike, etc.)
  - Used by: `fetch-gmail-diagnostics.js`, `analyze-diag-locally.js`, `render-diag-treat.js`
  - Commands: `npm run diag:analyze -- path/to/log.txt`, `npm run diag:treat`
  - Auto TREAT table: `tools/ci/render-diag-treat.js` → `reports/gmail-forum-YYYY-MM-DD/TREAT.md`
- **P2212 — Sacred couple DP audit:** `tools/ci/audit-sacred-couple-dps.js` (`npm run audit:dp-couples`)
  - Cross-ref: misattribution registry × `drivers/*/device.js` dpMappings × `data/dp_registry.json` × `data/dp_couple_knowledge.json`
  - Flags RAW/type-0 without parser, Z2M-known DPs missing in driver, TX gaps
  - Guide: `docs/guides/DP_INTERPRETATION.md` — **never interpret DP number without (mfr, pid)**
  - Byte array parsers: `lib/tuya/DpByteArrayProfiles.js`
  - Wired in: `fetch-diags.yml` (after diag treat)
- **P2213 — User impact investigator:** `tools/ci/user-impact-investigator.js` (`npm run user:impact`)
  - Per-user device matrix: forum posts + diag lineage + `data/user-impact-catalog.json`
  - Output: `reports/forum-verify-*/users/*.md` + `INDEX.json`
- **P2214 — Forum digest parse:** `tools/ci/parse-forum-digest.js` + Python twin (`npm run forum:parse-digest`)
  - Verifies live Discourse `highest_post_number` vs digest actionable tail (cross-platform; no PowerShell one-liners)
  - State: `.github/state/forum/topic-140352-parse.json`
- **P2215 — Silent enrichment orchestrator:** `tools/ci/silent-enrichment-orchestrator.js` (`npm run enrich:silent`)
  - Chains P2210–P2217 + diag treat + DP audit + user impact + gates
  - Phases: `--phase=forum|diag|users|investigate|gates|all` · `--skip-scan` · `--with-media` · `--with-pm` · `--apply-routes`
  - State: `.github/state/silent-enrichment/last-run.json` · summary: `reports/forum-verify-*/ENRICHMENT.md`
  - Wired in: `forum-poll.yml`, `auto-enrich-closed-loop.yml`, `fetch-diags.yml`, `multi-source-enrich-orchestrator.js`
- **P2216 — Enrichment architecture (manifest-driven):**
  - Manifest: `config/enrichment/manifest.json` — layers, state paths, merge rules
  - Phases: `config/enrichment/phases.json` — declarative pipeline (`lib/enrichment/PhaseRunner.js`)
  - Models: `config/enrichment/models/action-model.json`, `issue-model.json`, `investigation-model.json`
  - Sync: `npm run enrich:sync` → `tools/ci/sync-enrichment-profiles.js` (stubs only, never overwrite curated)
  - Profile pages: `npm run enrich:profiles` → `docs/knowledge/profiles/` (users + couples INDEX)
  - Library: `lib/enrichment/EnrichmentRegistry.js`, `ProfileSynchronizer.js`, `NeedActionInvestigator.js`
- **P2217 — Need-action auto-investigate (never wait for user reply):**
  - CLI: `tools/ci/auto-investigate-need-action.js` (`npm run enrich:investigate`)
  - Cross-ref chain: misattribution registry → device-truth → compose → same-user history → diag excerpts → inbox → Blakadder (smart-fetch)
  - Output: `reports/forum-verify-*/NEED_ACTION.md` + `need-action-investigation.json`
  - Wired in `phases.json` pipeline `forum` + `all` (after sync, before users)
  - Rule: `.cursor/rules/enrichment-architecture.mdc` — never invent pid; auto stubs only
- **P2218 — Predictive / heuristic unknowns (imprecise cases):**
  - Model: `config/enrichment/models/heuristic-model.json` (tiers hardLock / softHypothesis / weakHint)
  - Resolver: `lib/enrichment/HeuristicUnknownResolver.js` — symptom + mfr-prefix + peer-fleet boosts
  - Runtime: `lib/helpers/UnknownCaseRealigner.js` hooked from `TuyaZigbeeDevice.handleSmartDP` + `UnknownDeviceHandler`
  - Soft hypotheses **never** catalog-lock or sacred-couple invent; observe RX, no guessed TX
- **P2219 — SHADOW forum (absolute):** enrichment pipeline forces `FORUM_AUTO_POST=0`, `SHADOW_FORUM=1`, `DISCOURSE_WRITE=0`, empty `REPLY_TOPICS`. Passive read only — never intelligent forum write/interact.
- **P2220 — Button UI/UX realign:** `TuyaZigbeeDevice._registerButtonCapabilityListeners` — VirtualButtonMixin prefer + `markAppCommand` before TX + scene-only flow path; gate `battery-button-intelligence-gate.js` in enrichment `gates` block; test `test/critical/p2220-button-ui-ux.test.js`
- **P2223 — Button capture cascade L1–L8 (Homey gap compensation, additive):**
  - SSOT: `config/resilience/button-capture-cascade.json`
  - Runtime: `lib/mixins/ButtonCaptureCascade.js` → E000 BoundCluster per-EP + silent OnOff re-bind
  - Wired from `PhysicalButtonMixin.initPhysicalButtonDetection` after 0xFD setup
  - Tests: `test/critical/p2223-button-capture-cascade.test.js`; doctrine `docs/RULES_PHYSICAL_BUTTONS.md` §5
  - Keeps driver-owned E000 (scene_switch_4) — cascade skips if binding already present
- **P2222 — Project resilience (fleet Homey gaps):** `npm run resilience:audit` → `tools/ci/project-resilience-orchestrator.js`
  - SSOT: `config/resilience/{manifest,domains,bug-classes}.json` · runtime `lib/resilience/HomeyGapCompensator.js`
  - Soft-wired in enrichment `gates` / auto-enrich; SHADOW forum only
- **P2224 — Complementary enrichment (evolution → live stacks):**
  - Glossary: `config/resilience/layer-glossary.json` (pipeline L0–L11 / BYPASS L1–L9 / capability L0–L6 / button L1–L8 / AI 3)
  - Extra domains: `l14_telemetry`, `protocol_rxtx_bus`, `dynamic_adaptation`, `identity_normalize`, `ci_fleetwood`, `bypass_elite_complement`
  - Enrichment manifest layers → resilience domains; `investigation-model.json` `resilienceDomainRouting`
  - Doctrine: `docs/architecture/COMPLEMENTARY_ENRICHMENT.md` — additive only, never collapse stacks
- **P2225 — Inventory features + historical bugs (critical-first in workflows):**
  - SSOT: `config/resilience/critical-gaps.json` + expanded `bug-classes.json`
  - CLI: `npm run resilience:inventory` · `npm run resilience:critical` · `npm run resilience:all`
  - Script: `tools/ci/inventory-features-bugs.js` → `reports/resilience-*/INVENTORY.md`
  - Workflow: `.github/workflows/project-resilience.yml` — cron `20 5 * * *` + dispatch (`inventory|critical|all`)
  - Also wired: `forum-poll.yml`, `auto-enrich-closed-loop.yml`, `fetch-diags.yml`, enrichment `gates` block
  - Method: Homey gap → parallel stacks → gates; prioritize prio-1 domains before fleet audit
- **P2226 — Gmail auth cascade (plugin → secrets → local):**
  - L0 Cursor Gmail MCP = IDE/agent only (not in Actions)
  - L1 IMAP `GMAIL_EMAIL`/`GMAIL_APP_PASSWORD` (+ Homey aliases)
  - L2 OAuth refresh secrets · L3 `gmail-local-reader` from prior state
  - Scripts: `gmail-auth-cascade.js`, `verify-gmail-setup.js`; `npm run diag:gmail:cascade` / `diag:gmail:verify`
  - Workflows: `fetch-diags.yml`, `gmail-diagnostics.yml` probe cascade before fetch; `GMAIL_ALLOW_LOCAL_FALLBACK=1`
  - Smoke: `npm run workflow:smoke` → `tools/ci/workflow-smoke-p2226.js`
- **P2227 — AI forfait inclus + security (never exceed included quotas):**
  - SSOT: `config/security/ai-plan-forfait.json` — `AI_PLAN_MODE=forfait`, `AI_ALLOW_PAID=false`
  - Caps: global daily **400**, soft-stop **85%**, paid providers blocked, `GMAIL_DIAG_AI_MAX=0`
  - Guard: `tools/ci/ai-plan-guard.js` · wired in `ai-helper.js` `budgetAllows()` + token-budget
  - Commands: `npm run ai:plan-guard` · `npm run ai:quota` · `npm run security:plan`
  - Workflows: `gmail-diagnostics`, `fetch-diags`, `auto-enrich-closed-loop`, `project-resilience`
  - Prefer local heuristics when soft/hard stop — never auto-spend overage

- **P2372 — Fleet enrich all driver classes + free scrape (no paid overage, no lockouts):**
  - SSOT: `config/enrichment/free-scrape-budget.json` + `config/enrichment/driver-class-coverage.json`
  - Budget: `tools/ci/free-scrape-budget.js` · wired in `lib/scraper/FreeScrapeStack.js` (Jina/Microlink/AllOrigins/Wayback/Firecrawl daily caps + 429/403 cooldown)
  - All classes: `tools/ci/driver-class-fleet-enrich.js` (button/socket/switch/sensor/light/curtain/thermostat/meter/fan/lock/siren/ir/wifi)
  - Orchestrator: `tools/ci/fleet-intelligent-enrich.js` — cache-first crawls, sacred couple only, never degrade coverage
  - Workflow: `.github/workflows/fleet-intelligent-enrich.yml` — cron `35 1,13 * * *` (staggered off `*/4` enrich + forum `:15`)
  - Commands: `npm run enrich:fleet:apply` · `enrich:classes` · `scrape:budget` · `scrape:budget:preflight`
  - Env: `FIRECRAWL_DAILY_MAX=3`, `FREE_SCRAPE_BROWSER=0`, restore `.cache/scraper-cache` across runs
  - Never invent productId; Firecrawl last resort only; prefer Jina keyless + direct HTTP + 6h cache

- **P2376 — Intelligent source diff (cache-first, never block on missing source):**
  - SSOT: `config/enrichment/source-registry.json` + `tools/ci/intelligent-source-diff.js`
  - Manifest: `.github/state/intelligent-source-manifest.json` (project fingerprint + per-source hashes)
  - Policy: optional sources (`gmail`, `forum`, `johan`) **soft-fail** when secrets missing; stale cache OK
  - Crawl only **stale/missing/forced** — not full re-download every cron (ETag + scanner TTL + manifest)
  - GHA cache key: `intel-source-diff-${{ hashFiles('package-lock.json', 'config/enrichment/source-registry.json') }}` + restore-keys chain
  - Doctrine: `docs/architecture/INTELLIGENT_SOURCE_DIFF.md`
  - Commands: `npm run source:diff` · `source:diff:apply`
  - Wired: `fleet-intelligent-enrich.yml`, `auto-enrich-closed-loop.yml`, `fleet-intelligent-enrich.js --crawl`

- **P2375 — Flow fleet enrich (all driver classes, CI-only):**
  - Script: `tools/ci/flow-fleet-enrich.js` — orphan tokens, capability triggers, Z2M cross-ref, app.json sync
  - Commands: `npm run enrich:flow-fleet:apply` · `npm run flow:l99`
  - Runtime BOTH: `FlowCardHeuristics.buildCapabilityFlowCandidates` + `DynamicFlowCardManager` soft resolve

- **P2228 — CI vs Homey app packaging:**
  - Doctrine: `docs/architecture/CI_VS_HOMEY_RUNTIME.md`
  - Homey ships: `HomeyGapCompensator`, `ButtonCaptureCascade` + `lib/resilience/data/*`, `UnknownCaseRealigner` + `lib/helpers/data/heuristic-model.json`
  - Homey **excludes** (`.homeyignore`): `config/enrichment|resilience|security`, CI enrichment modules, `tools/`, `data/user-impact-catalog.json`
  - Never `require('tools/ci/...')` on Homey without try/catch + local fallback

- Private inbox harvest (SSO `HOMEY_EMAIL`/`HOMEY_PASSWORD`, **never POST**): `tools/ci/forum-pm-read-only.js`
  - Dedicated: `.github/workflows/forum-pm-read.yml` — cron `50 7,19 * * *` + dispatch; may fire `tuya-deep-diag.yml` for one UUID
  - Also wired in `forum-poll.yml` (every 4h) and `auto-enrich-closed-loop.yml`
  - Do not use `forum-pm-scanner.js` for replies
- Screenshot / media scan (public threads, never POST): `tools/ci/forum-media-deep-scan.js` in `forum-poll.yml`, `auto-enrich-closed-loop.yml`, `fetch-diags.yml`

**BUG FIXED v5.12.14:** `post-forum-update.js` had default `FORUM_TOPICS='140352,26439,146735'`
which caused bot to post release updates on OTHER people's threads (T26439, T146735).
Fix: hardcoded `.filter(t=>t===140352)` safety net — even if env overridden, only T140352 is used.

**BUG FIXED v5.11.190:** `forum-auto-responder.yml` AND `forum-monitor.yml` both had
`REPLY_TOPICS: '140352,26439'` which allowed the bot to post replies on JohanBendz's thread (T26439).
Fix: changed REPLY_TOPICS to '140352' in both workflows. FORUM_TOPICS may still include 26439 for
READ-ONLY scanning, but REPLY_TOPICS must ONLY be '140352'.

**P108:** Auto-post remains blocked; satellite threads (146735, 26439, 89271, 43287, 157628) are scan-only.

### 12. Copilot Semantic Linter — SAFETY RULES
The original `gh copilot suggest` approach was **dangerous**: it would echo raw Copilot output
directly into driver files (`echo "$SUGGESTION" > "$file"`), potentially destroying working code.
**v5.11.190 FIX:** Replaced with a safe, static bash-based SDK v3 validator that:
- NEVER modifies files — report-only mode
- Checks 7 SDK v3 rules: async init, Manager globals, v2 API, await setCapability, listener leaks, settings keys, titleFormatted
- Has 5-minute timeout to prevent blocking the pipeline


### 11. Auto-reopen chain
When user comments on closed issue/PR → `auto-reopen-on-comment.yml` reopens it →
`auto-respond.yml` triggers on `reopened` event → daily/nightly re-process in next cycle.

### 13. INFORMATION FLOW & ATTRIBUTION — CRITICAL RULE

**SCAN EVERYTHING, IMPLEMENT SILENTLY, CREDIT ONLY OWN SOURCES.**

#### What to SCAN (READ-ONLY, implement silently):
- All Tuya-related forum threads: T26439 (Johan), T146735 (Tuya Smart Life), T89271 (archive), etc.
- Johan Bendz's GitHub (JohanBendz/com.tuya.zigbee) — PRs, issues, code changes
- All Tuya WiFi threads and related projects
- Other forks and community contributions
- **→ Implement discoveries into drivers/code, but NEVER mention the source in:**
  - Forum posts
  - Changelogs
  - Commit messages (use generic "improved" / "added support")
  - GitHub issue/PR comments

#### What to PUBLICIZE (visible in logs/changelogs/forum):
Only content from these sources MAY be mentioned:
- **dlnraja's own forum thread** (T140352) — user requests, bug reports
- **dlnraja's GitHub** — own issues, own PRs
- **Direct user requests** from T140352
- **All descendant forks** of dlnraja/com.tuya.zigbee
- **→ These CAN appear in:** changelogs, forum posts, commit messages, logs

#### Forum Post Merge Rule:
- **ALWAYS check the last poster on T140352**
- If last poster is `dlnraja` (even if it was the bot posting): **EDIT/MERGE** into that post
- If last poster is someone else: **NEW reply** (only on T140352)
- NEVER create consecutive posts — always merge with own last post
- Use `merge-last-posts.js` for cleanup if multiple bot posts exist

#### Why this matters:
- Johan Bendz is the original author — we don't advertise that we watch his repo
- Forum community sees us as independent — no "synced from..." mentions
- Prevents attribution conflicts and maintains professional boundaries


---

## D. Draft → Test Promotion

Standard 3-tier Puppeteer pattern (ALL workflows must use):
1. **Wait**: `node .github/scripts/wait-athom-draft-ready.js` (poll ≤4 min; prefer draft/test over a sibling `processing_failed`; fail-closed only after the window if still failed — never `sleep 180` alone)
2. **Tier 1**: `npm install puppeteer --no-save` + `node .github/scripts/auto-promote-puppeteer.js`
3. **Tier 2**: `node .github/scripts/auto-publish-draft.js` (API fallback)
4. **Tier 3**: sleep 30s then re-run Puppeteer script

**TRAP**: Promote step MUST be in job with checkout + node + npm. A bare summary job will silently fail!
**TRAP**: Puppeteer needs `npm install puppeteer --no-save` before running.

---

## E. Commit Pattern

```yaml
- run: |
    git config user.name "github-actions[bot]"
    git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
    git add -A
    git diff --cached --quiet || git commit -m "auto: description [skip ci]"
    git pull --rebase origin master || true
    git push || true
```

Key: `[skip ci]` prevents infinite workflow loops.

---

## F. Rate-Limit Protection

All scripts using `gh` CLI or `fetch()` MUST have throttling:

### For `forum-auth.js` (SSO login):
All 7 fetch calls use `fetchTO()` with 15s timeout to prevent hangs during OAuth redirects.

### For `gh` CLI scripts (execSync):
```javascript
const { sleep } = require('./retry-helper');
await sleep(400); // 0.4s between API calls
```
Scripts with throttling: `triage-run.js`, `triage-upstream-enhanced.js`, `scan-forks.js`, `scan-johan-full.js`

### For fetch-based scripts:
```javascript
const { fetchWithRetry } = require('./retry-helper');
// Auto-handles: 429 backoff, GitHub X-RateLimit headers, Discourse spacing, CSRF refresh
```

### GitHub Issue Manager:
Always set `MAX_ITEMS` env to prevent unbounded API calls:
```yaml
env:
  MAX_ITEMS: "100"       # daily
  INCLUDE_CLOSED: "true" # for deep scans (sunday/monthly)
```

---

## G. Workflow Inventory (39 workflows)

| Workflow | Schedule | Steps | Key Secrets |
|----------|----------|-------|-------------|
| daily-everything | 4x/day (2,8,14,20 UTC) | 33 | ALL |
| sunday-master | Sun 07:00 | 20 jobs | ALL |
| nightly-auto-process | 03:30 daily | 15+ | ALL |
| auto-close-supported | 04:15 daily + Sun 15:00 | batch close | GH_PAT |
| upstream-auto-triage | Mon 05:00 | triage both repos | GH_PAT |
| weekly-fingerprint-sync | Mon 06:00 | Z2M/ZHA sync | GH_PAT |
| monthly-comprehensive-sync | 1st 01:00 | deep scan | ALL |
| auto-respond | on issue/PR open | FP check | GITHUB_TOKEN |
| auto-reopen-on-comment | on comment | reopen closed | GITHUB_TOKEN |
| stale | daily | mark+close inactive | GITHUB_TOKEN |
| publish | manual | Homey publish | HOMEY_PAT |
| auto-publish-on-push | on workflow complete | publish+promote | HOMEY_PAT |
| gmail-token-keepalive | 4x/day (5,11,17,23 UTC) | token refresh | GMAIL_* |
| deploy-pages | on push + daily | Device Finder | GITHUB_TOKEN |
| tuya-automation-hub | 4x/day (1,7,13,19) + Mon/Thu | forum+github | ALL |
| forum-auto-responder | 2x/day (9,21 UTC) | forum respond | HOMEY_EMAIL/PASSWORD |
| forum-pm-read | 07:50/19:50 UTC | PM harvest, never POST | HOMEY_EMAIL/PASSWORD |
| forum-poll | every 4h at :15 | public + media + PM harvest | HOMEY_EMAIL/PASSWORD |
| cleanup-wrong-threads | manual | cleanup bot posts | HOMEY_EMAIL/PASSWORD |
| johan-sdk3-sync | Wed 05:00 | SDK3 FP+DP sync + scaffold + audit | GITHUB_TOKEN |
| driver-maintenance | Fri 04:00 | Auto-scaffold + conflict audit + PR | GH_PAT |
| code-quality | Wed 03:00 + on push | quality checks | — |
| dependabot-auto-merge | on PR | auto-merge deps | GH_PAT |

19 additional workflows listed in `.github/workflows/` directory.

See `.github/SECRETS.md` for full secret reference.

### Supply-Chain Security
Pinning rule (actual, since 2026-07-29): **ALL actions pinned to full SHA, no exception** — format `owner/repo@<SHA> # vX.Y.Z`. Third-party actions were pinned in the 2026-07-28 security follow-up; official `actions/*` were pinned in the 2026-07-29 follow-up: checkout v5.1.0, setup-node v5.0.0, upload-artifact v5.0.0, cache v5.1.0, github-script v7.1.0 — Node.js 24 runtime. Never introduce a tag/branch ref (`@v5`, `@main`); resolve the SHA via `git ls-remote https://github.com/<owner>/<repo> "refs/tags/<tag>*"`.

---

## H. Sensor DP Discovery

New sensor variants (soil+fertilizer, air+VOC) may have unknown DPs.
1. Check fingerprint in `driver.compose.json`
2. Standard DPs work (soil: DP3/5/14/15)
3. Unknown DPs logged by `_handleDP()` — ask user for logs
4. Create capability in `.homeycompose/capabilities/`
5. Add DP mapping in `device.js`

### Known Pending: `_TZE284_hdml1aav` fertilizer/EC DP (unknown)

---

## I. SONOFF/eWeLink Mixins (v5.11.107)

| Mixin | File | Features |
|-------|------|----------|
| EwelinkMixin | `lib/mixins/SonoffEwelinkMixin.js` | LED, turbo, detach, trigger, delayed power-on |
| SensorMixin | `lib/mixins/SonoffSensorMixin.js` | Tamper, temp/hum calibration |
| EnergyMixin | `lib/mixins/SonoffEnergyMixin.js` | Current, voltage, power (0xFC11) |

Safe auto-add PIDs: `SNZB-*`, `ZBMINI*`, `S31ZB`, `S[46]0ZBT*`, `BASICZBR*`, `TRVZB`, `SWV-*`, `ZBM5-*`

---

## J. Auto-Reopen Guard (v5.12.x)

`auto-reopen-on-comment.yml` skips reopening when:
- Commenter is `dlnraja`, `github-actions[bot]`, or `dependabot[bot]`
- Comment < 5 chars, issue closed < 2min ago, or "thank you" patterns

**BUG FIXED:** dlnraja commenting on closed issues (to confirm resolution)
triggered the auto-reopen bot → infinite close/reopen loop.
Fix: added `dlnraja` to both the `if:` condition AND the `SKIP_USERS` array.

---

## K. SDK v3 Battery & Power Rules (CRITICAL for Automation)

### RULE: Never combine `measure_battery` + `alarm_battery`
Any automation (linter, enrichment, scaffold) that adds capabilities
MUST check this constraint BEFORE injecting:

```javascript
// SAFE check before adding battery capability
const caps = compose.capabilities || [];
if (caps.includes('measure_battery')) {
  // NEVER add alarm_battery — SDK v3 violation
}
if (caps.includes('alarm_battery')) {
  // NEVER add measure_battery — SDK v3 violation
}
```

### Power Source Detection (for automation scripts)
Automation scripts MUST NOT assume power source from driver name alone.
The same manufacturerName can power differently based on productId.

```
Decision tree:
1. Does compose have energy.batteries? → Battery device
2. Does device.js have mainsPowered=true? → Mains device
3. Is class=remote AND productId=TS004x? → Kinetic (self-powered)
4. Is class=socket/light/fan? → Probably mains (verify compose)
5. Default: DO NOT add battery capabilities automatically
```

### Maintenance Scripts Safety Rules
All scripts in `scripts/maintenance/` MUST:
1. **Never add both** `measure_battery` + `alarm_battery`
2. **Validate JSON** after compose modification
3. **Validate JS** syntax after device.js modification (`node -c`)
4. **Log every change** for audit trail
5. **Be idempotent** — running twice = same result
6. **Never remove** capabilities without explicit justification
7. **Never modify** WiFi driver authentication/implementation
8. **Respect protocol type** — don't add ZCL clusters to Tuya DP drivers

### Pipeline Step 6c Safety Gate
The daily pipeline runs `revert-alarm-battery-conflict.js` to catch
any regressions introduced by AI linting or enrichment steps.
Order: `fix-flow-cards` → `revert-battery-conflicts` → `fix-empty-caps` → `validate`

---

## L. Protocol-Aware Automation Rules

### Tuya DP (TS0601) Drivers
- NEVER add standard ZCL cluster bindings to TS0601 drivers
- ALWAYS use dpMappings for capability mapping
- Different _TZE200_ manufacturerNames need DIFFERENT DP numbers
- Validate DP numbers against Z2M/ZHA/Tuya IoT Platform

### Standard ZCL Drivers 
- ALWAYS use configureAttributeReporting()
- NEVER add TuyaEF00Manager to standard ZCL drivers
- Use zclNode.endpoints[N].clusters for capability binding

### Multi-Variant Drivers
- One driver can serve thousands of FP combinations
- NEVER assume all variants have same features
- Use runtime capability detection in device.js
- Example: `if (this.hasCapability('measure_power'))` before setup
# Workflow Guidelines & Rules

> Prevent common traps, conflicts, and errors in GitHub Actions YML files.

---

## A. Secret Dependencies

| Secret | Required For | Get From |
|--------|-------------|----------|
| `HOMEY_PAT` | Publish, drafttest | https://tools.developer.homey.app/me |
| `GH_PAT` | Cross-repo (forks, triage) | GitHub Settings  Tokens (scopes: repo, read:org) |
| `GOOGLE_API_KEY` | AI analysis (Gemini) | https://aistudio.google.com/apikey |
| `HOMEY_EMAIL` + `HOMEY_PASSWORD` | Forum SSO login | Athom account credentials |

### Rules
1. **NEVER hardcode tokens** in YML or JS
2. **Guard missing secrets**: `if [ -z "$SECRET" ]; then exit 0; fi`
3. **Use `continue-on-error: true`** for optional-secret steps
4. **`GITHUB_TOKEN`** is auto-provided, never add manually
5. **Fallback**: `${{ secrets.GH_PAT || secrets.GITHUB_TOKEN }}`

---

## B. YML Structure Rules

### Every workflow MUST have `defaults: run: shell: bash`:
```yaml
defaults:
  run:
    shell: bash
```
**WHY**: Prevents PowerShell from blocking on `>>` and `<<` operators. All 32 workflows have this.

### Every job running scripts MUST have:
```yaml
- uses: actions/checkout@v5
- uses: actions/setup-node@v5
  with:
    node-version: '22'
- run: npm ci --prefer-offline --no-audit || npm install
```
**TRAP**: Job without `npm ci` will crash on `require('./retry-helper')` imports!

### Always include (least privilege):
```yaml
permissions:
  contents: read  # default — add write scopes ONLY when a step actually needs them
concurrency:
  group: workflow-name
  cancel-in-progress: true
```
**WHY**: Every workflow MUST declare an explicit `permissions:` block (otherwise `GITHUB_TOKEN` inherits repo defaults). Start at `contents: read`; add `contents: write` only for `git push`, `issues: write` / `pull-requests: write` only when the workflow creates/comments issues or PRs. Never use write-for-all.

### Always set timeout:
```yaml
timeout-minutes: 30  # Increase for multi-step jobs (60 for nightly, 90 for daily)
```

---

## C. Common Traps

### 1. Git Push Rejected
Multiple workflows push concurrently. **Fix**: always rebase first:
```bash
git pull --rebase origin master || true
git push || true
```

### 2. Cron Conflicts
Stagger by 30+ min. Verified no conflicts exist.
Key schedule: daily-everything 02/08/14/20, nightly 03:30, auto-close 04:15, hub 01/07/13/19, sunday 07:00.

### 3. `needs:` + failed jobs
Jobs with `needs:` skip if parent failed. **Fix**: add `if: always()`.

### 4. Step ID references
Use `id: my_step` (snake_case). Reference: `steps.my_step.outcome`.

### 5. Shell = bash on Ubuntu
No PowerShell syntax. Use `${VAR}` not `$env:VAR`.
All workflows have `defaults: run: shell: bash` to enforce this.

### 6. Discourse CSRF
After `getForumAuth()`, ALWAYS call `refreshCsrf()` or all POST/PUT/DELETE get 403 BAD CSRF.

### 8. Discourse DELETE rate limit
~2/min. Use EDIT to replace spam content instead (no rate limit on edits).

### 9. Large state files
`comprehensive-scan.json` (~22MB) is in `.gitignore`. Always `git reset HEAD` if staged.

### 10. REPLY_TOPICS  CRITICAL (updated P108 / T157628)
**Default: do NOT post.** Prefer silent enrichment. Auto-post forced dry-run.
**If ever re-enabled, bot may ONLY post on T140352.** NEVER post on other people's threads.
```yaml
env:
  REPLY_TOPICS: "140352"
  FORUM_AUTO_POST: "0"
```
See section 10 at top of this file for full T157628 anti AI-paste + silent-scan tooling.
Duplicate historical notes retained below for genealogy.

**ALL scripts that post to forum  verified T140352 only:**
| Script | Guard |
|--------|-------|
| `forum-responder.js` | `REPLY_TOPICS` + forced dry-run + postReply blocked |
| `forum-respond-requests.js` | DEPRECATED |
| `post-forum-update.js` | Forced dry-run at top of main() |
| `post-lasse-reply.js` | `topic_id:140352` hardcode |
| `update-forum-first-post.js` | `TOPIC=140352` hardcode |
| `forum-updater.js` | `TOPIC=140352` hardcode |
| `monthly-comprehensive.js` | `postToForum(140352,...)` |
| `github-issue-manager.js` | `topic_id:140352` hardcode |

**BUG FIXED v5.12.14:** `post-forum-update.js` had default `FORUM_TOPICS='140352,26439,146735'`
which caused bot to post release updates on OTHER people's threads (T26439, T146735).
Fix: hardcoded `.filter(t=>t===140352)` safety net  even if env overridden, only T140352 is used.

**BUG FIXED v5.11.190:** `forum-auto-responder.yml` AND `forum-monitor.yml` both had
`REPLY_TOPICS: '140352,26439'` which allowed the bot to post replies on JohanBendz's thread (T26439).
Fix: changed REPLY_TOPICS to '140352' in both workflows. FORUM_TOPICS may still include 26439 for
READ-ONLY scanning, but REPLY_TOPICS must ONLY be '140352'.

### 12. Copilot Semantic Linter  SAFETY RULES
The original `gh copilot suggest` approach was **dangerous**: it would echo raw Copilot output
directly into driver files (`echo "$SUGGESTION" > "$file"`), potentially destroying working code.
**v5.11.190 FIX:** Replaced with a safe, static bash-based SDK v3 validator that:
- NEVER modifies files  report-only mode
- Checks 7 SDK v3 rules: async init, Manager globals, v2 API, await setCapability, listener leaks, settings keys, titleFormatted
- Has 5-minute timeout to prevent blocking the pipeline


### 11. Auto-reopen chain
When user comments on closed issue/PR  `auto-reopen-on-comment.yml` reopens it 
`auto-respond.yml` triggers on `reopened` event  daily/nightly re-process in next cycle.

### 13. INFORMATION FLOW & ATTRIBUTION  CRITICAL RULE

**SCAN EVERYTHING, IMPLEMENT SILENTLY, CREDIT ONLY OWN SOURCES.**

#### What to SCAN (READ-ONLY, implement silently):
- All Tuya-related forum threads: T26439 (Johan), T146735 (Tuya Smart Life), T89271 (archive), etc.
- Johan Bendz's GitHub (JohanBendz/com.tuya.zigbee)  PRs, issues, code changes
- All Tuya WiFi threads and related projects
- Other forks and community contributions
- ** Implement discoveries into drivers/code, but NEVER mention the source in:**
  - Forum posts
  - Changelogs
  - Commit messages (use generic "improved" / "added support")
  - GitHub issue/PR comments

#### What to PUBLICIZE (visible in logs/changelogs/forum):
Only content from these sources MAY be mentioned:
- **dlnraja's own forum thread** (T140352)  user requests, bug reports
- **dlnraja's GitHub**  own issues, own PRs
- **Direct user requests** from T140352
- **All descendant forks** of dlnraja/com.tuya.zigbee
- ** These CAN appear in:** changelogs, forum posts, commit messages, logs

#### Forum Post Merge Rule:
- **ALWAYS check the last poster on T140352**
- If last poster is `dlnraja` (even if it was the bot posting): **EDIT/MERGE** into that post
- If last poster is someone else: **NEW reply** (only on T140352)
- NEVER create consecutive posts  always merge with own last post
- Use `merge-last-posts.js` for cleanup if multiple bot posts exist

#### Why this matters:
- Johan Bendz is the original author  we don't advertise that we watch his repo
- Forum community sees us as independent  no "synced from..." mentions
- Prevents attribution conflicts and maintains professional boundaries


---

## D. Draft  Test Promotion

Standard 3-tier Puppeteer pattern (ALL workflows must use):
1. **Wait**: `node .github/scripts/wait-athom-draft-ready.js` (poll ≤4 min; prefer draft/test over a sibling `processing_failed`; fail-closed only after the window if still failed — never `sleep 180` alone)
2. **Tier 1**: `npm install puppeteer --no-save` + `node .github/scripts/auto-promote-puppeteer.js`
3. **Tier 2**: `node .github/scripts/auto-publish-draft.js` (API fallback)
4. **Tier 3**: sleep 30s then re-run Puppeteer script

**TRAP**: Promote step MUST be in job with checkout + node + npm. A bare summary job will silently fail!
**TRAP**: Puppeteer needs `npm install puppeteer --no-save` before running.

---

## E. Commit Pattern

```yaml
- run: |
    git config user.name "github-actions[bot]"
    git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
    git add -A
    git diff --cached --quiet || git commit -m "auto: description [skip ci]"
    git pull --rebase origin master || true
    git push || true
```

Key: `[skip ci]` prevents infinite workflow loops.

---

## F. Rate-Limit Protection

All scripts using `gh` CLI or `fetch()` MUST have throttling:

### For `forum-auth.js` (SSO login):
All 7 fetch calls use `fetchTO()` with 15s timeout to prevent hangs during OAuth redirects.

### For `gh` CLI scripts (execSync):
```javascript
const { sleep } = require('./retry-helper');
await sleep(400); // 0.4s between API calls
```
Scripts with throttling: `triage-run.js`, `triage-upstream-enhanced.js`, `scan-forks.js`, `scan-johan-full.js`

### For fetch-based scripts:
```javascript
const { fetchWithRetry } = require('./retry-helper');
// Auto-handles: 429 backoff, GitHub X-RateLimit headers, Discourse spacing, CSRF refresh
```

### GitHub Issue Manager:
Always set `MAX_ITEMS` env to prevent unbounded API calls:
```yaml
env:
  MAX_ITEMS: "100"       # daily
  INCLUDE_CLOSED: "true" # for deep scans (sunday/monthly)
```

---

## G. Workflow Inventory (39 workflows)

| Workflow | Schedule | Steps | Key Secrets |
|----------|----------|-------|-------------|
| daily-everything | 4x/day (2,8,14,20 UTC) | 33 | ALL |
| sunday-master | Sun 07:00 | 20 jobs | ALL |
| nightly-auto-process | 03:30 daily | 15+ | ALL |
| auto-close-supported | 04:15 daily + Sun 15:00 | batch close | GH_PAT |
| upstream-auto-triage | Mon 05:00 | triage both repos | GH_PAT |
| weekly-fingerprint-sync | Mon 06:00 | Z2M/ZHA sync | GH_PAT |
| monthly-comprehensive-sync | 1st 01:00 | deep scan | ALL |
| auto-respond | on issue/PR open | FP check | GITHUB_TOKEN |
| auto-reopen-on-comment | on comment | reopen closed | GITHUB_TOKEN |
| stale | daily | mark+close inactive | GITHUB_TOKEN |
| publish | manual | Homey publish | HOMEY_PAT |
| auto-publish-on-push | on workflow complete | publish+promote | HOMEY_PAT |
| gmail-token-keepalive | 4x/day (5,11,17,23 UTC) | token refresh | GMAIL_* |
| deploy-pages | on push + daily | Device Finder | GITHUB_TOKEN |
| tuya-automation-hub | 4x/day (1,7,13,19) + Mon/Thu | forum+github | ALL |
| forum-auto-responder | 2x/day (9,21 UTC) | forum respond | HOMEY_EMAIL/PASSWORD |
| forum-pm-read | 07:50/19:50 UTC | PM harvest, never POST | HOMEY_EMAIL/PASSWORD |
| forum-poll | every 4h at :15 | public + media + PM harvest | HOMEY_EMAIL/PASSWORD |
| cleanup-wrong-threads | manual | cleanup bot posts | HOMEY_EMAIL/PASSWORD |
| johan-sdk3-sync | Wed 05:00 | SDK3 FP+DP sync + scaffold + audit | GITHUB_TOKEN |
| driver-maintenance | Fri 04:00 | Auto-scaffold + conflict audit + PR | GH_PAT |
| code-quality | Wed 03:00 + on push | quality checks |  |
| dependabot-auto-merge | on PR | auto-merge deps | GH_PAT |

19 additional workflows listed in `.github/workflows/` directory.

See `.github/SECRETS.md` for full secret reference.

### Supply-Chain Security
Pinning rule (actual, since 2026-07-29): **ALL actions pinned to full SHA, no exception** — format `owner/repo@<SHA> # vX.Y.Z`. Third-party actions were pinned in the 2026-07-28 security follow-up; official `actions/*` were pinned in the 2026-07-29 follow-up: checkout v5.1.0, setup-node v5.0.0, upload-artifact v5.0.0, cache v5.1.0, github-script v7.1.0 — Node.js 24 runtime. Never introduce a tag/branch ref (`@v5`, `@main`); resolve the SHA via `git ls-remote https://github.com/<owner>/<repo> "refs/tags/<tag>*"`.

---

## H. Sensor DP Discovery

New sensor variants (soil+fertilizer, air+VOC) may have unknown DPs.
1. Check fingerprint in `driver.compose.json`
2. Standard DPs work (soil: DP3/5/14/15)
3. Unknown DPs logged by `_handleDP()`  ask user for logs
4. Create capability in `.homeycompose/capabilities/`
5. Add DP mapping in `device.js`

### Known Pending: `_TZE284_hdml1aav` fertilizer/EC DP (unknown)

---

## I. SONOFF/eWeLink Mixins (v5.11.107)

| Mixin | File | Features |
|-------|------|----------|
| EwelinkMixin | `lib/mixins/SonoffEwelinkMixin.js` | LED, turbo, detach, trigger, delayed power-on |
| SensorMixin | `lib/mixins/SonoffSensorMixin.js` | Tamper, temp/hum calibration |
| EnergyMixin | `lib/mixins/SonoffEnergyMixin.js` | Current, voltage, power (0xFC11) |

Safe auto-add PIDs: `SNZB-*`, `ZBMINI*`, `S31ZB`, `S[46]0ZBT*`, `BASICZBR*`, `TRVZB`, `SWV-*`, `ZBM5-*`

---

## J. Auto-Reopen Guard (v5.12.x)

`auto-reopen-on-comment.yml` skips reopening when:
- Commenter is `dlnraja`, `github-actions[bot]`, or `dependabot[bot]`
- Comment < 5 chars, issue closed < 2min ago, or "thank you" patterns

**BUG FIXED:** dlnraja commenting on closed issues (to confirm resolution)
triggered the auto-reopen bot  infinite close/reopen loop.
Fix: added `dlnraja` to both the `if:` condition AND the `SKIP_USERS` array.

---

## K. SDK v3 Battery & Power Rules (CRITICAL for Automation)

### RULE: Never combine `measure_battery` + `alarm_battery`
Any automation (linter, enrichment, scaffold) that adds capabilities
MUST check this constraint BEFORE injecting:

```javascript
// SAFE check before adding battery capability
const caps = compose.capabilities || [];
if (caps.includes('measure_battery')) {
  // NEVER add alarm_battery  SDK v3 violation
}
if (caps.includes('alarm_battery')) {
  // NEVER add measure_battery  SDK v3 violation
}
```

### Power Source Detection (for automation scripts)
Automation scripts MUST NOT assume power source from driver name alone.
The same manufacturerName can power differently based on productId.

```
Decision tree:
1. Does compose have energy.batteries?  Battery device
2. Does device.js have mainsPowered=true?  Mains device
3. Is class=remote AND productId=TS004x?  Kinetic (self-powered)
4. Is class=socket/light/fan?  Probably mains (verify compose)
5. Default: DO NOT add battery capabilities automatically
```

### Maintenance Scripts Safety Rules
All scripts in `scripts/maintenance/` MUST:
1. **Never add both** `measure_battery` + `alarm_battery`
2. **Validate JSON** after compose modification
3. **Validate JS** syntax after device.js modification (`node -c`)
4. **Log every change** for audit trail
5. **Be idempotent**  running twice = same result
6. **Never remove** capabilities without explicit justification
7. **Never modify** WiFi driver authentication/implementation
8. **Respect protocol type**  don't add ZCL clusters to Tuya DP drivers

### Pipeline Step 6c Safety Gate
The daily pipeline runs `revert-alarm-battery-conflict.js` to catch
any regressions introduced by AI linting or enrichment steps.
Order: `fix-flow-cards`  `revert-battery-conflicts`  `fix-empty-caps`  `validate`

---

## L. Protocol-Aware Automation Rules

### Tuya DP (TS0601) Drivers
- NEVER add standard ZCL cluster bindings to TS0601 drivers
- ALWAYS use dpMappings for capability mapping
- Different _TZE200_ manufacturerNames need DIFFERENT DP numbers
- Validate DP numbers against Z2M/ZHA/Tuya IoT Platform

### Standard ZCL Drivers 
- ALWAYS use configureAttributeReporting()
- NEVER add TuyaEF00Manager to standard ZCL drivers
- Use zclNode.endpoints[N].clusters for capability binding

### Multi-Variant Drivers
- One driver can serve thousands of FP combinations
- NEVER assume all variants have same features
- Use runtime capability detection in device.js
- Example: `if (this.hasCapability('measure_power'))` before setup

---

## M. Athom `processing_failed` / socket hang up (P139)

**Dual App IDs (2026-08+):** master publishes `com.dlnraja.tuya.zigbee` (9.0.x);
stable publishes `com.dlnraja.tuya.zigbee.stable` (5.12.x). Test slots are
**independent** when Stable compose id is `.stable`. Still never spam republish
after `processing_failed`, and never let a misconfigured Stable workflow target
the Universal Tuya App ID.

### Do NOT
1. Bump patch + republish in a loop when Athom returns `processing_failed` with
   `socket hang up` / ECONNRESET / 502–504 — that is Athom processor/network,
   not a version bug (see 9.0.525 / 9.0.526 while Test stayed on 9.0.524).
2. Let Publish Self-Heal re-run **Publish Stable → Test** with the wrong App ID
   (legacy shared id would overwrite Universal Tuya Test).
3. Force a recovery bump on bare `workflow_dispatch` of Auto-Fix.
4. Republish Stable in a loop on P139 while draft `5.12.88` is processing_failed.

### Do
1. Keep Test on the last **healthy** build; wait for Athom or one human publish.
2. `processing-failure-republish-check.js`: refuse Auto-Fix recovery when the
   failure is transient, especially if a healthy Test build already exists.
3. `athom-processing-failure-retry.js`: skip self-heal when Test is healthy or
   the failure is transient; if a rare non-transient heal runs, trigger
   **Auto-Publish on Push** (master) only — never Publish Stable→Test.
4. `verify-test-version.js` stays fail-closed for the *expected* version
   (do not greenwash a failed upload). `wait-athom-draft-ready.js` must not
   exit 1 on the first `processing_failed` poll — a sibling draft/test of
   the same version wins; fail-closed only after the wait window
   (`HOMEY_DRAFT_WAIT_MS` default **600s** after P2384/P2385).
7. **P2385 amplifiers**: `force_publish` defaults **false**; Auto-Fix publishes
   only when `trigger_publish=true` (never bare dispatch); Publish Self-Heal
   uses `cancel-in-progress: false` and re-triggers Auto-Publish with
   `force_publish=false`.
5. Auto-Publish / Auto Publish workflows use `cancel-in-progress: false` on the
   publish concurrency group — cancelling mid-draft/promote causes orphan Athom
   builds and socket hang up races on the next upload.
6. Auto-Fix+Publish must **not** Homey-publish from `stable-v5` (`github.ref_name != 'stable-v5'`).
   P217: `fix-fingerprint-conflicts.js` must not strip pid-disambiguated brands
   (`HOBEIAN`, `Wing`); re-inject after conflict resolve; anti-bot REQUIRED for HOBEIAN on `switch_2gang`.
7. **P2252 Athom combo budget (root cause of many `socket hang up`)**:
   Athom expands `manufacturerName[] × productId[]` using **RAW array lengths**
   (every CASE form counts). `compact-zigbee-identifiers.cjs` must:
   - count `afterTotal` as raw length product (not unique-lowercase);
   - cap CASE forms (`HOMEY_ZIGBEE_MAX_CASE_FORMS`, default 2);
   - run a second pass until raw total ≤ `HOMEY_ZIGBEE_MAX_TOTAL_COMBOS` (20k);
   - per-driver raw ≤ `HOMEY_ZIGBEE_MAX_DRIVER_COMBOS` (2k).
   Source compose may stay large; only the publish temp manifest is compacted.

8. **P2286 mandatory publish path (root cause of orphan Athom builds):**
   Never publish from the **repo root**. Always:
   ```bash
   npm run build
   npm run prepare-publish
   npm run publish:direct -- --channel test
   # or: npm run publish:temp -- --channel test
   ```
   `direct-api-publish.js` refuses paths that are not `homey-publish-temp`
   unless `HOMEY_ALLOW_REPO_PUBLISH=1` or `--force`. Soft-expect skips
   `createBuild` / upload / promote when the same version is already `test`
   or in-flight (re-lists after `createBuild` to catch peer races).
   `.homeyignore` must keep `!.homeychangelog.json`. Size gate default **50 MB**.

9. **P2323 tip email + developer tools dashboard hang:**
   - `dashboard-monitor.js` must pass `$timeout` (≥60s via `HOMEY_API_TIMEOUT_MS`)
     and retry on `Timeout after` / `socket hang up` (Athom default ~10s is too short).
   - Soft-alert: latest `processing_failed` + transient detail + any healthy `test`
     → do **not** exit 1 / bump-loop.
   - `prepare-publish` exports `HOMEY_PUBLISH_DIR` to `GITHUB_ENV`; publish steps
     prefer that path over recomputing `os.tmpdir()`.
   - Publish Diagnose scrapes logs for hang signatures and recommends wait + combo check.

10. **P2325 Auto-Publish verify soft-continue (2026-08-30):**
    - `verify-test-version.js` must call `softContinueOnTransientHang()` /
      `softAlertDecision` **before** fail-closed on `ATHOM_PROCESSING_FAILED`.
    - Evidence: tip emails + builds #3036/#3037 (`9.0.720`/`9.0.721`) hung while
      Test stayed healthy on **9.0.719** (#3035) — workflow must exit 0 with
      `P139: Test healthy…` note, not bump-loop.
    - Gate: `npm run check:p2325` · `test/critical/p2325-verify-soft-hang.test.js`.
    - Workflows: set `HOMEY_API_TIMEOUT_MS=60000` on verify + dashboard-monitor steps.

11. **P2326 inbox / misroute / DynCap (2026-08-30):**
    - GitHub issues + forum media often carry Homey diag UUIDs — harvest via
      `tools/ci/inbox-diag-uuid-harvest.js` (wired in `fetch-diags.yml`, `forum-poll.yml`).
    - `#533` salvagr: on Test tip, device ran `device_radiator_valve` with empty mfr
      while couple is `curtain_motor` — radiator logs `[MISROUTE-P2326]`.
    - `#532` Adam: DynCap mapped FCU DP36 valve → `target_temperature` — DynCap must
      skip driver-owned DPs (`npm run check:p2326`).
    - Forum: keep `forum:media` + actionable processor SHADOW; never auto-post.
    - Classify publish/runtime reliability as **BOTH**; do not spam Athom republish.

### Doctrine (never invent)
- Identity is always **manufacturerName + productId** (Sacred Couple).
- One MFS can ship many PIDs / variants / marketing names — **mfr alone is ambiguous**.
- Catalog / heuristic / registry must **refuse** a driver when `pid` is missing from
  that mfr’s `modelIds` (example: `_TZE284_m1cvyneb` + `TS0201` → **null**, not climate).
- `PRODUCT_ID_DEFAULTS['TS0201'].driver` must stay **`null`** (requires mfr).

### Locked couple (P2138 PresentSky BSEED Click)
| Couple | Driver | Forbidden |
|--------|--------|-----------|
| `*_m1cvyneb` + `TS0601` | `wall_dimmer_tuya` | climate / soil / zigbee_universal / generic / ir_blaster |
| Same mfr + other PID | *(no invent)* | do not force dimmer or climate |

Brightness MCU scale: `lib/tuya/TuyaBrightnessScale.js` (Homey 0–1 ↔ Tuya 0–1000, clamp).

### Mandatory CI gate
```bash
node tools/ci/p2138-sacred-couple-matrix-gate.js
node tools/ci/anti-bot-regression-gate.js
node tools/ci/audit-sacred-couple.js --from-registry
node tools/ci/layer-coverage-gate.js
node --test test/critical/p2138-bseed-wall-dimmer.test.js
node --test test/critical/poll-control-policy.test.js
```

### Workflows that MUST run the matrix gate (hard fail)
- `syntax-check.yml`, `unified-ci.yml`, `pr-gate.yml`, `validate.yml`
- `code-quality.yml`, `auto-publish-on-push.yml`
- `auto-fix-and-publish.yml`, `auto-enrich-closed-loop.yml`, `continuous-flow.yml`

Enrich / Blakadder / forum appliers must call anti-bot **after** apply; matrix gate
catches invent regressions anti-bot alone might miss (wrong-PID catalog force).

### P2268 / P2270 / P2269 — Parallel discussion harvest + anti-spaghetti
- **Machine SSOT lineage:** [`config/enrichment/discovery-lineage.json`](../config/enrichment/discovery-lineage.json) — past (P102–P2266) · recent (P2267 E002, P2268 parallel) · present (P2269–P2281).
- Gate: `npm run check:discovery-lineage` · PhaseRunner softFail `gate-discovery-lineage` + sync `remind-e002-taxonomy-p2267`.
- Shadow only (no forum POST). Curated discoveries: `reports/discussion-harvest-*/DISCOVERIES.json` (≥50).
- Scripts: `npm run discover:discussions` · `npm run discover:apply-min` · `npm run discover:regen-md` · `npm run check:p2269` · `npm run check:p2270` · `npm run apply:parallel-couples`.
- Regen MD: `node tools/ci/p2270-regenerate-discoveries-md.js` (keeps count ↔ array sync).
- Enrich phases (`config/enrichment/phases.json` sync): mega z2m/zha softFail + `discover-discussions-p2270` + regen-md + `discover-apply-min-p2270` + `apply-parallel-couples-p2268` + E002 remind + `sync-dp-couple-knowledge` + `coverage-dp-cluster-flow`; gates softFail `gate-p2269` / `gate-p2270` / `gate-p2278` / `gate-p2279` / `gate-discovery-lineage` + hard `p2138`.
- GHA softFail wiring: `auto-enrich-closed-loop.yml` · `forum-poll.yml` · `project-resilience.yml` · `recurrent-orchestrator.yml` run `--phase=sync` + lineage gate.
- GHA hard: `unified-ci.yml` runs lineage + p2269/p2270 tests after P2138.
- Comms ranking: `lib/protocol/CommunicationPathFinder.js` + `docs/architecture/COMM_PATHFINDING.md` (**keep**).
- Lexicon: `lib/zigbee/ZclClusterLexicon.js` E002=`manuSpecificTuya2` (P2267) (**keep**).
- SSOT map: `docs/architecture/SPAGHETTI_MAP.md` + PROTOCOL/BATTERY/TIME/PARSER_SSOT + DeviceFusionHooks split (**keep** WHY).
- Never invent productId/DP; tier D = watchlist only.

#### Discovery lineage (past → recent → present)

| Era | Patches | What workflows must remember |
|-----|---------|------------------------------|
| Past | P102–P2200 | Forum SHADOW; REPLY_TOPICS=140352 dry-run; sacred mfr+pid; no AI paste |
| Past | P2138 / P2201–P2207 | BSEED dimmer 0–1000; contact no TS0601; IAS/Tongou/DIN locks |
| Past | P2206 / P2227–P2228 | Privacy redactor; AI forfait; CI≠Homey bundle |
| Recent | P2267 | E000/E001/E002 taxonomy in lexicon + docs |
| Recent | P2268 | Parallel ZHA/Z2M couple unsteals + apply script |
| Present | P2269–P2270 | Anti-spaghetti SSOT + harvest ≥50 + PathFinder |
| Present | P2271–P2279 | Polarity / strip / curtain / smoke / meter / TRV cal / cover+USB |
| Present | P2280–P2281 | Dual-app inconsistency sweep + workflow lineage SSOT |

- Extra gates: `npm run check:p2278` · `npm run check:p2279` · `npm run check:discovery-lineage`.
- Dual-app: P227x couple unsteals + TRV cal TX/RX = **BOTH**. PathFinder / Daylight / mega feature managers = **MASTER_ONLY**.

### P2201 — Homey cartesian / contact TS0601 (2026-08-20)
- Never put **TS0601** on `contact_sensor` compose (pairs with every mfr → climate collisions).
- `_TZE200/204_pay2byax`+`TS0601` → narrow `contact_sensor_zigbee` only.
- ZG-102ZL luminance stays on `contact_sensor` with verified (mfr,pid) couples.

### P2202 — Fork-dump collision hygiene
- After mega/fork FP dumps, strip dual-homes from button/sensor drivers that collide with plugs.
- Refresh baseline only when **new** collisions are intentional:
  `node .github/scripts/fp-collision-check.js --baseline .github/fingerprint-collision-baseline.json`
- **Never** run `resolve-collisions.js` blindly (mass-prunes drivers).
- After strip/apply: `node tools/ci/align-mfs-db-intelligent.js` (report then `--apply` for medium compose_exclusive).

### Dual-app classification
- **BOTH**: wall_dimmer harden, brightness clamp, fingerprint refuse-wrong-pid,
  Poll Control skip sleepy, battery no-invent, compose FP locks,
  energy divisors / EnergyJumpGuard / energy-compose gate, BootBudget heap,
  brand-scrub of flow **titles** (no commercial names).
- **MASTER_ONLY**: command pacer, reconnect coalescer, availability last-seen,
  presence sim, Daylight Atmosphere / Solar Sync / Path Light engines,
  free-scrape, AlarmPolarity smart-learn, CI `.cache/` intel infra.
- Never Publish Stable with App ID `com.dlnraja.tuya.zigbee` (must be `.stable`).
- SSOT: `config/architecture/dual-app-tracks.json` · enrich gates:
  `node tools/ci/l99-dual-app-enrich-gates.js` (soft on enrich; `--hard` on unified-ci).

### L99 enrich automation (regular)
Workflows that soft-run L99 dual gates on schedule:
- `auto-enrich-closed-loop.yml` (every 4h)
- `project-resilience.yml` (05:20 UTC)
- `recurrent-orchestrator.yml` (03:30 UTC)
- `forum-poll.yml` (soft after silent scan)
Hard fail on `unified-ci.yml` / publish path for BOTH gates (`--hard`).

### P2352 — L99 Inbox Intelligence (regular + intelligent)
**Unify** Gmail crashes + GitHub issues/PRs + Homey forum SHADOW + driver/couple gates into one prioritized loop.

| | |
|---|---|
| Workflow | `l99-inbox-intelligence.yml` |
| Cron | `45 2,6,10,14,18,22 * * *` (+30m after `forum-poll` `:15`) |
| Script | `tools/ci/l99-inbox-intelligence-orchestrator.js` |
| Config | `config/enrichment/l99-inbox-intelligence.json` |
| Docs | `docs/architecture/L99_INBOX_INTELLIGENCE.md` |
| npm | `npm run inbox:l99` · `inbox:l99:quick` · `inbox:l99:github` |

Hooks (soft, continue-on-error):
- `forum-poll.yml` → `--quick --skip-scan` after silent scan
- `auto-enrich-closed-loop.yml` → same
- `recurrent-orchestrator.yml` → same

Rules: `FORUM_AUTO_POST=0`, never invent pid, never blind `align-mfs --apply`, commit reports only with `[skip ci]`.

### Catalog lock checklist (when adding a sacred couple)
1. `drivers/*/driver.compose.json` (static Homey match)
2. `lib/DeviceFingerprintDB.js` compound key `mfr|pid`
3. `lib/tuya/DeviceFingerprintDB` / fingerprints (`modelIds` exact)
4. `data/mfs_db.json` (no false couples)
5. `data/user-misattribution-registry.json` + anti-bot forbid list
6. Critical test + matrix gate entry if high-risk misroute

### P2232 — Max-source market couples + soft adaptive heuristic (2026-08-24)
Harvest **manufacturerName + productId** from every trusted channel — never invent pid.

| Source | Role |
|--------|------|
| Blakadder / Z2M / ZHA / deCONZ | Market catalogs |
| Johan issues/comments | Upstream SDK3 intel |
| Gmail diags + crash patterns | User crash/diag couples |
| Forum SHADOW | Read-only couples extract |
| `DEVICE_INTERVIEWS.json` | Project interview knowledge |
| `device-truth.json` locks | Canonical apply-safe locks |
| `reports/github-intel-*/` | Own GH issue/PR couples |

**Apply-safe tiers only:** `registry` · `device_truth` · `exact` · `interview(fixed)` · `z2m_desc`.

**Soft review only (never auto-compose):** `pid_default` · `heuristic_adaptive` · `heuristic_pid`
(`lib/utils/fingerprint-matcher.js`, kill-switch `TUYA_FP_HEURISTIC=0`).

```bash
npm run market:couples          # cross-ref + NEED_REVIEW.md
npm run market:couples:crawl    # refresh catalogs then intake
npm run market:couples:apply    # apply-safe compose locks
npm run market:couples:test     # P2231/P2232 critical tests
```

**Workflows:**
- `market-couples-intake.yml` — daily 04:45 UTC (crawl + check + apply-safe + mfs align)
- `auto-enrich-closed-loop.yml` — phase `2b-market-couples` (+ apply when not dry-run)
- `forum-poll.yml` — soft intake only (artifact / summary, no compose apply)
- `multi-source-enrich-orchestrator.js` — phases `6b` / `6c`
- `unified-ci.yml` — runs `p2231-market-couples-intake.test.js`

SSOT: `config/enrichment/market-couples-sources.json`

---

## O. GitHub elementary security & data-leak hygiene (P2206)

### Always
1. Every workflow declares top-level `permissions:` (start `contents: read`).
2. Never `echo ${{ secrets.* }}` or dump secret env to logs/artifacts.
3. Prefer `GITHUB_TOKEN`; use `GH_PAT` only for documented cross-repo needs.
4. `pull_request_target` is high-risk: do **not** checkout PR head. If used, add
   comment `P2206-ALLOW-PRT` explaining why (e.g. labeler with no untrusted code).
5. Guard missing secrets: empty → exit 0 / skip; optional steps `continue-on-error: true`.
6. Artifacts: never upload raw Gmail/Homey diag dumps; run `privacy-redactor.js` first.

### Never commit
| Path pattern | Why |
|--------------|-----|
| `reports/**/gmail-ci-dump.json` | mailbox / diag operational dump |
| `reports/**/diag-*-excerpt.txt` | Homey device UUIDs, paths, PII |
| `gmail-dumps/`, `diagnostics/raw/` | raw exports |
| `reports/forum-*/**/*.{jpg,png,...}` | user media |
| `.env*`, `secrets.json`, tokens | credentials |

Commit **sanitized** summaries only (`TREAT.md`, FP couples, app versions).

### Gates
```bash
npm run security-scan
npm run security:github
# or
npm run security:full
node .github/scripts/privacy-redactor.js <files...>
```

`unified-ci.yml` runs security-scanner + `github-security-elementary-gate.js` (hard fail).
