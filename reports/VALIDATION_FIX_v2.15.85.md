# 🔧 VALIDATION FIX - v2.15.85

**Date**: 2025-10-14T01:22:00+02:00  
**Issue**: GitHub Actions validation failed  
**Status**: ✅ **FIXED**

---

## ❌ Error Found

**GitHub Actions Validation**:
```
✖ App did not validate against level `publish` :
✖ Filepath does not exist: /assets/temp_alarm.svg
```

**Cause**:
During assets cleanup, `temp_alarm.svg` was moved from `/assets/` to `/assets/templates/`, but it's **actively used** in `app.json` as a capability icon.

**Location in app.json** (line 26490):
```json
{
  "getable": true,
  "setable": false,
  "uiComponent": "sensor",
  "icon": "/assets/temp_alarm.svg"
}
```

---

## ✅ Solution Applied

### Action 1: Restored File
- **Copied**: `assets/templates/temp_alarm.svg` → `assets/temp_alarm.svg`
- **Reason**: File must be accessible at `/assets/temp_alarm.svg` for app.json reference
- **Status**: ✅ File restored

### Action 2: Updated Documentation
- **Updated**: `assets/README.md`
- **Added**: Warning that `temp_alarm.svg` must stay in `/assets/` root
- **Note**: Templates folder keeps a copy as source

### Action 3: Created Fix Script
- **Script**: `FIX_VALIDATION_ERRORS.js`
- **Purpose**: Automatically detect and fix validation errors
- **Usage**: `node scripts/automation/FIX_VALIDATION_ERRORS.js`

---

## 📂 Corrected Assets Structure

```
assets/
├── images/              # App images (PNG only)
│   ├── small.png
│   ├── large.png
│   └── xlarge.png
│
├── icons/              # Reusable icons and badges
│   ├── power-ac.svg
│   ├── power-battery.svg
│   ├── power-battery-low.svg
│   └── placeholder.svg
│
├── temp_alarm.svg      # ⚠️ MUST BE HERE (used in app.json)
│
└── templates/          # Source SVG files
    ├── icon.svg
    ├── small.svg
    ├── large.svg
    ├── xlarge.svg
    └── temp_alarm.svg  # Source copy
```

---

## 🔍 Validation Rules

### Files That MUST Be In /assets/ Root
1. ✅ `temp_alarm.svg` - Used as capability icon in app.json

### Files That Can Be In /assets/templates/
- All other SVG source files
- Design templates
- Category icon sources

### Rule
**If a file is referenced in app.json or driver.compose.json, it must be at the specified path!**

---

## ✅ Verification

### Before Fix ❌
```
✖ Filepath does not exist: /assets/temp_alarm.svg
```

### After Fix ✅
```
✓ Pre-processing app...
✓ Validating app...
✓ App validated successfully!
```

---

## 🚀 GitHub Actions

**Commit**: 8ccbe4dd7  
**Push**: ✅ Sent to GitHub  
**Validation**: ⏳ Running...  
**Expected**: ✅ PASS

---

## 📊 Summary

| Item | Status |
|------|--------|
| **Error identified** | ✅ |
| **Root cause found** | ✅ |
| **File restored** | ✅ |
| **Documentation updated** | ✅ |
| **Fix script created** | ✅ |
| **Changes committed** | ✅ |
| **Pushed to GitHub** | ✅ |
| **Validation pending** | ⏳ |

---

## 💡 Lessons Learned

1. **Always verify references** before moving files
2. **Check app.json** for hardcoded asset paths
3. **Test validation** after structural changes
4. **Document exceptions** to standard folder structure

---

## 🛠️ Prevention

**Created Tool**: `FIX_VALIDATION_ERRORS.js`

**Features**:
- Detects missing asset files
- Checks all required paths
- Auto-fixes common issues
- Generates validation report

**Usage**:
```bash
node scripts/automation/FIX_VALIDATION_ERRORS.js
```

---

**Status**: ✅ **VALIDATION FIX COMPLETE**  
**Next**: Wait for GitHub Actions to confirm ✅

---

**Maintainer**: Dylan (dlnraja)  
**Repository**: https://github.com/dlnraja/com.tuya.zigbee  
**Version**: v2.15.85
