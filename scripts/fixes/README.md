# Fix Scripts Documentation

Comprehensive automated fix scripts for the Homey Tuya Zigbee app.

## 📋 Table of Contents

- [Overview](#overview)
- [Master Scripts](#master-scripts)
- [Individual Fix Scripts](#individual-fix-scripts)
- [Check Scripts](#check-scripts)
- [Usage](#usage)
- [CI/CD Integration](#cicd-integration)

---

## 🎯 Overview

These scripts automatically detect and fix common issues that cause build and validation failures:

1. **Double Suffixes** - Folders named `driver_aaa_aaa` instead of `driver_aaa`
2. **Duplicate Device Args** - Multiple device arguments in flow cards (Homey CLI adds them automatically)
3. **Orphaned [[device]] Refs** - `[[device]]` in titleFormatted when no device arg exists
4. **Inconsistent app.json** - References to old folder names after renaming

---

## 🎛️ Master Scripts

### `MASTER_FIX_ALL.js` (Recommended)

**Complete automated fix suite** - Runs all fixes in correct order.

```bash
node scripts/fixes/MASTER_FIX_ALL.js
```

**Steps performed:**
1. ✅ Fix double suffix folder names (31 patterns)
2. ✅ Fix `driver.compose.json` IDs and image paths
3. ✅ Remove device args from `driver.flow.compose.json`
4. ✅ Fix orphaned `[[device]]` in titleFormatted
5. ✅ Rebuild `app.json` from source
6. ✅ Fix remaining double suffixes in `app.json`
7. ✅ Validate at publish level

**Exit codes:**
- `0` - All fixes applied successfully
- `1` - One or more steps failed

---

### `MASTER_FIX_ALL.ps1`

PowerShell version of the master script (Windows).

```powershell
.\scripts\fixes\MASTER_FIX_ALL.ps1
```

**Options:**
- `-SkipValidation` - Skip final validation step

---

## 🔧 Individual Fix Scripts

### `RENAME_DOUBLE_SUFFIX_FOLDERS.js`

Renames folders with double suffixes and updates all references.

**Patterns fixed:**
- `ikea_ikea_*` → `ikea_*`
- `*_aaa_aaa` → `*_aaa`
- `*_aa_aa` → `*_aa`
- `*_internal_internal` → `*_internal`
- `*_other_other` → `*_other`

**Updates:**
- Folder names in `drivers/`
- Driver IDs in `app.json`
- Flow card filters in `app.json`

```bash
node scripts/fixes/RENAME_DOUBLE_SUFFIX_FOLDERS.js
```

---

### `FIX_DRIVER_COMPOSE_IDS.js`

Fixes double suffixes in `driver.compose.json` files.

**Fixes:**
- Driver IDs
- Image paths
- Learnmode image paths

```bash
node scripts/fixes/FIX_DRIVER_COMPOSE_IDS.js
```

---

### `REMOVE_DEVICE_ARGS_FROM_COMPOSE.js`

Removes manual device arguments from `driver.flow.compose.json`.

**Why?** Homey CLI automatically adds device args based on folder name. Manual args cause duplicates.

**Processes:**
- Actions
- Triggers
- Conditions

```bash
node scripts/fixes/REMOVE_DEVICE_ARGS_FROM_COMPOSE.js
```

---

### `FIX_TITLEFORMATTED_DEVICE_REFS.js`

Removes orphaned `[[device]]` references in titleFormatted strings.

**Example:**
```json
// Before
"titleFormatted": {
  "en": "Mode is... [[device]] [[mode]]"
}

// After (when no device arg exists)
"titleFormatted": {
  "en": "Mode is... [[mode]]"
}
```

```bash
node scripts/fixes/FIX_TITLEFORMATTED_DEVICE_REFS.js
```

---

### `REBUILD_APP_JSON.js`

Rebuilds `app.json` from `.homeycompose` source.

**Steps:**
1. Delete old `app.json`
2. Create stub from `.homeycompose/app.json`
3. Run `homey app build`
4. Verify new `app.json`

```bash
node scripts/fixes/REBUILD_APP_JSON.js
```

---

### `SIMPLE_FIX_DOUBLE_SUFFIXES.js`

String replacement fix for double suffixes in `app.json`.

**Use case:** Quick fix after rebuild when some suffixes remain.

```bash
node scripts/fixes/SIMPLE_FIX_DOUBLE_SUFFIXES.js
```

---

## 🔍 Check Scripts

### `CHECK_DOUBLE_SUFFIXES.js`

Scans entire project for double suffix patterns.

**Returns:**
- Exit code `0` - No issues found
- Exit code `1` - Issues detected (with details)

```bash
node scripts/fixes/CHECK_DOUBLE_SUFFIXES.js
```

---

### `CHECK_DUPLICATE_DEVICE_ARGS.js`

Checks for duplicate device arguments in flow cards.

**Example output:**
```
❌ Found 65 actions with duplicate "device" arguments:

  - action_id
    Device count: 2
    Device 1: driver_id=driver1
    Device 2: driver_id=driver2
```

```bash
node scripts/fixes/CHECK_DUPLICATE_DEVICE_ARGS.js
```

---

### `COUNT_DOUBLE_SUFFIXES.js`

Quick count of double suffix occurrences in `app.json`.

```bash
node scripts/fixes/COUNT_DOUBLE_SUFFIXES.js
# Output: 86
```

---

## 💻 Usage

### Quick Fix (Recommended)

```bash
# Run complete fix suite
node scripts/fixes/MASTER_FIX_ALL.js

# Or PowerShell version
.\scripts\fixes\MASTER_FIX_ALL.ps1
```

### Manual Step-by-Step

```bash
# 1. Check for issues
node scripts/fixes/CHECK_DOUBLE_SUFFIXES.js
node scripts/fixes/CHECK_DUPLICATE_DEVICE_ARGS.js

# 2. Apply fixes
node scripts/fixes/RENAME_DOUBLE_SUFFIX_FOLDERS.js
node scripts/fixes/FIX_DRIVER_COMPOSE_IDS.js
node scripts/fixes/REMOVE_DEVICE_ARGS_FROM_COMPOSE.js
node scripts/fixes/FIX_TITLEFORMATTED_DEVICE_REFS.js

# 3. Rebuild and validate
node scripts/fixes/REBUILD_APP_JSON.js
npx homey app validate --level publish
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
echo "Running pre-commit checks..."
node scripts/fixes/CHECK_DOUBLE_SUFFIXES.js || exit 1
node scripts/fixes/CHECK_DUPLICATE_DEVICE_ARGS.js || exit 1
echo "✅ Pre-commit checks passed"
```

---

## 🚀 CI/CD Integration

### GitHub Actions

The improved workflow (`.github/workflows/homey-official-publish-improved.yml`) includes:

1. **Pre-flight Job** - Automatically detects and fixes issues
2. **Validation Job** - Runs check scripts before validation
3. **Publish Job** - Final checks before publishing

**Key features:**
- Auto-fixes applied with `[auto-fix]` commit
- Retry logic for git operations
- Comprehensive logging
- Fail-fast on validation errors

### Local Testing Before Push

```bash
# Run all checks
npm test

# Or manual
node scripts/fixes/MASTER_FIX_ALL.js
git add -A
git commit -m "fix: Applied automated fixes"
git push
```

---

## 📊 Statistics

Based on the latest fix run:

| Metric | Count |
|--------|-------|
| Folders renamed | 31 |
| driver.compose.json fixed | 31 |
| Device args removed | 374 |
| titleFormatted fixed | 748 |
| app.json suffixes fixed | 86 |

**Total fixes:** 1,270+ automated corrections

---

## 🐛 Troubleshooting

### Issue: "ENOENT: no such file or directory"

**Cause:** Script running before folders are renamed.

**Fix:** Run `MASTER_FIX_ALL.js` which handles dependencies.

---

### Issue: "app.json is not valid JSON"

**Cause:** Partial fix applied.

**Fix:**
```bash
git stash
node scripts/fixes/MASTER_FIX_ALL.js
```

---

### Issue: "Validation failed after fixes"

**Cause:** New issues introduced or incomplete fix.

**Fix:**
```bash
# Check what's wrong
npx homey app validate --level publish

# Re-run master fix
node scripts/fixes/MASTER_FIX_ALL.js
```

---

## 📝 Notes

- **Always run `MASTER_FIX_ALL.js` instead of individual scripts** unless debugging
- Scripts are **idempotent** - safe to run multiple times
- **Backup not needed** - scripts modify in-place but git tracks changes
- `.homeycompose/` is in `.gitignore` - fixes apply to source files in `drivers/`
- Scripts designed for **SDK3** compliance

---

## 🔗 Related Documentation

- [Homey SDK3 Documentation](https://apps-sdk-v3.developer.homey.app/)
- [Main Project README](../../README.md)
- [GitHub Actions Workflow](.github/workflows/homey-official-publish-improved.yml)

---

## ✨ Changelog

### v1.0.0 - 2025-01-21
- Initial comprehensive fix suite
- Master script with 7-step process
- PowerShell version for Windows
- Improved GitHub Actions workflow
- Complete documentation

---

**Last Updated:** 2025-01-21  
**Maintainer:** Dylan Rajasekaram
