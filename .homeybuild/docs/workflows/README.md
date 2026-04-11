# 🚀 GitHub Actions Workflows - Universal Tuya Zigbee

**Last Updated:** 2025-11-04 17:00  
**Status:** ✅ Fully Optimized with Official Athom Actions  
**Active Workflows:** 5  
**Method:** 100% Official Athom GitHub Actions (No CLI)

---

## 🎯 OFFICIAL ATHOM ACTIONS USED

All workflows now use **official Athom GitHub Actions** instead of manual Homey CLI:

### 1. **`athombv/github-action-homey-app-validate@master`**
- **Purpose:** Validate Homey apps
- **Levels:** `debug`, `publish`, `verified`
- **Benefits:** No CLI install, faster, official support

### 2. **`athombv/github-action-homey-app-publish@master`**
- **Purpose:** Publish apps to Homey App Store
- **Input:** `personal_access_token` (from secrets.HOMEY_PAT)
- **Benefits:** Automatic validation, build, and publish

### 3. **`athombv/github-action-homey-app-version@master`**
- **Purpose:** Bump app version and update changelog
- **Inputs:** `version` (major/minor/patch), `changelog`
- **Benefits:** Auto-update app.json and .homeychangelog.json

---

## 🚀 ACTIVE WORKFLOWS

### 1. **publish.yml** 🔥 CRITICAL
**Status:** ✅ ACTIVE (PRIMARY PUBLISH)  
**Trigger:** Release published, manual  
**Action:** `athombv/github-action-homey-app-publish@master`

**What it does:**
- ✅ Checkout code
- ✅ Publish to Homey App Store (official action)
- ✅ Generate summary with management URL

**Features:**
- 🚀 Ultra-fast (no dependencies to install)
- 🔒 Secure (uses HOMEY_PAT secret)
- 📊 Automatic summary generation
- ✅ Official Athom method

---

### 2. **validate.yml** ✅ VALIDATION
**Status:** ✅ ACTIVE  
**Trigger:** Push, pull request, manual  
**Action:** `athombv/github-action-homey-app-validate@master`

**What it does:**
- ✅ Checkout code
- ✅ Validate app (publish level)
- ✅ Generate validation summary

**Features:**
- ⚡ Fast validation (no CLI install)
- 📊 Detailed summary in GitHub Actions
- ✅ Official Athom validation

---

### 3. **auto-organize.yml** 🧹 MAINTENANCE
**Status:** ✅ ACTIVE  
**Trigger:** Push to master, manual  
**Action:** `athombv/github-action-homey-app-validate@master`

**What it does:**
- 📚 Install dependencies
- 🧹 Run organization script
- ✅ Validate organized files (official action)
- 💾 Commit if valid, rollback if invalid
- 📊 Upload summary artifact

**Features:**
- 🔒 Safety first: rollback if validation fails
- 🤖 Auto-commit with [skip ci] tag
- 📝 Creates issue on failure
- ✅ Uses official validation action

---

### 4. **version-bump.yml** 🔢 VERSION MANAGEMENT
**Status:** ✅ ACTIVE (NEW!)  
**Trigger:** Manual (workflow_dispatch)  
**Actions:** 
- `athombv/github-action-homey-app-version@master`
- `athombv/github-action-homey-app-validate@master`

**What it does:**
- 🔢 Bump version (major/minor/patch)
- 📝 Update changelog
- ✅ Validate updated app
- 💾 Commit & push with tag
- 🚀 Create GitHub release

**Inputs:**
- `version`: major | minor | patch
- `changelog`: English changelog text

**Features:**
- 🎯 All-in-one version management
- ✅ Auto-validation before commit
- 🏷️ Auto-tagging
- 🚀 Auto-release creation
- 📊 Triggers automatic publication

---

### 5. **cleanup.yml** 🧹 CLEANUP (NEW!)
**Status:** ✅ ACTIVE  
**Trigger:** Weekly schedule (Sunday 00:00 UTC), manual  
**Action:** `athombv/github-action-homey-app-validate@master`

**What it does:**
- 🧹 Remove temporary files (*.tmp, *.temp, *.log)
- 📚 Organize documentation structure
- 🗑️ Clean old build artifacts
- ✅ Validate after cleanup
- 💾 Commit if changes detected

**Features:**
- 📅 Scheduled weekly automation
- 📂 Smart documentation organization
- ✅ Validation ensures nothing breaks
- 🤖 Fully automated maintenance

---

## ⚙️ CONFIGURATION

