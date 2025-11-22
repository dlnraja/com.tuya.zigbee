# 📜 Scripts Documentation - Universal Tuya Zigbee

**Version:** 2.1.51  
**Last Updated:** 2025-10-11  
**Status:** Production Ready

---

## 🎯 Overview

This directory contains all automation, validation, and maintenance scripts for the Universal Tuya Zigbee project.

---

## 📁 Directory Structure

```
scripts/
├── automation/           # Publication & deployment
├── analysis/            # Code analysis & verification
├── fixes/               # Automatic fixes
├── generation/          # Code generators
├── monitoring/          # Runtime monitoring
├── parsing/             # Data parsers
├── promotion/           # Build promotion
└── verification/        # Validation scripts
```

---

## 🚀 Publication Scripts

### `automation/publish-homey-official.ps1` ⭐ RECOMMENDED

**Purpose:** Local publication using official Homey CLI

**Usage:**
```powershell
# Standard publication
.\scripts\automation\publish-homey-official.ps1

# Minor version bump
.\scripts\automation\publish-homey-official.ps1 -VersionType minor

# With custom changelog
.\scripts\automation\publish-homey-official.ps1 -Changelog "Added 20 new devices"

# Dry run (test without publishing)
.\scripts\automation\publish-homey-official.ps1 -DryRun

# Skip validation
.\scripts\automation\publish-homey-official.ps1 -SkipValidation
```

**Features:**
- ✅ Pre-flight checks (Node.js, Homey CLI)
- ✅ Automatic cache cleaning
- ✅ Validation at publish level
- ✅ Interactive CLI prompts
- ✅ Next steps instructions

---

## 🔍 Analysis Scripts

### `ULTIMATE_DIAGNOSTIC_AND_REPAIR.js`

**Purpose:** Complete diagnostic and automatic repair

**Usage:**
```bash
node ULTIMATE_DIAGNOSTIC_AND_REPAIR.js
```

**Actions:**
- Analyzes all 164 drivers
- Detects capability issues
- Fixes manufacturer ID problems
- Repairs Zigbee cluster configurations
- Validates energy.batteries
- Generates diagnostic report

### `ULTIMATE_DRIVER_AUDIT.js`

**Purpose:** Comprehensive driver audit

**Usage:**
```bash
node ULTIMATE_DRIVER_AUDIT.js
```

**Checks:**
- Driver structure compliance
- SDK3 requirements
- Image presence and sizes
- Manufacturer ID completeness
- Product ID format

### `FINAL_COHERENCE_CHECK.js`

**Purpose:** Final validation before publication

**Usage:**
```bash
node FINAL_COHERENCE_CHECK.js
```

**Validates:**
- All drivers have correct endpoints
- No capability conflicts
- Images are correct sizes
- app.json sync with drivers

---

## 🔧 Fix Scripts

### `AUTO_FIX_DRIVERS.js`

**Purpose:** Automatic driver fixes

**Usage:**
```bash
node scripts/AUTO_FIX_DRIVERS.js
```

**Fixes:**
- Missing capabilities
- Incorrect Zigbee clusters
- Battery configuration
- Image references

### `FIX_ALL_IMAGES.js`

**Purpose:** Fix and regenerate all driver images

**Usage:**
```bash
node scripts/FIX_ALL_IMAGES.js
```

**Actions:**
- Verifies image existence
- Checks image dimensions
- Regenerates missing images
- Validates format (PNG)

### `CLEAN_APP_JSON.js`

**Purpose:** Clean and optimize app.json

**Usage:**
```bash
node scripts/CLEAN_APP_JSON.js
```

**Optimizations:**
- Removes duplicates
- Sorts arrays
- Validates structure
- Formats JSON

---

## 🎨 Generation Scripts

### `REGENERATE_ALL_CONTEXTUAL_IMAGES.js`

**Purpose:** Generate contextual images per category

**Usage:**
```bash
node scripts/REGENERATE_ALL_CONTEXTUAL_IMAGES.js
```

**Features:**
- Johan Bendz design standards
- Category-based colors
- Professional gradients
- All sizes (75x75, 500x500, 1000x1000)

### `ULTIMATE_IMAGE_GENERATOR_V2.js`

**Purpose:** Advanced image generation with AI context

**Usage:**
```bash
node scripts/ULTIMATE_IMAGE_GENERATOR_V2.js
```

**Capabilities:**
- Device type recognition
- Contextual color selection
- SVG to PNG conversion
- Batch processing

---

## ✅ Validation Scripts

### `ULTIMATE_VALIDATION_AND_FIX_ALL.js`

**Purpose:** Ultimate validation + auto-fix

**Usage:**
```bash
node scripts/ULTIMATE_VALIDATION_AND_FIX_ALL.js
```

