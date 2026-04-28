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

---

**Status**: ACTIVE  
**Orchestrator**: dlnraja-bot  
**Doctrine**: Silent Operation (no forum posting)  
**Next Pulse**: Sunday 02:00 UTC
