# 🎯 GLOBAL IMPROVEMENT PLAN — Universal Tuya Zigbee Engine v7.4.11+

> Comprehensive action plan for app quality, CI/CD optimization, and cost control.

---

## 1. Investigation & Diagnostic Layer (Weekly Pulsar)

### 1.1 Pseudonymized Data Harvesting
- **Automation**: `gmail-diagnostics.yml` — **Weekly Sunday Sweep** (22:00 UTC)
- **Pseudonymization**: SHA-256 hashed email identifiers (`user_[hash]`) for persistent anonymous tracking
- **Cross-Referencing**: Gmail → GitHub Issues → Homey Cloud Diagnostics → `diagnostics-crossref.yml`
- **Goal**: Identify top 10 most problematic fingerprints and clusters

### 1.2 Multi-Fork Intel Extraction
- **Johan SDK3 Sync**: Weekly (Mon 04:00 UTC) alignment with upstream
- **Z2M/ZHA Mapping**: Weekly external sources sync for TS0601 DP validation

## 2. Validation & Zero-Defect Guard

### 2.1 Architectural Compliance
- **Rule 21**: Multi-gang flow cards use capability-based filtering
- **Rule 24**: Case-insensitive matching via CaseInsensitiveMatcher
- **Rule 26**: NaN Guard in SemanticConverter for Zigbee report crashes

### 2.2 Syntax & Integrity Guard
- **STRICT_SYNTAX_GUARD**: Block merges/releases on `node --check` failure
- **Image Optimization**: Strip X-Large images (>500KB)

## 3. Resolution & Engine Stabilization

### 3.1 Autonomous Maintenance
- **Weekly PR Cycles**: Consolidated maintenance PRs (Mondays)
- **Auto-Resolver**: `diagnostic-auto-resolver.js` comments on issues when fixes are released

### 3.2 Legacy & Migration Strategy
- **Legacy Anchors**: Preserve old fingerprints during Unified Engine migration
- **Mixin Refactoring**: Standardize Tuya patterns into `lib/mixins/`

## 4. API Cost Control

### 4.1 Provider Budget Caps (per day)
| Provider | Daily Cap | Notes |
|----------|-----------|-------|
| Google Gemini | 1400 | Free tier |
| NVIDIA NIM | 800 | Free, 40 RPM |
| HuggingFace | 500 | Free tier |
| Groq | 500 | Free tier |
| Together | 200 | Free models only |
| Cerebras | 100 | Free tier |
| GitHub Models | 100 | Free for public repos |
| OpenAI | 50 | Pay-per-use, minimize |
| DeepSeek | 50 | Pay-per-use |
| Kimi | 50 | Limited |
| Mistral | 30 | Free tier |

### 4.2 Workflow Minute Budget
- Public repo = **unlimited free** GitHub Actions minutes
- Self-hosted runner charge ($0.002/min) applies since March 2026
- All workflows have `timeout-minutes` guards

## 5. Weekly Schedule (All Crons)

| Day | Time UTC | Workflow | Purpose |
|-----|----------|----------|---------|
| Sun | 02:00 | daily-everything | Full engine stabilization |
| Sun | 12:00 | validate | Validation gate |
| Sun | 22:00 | gmail-diagnostics | Email diagnostics sweep |
| Mon | 00:00 | unified-maintenance | Fleet repair |
| Mon | 03:00 | daily-maintenance | Self-healing + zero-defect |
| Mon | 04:00 | sync-johan | Johan fork sync |
| Mon | 06:00 | weekly-fingerprint-sync | FP enrichment + PR |
| Mon | 06:30 | upstream-auto-triage | Issue/PR triage |
| Mon | 08:00 | gmail-token-keepalive | IMAP health |
| Mon | 12:30 | sync-changelog-readme | Doc sync |
| Mon+Thu | 04:00 | tuya-automation-hub | Deep scan |
| Wed | 07:00 | weekly-verification | Fork verification |

## 6. Dependency & Package Analysis
- **Core Runtime**: `homey-zigbeedriver`, `tuyapi`, `zigbee-clusters` (Strict SDK 3.x compliance).
- **Core Utilities**: `color-space`, `qrcode`.
- **Security & Version Overrides**: Forced versions of `punycode` and `color-space` in `package.json` to avoid vulnerabilities.
- **Dev & Intelligence**: 
  - *Scraping*: `puppeteer`, `cheerio`
  - *Mail Diagnostics*: `imapflow`
  - *Image Optimization*: `sharp`, `canvas`

