# 🌐 GLOBAL INVESTIGATION PLAN — Phoenix Sovereign AI Framework
> **Version**: 3.0.0 | **Purpose**: Master investigation methodology for ALL AI agents
> **Reference Files**: `AI_CONTEXT_MANDATE.md`, `AI_GLOBAL_ACTION_PLAN.md`, `PROJECT_INDEX.md`, `.cursorrules`, `.clinerules`, `.windsurfrules`
> **Skills**: `Antigravity Awesome Skills` + `Claude Code Local` | **Branch**: `master` (primary) + `stable-v5` (sync)

---

## 🚨 AI ENTRY PROCEDURE (MANDATORY FIRST STEPS)

> **Every AI agent entering this project MUST execute these steps in order BEFORE any action:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  STEP 0: Read THIS file (GLOBAL_INVESTIGATION_PLAN.md)                  │
│  STEP 1: Read AI_CONTEXT_MANDATE.md — Architecture, dual-app, pipeline  │
│  STEP 2: Read PROJECT_INDEX.md — Master entry point, 227+ drivers       │
│  STEP 3: Read AI_GLOBAL_ACTION_PLAN.md — Immediate action mandate       │
│  STEP 4: Read all dotfiles in order:                                    │
│          .cursorrules → .clinerules → .windsurfrules → .clinerule      │
│  STEP 5: Scan latest issues/PRs:                                        │
│          node .github/scripts/scan-prs-issues.js                        │
│  STEP 6: Read architecture docs:                                        │
│          docs/ARCHITECTURE.md + MASTER-V7-SKELETON.md                   │
│  STEP 7: Read critical mistakes:                                        │
│          docs/rules/CRITICAL_MISTAKES.md                                 │
│  STEP 8: Check Antigravity skills registry:                             │
│          .ai/SKILL_REGISTRY.md (if exists)                              │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 TABLE OF CONTENTS