### Required Secrets

#### `HOMEY_PAT` (Required for Publishing)
- **Purpose:** Personal Access Token for Homey App Store
- **Get it from:** https://tools.developer.homey.app/me
- **Add it at:** https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
- **Used by:** `publish.yml`

#### `GITHUB_TOKEN` (Auto-provided)
- **Purpose:** GitHub API access
- **Used by:** All workflows
- **No configuration needed:** Automatically provided by GitHub

---

## 🔄 WORKFLOW AUTOMATION FLOW

```
┌─────────────────────────────────────────────────────────┐
│  1. CODE CHANGES → Push to master                      │
│     ↓                                                   │
│  2. validate.yml → Validates app                       │
│     ↓ (if valid)                                       │
│  3. auto-organize.yml → Cleans up files               │
│     ↓ (if needed)                                      │
│                                                         │
│  MANUAL: version-bump.yml                             │
│     ↓                                                   │
│  - Bumps version (major/minor/patch)                  │
│  - Updates changelog                                   │
│  - Creates git tag                                     │
│  - Creates GitHub release                             │
│     ↓ (triggers on release)                           │
│  4. publish.yml → Publishes to Homey App Store       │
│                                                         │
│  SCHEDULED: cleanup.yml (Every Sunday)                 │
│  - Cleans temporary files                             │
│  - Organizes documentation                             │
│  - Validates after cleanup                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 USAGE EXAMPLES

### Publish New Version
```bash
# 1. Make your code changes
git add .
git commit -m "feat: Add new feature"
git push origin master

# 2. Go to GitHub Actions → version-bump.yml → Run workflow
#    - Select version type: patch/minor/major
#    - Add changelog text
#    - Click "Run workflow"

# 3. Workflow will:
#    ✅ Bump version
#    ✅ Update changelog
#    ✅ Validate app
#    ✅ Create release
#    ✅ Trigger publish automatically
```

### Manual Validation
```bash
# Go to GitHub Actions → validate.yml → Run workflow
# Or push/PR will trigger it automatically
```

### Manual Cleanup
```bash
# Go to GitHub Actions → cleanup.yml → Run workflow
# Or wait for weekly schedule (Sunday 00:00 UTC)
```

---

## 📊 MONITORING

### GitHub Actions Dashboard
https://github.com/dlnraja/com.tuya.zigbee/actions

### Expected Behavior
- ✅ All workflows use official Athom actions
- ✅ No Homey CLI installation needed
- ✅ Fast execution (under 2 minutes typically)
- ✅ Clear summaries in GitHub Actions UI
- ✅ Automatic publication after release creation

---

## 🔧 TROUBLESHOOTING

### publish.yml fails with "Missing changelog"
**Solution:** Ensure `.homeychangelog.json` contains entry for current version

### publish.yml fails with authentication error
**Solution:** Check `HOMEY_PAT` secret is set correctly at:  
https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

### validation fails after organization
**Solution:** auto-organize.yml will automatically rollback changes

### version-bump.yml doesn't trigger publish
**Solution:** Ensure release is created (workflow does this automatically)

---

## ✨ RECENT UPDATES (2025-11-04)

### Major Improvements
1. ✅ **All workflows migrated to official Athom actions**
   - No more manual Homey CLI installation
   - Faster execution
   - Official support

2. ✅ **New version-bump.yml workflow**
   - All-in-one version management
   - Auto-validation before commit
   - Auto-release creation

3. ✅ **New cleanup.yml workflow**
   - Scheduled weekly maintenance
   - Smart file organization
   - Validation after cleanup

4. ✅ **Optimized validation**
   - Ultra-fast with official action
   - Clear GitHub summaries
   - No dependency installation

5. ✅ **Simplified publish workflow**
   - 3 steps instead of 8
   - Uses official action
   - Auto-validation included

---

## 🎉 BENEFITS

### Before (Manual CLI)
- ❌ 8+ steps per workflow
- ❌ Install Homey CLI every time
- ❌ Install patch-package dependency
- ❌ Complex authentication
- ❌ Slower execution (1-3 minutes)
- ❌ More points of failure

### After (Official Actions)
- ✅ 2-3 steps per workflow
- ✅ No installations needed
- ✅ No dependencies
- ✅ Simple token authentication
- ✅ Fast execution (30-60 seconds)
- ✅ Reliable and official

---

*Last Updated: 2025-11-04 17:00 UTC+01:00*  
*Status: Production Ready with Official Athom Actions*  
*Version: 4.9.274*
