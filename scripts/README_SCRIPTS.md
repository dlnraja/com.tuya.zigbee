# 📚 SCRIPTS DOCUMENTATION

**Last Updated**: 2 Novembre 2025  
**Version**: v4.9.259

---

## 🎯 OVERVIEW

This directory contains all automation scripts based on discovered patterns and best practices. All scripts follow the consolidated discoveries documented in `docs/DISCOVERIES_CONSOLIDATED.md`.

---

## 📁 DIRECTORY STRUCTURE

```
scripts/
├── master/               # Master scripts (apply all)
│   └── apply-all-discoveries.js
├── fixes/               # Specific fix scripts
│   ├── unbrand-harmonize-fix.js
│   ├── fix-json-quotes.js
│   ├── complete-unbrand-fix.js
│   ├── update-app-json-drivers.js
│   └── update-flow-compose-files.js
├── validation/          # Validation scripts
│   └── validate-all-discoveries.js
├── automation/          # Automation scripts
└── utils/              # Utility scripts
```

---

## 🚀 MASTER SCRIPTS

### apply-all-discoveries.js

**Purpose**: Apply ALL discovered patterns and fixes to entire app

**Location**: `scripts/master/apply-all-discoveries.js`

**Usage**:
```bash
# Apply all fixes
node scripts/master/apply-all-discoveries.js

# Dry run (preview changes)
node scripts/master/apply-all-discoveries.js --dry-run

# Verbose output
node scripts/master/apply-all-discoveries.js --verbose

# Dry run + verbose
node scripts/master/apply-all-discoveries.js --dry-run --verbose
```

**What It Does**:
1. ✅ Unbrand terminology (remove "hybrid", brand names)
2. ✅ Clean translations (simplify parentheses)
3. ✅ Fix JSON formatting (quotes, structure)
4. ✅ Harmonize capabilities (onoff.button → onoff.gang)
5. ✅ Validate architecture
6. ✅ Run Homey validation
7. ✅ Generate report

**Output**: `reports/master-script-report.json`

---

## 🔧 FIX SCRIPTS

### unbrand-harmonize-fix.js

**Purpose**: Remove brand terminology and harmonize naming

**Location**: `scripts/fixes/unbrand-harmonize-fix.js`

**What It Fixes**:
- Removes "Hybrid" from driver names
- Removes brand names (MOES, Nedis, etc.)
- Renames driver folders
- Updates all references
- Simplifies translations

**Usage**:
```bash
node scripts/fixes/unbrand-harmonize-fix.js
```

---

### fix-json-quotes.js

**Purpose**: Fix single quotes → double quotes in JSON

**Location**: `scripts/fixes/fix-json-quotes.js`

**What It Fixes**:
- `'_TZ3000_xxx'` → `"_TZ3000_xxx"`
- Validates JSON after fix

**Usage**:
```bash
node scripts/fixes/fix-json-quotes.js
```

---

### complete-unbrand-fix.js

**Purpose**: Complete app.json update for renamed drivers

**Location**: `scripts/fixes/complete-unbrand-fix.js`

**What It Fixes**:
- Updates driver IDs in app.json
- Updates flow card filters
- Updates flow card IDs
- Updates image paths
- Updates learnmode paths

**Usage**:
```bash
node scripts/fixes/complete-unbrand-fix.js
```

---

### update-app-json-drivers.js

**Purpose**: Update drivers array in app.json

**Location**: `scripts/fixes/update-app-json-drivers.js`

**What It Fixes**:
- Updates driver IDs
- Updates basic flow references

**Usage**:
```bash
node scripts/fixes/update-app-json-drivers.js
```

---

### update-flow-compose-files.js

**Purpose**: Update driver.flow.compose.json files

**Location**: `scripts/fixes/update-flow-compose-files.js`

**What It Fixes**:
- Updates internal driver references
- Fixes flow card definitions

**Usage**:
```bash
node scripts/fixes/update-flow-compose-files.js
```

---

## ✅ VALIDATION SCRIPTS

### validate-all-discoveries.js

**Purpose**: Validate entire app against best practices

**Location**: `scripts/validation/validate-all-discoveries.js`

**What It Checks**:
1. ✅ Driver naming conventions
2. ✅ Unbranded terminology
3. ✅ Driver structure (required files)
4. ✅ JSON validity
5. ✅ Capability patterns
6. ✅ Manufacturer ID format
7. ✅ Translation cleanliness
8. ✅ Settings labels

**Usage**:
```bash
node scripts/validation/validate-all-discoveries.js
```

**Output**: 
- Console report
- `reports/validation/validation-report-[timestamp].json`

**Exit Codes**:
- `0` = All valid or only warnings
- `1` = Errors found

---

## 📚 UTILITY LIBRARY

### DriverUtils.js

**Purpose**: Reusable utility functions based on discoveries

**Location**: `lib/utils/DriverUtils.js`

**Functions**:

#### Unbranding
```javascript
DriverUtils.unbrandText(text)           // Remove brand terms
DriverUtils.isUnbranded(driverName)     // Check if unbranded
```

#### Translation Cleaning
```javascript
DriverUtils.cleanLabel(label)           // Clean labels
DriverUtils.cleanBatteryLabel(label)    // Clean battery labels
```

#### JSON Validation
```javascript
DriverUtils.fixJsonQuotes(content)      // Fix quotes
DriverUtils.safeJsonParse(content)      // Safe parse
DriverUtils.isValidJson(filePath)       // Validate file
```

#### Capability Harmonization
```javascript
DriverUtils.harmonizeCapability(cap)    // Fix capability name
DriverUtils.getGangCount(capabilities)  // Get gang count
DriverUtils.validateMultiGang(caps)     // Validate multi-gang
```

