# GitHub Workflows Status - Universal Tuya Zigbee

**Last Updated:** 2025-10-11 14:43  
**Method:** Official Athom GitHub Actions

---

## ✅ Active Workflows

### 1. auto-publish-complete.yml ⭐ PRIMARY

**Status:** ✅ **ACTIVE & RECOMMENDED**  
**Trigger:** Push to master (automatic)  
**Purpose:** Complete auto-publish pipeline

**Features:**
- ✅ Pre-flight checks (JSON, drivers structure)
- ✅ Official Athom validation action
- ✅ Intelligent versioning (auto-detect from commit)
- ✅ Automatic changelog generation
- ✅ Auto-publish to Homey App Store
- ✅ Skip publish with `[skip publish]` or `docs:`

**Actions Used:**
- `athombv/github-action-homey-app-validate@master`
- `athombv/github-action-homey-app-version@master`
- `athombv/github-action-homey-app-publish@master`

**Documentation:** [AUTO_PUBLISH_GUIDE.md](../../AUTO_PUBLISH_GUIDE.md)

---

### 2. homey-validate.yml

**Status:** ✅ **ACTIVE**  
**Trigger:** Pull requests, development branches  
**Purpose:** Continuous validation

**Features:**
- ✅ Multi-level validation (debug + publish)
- ✅ JSON syntax checking
- ✅ Driver structure verification
- ✅ Runs on PRs automatically

**Actions Used:**
- `athombv/github-action-homey-app-validate@master`

---

## 📋 Manual Workflows (Disabled)

### 3. homey-app-cicd.yml.manual

**Status:** ⏸️ **DISABLED** (renamed)  
**Reason:** Replaced by auto-publish-complete.yml  
**Original Purpose:** Manual dispatch publication

**Can be re-enabled for:**
- Manual control over publication
- Testing without auto-publish
- Major releases requiring review

**To re-enable:**
```bash
git mv .github/workflows/homey-app-cicd.yml.manual .github/workflows/homey-app-cicd.yml
```

---

## ❌ Removed Workflows

### Legacy Workflows Removed

1. **CI_CD_TEST.yml** - Temporary test workflow (removed)
2. **homey-official-publish.yml.disabled** - Incorrect parameters (removed)
3. **publish-main.yml** - Old custom automation (if exists)
4. **publish-homey.yml** - Deprecated interactive prompts (if exists)

---

## 🔧 Configuration

### Required Secret

**Name:** `HOMEY_PAT`  
**Purpose:** Authentication with Homey App Store  
**Get token:** https://tools.developer.homey.app/me  
**Configure:** https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

### Optional Configuration

**Skip auto-publish:**
- Add `[skip ci]` to commit message
- Add `[skip publish]` to commit message
- Start commit with `docs:`
- Use workflow_dispatch with `skip_publish: true`

---

## 📊 Workflow Comparison

| Feature | auto-publish-complete | homey-validate | homey-app-cicd (manual) |
|---------|----------------------|----------------|------------------------|
| **Trigger** | Auto (push) | Auto (PR) | Manual dispatch |
| **Pre-checks** | ✅ Yes | ❌ No | ❌ No |
| **Validation** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Versioning** | ✅ Auto | ❌ No | ✅ Manual input |
| **Publication** | ✅ Auto | ❌ No | ✅ Yes |
| **Skip option** | ✅ Yes | N/A | N/A |
| **Best for** | Daily dev | PR review | Major releases |

---

## 🎯 Recommended Usage

### Daily Development (auto-publish-complete.yml)

```bash
# 1. Make changes
git add .

# 2. Commit with semantic message
git commit -m "feat: add 10 new sensors"

# 3. Push (triggers auto-publish)
git push origin master

# Result: Auto-validated, versioned, published
```

### Documentation Updates (skip publish)

```bash
# Commit with docs: prefix
git commit -m "docs: update README"
git push

# Result: Validated only, no publish
```

### Major Releases (manual workflow)

```bash
# 1. Re-enable manual workflow
git mv .github/workflows/homey-app-cicd.yml.manual .github/workflows/homey-app-cicd.yml
git commit -m "chore: enable manual workflow for major release"
git push

# 2. Use GitHub UI
# Actions → Homey App CI/CD → Run workflow
#   version_type: major
#   changelog: "Major v3.0.0 release"
```

---

## 🔍 Monitoring

### GitHub Actions

**URL:** https://github.com/dlnraja/com.tuya.zigbee/actions

**Check:**
- 🟢 Green = Success
- 🔴 Red = Failed (check logs)
- 🟡 Yellow = Running
- ⚪ Gray = Skipped

### Homey Dashboard

**URL:** https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee

**After successful publish:**
- New build appears as "Draft"
- Ready to promote to Test
- Can submit for certification

---

## 🐛 Troubleshooting

### Workflow doesn't trigger

**Causes:**
- Commit affects only ignored paths (*.md, docs/, reports/)
- Branch is not `master`
- Workflow is disabled

**Solution:**
```bash
# Check workflow files exist and are enabled
ls -la .github/workflows/

# Force trigger with manual dispatch
# GitHub → Actions → Auto-Publish Complete → Run workflow
```

### "HOMEY_PAT not found"

**Solution:**
1. Verify secret at https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
2. Name must be exactly `HOMEY_PAT`
3. Value must be valid token from https://tools.developer.homey.app/me

### Validation fails

**Solution:**
```bash
# Test locally first
npx homey app validate --level publish

# Fix errors reported
# Then push again
```

---

## 📚 Documentation

### Guides

- **Auto-Publish Guide:** [AUTO_PUBLISH_GUIDE.md](../../AUTO_PUBLISH_GUIDE.md)
- **GitHub Actions Setup:** [GITHUB_ACTIONS_SETUP.md](../../GITHUB_ACTIONS_SETUP.md)
- **Quick Start:** [QUICK_START_PUBLICATION.md](../../QUICK_START_PUBLICATION.md)
- **Official Workflows Guide:** [OFFICIAL_WORKFLOWS_GUIDE.md](./OFFICIAL_WORKFLOWS_GUIDE.md)

### Athom Official Actions

- **Validate:** https://github.com/marketplace/actions/homey-app-validate
- **Version:** https://github.com/marketplace/actions/homey-app-update-version
- **Publish:** https://github.com/marketplace/actions/homey-app-publish

---

## ✅ Status Summary

| Component | Status |
|-----------|--------|
| **Auto-Publish Workflow** | ✅ Active |
| **Validation Workflow** | ✅ Active |
| **Manual Workflow** | ⏸️ Disabled (available) |
| **HOMEY_PAT Secret** | ⏳ To configure |
| **Documentation** | ✅ Complete |

---

**Last Updated:** 2025-10-11 14:43  
**Active Workflows:** 2 (auto-publish + validate)  
**Method:** Official Athom GitHub Actions  
**Status:** ✅ Production Ready