1. [Investigation Philosophy & Deep Diagnostic Mandate](#1-investigation-philosophy--deep-diagnostic-mandate)
2. [Dual-App Architecture & Branch Context](#2-dual-app-architecture--branch-context)
3. [11-Layer Zigbee RX/TX Pipeline (from AI_CONTEXT_MANDATE)](#3-11-layer-zigbee-rxtx-pipeline)
4. [Complete Source Matrix & Investigation Methods](#4-complete-source-matrix--investigation-methods)
5. [Script Catalog for Investigation (50+ Scripts)](#5-script-catalog-for-investigation-50-scripts)
6. [Cross-Reference Patterns: manufacturerName × productId × power × protocol](#6-cross-reference-patterns)
7. [Investigation Flows per Bug Type](#7-investigation-flows-per-bug-type)
8. [Forum & GitHub Investigation Protocol](#8-forum--github-investigation-protocol)
9. [Diagnostics & Email Investigation Protocol](#9-diagnostics--email-investigation-protocol)
10. [Z2M / ZHA / Blakadder / Domoticz Cross-Reference Protocol](#10-z2m--zha--blakadder--domoticz-cross-reference-protocol)
11. [Antigravity Skills & Claude Code Local Integration](#11-antigravity-skills--claude-code-local-integration)
12. [Critical Mistakes Reference (from CRITICAL_MISTAKES.md)](#12-critical-mistakes-reference)
13. [Quality Gate System (9-Layer + Pre-Commit Gateway)](#13-quality-gate-system-9-layer--pre-commit-gateway)
14. [Documentation & Resource Enrichment Protocol](#14-documentation--resource-enrichment-protocol)
15. [Workflow & GitHub Actions Improvement Protocol](#15-workflow--github-actions-improvement-protocol)
16. [Shadow Mode Protocol & Attribution Rules](#16-shadow-mode-protocol--attribution-rules)
17. [Prevention Scripts Creation Methodology](#17-prevention-scripts-creation-methodology)
18. [Issue/PR Resolution & Auto-Close Protocol](#18-issuepr-resolution--auto-close-protocol)
19. [Appendix A: Quick Reference Commands](#19-appendix-a-quick-reference-commands)
20. [Appendix B: Investigation Report Template](#20-appendix-b-investigation-report-template)
21. [Appendix C: All Project Scripts (100+ index)](#21-appendix-c-all-project-scripts-index)
22. [Appendix D: Antigravity Skills Catalog](#22-appendix-d-antigravity-skills-catalog)

---

## 1. INVESTIGATION PHILOSOPHY & DEEP DIAGNOSTIC MANDATE

### Core Principle: NEVER Stay on the Surface

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ❌ WRONG APPROACH (REJECTED):                                          │
│  "Missing manufacturer, added fingerprint"                               │
│                                                                          │
│  ✅ CORRECT APPROACH (MANDATORY):                                       │
│  1. Full cross-reference with Z2M/ZHA/Blakadder/Domoticz                │
│  2. Search forum messages + images + diagnostic logs                    │
│  3. Check all PRs/issues (open AND closed) for context                 │
│  4. Analyze DP mappings from ALL similar variants                       │
│  5. Check if same manufacturerName exists in OTHER drivers              │
│  6. Implement fix + update docs + enrich workflows + create prevention  │
│  7. Verify via 9-Layer Quality Gate + npx homey app validate            │
│  8. Auto-close issue/PR with full resolution summary                    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Investigation Mindset

```javascript
// MANDATORY MINDSET CHECKS BEFORE ANY INVESTIGATION:

const mindset = {
  // 1. VARIANT INTELLIGENCE
  "one_mfr_many_ids": "A single manufacturerName (_TZ3000_xxx) can map to 50+ devices",
  "one_id_many_mfrs": "A single productId (TS0601) can be 2000+ different devices",
  "power_varies": "Same mfr can have battery AND mains AND kinetic variants",
  
  // 2. SOURCE DIVERSITY
  "check_all_sources": "Forum, GitHub, Email, Z2M, ZHA, Blakadder, Domoticz, Hubitat",
  "check_closed_issues": "Old closed issues may contain images, DP mappings, user manuals",
  "check_images": "screenshot-analyzer.js can extract info from forum images",
  
  // 3. IMPLEMENTATION DEPTH
  "not_just_fingerprint": "May need new DP mappings, flow cards, battery handling, custom clusters",
  "may_need_new_driver": "If existing driver incompatible → create new driver",
  "may_need_base_class_fix": "If bug in base class → fix ALL drivers inheriting from it",
  
  // 4. DOCUMENTATION AFTERMATH
  "update_everything": "PROJECT_INDEX.md, FINGERPRINT-CROSSREF.md, workflows, dotfiles",
  "create_prevention": "Create JS script to auto-detect same bug in future",
  "enrich_workflows": "Add checks to nightly-auto-process.yml, driver-maintenance.yml"
};
```

### Investigation Flow (6 Phases)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: DEEP CONTEXT GATHERING                                        │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Read AI_CONTEXT_MANDATE.md — Understand dual-app, 11-layer     │  │
│  │ 2. Read PROJECT_INDEX.md — Master cartography                      │  │
│  │ 3. Read relevant driver/device.js — Current implementation         │  │
│  │ 4. Read driver.compose.json — Current fingerprints/capabilities    │  │
│  │ 5. Read driver.flow.compose.json — Current flow cards              │  │
│  │ 6. Check lib/base classes — Understanding inheritance              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  PHASE 2: MULTI-SOURCE CROSS-REFERENCING                                │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Run internet-research-tool.js for web search                   │  │
│  │ 2. Run github-scanner.js for all issues/PRs (open + closed)       │  │
│  │ 3. Run fetch-gmail-diagnostics.js for diagnostic logs              │  │
│  │ 4. Run forum-activity-scraper.js for latest forum activity         │  │
│  │ 5. Run scan-prs-issues.js for issues/PRs summary                  │  │
│  │ 6. Run cross-ref-intelligence.js for Z2M/ZHA cross-ref            │  │
│  │ 7. Run external-sources-scanner.js for all external sources       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  PHASE 3: VARIANT INTELLIGENCE                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Search ALL drivers for same manufacturerName                   │  │
│  │ 2. Search ALL productIds for this manufacturerName                 │  │
│  │ 3. Identify power source (battery/mains/kinetic/USB)              │  │
│  │ 4. Identify protocol type (ZCL/TuyaDP/Hybrid/Custom)             │  │
│  │ 5. Map DP definitions to actual capabilities in device.js         │  │
│  │ 6. Check for custom clusters (0xE000, 0xE001, 0xEF00, 0xFCxx)    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  PHASE 4: IMPLEMENTATION                                                │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Add/update fingerprint in driver.compose.json                  │  │
│  │ 2. Implement DP mappings in device.js                              │  │
│  │ 3. Add/update flow cards in driver.flow.compose.json               │  │
│  │ 4. Update battery handling (UnifiedBatteryHandler)                │  │
│  │ 5. Apply CRITICAL_MISTAKES rules (backlight, settings, mixins)    │  │
│  │ 6. Run master-self-heal.js for normalization                       │  │
│  │ 7. Run fix-crashers.js if fixing class hierarchy                  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  PHASE 5: DOCUMENTATION & ENRICHMENT                                    │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Update PROJECT_INDEX.md with new device/change                 │  │
│  │ 2. Update FINGERPRINT-CROSSREF.md with new cross-references       │  │
│  │ 3. Update docs/DEVICE_MATRIX.md if applicable                     │  │
│  │ 4. Update .homeychangelog.json with version entry                 │  │
│  │ 5. Update CHANGELOG.md with generic wording                       │  │
│  │ 6. Update dotfiles if rules need changing                         │  │
│  │ 7. Update CRITICAL_MISTAKES.md if new bug pattern found           │  │
│  │ 8. Update docs/rules/ if new pattern discovered                   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  PHASE 6: QUALITY GATE + PREVENTION                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Run scripts/PRE_COMMIT_CHECKS.js — Syntax + YML + rules        │  │
│  │ 2. Run npx homey app validate --level publish                     │  │
│  │ 3. Run scripts/validation/comprehensive-recursive-validator.js    │  │
│  │ 4. Create prevention script if new bug pattern discovered         │  │
│  │ 5. Enrich GitHub Actions workflows with new checks                │  │
│  │ 6. Commit with [skip ci] and generic wording                      │  │
│  │ 7. Auto-close issue/PR with resolution summary                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. DUAL-APP ARCHITECTURE & BRANCH CONTEXT

### App IDs & Branch Mapping

| App ID | Branch | Intended Audience | Versioning | CI/CD |
|--------|--------|-------------------|------------|-------|
| `com.dlnraja.tuya.zigbee` | `master` | Experimental / Beta | `7.x.x` | auto-publish-on-push.yml |
| `com.dlnraja.tuya.zigbee.stable` | `stable-v5` | Production / Stable | `5.11.x` | publish-stable.yml |

### CRITICAL INVESTIGATION RULES FOR BRANCHES:

```javascript
const branchRules = {
  // WORK ON master PRIMARILY
  primary_branch: "master",
  
  // SYNC TO stable-v5 WHEN:
  sync_to_stable: {
    critical_bug_fixes: true,
    fingerprint_additions: true,
    dp_mapping_changes: "only if tested on master first",
    new_drivers: "only for stable-v5 priority list",
    base_class_changes: "only if backwards-compatible"
  },
  
  // NEVER SYNC TO stable-v5:
  never_sync: [
    "new architecture features (v8.0+)",
    "experimental clusters",
    "beta features only for master",
    "breakings changes to existing API"
  ],
  
  // GIT SYNC COMMANDS:
  sync_command: `
    git checkout master
    git pull --rebase origin master
    # ... make changes ...
    git commit -m "feat: ... [skip ci]"
    git push origin master
    
    # Cherry-pick to stable-v5 if needed:
    git checkout stable-v5
    git pull --rebase origin stable-v5
    git cherry-pick <commit-hash>
    git push origin stable-v5
  `
};
```

### App.json ID Check (CRITICAL)

```bash
# ALWAYS verify app.json before any commit!
grep "com.dlnraja.tuya.zigbee" .homeycompose/app.json

# On stable-v5 branch, should be:
# "id": "com.dlnraja.tuya.zigbee.stable"

# On master branch, should be:
# "id": "com.dlnraja.tuya.zigbee"
```

---

## 3. 11-LAYER ZIGBEE RX/TX PIPELINE

> **Source**: AI_CONTEXT_MANDATE.md — Every frame passes through these layers:

| Layer | Component | Core Responsibility | Investigation Use |
|-------|-----------|---------------------|-------------------|
| **L0** | `TuyaZigbeeDevice.js` (handleFrame) | **Raw Interception**: Intercepts proprietary clusters (0xE000, 0xE004) | Check if custom cluster being dropped |
| **L1** | `UniversalThrottleManager.js` | **Flow Control**: 120 msg/min RX, 30 msg/min TX | Check if device flooding causing issues |
| **L2** | `IntelligentProtocolRouter.js` | **Intelligent Routing**: ZCL vs Tuya DP vs custom | Check if protocol mis-routed |
| **L3** | `TuyaBoundCluster.js` | **Binding & Command Capture**: Button press states | Check if binding missing for button |
| **L4** | `TuyaEF00Manager.js` / `AdaptiveDataParser.js` | **DP Decoding**: Byte→JS type conversion | Check double-division bug! |
| **L5** | `GlobalTimeSyncEngine.js` | **Time Sync**: LCD clock wake-up requests | Check if TRV/losing time |
| **L6** | `PhysicalButtonMixin.js` | **Button Dedup**: appCommandPending flag | Check physical detection failure |
| **L7** | `BaseHybridDevice.js` | **Capability Mapping**: DP → Homey capabilities | Check wrong capability mapping |
| **L8** | `DynamicCapabilityManager.js` | **Auto-Discovery**: Unknown DPs → generic | Check phantom capabilities |
| **L9** | `SessionManager` (Master Beta) | **Session Reassembly**: IR fragmented packets | Check Zosung IR code corruption |
| **L10** | `HealthMonitor` (Master Beta) | **Heartbeat Tracking**: Dead sensor detection | Check false offline status |
| **L11** | `SanityFilter.js` (Master Beta) | **Semantic Filter**: EMA + ROC spike rejection | Check erratic sensor values |

### Pipeline Investigation Pattern

```javascript
// When investigating WHY a device isn't working:
// 1. Check which layer is failing
const pipelineInvestigation = {
  // No data at all? Check L0-L1
  no_data: ["TuyaZigbeeDevice.handleFrame", "UniversalThrottleManager"],
  
  // Wrong values? Check L4 (double-division!)
  wrong_values: ["TuyaEF00Manager.AdaptiveDataParser", "dpMappings.divisor"],
  
  // Buttons not working? Check L3, L6
  buttons_not_working: ["TuyaBoundCluster", "PhysicalButtonMixin"],
  
  // Features missing? Check L7, L8
  features_missing: ["BaseHybridDevice", "DynamicCapabilityManager"],
  
  // Battery wrong? Check battery-specific code (not pipeline)
  battery_wrong: ["UnifiedBatteryHandler", "VoltageCurveConverter"],
  
  // Crash on init? Check L0, import paths, settings keys
  crash_on_init: ["TuyaZigbeeDevice", "settings.keys", "import.paths"]
};
```

---

## 4. COMPLETE SOURCE MATRIX & INVESTIGATION METHODS

### All Sources to Scan (Priority Order)

| # | Source | What to Get | Access Method | Attribution |
|---|--------|-------------|---------------|-------------|
| 1 | **Homey Forum T140352** | User reports, device requests, diagnostics, images | `./github/scripts/internet-research-tool.js homeyforum 140352` | PUBLIC |
| 2 | **dlnraja GitHub Issues** | Bug reports, feature requests, closed issues | `./github/scripts/github-scanner.js scan-issues --state all` | PUBLIC |
| 3 | **dlnraja GitHub PRs** | Community contributions, WIP fixes | `./github/scripts/github-scanner.js scan-prs --state all` | PUBLIC |
| 4 | **JohanBendz Fork Issues/PRs** | Upstream fixes, known issues | `./github/scripts/scan-johan-full.js` | SILENT |
| 5 | **Gmail Diagnostics** | Crash logs, diagnostic IDs (54888ee1-xxxx) | `./github/scripts/fetch-gmail-diagnostics.js --max 50` | SILENT |
| 6 | **Z2M Converters (tuya.ts)** | DP definitions, device configs, exposes | `./github/scripts/internet-research-tool.js z2m "TS0601"` | SILENT |
| 7 | **ZHA Device Handlers** | Quirks, cluster definitions | `./github/scripts/external-sources-scanner.js --source zha` | SILENT |
| 8 | **Blakadder** | Device DB cross-reference | `./github/scripts/internet-research-tool.js blakadder "TZE200"` | SILENT |
| 9 | **Domoticz** | Tuya device integrations | `./github/scripts/external-sources-scanner.js --source domoticz` | SILENT |
| 10 | **Hubitat** | Device drivers, DP patterns | `./github/scripts/external-sources-scanner.js --source hubitat` | SILENT |
| 11 | **packetninja fork** | Community patterns | `./github/scripts/scan-forks.js` | SILENT |
| 12 | **All known forks** | Cross-fork device support | `./github/scripts/scan-forks-recursive.js` | SILENT |
| 13 | **Tuya IoT Platform** | Official DP definitions | Web search | SILENT |
| 14 | **Antigravity Skills** | Investigation patterns, toolkits | `.ai/SKILL_REGISTRY.md` | PUBLIC |
| 15 | **Claude Code Local** | Investigation scripts, patterns | GitHub repo ref | PUBLIC |

### Source Access URLs

```javascript
const ALL_SOURCES = {
  // === HOMEY COMMUNITY ===
  forum_main: 'https://community.homey.app/t/140352',           // dlnraja thread (PUBLIC)
  forum_johan_26439: 'https://community.homey.app/t/26439',     // Johan thread (READ ONLY)
  forum_tuya_146735: 'https://community.homey.app/t/146735',    // Tuya thread (READ ONLY)
  forum_lasse_89271: 'https://community.homey.app/t/89271',     // Lasse thread (READ ONLY)
  
  // === GITHUB ===
  github_main: 'https://github.com/dlnraja/com.tuya.zigbee',
  github_issues: 'https://api.github.com/repos/dlnraja/com.tuya.zigbee/issues',
  github_upstream: 'https://github.com/JohanBendz/com.tuya.zigbee',
  github_upstream_issues: 'https://api.github.com/repos/JohanBendz/com.tuya.zigbee/issues',
  
  // === ZIGBEE DATABASES ===
  z2m_tuya_ts: 'https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts',
  z2m_devices: 'https://www.zigbee2mqtt.io/devices/',
  zha_handlers: 'https://github.com/zigpy/zha-device-handlers',
  blakadder: 'https://zigbee.blakadder.com/',
  
  // === DOMOTIC PROJECTS ===
  domoticz_tuya: 'https://www.domoticz.com/wiki/Tuya',
  hubitat_tuya: 'https://github.com/hubitat/Tuya-Community-Drivers',
  tasmota_tuya: 'https://tasmota.github.io/docs/Tuya/',
  esphome_tuya: 'https://esphome.io/components/tuya.html',
  
  // === OTHER FORKS ===
  packetninja: 'https://github.com/packetninja/com.tuya.zigbee',
  
  // === RESOURCES ===
  antigravity_skills: 'https://github.com/sickn33/antigravity-awesome-skills',
  claude_code_local: 'https://github.com/nicedreamzapp/claude-code-local'
};
```

---

## 5. SCRIPT CATALOG FOR INVESTIGATION (50+ Scripts)

### All Investigation Scripts in .github/scripts/

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🎯 PRIMARY INVESTIGATION SCRIPTS (Run FIRST)                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  internet-research-tool.js     — MAIN web search engine (DuckDuckGo)    │
│  github-scanner.js             — Scan ALL issues/PRs (open + closed)    │
│  fetch-gmail-diagnostics.js    — Extract diagnostic emails              │
│  forum-activity-scraper.js     — Scrape forum for new messages/images   │
│  scan-prs-issues.js            — Quick summary of all issues/PRs        │
│  cross-ref-intelligence.js     — Cross-reference Z2M/ZHA/Blakadder     │
│  external-sources-scanner.js   — All external domotic projects          │
│                                                                          │
│  🔬 DEEP INVESTIGATION SCRIPTS                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  intelligent-bug-detector.js   — AI-powered bug detection across code   │
│  bug-investigator.js           — Methodical bug investigation flow      │
│  bug-report-processor.js       — Process bug reports into actionable    │
│  pattern-detector.js           — Detect patterns across drivers         │
│  protocol-pattern-detector.js  — Detect Tuya protocol patterns          │
│  variant-scanner.js            — Scan manufacturerName variants         │
│  manufacturer-scraper.js       — Deep manufacturer research             │
│  screenshot-analyzer.js        — Extract text from forum images         │
│  issue-deep-researcher.js      — Deep research on single issue          │
│                                                                          │
│  📊 DIAGNOSTIC & CRASH SCRIPTS                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  diagnostic-auto-resolver.js   — Auto-map crash logs to fixes           │
│  diagnostic-auto-heal-radar.js — Fix radar sensor diagnostic           │
│  collect-diagnostics.js        — Collect all diagnostic reports         │
│  homey-device-diagnostics.js   — Homey device diagnostic tool           │
│  device-finder-collect.js      — Collect device info from diagnostics  │
│  device-finder-html.js         — Generate HTML device finder            │
│                                                                          │
│  🔄 SYNC & ENRICHMENT SCRIPTS                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  sync-johan-sdk3.js            — Sync upstream JohanBendz fixes         │
│  sync-external-sources.js      — Sync all external source data          │
│  auto-learn-fingerprints.js    — Auto-learn new FPs from forum/email    │
│  fp-research-engine.js         — Research new fingerprints in depth     │
│  fp-collision-check.js         — Check fingerprint collisions           │
│  fp-validator.js               — Validate fingerprint format            │
│  enforce-rules.js              — Enforce project rules                   │
│  enrichment-scanner.js         — Scan for enrichment opportunities      │
│  gather-intelligence.js        — Gather intelligence from all sources   │
│  implement-fork-fps.js         — Implement fingerprints from forks      │
│                                                                          │
│  🧪 VALIDATION & AUDIT SCRIPTS                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ai-helper.js                  — Multi-provider AI fallback chain       │
│  ai-ensemble.js                — AI ensemble analysis                   │
│  project-rules.js              — Condensed rules for AI prompts         │
│  deep-code-audit.js            — Deep code quality audit                │
│  driver-conflict-audit.js      — Audit driver conflicts                 │
│  misplaced-fp-detector.js      — Detect misplaced fingerprints          │
│  cross-driver-gap.js           — Find gaps between similar drivers      │
│  validate-drivers.js           — Validate all drivers                   │
│  deep-fork-integrator.js       — Integrate deep fork changes           │
│  full-fork-verifier.js         — Verify all fork data                  │
│                                                                          │
│  🤖 AUTO-RESPOND & FORUM SCRIPTS                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  forum-responder.js            — Auto-respond to forum topics           │
│  auto-respond-intelligent.js   — Intelligent auto-response             │
│  post-forum-update.js          — Post update to forum                   │
│  merge-last-posts.js           — Merge AI posts with last dlnraja post  │
│  thread-context.js             — Get full thread context                │
│  interview-recovery.js         — Recover interview data                 │
│  user-profile-detector.js      — Detect user profiles from messages     │
│                                                                          │
│  📝 DOCUMENTATION & GENERATION                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  auto-update-docs.js           — Auto-update documentation              │
│  update-architecture.js        — Update architecture docs               │
│  generate-readme.js            — Generate README                        │
│  generate-changelog.js         — Generate changelog                     │
│  generate-driver.js            — Generate new driver scaffold           │
│  generate-driver-images.js     — Generate driver images                 │
│  update-forum-first-post.js    — Update main forum post                 │
│  generate-user-expectations.js — Generate user expectation doc          │
│  update-post-1.js              — Update first forum post                │
│                                                                          │
│  🛠️ MAINTENANCE & OPTIMIZATION                                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  nightly-processor.js          — Nightly batch processor                │
│  monthly-comprehensive.js      — Monthly comprehensive scan             │
│  pipeline-health.js            — Check pipeline health                  │
│  count-stats.js                — Count project statistics               │
│  retry-helper.js               — Retry helper for scripts               │
│  retry-runner.js               — Retry runner for tasks                 │
│  translate-all.js              — Translate all locales                  │
│  translate-locales.js          — Translate specific locales             │
│  i18n-translator.js            — i18n translation tool                  │
│                                                                          │
│  ⚡ SPECIALIZED SCRIPTS                                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  scan-public-apis.js           — Scan public APIs for device info       │
│  scan-tuya-ecosystem.js        — Scan entire Tuya ecosystem             │
│  ota-checker.js                — Check OTA updates available            │
│  dp-learning-system.js         — Learn DP patterns from devices         │
│  adaptive-dp-detector.js       — Adaptive DP detection                  │
│  smart-device-lib.js           — Smart device library                   │
│  smart-device-processor.js     — Smart device processor                │
│  tuya-wifi-local-researcher.js — Research Tuya WiFi local              │
│  inject-ota-maintenance.js     — Inject OTA maintenance                │
│  github-deep-search.js         — Deep search GitHub                    │
│  github-issue-manager.js       — Manage GitHub issues                  │
│  handle-issue-comments.js      — Handle issue comments                 │
│  smart-pr-merge.js             — Smart PR merge automation             │
│  triage-issues.js              — Triage issues by category             │
│  triage-upstream-enhanced.js   — Enhanced upstream triage              │
│  batch-close-upstream.js       — Batch close upstream issues           │
│  bot-self-audit.js             — Self-audit bot behavior               │
│  cleanup-wrong-thread-posts.js — Cleanup wrong thread posts            │
│  delete-bot-posts.js           — Delete bot posts                      │
│  sanitize-forum.js             — Sanitize forum data                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Script Usage Quick Reference

```bash
# ============================================
# 1. INTERNET RESEARCH — PRIMARY ENGINE
# ============================================

# Web search
node .github/scripts/internet-research-tool.js search "TS0601 _TZE200_hl0ss9oa"

# GitHub issues (all states)
node .github/scripts/internet-research-tool.js gh-issues dlnraja/com.tuya.zigbee
node .github/scripts/internet-research-tool.js gh-prs dlnraja/com.tuya.zigbee

# Homey forum thread (with images)
node .github/scripts/internet-research-tool.js homeyforum 140352

# Blakadder device search
node .github/scripts/internet-research-tool.js blakadder "TZE200"

# Z2M converter search
node .github/scripts/internet-research-tool.js z2m "tuya thermostat"

# Fetch webpage as markdown
node .github/scripts/internet-research-tool.js fetch "https://zigbee.blakadder.com/device.html"

# Scan project files for term
node .github/scripts/internet-research-tool.js scan "switch_3gang"

# Extract all URLs from project
node .github/scripts/internet-research-tool.js urls

# Aggregated collect (forum + github + urls)
node .github/scripts/internet-research-tool.js collect

# ============================================
# 2. GITHUB SCANNER — FULL ISSUE/PR SCAN
# ============================================

# Scan all issues (open + closed)
node .github/scripts/github-scanner.js scan-issues --repo dlnraja/com.tuya.zigbee --state all
node .github/scripts/github-scanner.js scan-prs --repo dlnraja/com.tuya.zigbee --state all

# Triage and categorize
node .github/scripts/github-scanner.js triage --repo dlnraja/com.tuya.zigbee

# Scan upstream JohanBendz
node .github/scripts/scan-johan-full.js

# ============================================
# 3. DIAGNOSTIC EMAILS — CRASH LOG EXTRACTION
# ============================================

node .github/scripts/fetch-gmail-diagnostics.js --max 50
node .github/scripts/fetch-gmail-diagnostics.js --since 2026-05-01

# ============================================
# 4. FORUM ACTIVITY — LATEST POSTS + IMAGES
# ============================================

node .github/scripts/forum-activity-scraper.js --topic 140352
node .github/scripts/screenshot-analyzer.js --post-url "https://community.homey.app/t/140352/xxx"

# ============================================
# 5. CROSS-REFERENCE — INTELLIGENT MATCHING
# ============================================

node .github/scripts/cross-ref-intelligence.js --mfr "_TZ3000_abc123"
node .github/scripts/cross-ref-intelligence.js --pid "TS0001"
node .github/scripts/external-sources-scanner.js --all

# ============================================
# 6. FINGERPRINT LEARNING & VALIDATION
# ============================================

node .github/scripts/auto-learn-fingerprints.js --source forum
node .github/scripts/auto-learn-fingerprints.js --source email
node .github/scripts/fp-research-engine.js --mfr "_TZE200_xxx" --pid "TS0601"

# ============================================
# 7. VARIANT SCANNER — DEEP VARIANT ANALYSIS
# ============================================

node .github/scripts/variant-scanner.js --mfr "_TZ3000_abc123"
node .github/scripts/manufacturer-scraper.js --mfr "_TZE200_"

# ============================================
# 8. BUG DETECTION — INTELLIGENT BUG HUNTING
# ============================================

node .github/scripts/intelligent-bug-detector.js --scope drivers
node .github/scripts/bug-investigator.js --issue 318
node .github/scripts/pattern-detector.js --target "backlight"
node .github/scripts/protocol-pattern-detector.js --mfr "_TZE200_"

# ============================================
# 9. ISSUE DEEP RESEARCH — SINGLE ISSUE DIVE
# ============================================

node .github/scripts/issue-deep-researcher.js --issue 318
node .github/scripts/issue-deep-researcher.js --issue 318 --include-closed

# ============================================
# 10. FORK SYNC — GET FINGERPRINTS FROM FORKS
# ============================================

node .github/scripts/scan-forks.js
node .github/scripts/scan-forks-recursive.js
node .github/scripts/implement-fork-fps.js

# ============================================
# 11. NORMALIZATION — SELF-HEAL ENGINE
# ============================================

node scripts/maintenance/master-self-heal.js --dry-run
node scripts/maintenance/master-self-heal.js --apply

# ============================================
# 12. AUTO-FIX — COMMON BUG FIXES
# ============================================

node scripts/automation/fix-crashers.js
node scripts/automation/update-docs.js

# ============================================
# 13. VALIDATION — FINAL QUALITY CHECK
# ============================================

node scripts/PRE_COMMIT_CHECKS.js
node scripts/validation/comprehensive-recursive-validator.js
npx homey app validate --level publish
```

---

## 6. CROSS-REFERENCE PATTERNS

### manufacturerName × productId Matrix (CRITICAL)

```javascript
// ============================================
// CRITICAL RULE: One manufacturerName → MANY productIds (NORMAL)
// ============================================

const crossReferencePatterns = {
  // ✅ NORMAL: Same mfr, different productIds in different drivers
  normal_example_1: {
    mfr: "_TZ3000_abc123",
    devices: [
      { pid: "TS0001", driver: "switch_1gang", power: "mains" },
      { pid: "TS0002", driver: "switch_2gang", power: "mains" },
      { pid: "TS0003", driver: "switch_3gang", power: "mains" },
      { pid: "TS0043", driver: "button_wireless_3", power: "kinetic" },
      { pid: "TS011F", driver: "plug_smart", power: "mains" }
    ]
  },

  // ✅ NORMAL: Same productId, different mfrs (TS0601 is generic)
  normal_example_2: {
    pid: "TS0601",
    devices: [
      { mfr: "_TZE200_xxx", driver: "climate_sensor" },
      { mfr: "_TZE200_yyy", driver: "soil_sensor" },
      { mfr: "_TZE200_zzz", driver: "device_radiator_valve" },
      { mfr: "_TZE204_aaa", driver: "presence_sensor_radar" },
      { mfr: "_TZE284_bbb", driver: "switch_4gang" }
    ]
  },

  // ❌ CONFLICT: Same mfr + same pid in incompatible drivers
  conflict_example: {
    mfr: "_TZ3000_abc123",
    pid: "TS0001",
    bad: { driver1: "switch_1gang", driver2: "switch_2gang" },
    resolution: "REMOVE from switch_2gang, KEEP in switch_1gang"
  }
};
```

### Variant Intelligence Methodology

```javascript
// ============================================
// VARIANT INTELLIGENCE — FULL METHODOLOGY
// ============================================

async function investigateVariant(manufacturerName, productId) {
  const results = {};
  
  // STEP 1: Search ALL drivers for this manufacturerName
  results.drivers_with_mfr = await searchAllDrivers({
    type: "manufacturerName",
    value: manufacturerName
  });
  
  // STEP 2: Search ALL productIds for this manufacturerName
  results.all_product_ids = await searchProductIds({
    mfr: manufacturerName
  });
  
  // STEP 3: Cross-reference with Z2M
  results.z2m_config = await fetchZ2MConfig(manufacturerName, productId);
  
  // STEP 4: Cross-reference with ZHA
  results.zha_config = await fetchZHAConfig(manufacturerName, productId);
  
  // STEP 5: Cross-reference with Blakadder
  results.blakadder = await fetchBlakadderPage(manufacturerName, productId);
  
  // STEP 6: Identify power source (battery/mains/kinetic/USB)
  results.power_source = await detectPowerSource({
    z2m: results.z2m_config,
    zha: results.zha_config,
    pid: productId,
    mfr: manufacturerName
  });
  
  // STEP 7: Identify protocol type
  results.protocol = await detectProtocol({
    mfr: manufacturerName,
    pid: productId,
    z2m: results.z2m_config
  });
  
  // STEP 8: Check for custom clusters
  results.custom_clusters = await detectCustomClusters({
    mfr: manufacturerName,
    pid: productId,
    z2m: results.z2m_config
  });
  
  // STEP 9: Map DP definitions
  results.dp_mappings = await mapDPDefinitions(
    results.z2m_config,
    manufacturerName,
    productId
  );
  
  // STEP 10: Recommend driver
  results.recommended_driver = await recommendDriver({
    mfr: manufacturerName,
    pid: productId,
    power: results.power_source,
    protocol: results.protocol,
    existing: results.drivers_with_mfr.drivers,
    dp_mappings: results.dp_mappings
  });
  
  return results;
}
```

### Power Source Detection Priority

```javascript
// ============================================
// POWER SOURCE DETECTION — 6-Step Priority
// ============================================

const POWER_SOURCES = {
  // 1. ZCL genPowerCfg (cluster 0x0001)
  zcl_power: "batteryPercentageRemaining ÷ 2 → measure_battery",
  
  // 2. Tuya DP (DP 4,10,14,15,21,100-105)
  tuya_dp_power: "direct percentage → measure_battery",
  
  // 3. IAS Zone Status bit 3
  ias_zone: "low-battery boolean → alarm_battery",
  
  // 4. Voltage DPs (DP 33,35,247)
  voltage_dp: "voltage-to-percent curve → measure_battery",
  
  // 5. mainsPowered getter → REMOVE all battery capabilities
  mains: "mainsPowered() { return true; } → no battery",
  
  // 6. Kinetic detection (TS004x without batteries) → REMOVE all
  kinetic: "TS0041-TS0046 + no battery reports → no battery"
};

// POWER SOURCE VARIES PER VARIANT — NEVER ASSUME!
const power_variants_example = {
  "_TZ3000_abc + TS0041": "kinetic (no battery)",
  "_TZ3000_abc + TS0042": "kinetic (no battery)",
  "_TZE200_def + TS0601": "battery soil sensor (measure_battery)",
  "_TZE200_ghi + TS0601": "USB air quality (mainsPowered=true)",
  "_TZE200_jkl + TS0601": "mains wall switch (no battery)"
};
```

---

## 7. INVESTIGATION FLOWS PER BUG TYPE

### Type A: "Unknown Device" / "Not Pairing"

```
┌──────────────────────────────────────────────────────────────────────────┐
│  INVESTIGATION FLOW: Unknown Device                                      │
│                                                                          │
│  1. Get manufacturerName + productId from user report                    │
│                                                                          │
│  2. Search ALL drivers for this manufacturerName:                        │
│     node .github/scripts/internet-research-tool.js scan "_TZ3000_xxx"   │
│                                                                          │
│  3. Check each driver.productId list:                                    │
│     - If mfr found but pid NOT in list → ADD fingerprint to existing     │
│     - If mfr NOT found anywhere → may need new driver                    │
│     - If mfr + pid found in incompatible driver → MOVING needed         │
│                                                                          │
│  4. Cross-reference Z2M/ZHA/Blakadder:                                   │
│     node .github/scripts/cross-ref-intelligence.js --mfr "_TZ3000_xxx"  │
│                                                                          │
│  5. Check DP mappings from Z2M:                                          │
│     - Identify which DPs the device uses                                 │
│     - Map to Homey capabilities                                          │
│                                                                          │
│  6. Identify protocol (ZCL/TuyaDP/Hybrid/Custom):                        │
│     - TS0001-TS0504 = ZCL (standard clusters)                           │
│     - TS0601 = Tuya DP (0xEF00 manager needed)                          │
│     - Some have BOTH (hybrid)                                            │
│                                                                          │
│  7. Identify power source:                                                │
│     - Battery → measure_battery OR alarm_battery (not both)              │
│     - Mains → removeCapability('measure_battery')                        │
│     - Kinetic → no battery capability at all                             │
│                                                                          │
│  8. Implement:                                                            │
│     - Add to driver.compose.json fingerprint                             │
│     - Add DP mappings if TuyaDP                                         │
│     - Add flow cards if physical buttons                                │
│     - Set battery handling                                                │
│                                                                          │
│  9. Validate:                                                             │
│     npx homey app validate --level publish                               │
│     node scripts/PRE_COMMIT_CHECKS.js                                    │
│     node scripts/validation/comprehensive-recursive-validator.js         │
│                                                                          │
│ 10. Enrich:                                                               │
│     Update PROJECT_INDEX.md, FINGERPRINT-CROSSREF.md, CHANGELOG.md      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Type B: "Wrong Values" (e.g., temp 0.2°C instead of 20.6°C)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  INVESTIGATION FLOW: Wrong Sensor Values                                 │
│                                                                          │
│  1. Identify the DOUBLE-DIVISION BUG (most common):                      │
│     Symptom: temp * 0.1 or 0.01 of expected value                       │
│     Root Cause: AdaptiveDataParser auto-converts (/100 or /10),          │
│     THEN dpMappings divisor divides AGAIN                                │
│     Fix: TuyaEF00Manager.js skips auto-convert when divisor !== 1        │
│                                                                          │
│  2. Check ProductValueValidator.js ranges:                               │
│     Symptom: validator REJECTING valid values (e.g., CO2 warmup=0)      │
│     Fix: Update min/max ranges in validator                              │
│                                                                          │
│  3. Check for backlight wrong type:                                      │
│     Symptom: backlight not working                                       │
│     Fix: MUST use strings ("off", "normal", "inverted"), NOT numbers     │
│                                                                          │
│  4. Check for false battery alerts:                                      │
│     Symptom: mains device showing low battery                            │
│     Fix: mainsPowered() { return true; } + removeCapability              │
│                                                                          │
│  5. Check SanityFilter (L11):                                            │
│     Symptom: erratic spikes filtered or not                              │
│     Check: EMA + ROC algorithm in SanityFilter.js                        │
│                                                                          │
│  6. Cross-reference Z2M for correct divisor:                             │
│     Z2M often has correct divisor values for each DP                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Type C: "Physical Button Not Detected"

```
┌──────────────────────────────────────────────────────────────────────────┐
│  INVESTIGATION FLOW: Physical Button Detection Failure                   │
│                                                                          │
│  1. Check appCommandPending pattern (MANDATORY):                         │
│     - _appCommandPending flag MUST be set                                │
│     - 2000ms timeout window MUST exist                                   │
│     - isPhysical = reportingEvent && !_appCommandPending                  │
│                                                                          │
│  2. Check mixin order:                                                    │
│     class Device extends PhysicalButtonMixin(VirtualButtonMixin(...))    │
│                                                                          │
│  3. Check flow card IDs match EXACTLY:                                   │
│     Pattern: {driver}_physical_gang{N}_{on|off}                          │
│     Example: switch_2gang_physical_gang1_on                              │
│                                                                          │
│  4. Check binding (BSEED ZCL-only):                                      │
│     - requiresExplicitBinding = true for BSEED                           │
│     - OnOffBoundCluster must be bound per EP                             │
│                                                                          │
│  5. Check perEndpointControl (multi-gang):                                │
│     - markAppCommandAll() for firmware broadcast                         │
│     - _lastCommandedGang + 2s broadcast filter                           │
│                                                                          │
│  6. Check deduplication:                                                  │
│     Same capability+value within 500ms → SKIP                            │
│                                                                          │
│  7. NO titleFormatted with [[device]]:                                   │
│     Causes manual device selection bug in flow cards                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Type D: "App Crashes On Boot"

```
┌──────────────────────────────────────────────────────────────────────────┐
│  INVESTIGATION FLOW: Crash on Boot                                       │
│                                                                          │
│  1. Check diagnostic log (if available):                                 │
│     node .github/scripts/fetch-gmail-diagnostics.js --max 50            │
│     Look for "54888ee1-xxxx" pattern in diagnostics/                     │
│                                                                          │
│  2. Common crash causes (95% of cases):                                  │
│     a) MODULE_NOT_FOUND → file excluded by .homeyignore                 │
│        → Wrap require() in try/catch (defensive import)                  │
│        → Add to .homeyignore exception if needed                         │
│     b) Syntax error → node -c on file                                   │
│     c) getTriggerCard deprecated → use getDeviceTriggerCard             │
│     d) Manager globals → use this.homey.<managerId>                     │
│     e) setCapabilityValue not defined → check 'this' context            │
│                                                                          │
│  3. Fix the crash:                                                        │
│     → Safe require pattern (try/catch around imports)                    │
│     → Replace deprecated API calls                                       │
│     → Fix async/sync init (must be async onNodeInit)                     │
│                                                                          │
│  4. Validate fix:                                                         │
│     node -c on all modified files                                        │
│     npx homey app validate --level publish                               │
│     node scripts/PRE_COMMIT_CHECKS.js                                    │
│                                                                          │
│  5. Document fix:                                                         │
│     Add to docs/rules/CRITICAL_MISTAKES.md                                │
│     Add to PROJECT_INDEX.md Crash Resolutions History                    │
│     Update .homeychangelog.json                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Type E: "Flow Cards Not Working"

```
┌──────────────────────────────────────────────────────────────────────────┐
│  INVESTIGATION FLOW: Flow Cards Not Triggering                           │
│                                                                          │
│  1. Check driver.flow.compose.json ID format:                            │
│     ✓ Pattern: {driver}_physical_gang{N}_{on|off}                        │
│     ✗ NO titleFormatted with [[device]]                                  │
│     ✗ NO getTriggerCard (use getDeviceTriggerCard)                       │
│                                                                          │
│  2. Check device.js trigger code:                                         │
│     this.homey.flow.getDeviceTriggerCard(flowId).trigger(this, {}, {})   │
│                                                                          │
│  3. Check sub-capability routing:                                         │
│     Virtual buttons MUST use this._safeSetCapability()                   │
│     NOT native setCapabilityValue (bypasses flow routing)                │
│                                                                          │
│  4. Check flow IDs in driver.js:                                          │
│     this.homey.flow.getDeviceTriggerCard('{driver}_physical_gang1_on')   │
│                                                                          │
│  5. Cross-check with existing working flows:                              │
│     Compare with switch_1gang/driver.flow.compose.json                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Type F: "Battery Issues"

```
┌──────────────────────────────────────────────────────────────────────────┐
│  INVESTIGATION FLOW: Battery Issues                                      │
│                                                                          │
│  1. NEVER combine measure_battery + alarm_battery in same device         │
│      → SDK v3 violation!                                                 │
│                                                                          │
│  2. Check UnifiedBatteryHandler detection order:                         │
│     1) ZCL genPowerCfg → % (div by 2)                                   │
│     2) Tuya DP (4,10,14,15,21,100-105) → direct %                       │
│     3) IAS Zone bit 3 → boolean low battery                              │
│     4) Voltage DP (33,35,247) → voltage-to-percent curve                 │
│     5) mainsPowered getter → REMOVE all battery                          │
│     6) Kinetic detection → REMOVE all battery                            │
│                                                                          │
│  3. Check mainsPowered getter for mains sensors:                         │
│     get mainsPowered() { return true; }                                  │
│     onNodeInit: await this.removeCapability('measure_battery')           │
│                                                                          │
│  4. Check voltage curves (not linear!):                                  │
│     CR2032 → specific curve from Z2M profiles                            │
│     2xAA → different curve                                               │
│     Li-ion → different curve                                              │
│     AA → different curve                                                 │
│                                                                          │
│  5. Check batteryPercentageRemaining===0 is VALID:                       │
│     Do NOT reject 0 (device is dead but that's accurate)                 │
│                                                                          │
│  6. Check sleepy devices:                                                 │
│     First report may take up to 24h after pairing                       │
│     This is NOT a bug                                                    │
│                                                                          │
│  7. Store-based restore:                                                  │
│     Persist battery on every update                                      │
│     Restore on init if null                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 8. FORUM & GITHUB INVESTIGATION PROTOCOL

### Forum Investigation (T140352)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  FORUM INVESTIGATION PROTOCOL                                           │
│                                                                          │
│  1. FETCH LATEST POSTS:                                                  │
│     node .github/scripts/internet-research-tool.js homeyforum 140352    │
│     node .github/scripts/forum-activity-scraper.js --topic 140352       │
│                                                                          │
│  2. EXTRACT DIAGNOSTIC IDs:                                              │
│     Look for: [54888ee1-xxxx], diagnostic, crash                        │
│     Parse: manufacturerName + productId from text                       │
│                                                                          │
│  3. EXTRACT IMAGES (screenshots, device photos):                        │
│     node .github/scripts/screenshot-analyzer.js --post-url <url>        │
│     Images may contain:                                                  │
│     - Device photos showing model numbers                                │
│     - Cluster information from Zigbee dongles                            │
│     - Error messages from Homey UI                                      │
│                                                                          │
│  4. CROSS-REFERENCE WITH GITHUB:                                         │
│     Check if same issue exists in github-scanner results                │
│     Check if fix already implemented in current code                    │
│     node .github/scripts/issue-deep-researcher.js --source forum        │
│                                                                          │
│  5. CROSS-REFERENCE WITH EMAIL DIAGNOSTICS:                              │
│     node .github/scripts/fetch-gmail-diagnostics.js --since 2026-05-01  │
│     Match diagnostic IDs from forum with email receipts                 │
│                                                                          │
│  6. IMPLEMENT SILENTLY:                                                  │
│     NEVER mention forum source in commits/changelogs                    │
│     Use generic wording: "improved device support"                      │
│                                                                          │
│  7. UPDATE DOCUMENTATION:                                                │
│     Add to PROJECT_INDEX.md device list                                 │
│     Reference in FINGERPRINT-CROSSREF.md if new cross-ref               │
│                                                                          │
│  8. FORUM RESPONSE (if needed):                                          │
│     Merge with last dlnraja post (edit, not new reply)                  │
│     Only post on T140352                                                  │
│     NEVER post on T26439 (Johan), T146735 (Tuya)                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### GitHub Issues/PRs Investigation (Open AND Closed)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  GITHUB ISSUES/PRs INVESTIGATION PROTOCOL                                │
│                                                                          │
│  1. SCAN OPEN ISSUES:                                                    │
│     node .github/scripts/github-scanner.js scan-issues --state open     │
│     Categorize: missing-fingerprint | bug | feature | question          │
│     Priority: high (crash) > medium (feature broken) > low (enhancement)│
│                                                                          │
│  2. SCAN CLOSED ISSUES (MANDATORY):                                      │
│     node .github/scripts/github-scanner.js scan-issues --state closed   │
│     WHY: Closed issues may contain:                                      │
│     - Device manuals / screenshots / user photos                        │
│     - DP mappings discovered during debugging                            │
│     - Workarounds that need proper implementation                        │
│     - Updates in comments (user may report same device still broken)    │
│                                                                          │
│  3. SCAN ALL PRs:                                                        │
│     node .github/scripts/github-scanner.js scan-prs --state all         │
│     Check for:                                                           │
│     - WIP implementations that were abandoned                            │
│     - Community contributions with useful patterns                       │
│     - Failed attempts that reveal edge cases                            │
│                                                                          │
│  4. SCAN UPSTREAM (JohanBendz):                                          │
│     node .github/scripts/scan-johan-full.js                             │
│     Check for fixes already implemented upstream                         │
│     Cherry-pick relevant fixes (with generic commit message)            │
│                                                                          │
│  5. SCAN ALL FORKS:                                                      │
│     node .github/scripts/scan-forks.js                                   │
│     node .github/scripts/scan-forks-recursive.js                        │
│     Look for new fingerprints, DP mappings, fixes                       │
│                                                                          │
│  6. DEEP RESEARCH ON SPECIFIC ISSUE:                                     │
│     node .github/scripts/issue-deep-researcher.js --issue 318           │
│     This script will:                                                    │
│     - Fetch issue + all comments + linked PRs                            │
│     - Search codebase for relevant files                                │
│     - Cross-reference Z2M/ZHA/Blakadder                                 │
│     - Generate implementation suggestion                                │
│                                                                          │
│  7. IMPLEMENT FIX:                                                       │
│     Follow Investigation Flows (section 7) based on bug type            │
│     Follow CRITICAL_MISTAKES rules (section 12)                         │
│                                                                          │
│  8. AUTO-CLOSE ISSUE:                                                    │
│     After fix is pushed, close with resolution summary                  │
│     Format: "Fixed in vX.Y.ZZZ: {description}"                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 9. DIAGNOSTICS & EMAIL INVESTIGATION PROTOCOL

### Email Diagnostic Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│  EMAIL DIAGNOSTIC EXTRACTION & INVESTIGATION                            │
│                                                                          │
│  1. FETCH RECENT EMAILS:                                                 │
│     node .github/scripts/fetch-gmail-diagnostics.js --max 50            │
│     node .github/scripts/fetch-gmail-diagnostics.js --since <date>      │
│                                                                          │
│  2. PARSE DIAGNOSTIC LOGS:                                               │
│     Extract: diagnostic ID (e.g., 54888ee1-xxxx)                        │
│     Parse: device info from logs                                        │
│     Find: manufacturerName + productId                                  │
│                                                                          │
│  3. AUTO-RESOLVE DIAGNOSTIC:                                             │
│     node .github/scripts/diagnostic-auto-resolver.js                    │
│     Maps crash logs to codebase fixes via AI                            │
│                                                                          │
│  4. CROSS-REFERENCE CRASH:                                               │
│     Search diagnostics/ folder for existing logs                        │
│     Compare with known crashes in PROJECT_INDEX.md section 22           │
│     Check CRITICAL_MISTAKES.md for known patterns                       │
│                                                                          │
│  5. IMPLEMENT FIX:                                                       │
│     Fix crash root cause in relevant driver/base class                  │
│     Add fingerprint if missing                                          │
│     Test with diagnostic log replay                                     │
│                                                                          │
│  6. VERIFY FIX:                                                          │
│     Re-run diagnostic-auto-resolver.js                                   │
│     Confirm no recurrence                                                │
│                                                                          │
│  7. DOCUMENT:                                                             │
│     Add to PROJECT_INDEX.md Crash Resolutions History                    │
│     Add to diagnostics/README.md if new crash type                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Diagnostic ID Investigation Template

```javascript
// ============================================
// DIAGNOSTIC INVESTIGATION — COMPLETE TEMPLATE
// ============================================

async function investigateDiagnostic(diagnosticId) {
  // 1. Find diagnostic report
  const report = await findDiagnosticReport(diagnosticId);
  if (!report) {
    console.log(`❌ Diagnostic ${diagnosticId} not found locally`);
    // Try fetching from email
    const emails = await fetchGmailDiagnostics({ max: 50 });
    console.log(`✅ Found ${emails.length} emails to scan`);
    return null;
  }
  
  // 2. Parse device info from log
  const deviceInfo = parseDeviceInfoFromLog(report);
  const { manufacturerName, productId, modelId } = deviceInfo;
  
  // 3. Identify crash root cause
  const crashAnalysis = analyzeCrashLog(report);
  const { errorType, stackTrace, crashLine } = crashAnalysis;
  
  // 4. Check CRITICAL_MISTAKES.md for known patterns
  const knownMistakes = checkKnownMistakes(errorType);
  
  // 5. Cross-reference with codebase
  const relatedFiles = searchCodebase({
    terms: [errorType, ...extractClassesFromStack(stackTrace)],
    exclude: ['node_modules', 'tmp', '.git']
  });
  
  // 6. Check if same crash in multiple reports
  const similarCrashes = findSimilarCrashes(errorType);
  
  // 7. Implement fix
  const fix = generateFix({
    crashAnalysis,
    relatedFiles,
    deviceInfo,
    knownMistakes
  });
  
  // 8. Create prevention script if new bug pattern
  const newPattern = isNewBugPattern(errorType);
  if (newPattern) {
    await createPreventionScript({
      pattern: errorType,
      rootCause: crashAnalysis.rootCause,
      checkFiles: relatedFiles
    });
  }
  
  // 9. Return complete investigation report
  return {
    diagnosticId,
    deviceInfo: { manufacturerName, productId, modelId },
    crashAnalysis: {
      errorType,
      stackTrace: stackTrace.slice(0, 10), // First 10 lines
      crashLine
    },
    relatedFiles,
    similarCrashes: similarCrashes.length,
    knownMistakes: knownMistakes.length > 0,
    fix,
    createNewScript: newPattern,
    verificationSteps: [
      'node -c on modified files',
      'npx homey app validate --level publish',
      'node scripts/PRE_COMMIT_CHECKS.js',
      'Update diagnostics/README.md'
    ]
  };
}
```

---

## 10. Z2M / ZHA / BLAKADDER / DOMOTICZ CROSS-REFERENCE PROTOCOL

### Z2M (Zigbee2MQTT) Investigation

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Z2M CROSS-REFERENCE PROTOCOL                                           │
│                                                                          │
│  1. SEARCH Z2M TUYA CONVERTERS:                                          │
│     node .github/scripts/internet-research-tool.js z2m "TS0601"         │
│                                                                          │
│  2. FETCH Z2M DEVICE PAGE:                                               │
│     node .github/scripts/internet-research-tool.js fetch                │
│       "https://www.zigbee2mqtt.io/devices/TS0601.html"                  │
│                                                                          │
│  3. EXTRACT DEVICE DEFINITION FROM tuya.ts:                              │
│     const z2mConfig = {                                                  │
│       vendor: "Tuya",                                                    │
│       model: "TS0601",                                                   │
│       description: "Device description",                                │
│       exposes: [                                                         │
│         { type: "switch", name: "state", endpoint: 1 },                 │
│         { type: "numeric", name: "temperature", unit: "°C", /100 }     │
│       ],                                                                 │
│       fromZigbee: ["tuya_on_off", "tuya_temperature"],                  │
│       toZigbee: ["tuya_on_off", "tuya_temperature"]                     │
│     };                                                                   │
│                                                                          │
│  4. MAP EXPOSES → HOMEY CAPABILITIES:                                    │
│     switch → onoff                                                      │
│     numeric/temperature → measure_temperature (÷ 10 or ÷ 100)          │
│     numeric/humidity → measure_humidity (÷ 10)                         │
│     numeric/co2 → measure_co2                                           │
│     numeric/pm25 → measure_pm25                                         │
│     enum → alarm_contact or specific enum                               │
│                                                                          │
│  5. CHECK TOZIGBEE CONVERTERS FOR DP MAPPINGS:                           │
│     tuya_on_off → DP1 (bool)                                            │
│     tuya_temperature → DP18 (value, /10)                                │
│     tuya_humidity → DP19 (value, /10)                                   │
│                                                                          │
│  6. IDENTIFY POWER SOURCE FROM Z2M:                                      │
│     Check device definition for: "battery", "power", "mainsPowered"     │
│                                                                          │
│  7. CHECK Z2M ISSUES FOR SPECIFIC DEVICE:                                │
│     node .github/scripts/internet-research-tool.js search               │
│       "site:github.com/Koenkk/zigbee2mqtt/issues _TZE200_xxx"           │
│     May find: quirks, bug reports, DP corrections                       │
└──────────────────────────────────────────────────────────────────────────┘
```

### ZHA (Zigbee Home Automation) Investigation

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ZHA CROSS-REFERENCE PROTOCOL                                           │
│                                                                          │
│  1. SEARCH ZHA DEVICE HANDLERS:                                          │
│     node .github/scripts/internet-research-tool.js search               │
│       "site:github.com/zigpy/zha-device-handlers _TZE200"              │
│                                                                          │
│  2. FETCH ZHA QUIRK IF EXISTS:                                           │
│     Check for QUIRK_CLASS in tuya/init.py or specific files             │
│     Extract:                                                             │
│     - signature (manufacturerName, model)                                │
│     - replacement (clusters to modify)                                  │
│     - dp_mapping (DP → attribute)                                       │
│                                                                          │
│  3. MAP TO HOMEY CAPABILITIES:                                           │
│     ZHA cluster + attribute → Homey capability                          │
│     Check if clusters already supported in our code                     │
│                                                                          │
│  4. CHECK ZHA ISSUES FOR DEVICE:                                         │
│     node .github/scripts/internet-research-tool.js search               │
│       "site:github.com/zigpy/zha-device-handlers/issues _TZE200_xxx"   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Blakadder Investigation

```
┌──────────────────────────────────────────────────────────────────────────┐
│  BLAKADDER CROSS-REFERENCE PROTOCOL                                     │
│                                                                          │
│  1. SEARCH BLAKADDER:                                                    │
│     node .github/scripts/internet-research-tool.js blakadder "tuya"     │
│                                                                          │
│  2. FETCH SPECIFIC DEVICE PAGE:                                          │
│     node .github/scripts/internet-research-tool.js fetch                │
│       "https://zigbee.blakadder.com/your_device.html"                   │
│                                                                          │
│  3. EXTRACT DEVICE INFO:                                                 │
│     - Vendor                                                             │
│     - Model                                                              │
│     - Description                                                        │
│     - Supported clusters (ZCL)                                           │
│     - Battery indicator                                                  │
│     - Link to product page                                               │
│                                                                          │
│  4. CROSS-REFERENCE EXISTING DRIVERS:                                    │
│     Compare clusters with our device.js implementation                  │
│     Check if we're missing cluster support                              │
└──────────────────────────────────────────────────────────────────────────┘
```

### Domoticz / Hubitat / Tasmota / ESPHome Investigation

```
┌──────────────────────────────────────────────────────────────────────────┐
│  OTHER DOMOTIC PROJECTS PROTOCOL                                        │
│                                                                          │
│  1. SCAN ALL DOMOTIC SOURCES:                                            │
│     node .github/scripts/external-sources-scanner.js --all              │
│     node .github/scripts/scan-tuya-ecosystem.js                         │
│                                                                          │
│  2. FOR EACH SOURCE, CHECK:                                              │
│     - Tuya TuyaMCU / TuyaSerial converter patterns                      │
│     - Known quirks and workarounds                                      │
│     - DP mapping tables                                                 │
│     - Voltage curve tables for batteries                                │
│                                                                          │
│  3. SPECIFIC SOURCES:                                                    │
│     Domoticz: https://www.domoticz.com/wiki/Tuya                        │
│     Hubitat: github.com/hubitat/Tuya-Community-Drivers                  │
│     Tasmota: https://tasmota.github.io/docs/Tuya/                       │
│     ESPHome: https://esphome.io/components/tuya.html                   │
│                                                                          │
│  4. IMPLEMENT PATTERNS SILENTLY:                                         │
│     NEVER mention these sources in commits/changelogs                    │
│     Use generic wording for implementation                              │
└──────────────────────────────────────────────────────────────────────────┘
```

### External Sources Scanner Script

```bash
# Scan all external sources in one go:
node .github/scripts/external-sources-scanner.js --all

# Or specific sources:
node .github/scripts/external-sources-scanner.js --source z2m
node .github/scripts/external-sources-scanner.js --source zha
node .github/scripts/external-sources-scanner.js --source blakadder
node .github/scripts/external-sources-scanner.js --source domoticz
node .github/scripts/external-sources-scanner.js --source hubitat
node .github/scripts/external-sources-scanner.js --source tasmota
node .github/scripts/external-sources-scanner.js --source esphome
```

---

## 11. ANTIGRAVITY SKILLS & CLAUDE CODE LOCAL INTEGRATION

### Antigravity Awesome Skills

> **Source**: `https://github.com/sickn33/antigravity-awesome-skills`
> **Registry**: `.ai/SKILL_REGISTRY.md`

This project contains and is inspired by the Antigravity Awesome Skills ecosystem.
When investigating, ALWAYS check if an existing Antigravity skill can help:

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| **`@bug-hunter`** | Systematic bug finding from symptom to root cause | Every bug investigation |
| **`@logic-lens`** | Deep code review using formal logic | Verify fix anti-patterns |
| **`@codebase-audit-pre-push`** | Production readiness audit | Before commit |
| **`@performance-optimizer`** | Performance bottleneck identification | Slow devices, wrong values |
| **`@squirrel`** | Full-cycle AI coding pattern | New driver implementation |
| **`@technical-change-tracker`** | Track changes with JSON records | Documentation investigation |
| **`@agenttrace-session-audit`** | Session cost/latency analysis | Optimize investigation flow |
| **`@api-endpoint-builder`** | Production-ready REST API endpoints | API investigation |
| **`@k6-load-testing`** | Comprehensive load testing | Performance testing |
| **`@lambdatest-agent-skills`** | Test automation for 46 frameworks | Test verification |
| **`@gdb-cli`** | GDB debugging assistant | Zigbee crash analysis |
| **`@mock-hunter`** | Audit web pages for mock data | Forum page analysis |
| **`@python-pptx-generator`** | Generate PowerPoint decks | Report generation |
| **`@jq`** | Expert JSON querying | JSON data analysis |
| **`@global-chat-agent-discovery`** | Discover 18K+ MCP servers | External tool discovery |
| **`@skill-check`** | Validate skills against specification | Skill integrity |
| **`@rayden-code`** | React code generation | UI investigation |
| **`@tmux`** | Terminal multiplexing | Multi-terminal investigation |
| **`@brooks-lint`** | Code reviewer for design smells | Architecture review |

### Claude Code Local Integration

> **Source**: `https://github.com/nicedreamzapp/claude-code-local`

This project leverages patterns from Claude Code Local for investigation:

```javascript
// Claude Code Local investigation patterns:
const CLAUDE_CODE_LOCAL_PATTERNS = {
  investigation: {
    repo: 'https://github.com/nicedreamzapp/claude-code-local',
    scripts: {
      investigate: '.github/scripts/investigate.js',
      fingerprintLookup: '.github/scripts/fingerprint-lookup.js',
      variantAnalysis: '.github/scripts/variant-analysis.js'
    }
  },
  
  // Patterns to adopt:
  patterns: {
    step_by_step: "Break investigation into atomic steps",
    source_tracking: "Always track where info came from",
    diff_based_fix: "Generate minimal diff for the fix",
    cross_ref_chain: "Chain cross-references for reliability"
  }
};
```

### Loading Antigravity Skills

```javascript
// Method 1: Direct skill activation (if skill tool available)
await use_skill({ skill_name: 'bug-hunter' });
await use_skill({ skill_name: 'logic-lens' });
await use_skill({ skill_name: 'codebase-audit-pre-push' });

// Method 2: Read skill documentation
// Read .agents/skills/<skill-name>/SKILL.md
// Clone repo: git clone https://github.com/sickn33/antigravity-awesome-skills

// Method 3: Reference local Claude Code scripts
// Read .github/scripts/ from claude-code-local repo
```

### Project-Specific Skills (local .agents/skills/)

```bash
# List available project-specific skills:
ls -la .agents/skills/

# Each skill contains:
# - SKILL.md — Skill documentation
# - templates/ — Templates for the skill
# - examples/ — Example usage
```

---

## 12. CRITICAL MISTAKES REFERENCE

> **Full reference**: `docs/rules/CRITICAL_MISTAKES.md`
> These are the most common bugs that must NEVER be repeated:

### A. Settings Keys (ALWAYS exact)
```javascript
// ✅ CORRECT:
this.settings.get('zb_model_id')
this.settings.get('zb_manufacturer_name')

// ❌ WRONG (causes silent failures):
this.settings.get('zb_modelId')
this.settings.get('zb_manufacturerName')
```

### B. Backlight Values (Strings Only)
```javascript
// ✅ CORRECT (strings):
"off", "normal", "inverted"

// ❌ WRONG (numeric — Layer 11 violation):
0, 1, 2

// ✅ Ternary mapping:
const lightMode = backlightMode === 'normal' ? 1 : 2;
```

### C. Flow Card IDs (Exact Pattern)
```javascript
// ✅ CORRECT:
"{driver}_physical_gang{N}_{on|off}"
// Example: "switch_2gang_physical_gang1_on"

// ❌ WRONG (NO [[device]] in titleFormatted):
// causes manual device selection bug
```

### D. Imports (Exact Paths)
```javascript
// ✅ CORRECT:
const { ZigBeeDevice } = require('homey-zigbeedriver');
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

// ❌ WRONG (wrong path):
const TuyaZigbeeDevice = require('../../lib/TuyaZigbeeDevice');
```

### E. Mixin Order (MANDATORY)
```javascript
// ✅ CORRECT:
class Device extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase))

// ❌ WRONG (wrong order causes button detection failure):
class Device extends VirtualButtonMixin(PhysicalButtonMixin(HybridSwitchBase))
```

### F. Battery (NEVER combine)
```javascript
// ✅ CORRECT: measure_battery OR alarm_battery (mutually exclusive)
// ✅ CORRECT: mainsPowered getter for mains devices
// ✅ CORRECT: Remove measure_battery in onNodeInit for mains

// ❌ WRONG: measure_battery + alarm_battery together (SDK v3 violation)
```

### G. Double-Division (FIXED v5.11.15)
```javascript
// ❌ BUG: AdaptiveDataParser ÷ 100 THEN dpMappings divisor ÷ 10
// Result: 20.6°C → 0.206°C (wrong!)

// ✅ FIX: TuyaEF00Manager.js skips auto-convert when divisor !== 1
```

### H. Fingerprints (NO Wildcards)
```javascript
// ✅ CORRECT: exact strings in driver.compose.json
"_TZ3000_abc123"

// ❌ WRONG: Wildcards in SDK3
"_TZ3000_*"  // INVALID
"_TZE284_*"  // INVALID
```

### I. Physical Button Detection
```javascript
// ✅ CORRECT:
this._appCommandPending = true;
// ... 2000ms timeout ...
const isPhysical = reportingEvent && !this._appCommandPending;

// ❌ WRONG: Missing appCommandPending check
// Causes: software updates trigger physical button flows
```

### J. Validation & Release
```javascript
// ✅ ALWAYS:
npx homey app validate --level publish
node -c modified_file.js
Update .homeycompose/app.json version
Update .homeychangelog.json (TOP)

// ❌ NEVER:
npx homey app publish locally (use GitHub Actions)
git commit without [skip ci] for auto-commits
```

---

## 13. QUALITY GATE SYSTEM (9-LAYER + PRE-COMMIT GATEWAY)

### 9-Layer Quality Gate

| Layer | Target | Verification |
|-------|--------|--------------|
| **L1** | PR #120 Flow Cards | No `titleFormatted` with `[[device]]` |
| **L2** | PR #119 Class Mapping | `wall_switch_1gang_1way` inherits `SwitchBase` |
| **L3** | PR #118 Manufacturer | `_TZ3000_ysdv91bk` registered correctly |
| **L4** | PR #116 Manufacturer | `_TZ3000_blhvsaqf` registered correctly |
| **L5** | PR #111 Wall Dimmer | Driver exists and compiles |
| **L6** | Suffix Cleanup | No `_hybrid` or `_hybride` suffixes |
| **L7** | Match Integrity | No manual `.toLowerCase()` calls |
| **L8** | Memory Leak Watchdog | WiFi drivers inherit from `TuyaLocalDevice` |
| **L9** | Direct TuyAPI Bypass | No raw `tuyapi` instantiation |

### Pre-Commit Gateway (scripts/PRE_COMMIT_CHECKS.js)

```bash
# ALWAYS run before commit:
node scripts/PRE_COMMIT_CHECKS.js
```

This checks:
1. **JavaScript Syntax** — No unclosed braces, no syntax errors across `lib/`, `drivers/`, `scripts/`
2. **GitHub Actions YML** — 100% compliance with WORKFLOW_GUIDELINES.md
3. **Banned Patterns** — `_hybrid` suffix detection
4. **Settings Key Compliance** — `zb_model_id` not `zb_modelId`
5. **Battery Compliance** — No `measure_battery` + `alarm_battery` together

### Comprehensive Validation

```bash
# Full validation pipeline:
node scripts/PRE_COMMIT_CHECKS.js
node scripts/validation/comprehensive-recursive-validator.js
npx homey app validate --level publish
```

---

## 14. DOCUMENTATION & RESOURCE ENRICHMENT PROTOCOL

### Mandatory Post-Investigation Updates

```
┌──────────────────────────────────────────────────────────────────────────┐
│  DOCUMENTATION UPDATE CHECKLIST                                         │
│                                                                          │
│  AFTER EVERY FIX/DISCOVERY, UPDATE THESE:                                │
│                                                                          │
│  □ PROJECT_INDEX.md:                                                     │
│    - Add device to driver list                                          │
│    - Update device count                                                │
│    - Add to known issues if bug fix                                     │
│    - Update section 19 (Known Issues) if new bug                        │
│    - Update section 22 (Crash Resolutions) if crash fix                 │
│                                                                          │
│  □ FINGERPRINT-CROSSREF.md:                                              │
│    - Add manufacturerName + productId mapping                           │
│    - Update variant matrix                                               │
│    - Update RESOLUTION SUMMARY                                           │
│                                                                          │
│  □ docs/DEVICE_MATRIX.md:                                                │
│    - Add device with capabilities                                        │
│    - Reference Z2M/ZHA source                                            │
│                                                                          │
│  □ CHANGELOG.md:                                                         │
│    - Add entry with generic wording                                     │
│    - DO NOT mention external sources                                    │
│                                                                          │
│  □ .homeychangelog.json:                                                 │
│    - Add top entry with version bump                                    │
│    - Format: { "version": "7.5.XXX", "changes": ["..."] }              │
│                                                                          │
│  □ docs/rules/CRITICAL_MISTAKES.md:                                      │
│    - Add new bug pattern if discovered                                  │
│    - Update existing patterns if refined                                │
│                                                                          │
│  □ docs/rules/DEVELOPMENT_RULES.md:                                      │
│    - Add new development rules                                           │
│    - Update SDK v3 patterns if changed                                  │
│                                                                          │
│  □ docs/rules/ZIGBEE_TUYA_RULES.md:                                      │
│    - Add new Zigbee/Tuya specific rules                                  │
│    - Update DP mapping conventions                                       │
│                                                                          │
│  □ Dotfiles (if rules change):                                           │
│    - .cursorrules — Add new patterns                                    │
│    - .clinerules — Add new rules                                        │
│    - .windsurfrules — Add new instructions                              │
│                                                                          │
│  □ GitHub Actions Workflows:                                             │
│    - Add new checks to existing workflows                               │
│    - Create new workflow if new pattern needs monitoring                │
│                                                                          │
│  □ Prevention Scripts:                                                   │
│    - Create new script in scripts/automation/ to auto-detect same bug   │
│    - Add script to nightly-auto-process.yml or driver-maintenance.yml   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Documentation Update Template

```markdown
## Documentation Update Entry

### Files Modified
- `drivers/{driver}/driver.compose.json` — Added fingerprint
- `drivers/{driver}/device.js` — Added DP mappings
- `PROJECT_INDEX.md` — Updated device count, crash history
- `FINGERPRINT-CROSSREF.md` — Added cross-reference
- `docs/rules/CRITICAL_MISTAKES.md` — Added new pattern

### Investigation Summary
- **Source**: [GitHub Issue #XXX / Forum T140352 / Email / Diagnostic ID]
- **Cross-Reference Sources**: [Z2M ✓, ZHA ✓, Blakadder ✓, Domoticz]
- **Fix Applied**: [Brief description of what was fixed]
- **Prevention Script Created**: [scripts/automation/xxx.js]
- **Testing**: [Validation commands run]

### Version Bump
```bash
npm run bump-version -- --version X.Y.ZZZ
git add -A && git commit -m "feat: added support for {Device Name} [skip ci]"
git push
```
```

---

## 15. WORKFLOW & GITHUB ACTIONS IMPROVEMENT PROTOCOL

### When to Enrich Workflows

After every investigation that discovers:
1. A new bug pattern → Add check to `driver-maintenance.yml` or `nightly-auto-process.yml`
2. A new validation rule → Add to `validate-drivers.yml`
3. A new sync source → Add to `sync-johan.yml` or create new workflow
4. A new diagnostic pattern → Add to `secure-diagnostics.yml`
5. A new auto-fix → Add to `nightly-auto-process.yml`

### Workflow Enrichment Template

```yaml
# Template for adding new checks to driver-maintenance.yml
# ============================================

# Add step to existing job:
- name: Check New Bug Pattern
  run: node scripts/automation/check-new-pattern.js --ci
  continue-on-error: true
  
# Or create new job:
check-new-pattern:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - name: Check for Pattern
      run: node scripts/automation/check-new-pattern.js --ci
      continue-on-error: true
```

### Workflow Guidelines (from .github/WORKFLOW_GUIDELINES.md)

```javascript
// CRITICAL YML RULES:
const ymlRules = {
  "before_editing": "Read .github/WORKFLOW_GUIDELINES.md FIRST",
  "every_job": "checkout → setup-node → npm ci",
  "timeout-minutes": "ALWAYS set on jobs",
  "permissions": "ALWAYS set at top level",
  "concurrency": "ALWAYS set at top level",
  "continue-on-error": "true for optional-secret steps",
  "commit_message": "[skip ci] in auto-commits to prevent loops",
  "cron_stagger": "30+ min between schedules to avoid push conflicts",
  "secret_missing_guard": "if [ -z \"$SECRET\" ]; then exit 0; fi",
  "git_push": "git pull --rebase origin master || true before push"
};
```

---

## 16. SHADOW MODE PROTOCOL & ATTRIBUTION RULES

### Shadow Mode (MANDATORY)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🕵️ SHADOW MODE PROTOCOL                                                │
│                                                                          │
│  All repairs, synchronizations, and automation pipelines                 │
│  MUST operate in SHADOW MODE:                                            │
│                                                                          │
│  ❌ FORBIDDEN:                                                           │
│  - Public forum announcements (e.g., "Fixed thanks to Z2M!")            │
│  - Notifications to external threads                                     │
│  - Automated forum interactions (requires manual review)                │
│  - Mentioning external sources in commits/changelogs                    │
│  - Creating consecutive bot posts on forum                              │
│                                                                          │
│  ✅ ALLOWED:                                                             │
│  - Implement fixes silently                                              │
│  - Update internal documentation                                         │
│  - Cross-reference external sources for research                         │
│  - Use generic wording in commits                                        │
│  - Merge AI posts with last dlnraja forum post                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Attribution Rules (VISIBILITY MATRIX)

| Source Type | Forum/Changelog | Commits | PR Comments |
|-------------|-----------------|---------|-------------|
| **OWN sources** (dlnraja T140352, own GitHub) | ✅ CAN mention | ✅ Full visibility | ✅ Full visibility |
| **USER reports** (from T140352, direct) | ✅ CAN mention | ✅ Full visibility | ✅ Full visibility |
| **EXTERNAL sources** (JohanBendz, Z2M, ZHA, Domoticz, Blakadder, packetninja, all forks) | ❌ NEVER | ❌ NEVER | ❌ NEVER |

### Commit Message Examples

```bash
# ❌ WRONG — exposes external source:
git commit -m "Added fingerprint from Z2M issue #318"
git commit -m "Fixed from JohanBendz upstream PR #42"

# ✅ CORRECT — generic wording:
git commit -m "feat: added support for TS0601 _TZE200_xxxx switch"
git commit -m "fix: improved DP handling for temperature sensor"
git commit -m "chore: normalized fingerprint casing variants"
git commit -m "fix: corrected divisor for temperature DP" 
```

### Forum Ghostwriter Rules

```javascript
const forumRules = {
  // If last poster = dlnraja → EDIT/MERGE into that post
  if_last_poster_is_dlnraja: "Edit existing post, DO NOT create new reply",
  
  // If last poster = someone else → NEW reply (only on T140352)
  if_last_poster_is_other: "Create new reply ONLY on T140352",
  
  // NEVER post on these threads:
  no_post: {
    johan: "T26439",
    tuya: "T146735",
    lasse: "T89271"
  },
  
  // REPLY_TOPICS (ABSOLUTE):
  reply_topics: "['140352'] ONLY",
  
  // FORUM_TOPICS (read-only scan, no reply):
  forum_topics: "['140352', '26439', '146735']",
  
  // Tone: casual, like a dev editing their own post
  tone: "edit: just pushed a fix for this..."
};
```

---

## 17. PREVENTION SCRIPTS CREATION METHODOLOGY

### When to Create a Prevention Script

Create a new script when you discover:
1. A new bug pattern that could recur in other drivers
2. A validation rule that isn't already checked
3. A pattern that needs regular scanning
4. A common mistake that automated QA can catch

### Prevention Script Template

```javascript
#!/usr/bin/env node
/**
 * 🌟 PREVENTION SCRIPT TEMPLATE
 * 
 * Name: check-{bug-pattern}.js
 * Purpose: Auto-detect [bug pattern] across all drivers
 * Created: YYYY-MM-DD (after fixing [issue/PR #])
 * Trigger: Added to nightly-auto-process.yml or driver-maintenance.yml
 * 
 * Usage:
 *   node scripts/automation/check-{bug-pattern}.js           # Run locally
 *   node scripts/automation/check-{bug-pattern}.js --ci      # CI mode (exit code)
 *   node scripts/automation/check-{bug-pattern}.js --fix     # Auto-fix mode
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

const args = process.argv.slice(2);
const isCI = args.includes('--ci');
const isFix = args.includes('--fix');

let issuesFound = 0;

// ============================================
// SCAN: Add your bug pattern checks here
// ============================================

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let hasIssue = false;
  
  // Add specific bug pattern detection:
  // Example: if (content.includes('badPattern')) { ... }
  
  if (hasIssue) {
    issuesFound++;
    console.log(`❌ ${filePath}: Issue found`);
    
    if (isFix) {
      // Auto-fix logic
      // content = content.replace(/badPattern/g, 'goodPattern');
      // fs.writeFileSync(filePath, content);
      console.log(`   → Fixed`);
    }
  }
}

// ============================================
// SCAN DRIVERS
// ============================================

function scanDrivers() {
  const driverDirs = fs.readdirSync(DRIVERS_DIR);
  
  for (const dir of driverDirs) {
    const deviceJs = path.join(DRIVERS_DIR, dir, 'device.js');
    const composeJson = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    
    if (fs.existsSync(deviceJs)) scanFile(deviceJs);
    if (fs.existsSync(composeJson)) scanFile(composeJson);
  }
}

// ============================================
// SCAN LIB
// ============================================

function scanLib() {
  const files = [];
  
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(LIB_DIR);
  
  for (const file of files) {
    scanFile(file);
  }
}

// ============================================
// MAIN
// ============================================

scanDrivers();
scanLib();

console.log(`\n${'='.repeat(50)}`);
if (issuesFound === 0) {
  console.log('✅ No issues found. All clean!');
} else {
  console.log(`⚠️  Found ${issuesFound} issue(s).`);
  if (isCI) process.exit(1);
}
```

### Adding Script to Workflow

```yaml
# Add to nightly-auto-process.yml
# ============================================

- name: Check New Bug Pattern
  run: node scripts/automation/check-{bug-pattern}.js --ci
  continue-on-error: true
  working-directory: ${{ github.workspace }}
```

---

## 18. ISSUE/PR RESOLUTION & AUTO-CLOSE PROTOCOL

### Issue Resolution Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ISSUE RESOLUTION FLOW                                                  │
│                                                                          │
│  1. READ the issue completely (including all comments)                  │
│  2. REPRODUCE the issue locally if possible                             │
│  3. INVESTIGATE using all sources (section 4-10)                        │
│  4. IMPLEMENT fix following bug type flows (section 7)                  │
│  5. TEST with: npx homey app validate, PRE_COMMIT_CHECKS                │
│  6. COMMIT with [skip ci] and generic message                           │
│  7. CLOSE issue with resolution summary                                 │
│      Format: "Fixed in vX.Y.ZZZ: {description}"                        │
│      + Checklist of what was done                                       │
│                                                                          │
│  NOTE: NEVER auto-close until fix is pushed and verified                │
└──────────────────────────────────────────────────────────────────────────┘
```

### Issue Response Template

```markdown
## Resolution Summary

**Status**: ✅ Fixed in v{version}

### What was done:
- [x] Investigated manufacturerName + productId combination
- [x] Cross-referenced with Z2M/ZHA/Blakadder
- [x] Implemented fingerprint in correct driver
- [x] Added DP mappings for all capabilities
- [x] Updated battery handling
- [x] Validated with `npx homey app validate --level publish`
- [x] Updated documentation

### Files modified:
- `drivers/{driver}/driver.compose.json`
- `drivers/{driver}/device.js`
- `PROJECT_INDEX.md`

### Testing:
- `npx homey app validate --level publish` ✅ PASS
- `node scripts/PRE_COMMIT_CHECKS.js` ✅ PASS
```

---

## 19. APPENDIX A: QUICK REFERENCE COMMANDS

### Investigation Quick Commands

```bash
# ============================================
# 1. READ MANDATORY CONTEXT
# ============================================
cat AI_CONTEXT_MANDATE.md | head -50
cat PROJECT_INDEX.md | head -50
cat docs/rules/CRITICAL_MISTAKES.md

# ============================================
# 2. SEARCH FOR DEVICE IN PROJECT
# ============================================
node .github/scripts/internet-research-tool.js scan "_TZ3000_xxxx"
grep -r "_TZ3000_xxxx" drivers/ --include="*.json" --include="*.js"

# ============================================
# 3. CHECK ALL DRIVERS FOR MANUFACTURER
# ============================================
grep -rl "_TZ3000_xxxx" drivers/*/driver.compose.json

# ============================================
# 4. SEARCH ALL SOURCES
# ============================================
node .github/scripts/github-scanner.js scan-issues --state all
node .github/scripts/forum-activity-scraper.js --topic 140352
node .github/scripts/fetch-gmail-diagnostics.js --max 20
node .github/scripts/external-sources-scanner.js --all

# ============================================
# 5. CROSS-REFERENCE
# ============================================
node .github/scripts/cross-ref-intelligence.js --mfr "_TZ3000_xxxx"
node .github/scripts/internet-research-tool.js z2m "TS0601"
node .github/scripts/internet-research-tool.js blakadder "tuya"
node .github/scripts/internet-research-tool.js search "_TZE200_xxxx"

# ============================================
# 6. DEEP RESEARCH
# ============================================
node .github/scripts/issue-deep-researcher.js --issue 318
node .github/scripts/variant-scanner.js --mfr "_TZ3000_xxxx"
node .github/scripts/intelligent-bug-detector.js --scope drivers

# ============================================
# 7. IMPLEMENTATION
# ============================================
node scripts/maintenance/master-self-heal.js --dry-run
node scripts/automation/fix-crashers.js

# ============================================
# 8. VALIDATION
# ============================================
node scripts/PRE_COMMIT_CHECKS.js
node scripts/validation/comprehensive-recursive-validator.js
npx homey app validate --level publish

# ============================================
# 9. COMMIT
# ============================================
git add -A && git commit -m "feat: added support for device [skip ci]"
git push
```

### File Reading Quick Commands

```bash
# Read dotfiles:
cat .cursorrules | head -50
cat .clinerules | head -50
cat .windsurfrules | head -50

# Read architecture:
cat docs/ARCHITECTURE.md | head -50
cat MASTER-V7-SKELETON.md | head -50
cat STABLE-V5-SKELETON.md | head -50

# Read critical rules:
cat docs/rules/CRITICAL_MISTAKES.md
cat docs/rules/DEVELOPMENT_RULES.md
cat docs/rules/ZIGBEE_TUYA_RULES.md
cat docs/rules/POST_PROMOTION_PROTOCOL.md

# Read bug reports:
cat CONSOLIDATED_REPAIR_REPORT.md | head -40
cat AUDIT-REPORT.md | head -40
cat FINGERPRINT-CROSSREF.md | head -20

# Read diagnostics:
cat diagnostics/summary.json | head -30
cat diagnostics/issues-map.json | head -30

# Read workflow guidelines:
cat .github/WORKFLOW_GUIDELINES.md | head -50
cat .github/SECRETS.md | head -30
```

---

## 20. APPENDIX B: INVESTIGATION REPORT TEMPLATE

```markdown
# Investigation Report: [Device/Issue Name]

## Summary
- **Issue**: [Brief description]
- **Source**: [GitHub Issue # / Forum T140352 / Email / Diagnostic ID]
- **Status**: [Investigating / Implementing / Resolved]
- **Date**: [YYYY-MM-DD]

## Device Info
- **manufacturerName**: `_TZxxxx_xxxxxxxx`
- **productId**: `TSxxxx`
- **modelId**: `[if available]`
- **Diagnostic ID**: `[54888ee1-xxxx if crash]`

## Investigation Steps
1. [Step 1: Read context files]
2. [Step 2: Search project]
3. [Step 3: Cross-reference Z2M]
4. [Step 4: Cross-reference ZHA]
5. [Step 5: Check Blakadder]
6. [Step 6: Check GitHub issues/PRs (open + closed)]
7. [Step 7: Check forum messages + images]
8. [Step 8: Check email diagnostics]
9. [Step 9: Variant analysis]
10. [Step 10: Implementation]

## Cross-Reference Results
- **Z2M**: [Found/Not Found]
  - Config: [Summary of Z2M device definition]
  - DP Mappings: [DP → capability]
  - Power Source: [battery/mains/kinetic/USB]
- **ZHA**: [Found/Not Found]
  - Quirk: [ZigbeeQuirk class if exists]
  - Clusters: [List of ZCL clusters]
- **Blakadder**: [Found/Not Found]
  - URL: [Link]
  - Description: [Device description]
- **Domoticz/Hubitat/Tasmota**: [Found/Not Found]
- **JohanBendz**: [Found/Not Found]
  - Related Issue/PR: [#xxx]
- **Other Forks**: [Found/Not Found]

## Variant Analysis
- **Other devices with same manufacturerName**:
  - `_TZxxxx_xxxxxxxx + TSxxxx → driver_name` (existing)
  - `_TZxxxx_xxxxxxxx + TSxxxx → driver_name` (existing)
- **Power Source**: [mains/battery/kinetic/USB]
- **Protocol Type**: [ZCL/TuyaDP/Hybrid/Custom]
- **Expected Capabilities**: [list]
- **Custom Clusters**: [0xExxx if any]

## Implementation
- **Driver**: [driver_name]
- **Fingerprint Added**: `manufacturerName: ["_TZxxxx_xxxxxxxx"], productId: ["TSxxxx"]`
- **DP Mappings** (if TuyaDP):
  - DP1 → `onoff` (bool)
  - DP18 → `measure_temperature` (value, /10)
- **Flow Cards**: [if physical buttons]
- **Battery Handling**: [mainsPowered / measure_battery / alarm_battery]
- **Backlight**: ["off"/"normal"/"inverted" strings]

## Files Modified
- [ ] `drivers/{driver}/driver.compose.json`
- [ ] `drivers/{driver}/device.js`
- [ ] `drivers/{driver}/driver.flow.compose.json` (if flow cards)
- [ ] `PROJECT_INDEX.md`
- [ ] `FINGERPRINT-CROSSREF.md`
- [ ] `docs/rules/CRITICAL_MISTAKES.md` (if new bug pattern)
- [ ] `.homeychangelog.json`
- [ ] `CHANGELOG.md`
- [ ] `.github/workflows/xxx.yml` (if new check)

## Prevention Script Created
- [ ] `scripts/automation/check-{pattern}.js` added
- [ ] Workflow updated: `nightly-auto-process.yml`

## Quality Gate Verification
- [x] `scripts/PRE_COMMIT_CHECKS.js` — PASSED
- [x] `npx homey app validate --level publish` — PASSED
- [x] `scripts/validation/comprehensive-recursive-validator.js` — PASSED
- [x] Fingerprint format — VERIFIED (no wildcards)
- [x] Battery rules — VERIFIED (no measure_battery + alarm_battery)
- [x] Backlight values — VERIFIED (strings, not numbers)
- [x] Settings keys — VERIFIED (zb_model_id, not zb_modelId)
- [x] Mixin order — VERIFIED (PhysicalButton BEFORE VirtualButton)
- [x] Import paths — VERIFIED (../../lib/...)

## Testing Notes
- [Manual test steps performed]
- [Validation commands run]

## Commit
```bash
git commit -m "feat: added support for {Device Name} [skip ci]"
```
```

---

## 21. APPENDIX C: ALL PROJECT SCRIPTS INDEX

### .github/scripts/ (100+ Scripts)

| Category | Script | Purpose |
|----------|--------|---------|
| **Research** | internet-research-tool.js | Web scraping engine (DuckDuckGo, forum, Z2M, Blakadder) |
| **Research** | github-scanner.js | Scan GitHub issues/PRs across repos |
| **Research** | cross-ref-intelligence.js | Cross-reference Z2M/ZHA/Blakadder with AI |
| **Research** | external-sources-scanner.js | Scan all external domotic sources |
| **Research** | variant-scanner.js | Deep variant analysis per mfr+pid |
| **Research** | manufacturer-scraper.js | Scrape manufacturer data |
| **Research** | fp-research-engine.js | Deep fingerprint research engine |
| **Research** | issue-deep-researcher.js | Deep research on single issue |
| **Research** | scan-forks.js | Scan known forks |
| **Research** | scan-forks-recursive.js | Recursive fork scanning |
| **Research** | scan-johan-full.js | Scan JohanBendz fork fully |
| **Research** | scan-prs-issues.js | Quick issues/PRs summary |
| **Research** | scan-public-apis.js | Scan public APIs |
| **Research** | scan-tuya-ecosystem.js | Scan Tuya ecosystem |
| **Research** | gather-intelligence.js | Gather all intelligence |
| **Research** | github-deep-search.js | Deep GitHub search |
| **Bug Detection** | intelligent-bug-detector.js | AI-powered bug detection |
| **Bug Detection** | bug-investigator.js | Methodical bug investigation |
| **Bug Detection** | bug-report-processor.js | Process bug reports |
| **Bug Detection** | pattern-detector.js | Detect patterns across codebase |
| **Bug Detection** | protocol-pattern-detector.js | Detect Tuya protocol patterns |
| **Bug Detection** | misplaced-fp-detector.js | Detect misplaced fingerprints |
| **Bug Detection** | driver-conflict-audit.js | Audit driver conflicts |
| **Bug Detection** | cross-driver-gap.js | Find gaps between similar drivers |
| **Bug Detection** | fp-collision-check.js | Check fingerprint collisions |
| **Bug Detection** | fp-validator.js | Validate fingerprint format |
| **Diagnostics** | fetch-gmail-diagnostics.js | Extract diagnostic emails |
| **Diagnostics** | diagnostic-auto-resolver.js | Auto-map crash logs to fixes |
| **Diagnostics** | diagnostic-auto-heal-radar.js | Fix radar sensor diagnostics |
| **Diagnostics** | collect-diagnostics.js | Collect all diagnostics |
| **Diagnostics** | homey-device-diagnostics.js | Homey device diagnostics |
| **Diagnostics** | device-finder-collect.js | Collect device info |
| **Diagnostics** | device-finder-html.js | Generate HTML device finder |
| **Forum** | forum-activity-scraper.js | Scrape forum activity |
| **Forum** | forum-responder.js | Auto-respond to forum |
| **Forum** | auto-respond-intelligent.js | Intelligent auto-response |
| **Forum** | post-forum-update.js | Post forum update |
| **Forum** | merge-last-posts.js | Merge bot posts with own |
| **Forum** | thread-context.js | Get full thread context |
| **Forum** | screenshot-analyzer.js | Extract text from forum images |
| **Forum** | forum-pm-scanner.js | Scan forum private messages |
| **Forum** | forum-scan-spam.js | Scan forum for spam |
| **Forum** | interview-recovery.js | Recover interview data |
| **Forum** | user-profile-detector.js | Detect user profiles |
| **Forum** | update-forum-first-post.js | Update first forum post |
| **Forum** | update-post-1.js | Update main post |
| **Forum** | cleanup-wrong-thread-posts.js | Cleanup wrong threads |
| **Forum** | delete-bot-posts.js | Delete bot posts |
| **Forum** | sanitize-forum.js | Sanitize forum data |
| **Forum** | fix-csrf-all.js | Fix CSRF issues |
| **Forum** | forum-auth.js | Forum authentication |
| **Forum** | forum-cleanup.js | Cleanup forum |
| **Forum** | forum-cleanup-edit.js | Edit cleanup |
| **Forum** | forum-cleanup-now.js | Immediate cleanup |
| **Forum** | forum-intel-processor.js | Forum intelligence processing |
| **Forum** | forum-respond-requests.js | Respond to requests |
| **Forum** | forum-updater.js | Update forum data |
| **Enrichment** | auto-learn-fingerprints.js | Auto-learn fingerprints |
| **Enrichment** | enrichment-scanner.js | Scan for enrichment opportunities |
| **Enrichment** | implement-fork-fps.js | Implement fork fingerprints |
| **Enrichment** | sync-external-sources.js | Sync external sources |
| **Enrichment** | sync-johan-sdk3.js | Sync JohanBendz upstream |
| **Enrichment** | sync-sdk3-docs.js | Sync SDK3 docs |
| **Enrichment** | enforce-rules.js | Enforce project rules |
| **Enrichment** | adaptive-dp-detector.js | Adaptive DP detection |
| **Enrichment** | dp-learning-system.js | Learn DP patterns from devices |
| **Enrichment** | ota-checker.js | Check OTA updates |
| **Generation** | auto-driver-scaffold.js | Generate new driver scaffold |
| **Generation** | generate-driver.js | Generate driver |
| **Generation** | generate-driver-images.js | Generate driver images |
| **Generation** | generate-changelog.js | Generate changelog |
| **Generation** | generate-readme.js | Generate README |
| **Generation** | generate-user-expectations.js | Generate user expectations |
| **Generation** | generate-ai-changelog.js | Generate AI changelog |
| **Generation** | generate-all-keys.js | Generate all keys |
| **Generation** | generate-device-finder.js | Generate device finder |
| **Generation** | generate-discourse-key.js | Generate Discourse key |
| **Documentation** | auto-update-docs.js | Auto-update documentation |
| **Documentation** | update-architecture.js | Update architecture docs |
| **Documentation** | update-forum-first-post.js | Update forum first post |
| **Documentation** | i18n-translator.js | i18n translation tool |
| **Documentation** | translate-all.js | Translate all locales |
| **Documentation** | translate-locales.js | Translate specific locales |
| **AI** | ai-helper.js | Multi-provider AI fallback chain |
| **AI** | ai-ensemble.js | AI ensemble analysis |
| **AI** | master-ai-battle.js | Master AI comparison |
| **AI** | copilot-analyzer.js | Copilot code analysis |
| **AI** | project-rules.js | Condensed rules for AI |
| **Automation** | nightly-processor.js | Nightly batch processor |
| **Automation** | monthly-comprehensive.js | Monthly deep scan |
| **Automation** | pipeline-health.js | Pipeline health check |
| **Automation** | count-stats.js | Project statistics |
| **Automation** | retry-helper.js | Retry helper |
| **Automation** | retry-runner.js | Retry runner |
| **Automation** | auto-promote-oauth.js | Auto-promote via OAuth |
| **Automation** | auto-promote-puppeteer.js | Auto-promote via Puppeteer |
| **Automation** | auto-publish-draft.js | Auto-publish draft |
| **Automation** | promote-via-session.js | Promote via session |
| **Automation** | verify-test-version.js | Verify test version |
| **Automation** | dashboard-fallback.js | Dashboard fallback |
| **PR/Issue** | triage-issues.js | Triage issues |
| **PR/Issue** | triage-upstream-enhanced.js | Enhanced upstream triage |
| **PR/Issue** | triage-run.js | Run triage |
| **PR/Issue** | handle-issue-comments.js | Handle issue comments |
| **PR/Issue** | github-issue-manager.js | Manage GitHub issues |
| **PR/Issue** | smart-pr-merge.js | Smart PR merge |
| **PR/Issue** | batch-close-upstream.js | Batch close upstream |
| **PR/Issue** | resolution-summary.js | Generate resolution summary |
| **PR/Issue** | reply-quality-gate.js | Reply quality gate |
| **Audit** | deep-code-audit.js | Deep code audit |
| **Audit** | full-fork-verifier.js | Full fork verification |
| **Audit** | deep-fork-integrator.js | Deep fork integration |
| **Audit** | bot-self-audit.js | Bot self-audit |
| **Audit** | validate-drivers.js | Validate all drivers |
| **Special** | smart-device-lib.js | Smart device library |
| **Special** | smart-device-processor.js | Smart device processor |
| **Special** | tuya-wifi-local-researcher.js | Tuya WiFi local research |
| **Special** | inject-ota-maintenance.js | Inject OTA maintenance |
| **Special** | fetch-irdb-codes.js | Fetch IRDB codes |
| **Special** | fetch-target.js | Fetch target data |
| **Special** | fetch-via-oauth.js | Fetch via OAuth |
| **Special** | screenshot-analyzer.js | Analyze forum screenshots |

### scripts/ (Local Scripts)

| Script | Purpose |
|--------|---------|
| scripts/PRE_COMMIT_CHECKS.js | Pre-commit integrity gateway |
| scripts/automation/fix-crashers.js | Auto-fix common crashers |
| scripts/automation/update-docs.js | Auto-update documentation |
| scripts/automation/update-docs.js | Auto-update documentation |
| scripts/validation/comprehensive-recursive-validator.js | Comprehensive validation |
| scripts/publish-stable.js | Publish to stable |
| scripts/auto-publish.js | Auto-publish script |

---

## 22. APPENDIX D: ANTIGRAVITY SKILLS CATALOG

> **Repository**: `https://github.com/sickn33/antigravity-awesome-skills`
> **Registry**: `.ai/SKILL_REGISTRY.md`

| Skill | Description | Use Case |
|-------|-------------|----------|
| **bug-hunter** | Systematic bug finding. Traces from symptoms to root cause, implements fixes, prevents regression. | Every bug investigation |
| **logic-lens** | Deep code review using formal logic. Detects anti-patterns and security risks beyond linters. | Verify fix quality |
| **codebase-audit-pre-push** | Deep audit before push. Removes junk, dead code, security holes. | Pre-commit gate |
| **performance-optimizer** | Identifies performance bottlenecks. Measures before/after. | Slow devices |
| **squirrel** | Full-cycle coding. Plans, builds, tests, lints, fixes bugs, writes docs. | New driver creation |
| **technical-change-tracker** | Tracks changes with JSON records + state machine enforcement. | Session handoffs |
| **agenttrace-session-audit** | Audits cost, tool failures, latency, anomalies. | Optimize investigation cost |
| **api-endpoint-builder** | Builds production-ready REST API endpoints. | API features |
| **k6-load-testing** | Comprehensive load testing for API and browser. | Performance testing |
| **lambdatest-agent-skills** | Test automation for 46 frameworks across 15+ languages. | Multi-framework testing |
| **gdb-cli** | GDB debugging—core dumps, live processes, crashes. | Zigbee crash analysis |
| **mock-hunter** | Audits web pages for mock/hardcoded data across 5 phases. | Forum source verification |
| **python-pptx-generator** | Generates PowerPoint decks with python-pptx. | Report generation |
| **jq** | Expert JSON querying and transformation for shell workflows. | JSON data parsing |
| **global-chat-agent-discovery** | Discovers 18K+ MCP/AI agents across 6+ registries. | External tool discovery |
| **skill-check** | Validates skills against agentskills specification. | Skill integrity |
| **rayden-code** | Generates React code with Rayden UI components. | UI generation |
| **brooks-lint** | AI code reviewer for design smells, coupling, architectural risks. | Architecture review |
| **tmux** | Expert tmux session/window/pane management. | Multi-terminal workflows |

---

> **Generated by**: Antigravity AI | **Version**: 3.0.0 | **Date**: 2026-05-17
> **Reference Files**: `AI_CONTEXT_MANDATE.md`, `AI_GLOBAL_ACTION_PLAN.md`, `PROJECT_INDEX.md`, `.cursorrules`, `.clinerules`, `.windsurfrules`
> **Antigravity Skills**: `https://github.com/sickn33/antigravity-awesome-skills`
> **Claude Code Local**: `https://github.com/nicedreamzapp/claude-code-local`

## AI AUTOMATION RULES (v10.0)
1. **Anti-Degradation**: AI bots MUST NOT remove a manufacturerName (MFS) from a driver.compose.json just because it is found in another driver. It must be kept in both, and collision handled at runtime or pairing logic.
2. **Enrichment**: Any MFS conflict should be logged as MFS_COLLISION_WARNING instead of deleting footprints. This preserves backward compatibility for exotic variants.