#### Naming Conventions
```javascript
DriverUtils.parseDriverName(name)       // Parse components
DriverUtils.extractGangCount(name)      // Extract gang count
DriverUtils.validateDriverName(name)    // Validate naming
```

#### Path Management
```javascript
DriverUtils.updatePaths(old, new, content)  // Update paths
```

#### Architecture Validation
```javascript
DriverUtils.validateDriverStructure(path)   // Validate structure
DriverUtils.getDriverCompose(path)          // Get compose JSON
DriverUtils.saveDriverCompose(path, data)   // Save compose JSON
```

#### Manufacturer IDs
```javascript
DriverUtils.isValidManufacturerId(id)       // Validate ID
DriverUtils.uniqueManufacturerIds(ids)      // Get unique IDs
```

#### Flow Cards
```javascript
DriverUtils.generateFlowCardId(...)         // Generate ID
DriverUtils.parseFlowCardId(id)             // Parse ID
```

#### Utilities
```javascript
DriverUtils.cleanCache(appPath)             // Clean cache
DriverUtils.backupFile(filePath)            // Backup file
```

**Usage**:
```javascript
const DriverUtils = require('./lib/utils/DriverUtils');

// Example: Clean label
const cleaned = DriverUtils.cleanLabel('Battery Type (3V)');
// Result: "Battery Type"

// Example: Validate driver
const validation = DriverUtils.validateDriverName('switch_hybrid_2gang');
// Result: { valid: false, violations: ['noHybrid'] }
```

---

## 🔄 WORKFLOW

### Standard Workflow

```bash
# 1. Validate current state
node scripts/validation/validate-all-discoveries.js

# 2. Apply all fixes
node scripts/master/apply-all-discoveries.js

# 3. Validate again
node scripts/validation/validate-all-discoveries.js

# 4. Test with Homey
homey app validate --level publish

# 5. Commit if all passed
git add -A
git commit -m "refactor: Apply all discoveries"
git push origin master
```

### Safe Workflow (with dry-run)

```bash
# 1. Validate
node scripts/validation/validate-all-discoveries.js

# 2. Preview changes
node scripts/master/apply-all-discoveries.js --dry-run --verbose

# 3. Apply if preview looks good
node scripts/master/apply-all-discoveries.js

# 4. Validate
node scripts/validation/validate-all-discoveries.js

# 5. Homey validate
homey app validate --level publish
```

### Fix Specific Issues

```bash
# Fix only JSON quotes
node scripts/fixes/fix-json-quotes.js

# Fix only app.json references
node scripts/fixes/complete-unbrand-fix.js

# Fix only flow compose files
node scripts/fixes/update-flow-compose-files.js
```

---

## 📊 REPORTS

### master-script-report.json

**Location**: `reports/master-script-report.json`

**Content**:
```json
{
  "date": "2025-11-02T00:30:00.000Z",
  "stats": {
    "driversProcessed": 186,
    "translationsFixed": 149,
    "jsonFixed": 1,
    "errors": []
  },
  "config": {
    "dryRun": false,
    "verbose": false
  }
}
```

### validation-report-[timestamp].json

**Location**: `reports/validation/validation-report-[timestamp].json`

**Content**:
```json
{
  "drivers": [
    {
      "name": "switch_1gang",
      "valid": true,
      "warnings": [],
      "errors": []
    }
  ],
  "summary": {
    "total": 186,
    "valid": 180,
    "warnings": 5,
    "errors": 1
  },
  "issues": {
    "branding": [],
    "naming": [],
    "translations": [],
    "json": [],
    "capabilities": [],
    "structure": [],
    "manufacturerIds": []
  }
}
```

---

## 🎯 BEST PRACTICES

### Before Running Scripts

1. ✅ Commit current work
2. ✅ Use `--dry-run` first
3. ✅ Review changes
4. ✅ Backup if unsure

### After Running Scripts

1. ✅ Validate with validation script
2. ✅ Test with `homey app validate`
3. ✅ Review reports
4. ✅ Commit atomically

### Script Development

1. ✅ Use DriverUtils library
2. ✅ Follow discovered patterns
3. ✅ Add validation
4. ✅ Generate reports
5. ✅ Document in this README

---

## 🔮 FUTURE SCRIPTS

### Planned

- [ ] `auto-generate-flow-cards.js` - Auto-generate flow cards
- [ ] `consolidate-drivers.js` - Merge similar drivers
- [ ] `optimize-manufacturer-ids.js` - Optimize ID lists
- [ ] `generate-driver-matrix.js` - Generate capability matrix
- [ ] `auto-format-all.js` - Auto-format all JSON files

---

## 🐛 TROUBLESHOOTING

### Script Fails with JSON Error

```bash
# Fix JSON quotes first
node scripts/fixes/fix-json-quotes.js

# Then retry
node scripts/master/apply-all-discoveries.js
```

### Validation Fails After Fix

```bash
# Clean cache
rm -rf .homeycompose .homeybuild assets/drivers.json

# Validate again
homey app validate --level publish
```

### Dry-run Shows Too Many Changes

```bash
# Run verbose to see details
node scripts/master/apply-all-discoveries.js --dry-run --verbose

# Review each type of change
# Apply fixes incrementally if needed
```

---

## 📞 SUPPORT

**Documentation**:
- Discoveries: `docs/DISCOVERIES_CONSOLIDATED.md`
- Report: `UNBRAND_HARMONIZATION_REPORT.md`

**Issues**: Check `reports/` directory for detailed error messages

**Updates**: This README is updated when new scripts are added

---

**Last Updated**: 2 Novembre 2025  
**Version**: v4.9.259  
**Status**: ✅ PRODUCTION READY