## 7. Dotfiles & System Cartography
The architecture strictly enforces separation of concerns via dotfiles:
- **`.agents/rules/security.md`**: Mandatory constraints. No hardcoded secrets. PII MUST be anonymized in diagnostics. Strict input sanitization and `DRY_RUN` support.
- **`.agents/rules/architectural.md`**: Enforces `driver-mapping-database.json` centralized mapping and SDK3 adherence.
- **`.gemini/rules/repository.md`**: Defines **Case-Less Architecture** (`CaseInsensitiveMatcher`), **NaN Safety** (`safeParse`), and **Flow Card Safety** (mandatory `try-catch`).
- **`.eslintrc.json`**: Linter bounds and rules validation for CI.
- **`.homeyignore` & `.gitignore`**: Strict payload management. Ensures the 7MB app footprint does not explode by excluding GitHub actions, AI scripts, docs, and raw artifacts from the Homey build.
- **`.homeychangelog.json`**: For maintaining automated changelog consistency across deployments.

---

**Status**: ACTIVE  
**Orchestrator**: dlnraja-bot  
**Doctrine**: Silent Operation (no forum posting)  
**Next Pulse**: Sunday 02:00 UTC

---

## v7.4.15 Update Notes

### AI Provider Budget (Updated)

**TIER 1 - FREE TIER (Use First):**
| Provider | Secret | Daily Cap | Notes |
|----------|--------|-----------|-------|
| NVIDIA NIM | NVIDIA_API_KEY | 800/day | **PRIORITY** - Free, 40 RPM |
| HuggingFace | HF_TOKEN | 500/day | Community inference |
| Groq | GROQ_API_KEY | 500/day | Fast Llama |
| OpenRouter | OPENROUTER_API_KEY | Varies | Filter :free models |

**TIER 2 - PAID (Budget Strict):**
| Provider | Secret | Daily Cap | Max Monthly |
|----------|--------|-----------|-------------|
| Cerebras | CEREBRAS_API_KEY | 100/day | $5 max |
| Together.ai | TOGETHER_API_KEY | 200/day | $10 max |
| DeepSeek | DEEPSEEK_API_KEY | 50/day | $3 max |
| Kimi | KIMI_API_KEY | 50/day | $5 max |

**TIER 3 - PREMIUM (Very Strict):**
| Provider | Secret | Daily Cap | Max Monthly |
|----------|--------|-----------|-------------|
| OpenAI | OPENAI_API_KEY | 50/day | $10 max |
| Mistral | MISTRAL_API_KEY | 30/day | $5 max |
| Gemini | GOOGLE_API_KEY | 1400/day | Free tier |

### Secrets Setup Priority (v7.4.15)

1. **NVIDIA_API_KEY** - Add immediately! (800 calls/day FREE)
2. HOMEY_PAT - publishing
3. HOMEY_PAT_API - real device diagnostics
4. GOOGLE_API_KEY - AI analysis
5. HOMEY_EMAIL + HOMEY_PASSWORD - forum (read-only, no posting)
6. GH_PAT - cross-repo
7. Gmail secrets - diagnostic pipeline
8. HF_TOKEN, GROQ_API_KEY - Free tier redundancy
9. CEREBRAS_API_KEY, TOGETHER_API_KEY - Paid fallback
10. Remaining AI keys (optional)

### Forum Doctrine (v7.4.15)

- **NO AUTOMATIC FORUM POSTING** - All posting must be manual
- Forum scripts are READ-ONLY (scan, read, no post)
- `forum-responder.js` restricted to T140352 only (own thread)
- Bot was flagged by moderators (Feb 2026) - no more auto-posting

### GitHub vs App Separation

- `.github/` = GitHub automation, CI/CD, AI scripts (not deployed to Homey)
- `drivers/`, `lib/`, `app.js` = Homey app (deployed via `homey app install`)
- `.homeyignore` prevents GitHub files from being included in app builds

### Workflow Schedule (v7.4.16)

