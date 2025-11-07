# 🛠️ Development & Analysis Scripts

This directory contains utility scripts for analyzing, debugging, and improving the Universal Tuya Zigbee app.

## 📋 **Available Scripts**

### **1. `scan_history.sh`** - Git History Analysis

Analyzes git commit history to identify improvements by topic.

```bash
bash scripts/scan_history.sh
```

**Output:**
- `.artifacts/git_commits.log` - Full commit history
- `.artifacts/improvements_summary.txt` - Categorized improvements

**Topics analyzed:**
- Battery improvements
- USB outlet improvements
- Presence/radar sensors
- Tuya DP/EF00 protocol
- Smart-Adapt changes
- Crash fixes

---

### **2. `analyze_diagnostics.js`** - Diagnostic Log Analysis

Automatically detects common issues in diagnostic logs and suggests fixes.

```bash
# From log file
node scripts/analyze_diagnostics.js diagnostic.log

# From text
node scripts/analyze_diagnostics.js "Manufacturer: Unknown Model: Unknown"

# Save report as JSON
SAVE_REPORT=true node scripts/analyze_diagnostics.js diagnostic.log
```

**Detects:**
- ❌ Missing battery KPI
- ❌ Unknown manufacturer/model
- ❌ USB outlet detection issues
- ❌ Sensor→Switch wrong adaptation
- ❌ Low confidence device detection
- ❌ Tuya DP protocol issues
- ❌ App crashes

**Output:**
- Console report with severity levels (CRITICAL/HIGH/MEDIUM)
- Device information extraction
- Recommended actions
- Optional JSON report in `.artifacts/`

---

### **3. `version_summary.js`** - Version & Changelog Summary

Displays recent versions and their key fixes.

```bash
node scripts/version_summary.js
```

**Shows:**
- Current app version
- Last 5 versions with key fixes
- Critical fix timeline
- Problems addressed per version

---

## 🚀 **Quick Start**

```bash
# 1. Make scripts executable (Linux/Mac)
chmod +x scripts/*.sh

# 2. Run history analysis
bash scripts/scan_history.sh

# 3. Check version summary
node scripts/version_summary.js

# 4. Analyze a diagnostic log
node scripts/analyze_diagnostics.js path/to/diagnostic.log
```

---

## 📊 **What's Already Implemented**

### ✅ **GitHub Actions Automation**
- **File:** `.github/workflows/homey-publish.yml`
- **Features:**
  - Automated build & validation
  - Automated publish to Homey App Store
  - Uses official `athombv/github-action-homey-app-publish` action
  - Secret: `HOMEY_PAT` (personal access token)
- **Status:** ✅ Working (v4.9.305, v4.9.306, v4.9.307 published successfully)

### ✅ **Smart-Adapt with Safety**
- **File:** `lib/SmartDriverAdaptation.js`
- **Features:**
  - Protected driver whitelist (soil sensors, climate monitors, etc.)
  - Sensor/Monitor → Switch/Outlet prevention
  - 95% confidence threshold
  - Detailed safety logging
- **Status:** ✅ Implemented in v4.9.307

### ✅ **Manufacturer/Model Reading**
- **File:** `lib/devices/BaseHybridDevice.js`
- **Features:**
  - Robust retry logic (3 attempts)
  - Dual read strategy (early + before Smart-Adapt)
  - Fixed syntax errors
- **Status:** ✅ Fixed in v4.9.306

### ✅ **USB 2-Outlet Detection**
- **Files:** `lib/SmartDriverAdaptation.js`, driver files
- **Features:**
  - Multi-endpoint detection
  - Pattern matching (TS011F, _TZ3000_*)
  - `onoff` + `onoff.usb2` capabilities
  - 98% confidence detection
- **Status:** ✅ Working

---

## 📅 **Development Roadmap**

### **Phase 1: Stabilization** (CURRENT - v4.9.307)
- ✅ Fix critical crashes
- ✅ Fix manufacturer/model reading
- ✅ Fix Smart-Adapt over-aggressive behavior
- ⏳ **Wait for user feedback (24-48h)**

### **Phase 2: Validation** (NEXT)
- ⏳ Collect user feedback on v4.9.307
- ⏳ Verify soil sensors are protected
- ⏳ Verify USB outlets work
- ⏳ Verify battery KPIs report correctly

### **Phase 3: Enhancement** (FUTURE)
- 🔜 Capability map generation (static analysis)
- 🔜 Integration test fixtures
- 🔜 Forum scraping for timeline mapping
- 🔜 Auto-issue creation from diagnostics
- 🔜 Enhanced CI/CD pipeline

---

## ⚠️ **Important Notes**

### **Why Not Implement Everything Now?**

1. **v4.9.307 just published** (30 minutes ago)
   - Need to wait for user feedback
   - Too many changes = new bugs risk

2. **Incremental approach is safer**
   - One critical fix at a time
   - Validate each fix before next
   - User feedback guides priorities

3. **Some features are over-engineered**
   - Forum scraping can wait
   - AST parsing is complex
   - Focus on user-reported issues first

### **Next Steps After v4.9.307 Validation**

**If users confirm v4.9.307 fixes their issues:**
- ✅ Proceed with Phase 3 enhancements
- ✅ Implement capability map generation
- ✅ Add integration test fixtures

**If users report new issues:**
- ⚠️ Prioritize fixing those issues first
- ⚠️ Use `analyze_diagnostics.js` to detect patterns
- ⚠️ Wait before adding new features

---

## 🔧 **Usage Examples**

### **Analyzing User Diagnostic Reports**

When you receive a diagnostic report email:

```bash
# 1. Copy log to file
cat > user_diagnostic.log
# Paste log content, press Ctrl+D

# 2. Analyze
node scripts/analyze_diagnostics.js user_diagnostic.log

# 3. Get recommendations
# Script will show:
# - Detected issues (CRITICAL/HIGH/MEDIUM)
# - Device information
# - Recommended actions (update to vX.X.X, remove/re-add device, etc.)
```

### **Finding When a Feature Was Added**

```bash
# 1. Run history scan
bash scripts/scan_history.sh

# 2. Check improvements summary
cat .artifacts/improvements_summary.txt

# 3. Grep for specific feature
grep -i "usb.*outlet" .artifacts/git_commits.log
```

### **Checking Recent Fixes**

```bash
# Quick summary of last 5 versions
node scripts/version_summary.js
```

---

## 📚 **References**

- [Homey Apps SDK v3 Documentation](https://apps-sdk-v3.developer.homey.app/)
- [GitHub Actions Workflow](.github/workflows/homey-publish.yml)
- [Smart-Adapt Implementation](../lib/SmartDriverAdaptation.js)
- [Device Base Class](../lib/devices/BaseHybridDevice.js)

---

## 🆘 **Troubleshooting**

### **Script permissions (Linux/Mac)**
```bash
chmod +x scripts/*.sh
```

### **Missing .artifacts directory**
```bash
mkdir -p .artifacts
```

### **Node.js not found**
```bash
# Install Node.js 18+
# https://nodejs.org/
```

---

**Last Updated:** 2025-11-07 (v4.9.307 release)