**Process:**
1. Validates all drivers
2. Detects issues
3. Applies automatic fixes
4. Re-validates
5. Generates report

### `PRE_COMMIT_CHECKS.js`

**Purpose:** Pre-commit validation

**Usage:**
```bash
node scripts/PRE_COMMIT_CHECKS.js
```

**Checks:**
- Homey CLI validation
- JSON syntax
- Driver structure
- Image presence
- Git status clean

---

## 📊 Monitoring Scripts

### `monitoring/CONTINUOUS_VALIDATOR.js`

**Purpose:** Continuous validation during development

**Usage:**
```bash
node scripts/monitoring/CONTINUOUS_VALIDATOR.js
```

**Features:**
- File watcher
- Automatic validation on changes
- Real-time feedback
- Error notifications

---

## 🏗️ Master Scripts

### `ULTRA_MASTER_SYSTEM.js`

**Purpose:** Complete orchestration system

**Usage:**
```bash
node scripts/ULTRA_MASTER_SYSTEM.js
```

**Capabilities:**
- Full project audit
- Automatic enrichment
- Driver organization
- Publication preparation
- Git operations

### `MASTER_AUTONOMOUS_SYSTEM.js`

**Purpose:** Autonomous maintenance system

**Usage:**
```bash
node scripts/MASTER_AUTONOMOUS_SYSTEM.js
```

**Functions:**
- Scheduled checks
- Automatic updates
- Issue detection
- Self-healing
- Reporting

---

## 🔄 CI/CD Scripts

### GitHub Actions Integration

All scripts are compatible with GitHub Actions:

```yaml
- name: Run Validation
  run: node scripts/ULTIMATE_VALIDATION_AND_FIX_ALL.js

- name: Fix Issues
  run: node scripts/AUTO_FIX_DRIVERS.js

- name: Generate Images
  run: node scripts/REGENERATE_ALL_CONTEXTUAL_IMAGES.js
```

See `.github/workflows/` for complete workflows.

---

## 📝 Script Development Guidelines

### Creating New Scripts

1. **Follow naming convention:**
   - `VERB_NOUN_ACTION.js` (e.g., `FIX_DRIVER_IMAGES.js`)
   - Use UPPERCASE for master scripts
   - Use lowercase for utilities

2. **Include header:**
```javascript
/**
 * SCRIPT_NAME.js
 * Purpose: Brief description
 * Usage: node scripts/SCRIPT_NAME.js
 * Author: Dylan Rajasekaram
 * Last Updated: YYYY-MM-DD
 */
```

3. **Error handling:**
```javascript
try {
  // Script logic
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
```

4. **Progress feedback:**
```javascript
console.log('🚀 Starting process...');
console.log('✅ Step 1 completed');
console.log('⚠️ Warning: issue detected');
console.log('❌ Error occurred');
```

---

## 🧪 Testing Scripts

Before committing new scripts:

```bash
# 1. Syntax check
node --check scripts/YOUR_SCRIPT.js

# 2. Dry run
node scripts/YOUR_SCRIPT.js --dry-run

# 3. Test on subset
node scripts/YOUR_SCRIPT.js --test

# 4. Full run
node scripts/YOUR_SCRIPT.js
```

---

## 🔗 Script Dependencies

Common dependencies used across scripts:

```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// For image generation
const canvas = require('canvas');

// For Homey operations
// Uses Homey CLI commands via execSync
```

---

## 📊 Script Metrics

```
Total Scripts: 78+
  - Automation: 2
  - Analysis: 7
  - Fixes: 6
  - Generation: 4
  - Validation: 4
  - Monitoring: 1
  - Master: 10+
  - Utilities: 40+
```

---

## 🆘 Troubleshooting

### Script fails with "Module not found"

```bash
npm install
```

### Script hangs or times out

Check for:
- Large file operations
- Network requests
- Infinite loops

Add timeout:
```javascript
const timeout = setTimeout(() => {
  console.error('⏱️ Script timeout');
  process.exit(1);
}, 60000); // 60 seconds

// Clear timeout when done
clearTimeout(timeout);
```

### Permission errors

Windows PowerShell:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🔗 Related Documentation

- **Publication:** [PUBLICATION_GUIDE_OFFICIELLE.md](../PUBLICATION_GUIDE_OFFICIELLE.md)
- **Contributing:** [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Workflows:** [.github/workflows/OFFICIAL_WORKFLOWS_GUIDE.md](../.github/workflows/OFFICIAL_WORKFLOWS_GUIDE.md)

---

## 📞 Support

**Issues:** https://github.com/dlnraja/com.tuya.zigbee/issues  
**Forum:** https://community.homey.app/t/140352/

---

**Last Updated:** 2025-10-11  
**Maintainer:** Dylan Rajasekaram