| Workflow | Former | New | Notes |
|----------|----------------|--------------|-------|
| daily-promote-to-test.yml | 2x daily (03:45, 15:30 UTC) | **Weekly Monday 03:45 UTC** | Reduced to weekly |
| daily-maintenance.yml | Weekly Monday 03:00 | **Weekly Monday 03:00** | Renamed to "Weekly" |
| nightly-auto-process.yml | Manual only | Manual only | Still manual dispatch |
| daily-everything.yml | Weekly Sunday 02:00 | **Weekly Sunday 02:00** | Already weekly |
| weekly-fingerprint-sync.yml | Weekly Monday 06:00 | **Weekly Monday 06:00** | Already weekly |
| sunday-master.yml | Manual only | Manual only | Still manual dispatch |

**Principle**: All automatic workflows now run **once per week maximum** to conserve AI API credits and minimize GitHub Actions usage.

---

## v7.4.16 Diagnostic Analysis (2026-04-28)

### Gmail Diagnostics Results

**4 Unmatched Fingerprints from Emails - ALL SUPPORTED:**
| Fingerprint | Drivers | Status |
|-------------|---------|--------|
| `_TZE200_u6x1zyv2` | air_quality_comprehensive | ✅ EXISTS (TS0005, TS0006, TS0601) |
| `_TZE284_hdml1aav` | sensor_lcdtemphumidsensor_soil_hybrid | ✅ EXISTS (TS0601) |
| `_TZB000_yqjaollc` | temphumidsensor, plug_energy_monitor | ✅ EXISTS (59 entries) |
| `_TZ3000_tzvbimpq` | remote_button_wireless_hybrid | ✅ EXISTS (24 entries) |

**Error Patterns:**
- `getDeviceConditionCard`: NOT in codebase → OLD version report
- IAS Zone enrollment: FIXED in v7.4.x (dataQuery on init)

**Protocol Distribution (resolver-report.json):**
- tuya_dp: 8, zcl: 3, ias: 1, unknown: 7

### No Corrections Required
✅ All fingerprints from emails are already supported in `data/fingerprints.json`  
✅ No critical issues to fix from Gmail diagnostics  
✅ Errors are from OLD app versions, not current codebase

### Homey Pro Local Access
- **Name**: Homey Pro de Dylan
- **Access**: via HOMEY_PAT_API or HOMEY_PAT secrets
- **Use**: Real device diagnostics, device pairing tests

### GitHub Actions Execution
- `gmail-diagnostics.yml` requires: `GMAIL_EMAIL`, `GMAIL_APP_PASSWORD` secrets
- Local execution not possible without IMAP credentials
- Run on GitHub Actions with configured secrets

---

## v7.4.17 Refactor & Validation Fixes (2026-04-29)

### Major Refactor: _hybrid Suffix Removal

**Problem**: All drivers had `_hybrid` suffix in directory names, causing confusion and bloated naming.

**Solution**: Complete removal of `_hybrid` suffix from:
- 120+ driver directory names (renamed via `git mv`)
- 6400+ references in `app.json`, `data/fingerprints.json`, `driver-mapping-database.json`
- 245 driver JSON files (`driver.compose.json`, `driver.flow.compose.json`)
- 8 duplicate `_hybrid` drivers deleted (identical flow card IDs causing conflicts)

**Duplicate drivers removed**:
| Duplicate | Base Driver | Issue |
|-----------|-------------|-------|
| `bulb_tunable_white_hybrid` | `bulb_tunable_white` | 8 duplicate flow card IDs |
| `dimmer_dual_channel_hybrid` | `dimmer_dual_channel` | 12 duplicate flow card IDs |
| `smart_knob_rotary_hybrid` | `smart_knob_rotary` | 3 duplicate flow card IDs |
| `air_quality_comprehensive_hybrid` | `air_quality_comprehensive` | 8 duplicate flow card IDs |
| `curtain_motor_tilt_hybrid` | `curtain_motor_tilt` | 18 duplicate flow card IDs |
| `module_mini_switch_hybrid` | `module_mini_switch` | 11 duplicate flow card IDs |
| `plug_energy_monitor_hybrid` | `plug_energy_monitor` | 24 duplicate flow card IDs |
| `smart_knob_switch_hybrid` | `smart_knob_switch` | 15 duplicate flow card IDs |

**Final state**: 315 drivers, 0 ID collisions, 0 `_hybrid` references in critical files.

### Validation Fixes

**[[device]] Missing in Flow Cards**:
- Fixed 24 actions across 4 drivers (`wall_switch_1gang_1way`, `wall_switch_2gang_1way`, `wall_switch_3gang_1way`, `wall_switch_4gang_1way`)
- Both EN and NL titleFormatted required `[[device]]` for actions with `type: "device"` args
- **Rule**: ALL flow card actions with device args MUST include `[[device]]` in ALL language variants

