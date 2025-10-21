# GitHub Actions Workflows - Universal Tuya Zigbee

**Last Updated:** 2025-10-16 21:50  
**Status:** ✅ Optimized & Production Ready  
**Active Workflows:** 6  
**Disabled Workflows:** 9

---

## 🚀 ACTIVE WORKFLOWS

### Critical (Always Running)

#### 1. update-docs.yml
**Status:** ✅ ACTIVE  
**Trigger:** Push to master (paths-ignore: docs/)  
**Purpose:** Auto-update documentation, links, README, CHANGELOG  
**Features:**
- ✅ Concurrency control (prevents conflicts)
- ✅ Pull rebase + retry logic (resilient)
- ✅ Skips CI ([skip ci] tag)
- ✅ Auto-commit and push

#### 2. homey-official-publish.yml
**Status:** ✅ ACTIVE (PRIMARY PUBLISH)  
**Trigger:** Push to master (paths-ignore: docs, scripts, etc.)  
**Purpose:** Official Homey App Store publication  
**Features:**
- ✅ Concurrency control
- ✅ Pull rebase + retry logic
- ✅ Update docs before publish
- ✅ Version bump + commit
- ✅ Publish to Homey App Store

**Jobs:**
1. `update-docs` - Updates documentation
2. `version` - Bumps version and creates tags  
3. `publish` - Publishes to Homey App Store

#### 3. ci-validation.yml
**Status:** ✅ ACTIVE  
**Trigger:** Push, pull request  
**Purpose:** Continuous validation  
**Features:**
- ✅ upload-artifact v4
- ✅ Homey app validation (publish level)
- ✅ Fast feedback

#### 4. ci-complete.yml
**Status:** ✅ ACTIVE  
**Trigger:** Push, pull request  
**Purpose:** Complete CI pipeline  
**Features:**
- ✅ upload-artifact v4 (7 locations)
- ✅ 7 parallel jobs
- ✅ Device matrix generation
- ✅ Schema validation
- ✅ Coverage stats
- ✅ Badges generation

### Validation

#### 5. build-and-validate.yml
**Status:** ✅ ACTIVE  
**Trigger:** Push (multiple branches), pull request  
**Purpose:** Build validation  
**Features:**
- ✅ Concurrency control (NEW)
- ✅ ESLint validation
- ✅ Homey validation
- ✅ Device matrix generation

#### 6. homey-validate-only.yml
**Status:** ✅ ACTIVE  
**Trigger:** Pull request, manual  
**Purpose:** Validation only (no publish)  
**Features:**
- ✅ Concurrency control (NEW)
- ✅ Matrix validation (publish + verified levels)
- ✅ Useful for PRs

---

## 🔒 DISABLED WORKFLOWS (Not Implemented)

### Conflicting Publish Workflows
- `publish-homey.yml.DISABLED` - Conflicted with homey-official-publish
- `publish-v3.yml.DISABLED` - Conflicted with homey-official-publish

### Automation Workflows (Scripts Not Implemented)
- `ai-weekly-enrichment.yml.DISABLED`
- `auto-driver-generation.yml.DISABLED`
- `auto-process-github-issues.yml.DISABLED`
- `auto-respond-to-prs.yml.DISABLED`
- `monthly-auto-enrichment.yml.DISABLED`
- `weekly-enrichment.yml.DISABLED`
- `scheduled-issues-scan.yml.DISABLED`

**Why Disabled:**
- Scripts not implemented yet
- Would fail and consume GitHub Actions minutes
- Can be re-enabled once automation scripts are ready

---

## ⚙️ CONFIGURATION

### Required Secrets
None required! All workflows use `GITHUB_TOKEN` (auto-provided)

### Concurrency Control
All active workflows now have concurrency control to prevent:
- Race conditions
- Push rejected errors
- Duplicate runs
- Resource waste

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

---

## 🧪 LOCAL TESTING

```bash
# Validate app
homey app validate --level=publish

# Test build
homey app build

# Run ESLint
npx eslint . --ext .js

# Run tests (if available)
npm test
```

---

## 📊 MONITORING

**GitHub Actions:** https://github.com/dlnraja/com.tuya.zigbee/actions

**Expected Behavior:**
- ✅ No workflow conflicts
- ✅ No push rejected errors
- ✅ All validations pass
- ✅ Clean workflow runs

---

## 📝 RECENT CHANGES (2025-10-16)

### Fixes Applied
1. ✅ Added CHANGELOG entries (v3.0.1 - v3.0.8)
2. ✅ Disabled 9 conflicting/non-implemented workflows
3. ✅ Added concurrency control to build-and-validate
4. ✅ Added concurrency control to homey-validate-only
5. ✅ All upload-artifact updated to v4

### Problems Resolved
- ✅ No more workflow conflicts (3 publish workflows → 1)
- ✅ No more automation failures (7 disabled)
- ✅ Concurrency control everywhere (prevents races)
- ✅ Clean, optimized workflow setup

---

## 🎯 WORKFLOW DECISION TREE

**When to use which workflow?**

```
Push to master:
  ├─ Code changes → homey-official-publish (publish to App Store)
  └─ Doc changes  → update-docs (update docs only)

Pull request:
  ├─ Validation   → homey-validate-only
  └─ Full CI      → ci-complete

Manual:
  └─ Quick check  → homey-validate-only
```

---

*Last Updated: 2025-10-16 21:50 UTC+02:00*  
*Status: Production Ready*  
*Version: 3.0.8*