**Missing Driver Images**:
- Added `small.png`, `large.png`, `xlarge.png` to 10 drivers that were missing them
- **Rule**: Every driver MUST have all 3 image sizes in `assets/images/`

### Bug Fixes

**Issue #162 — Fingerbot _getFlowCard() Infinite Recursion**:
- **Root cause**: `_getFlowCard()` method called itself recursively with same arguments
- **Fix**: Replaced with proper Homey SDK3 API calls:
  ```javascript
  // BEFORE (BROKEN):
  _getFlowCard(id, type = 'trigger') {
    if (type === 'action') return this._getFlowCard(id, 'action');
    // ... infinite recursion
    
  // AFTER (FIXED):
  _getFlowCard(id, type = 'trigger') {
    if (type === 'action') return this.homey.flow.getActionCard(id);
    if (type === 'condition') return this.homey.flow.getConditionCard(id);
    return this.homey.flow.getTriggerCard(id);
  }
  ```
- **Impact**: Fingerbot flow cards (button press, battery low, mode change) now trigger correctly

### New Rules Discovered

| Rule | Description |
|------|-------------|
| **Rule 27** | Flow card IDs must be globally unique across ALL drivers (no duplicates) |
| **Rule 28** | Removing driver directories requires cleaning ALL references in app.json, fingerprints.json, and driver-mapping-database.json |
| **Rule 29** | `[[device]]` placeholder required in ALL language variants of titleFormatted for actions with device args |

### Scripts Created

| Script | Purpose |
|--------|---------|
| `scripts/fix-hybrid-refs.js` | Remove `_hybrid` from app.json, fingerprints.json, driver-mapping-database.json |
| `scripts/fix-hybrid-refs-all.js` | Remove `_hybrid` from ALL JSON files in drivers/ directory |

### YML Automation Issues Found

**tuya-automation-hub.yml**:
- Dead conditional: Monthly SDK3 sync step checks `github.event.schedule == '0 4 1 * *'` but schedule is `0 4 * * 1,4` — **never runs on schedule**
- 12 API keys duplicated across 3 jobs (36 env declarations) — should use reusable workflow
- `continue-on-error: true` on all scanner steps silently swallows failures

**ai-helper.js**:
- NVIDIA NIM configured as PRIORITY (800/day free) ✅
- OpenRouter model discovery fetches ALL models on every call — should cache with TTL
- Rate state file (`_rtSave()`) writes on every API call — race condition risk in concurrent CI

### Commits Summary

| Hash | Description |
|------|-------------|
| `9d181dbb5` | FIX: add [[device]] to NL titleFormatted in wall_switch_2/3/4gang_1way |
| `3d7383971` | FIX: add [[device]] to all titleFormatted.en in wall_switch_2/3/4gang_1way |
| `ef844a245` | FIX: remove ALL _hybrid refs from app.json, fingerprints.json, driver-mapping-database.json |
| `424538e42` | FIX: remove 8 duplicate _hybrid drivers causing flow card ID conflicts |
| `a333a197b` | FIX Issue #162: fingerbot _getFlowCard() infinite recursion |

**Status**: ACTIVE  
**Orchestrator**: dlnraja-bot  
**Doctrine**: Silent Operation (no forum posting)  
**Validation**: ✅ PUBLISH level passes (Build + npx + Athom Docker)  
**Next Pulse**: Sunday 02:00 UTC



## v7.4.19 Dual-Version Strategy (2026-04-29)

### Stable vs Test Channel
| Channel | Version | Status | Notes |
|---------|---------|--------|-------|
| **Main (Stable)** | v5.11.205 | Production | Proven stable, all devices working |
| **Test (Beta)** | v7.4.18+ | Development | New features, 315 drivers, 22400+ FPs |

### Rationale
- v5.11.205 is battle-tested and works well for users
- v7.x has major architectural changes (_hybrid removal, SDK3 compliance)
- Users can choose stability vs latest features
- v7.x gets continuous improvement in test channel

### Promotion Flow
1. v7.x changes pushed to master (auto-validation)
2. Weekly draft-to-test promotion via tuya-automation-hub
3. Users test v7.x in test channel
4. When stable, promote v7.x to main channel
5. v5.11.205 remains as fallback

### Silent Operation
- All enrichment done without forum notification
- Project continues silently
- Users informed via GitHub issues/PRs only
