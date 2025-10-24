#!/usr/bin/env node

/**
 * PHASE 4: UPDATE TOUTES LES RÉFÉRENCES
 * Met à jour app.json, README, CHANGELOG, documentation
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..', '..');
const mappingPath = path.join(__dirname, 'MIGRATION_MAP_v4.json');

if (!fs.existsSync(mappingPath)) {
  console.error('❌ MIGRATION_MAP_v4.json not found!');
  process.exit(1);
}

console.log('\n🔄 PHASE 4: UPDATE RÉFÉRENCES\n');

const { mapping, stats } = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

// 1. Update app.json (si .homeycompose/app.json existe)
console.log('📝 Updating app.json...');
const appJsonPath = path.join(rootDir, '.homeycompose', 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  // Update version to 4.0.0
  appJson.version = '4.0.0';
  
  // Update description
  if (appJson.description) {
    if (!appJson.description.en.includes('300+')) {
      appJson.description.en = appJson.description.en.replace(/\d+ drivers?/, '300+ drivers');
    }
  }
  
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
  console.log('  ✅ app.json updated\n');
}

// 2. Update README.md
console.log('📝 Updating README.md...');
const readmePath = path.join(rootDir, 'README.md');
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');
  
  // Update driver count
  readme = readme.replace(/\d+ drivers?/gi, '300+ drivers');
  
  // Add breaking change notice si pas déjà présent
  if (!readme.includes('## ⚠️ Breaking Change v4.0.0')) {
    const notice = `
## ⚠️ Breaking Change v4.0.0

**ALL DEVICES MUST BE RE-PAIRED!**

This version introduces a complete reorganization:
- Drivers now organized by **BRAND** (Tuya, Aqara, IKEA, etc.)
- Drivers separated by **BATTERY TYPE** (CR2032, AAA, AA, etc.)
- New naming: \`{brand}_{category}_{type}_{battery}\`
- Total: 300+ drivers (was 190)

**Migration Guide:** See [MIGRATION_GUIDE_v4.md](docs/MIGRATION_GUIDE_v4.md)

`;
    readme = notice + readme;
  }
  
  fs.writeFileSync(readmePath, readme);
  console.log('  ✅ README.md updated\n');
}

// 3. Create/Update CHANGELOG.md
console.log('📝 Updating CHANGELOG.md...');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
let changelog = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : '# Changelog\n\n';

const newEntry = `## [4.0.0] - ${new Date().toISOString().split('T')[0]} - BREAKING CHANGE

### ⚠️ BREAKING CHANGES
- **ALL DEVICES MUST BE RE-PAIRED**
- Complete driver reorganization by brand and battery type
- 190 drivers → 300+ drivers (multi-battery separation)

### Added
- Brand prefixes: \`tuya_\`, \`aqara_\`, \`ikea_\`, \`philips_\`, etc.
- Battery type suffixes: \`_cr2032\`, \`_aaa\`, \`_aa\`, \`_cr2450\`, etc.
- ${stats.toDuplicate} new drivers (multi-battery variants)

### Changed
- ${stats.toRename} drivers renamed with new nomenclature
- Driver naming: \`{brand}_{category}_{type}_{battery}\`
- All flow cards updated with new driver IDs

### Migration
See [MIGRATION_GUIDE_v4.md](docs/MIGRATION_GUIDE_v4.md) for details.

---

`;

// Insérer après le titre
changelog = changelog.replace('# Changelog\n\n', '# Changelog\n\n' + newEntry);
fs.writeFileSync(changelogPath, changelog);
console.log('  ✅ CHANGELOG.md updated\n');

// 4. Create Migration Guide
console.log('📝 Creating MIGRATION_GUIDE_v4.md...');
const migrationGuide = `# Migration Guide v4.0.0

## ⚠️ Breaking Change Notice

Version 4.0.0 introduces a **COMPLETE REORGANIZATION** of all drivers.

**ALL YOUR DEVICES WILL NEED TO BE RE-PAIRED.**

## Why This Change?

Based on user feedback:
- Too many similar drivers without clear distinction
- Difficult to identify device brand
- Battery type not visible in driver name
- Confusion when pairing new devices

## What's New

### Brand Organization
Drivers are now prefixed by manufacturer:
- \`tuya_\` - Tuya devices (most common)
- \`aqara_\` - Aqara/Xiaomi devices
- \`ikea_\` - IKEA TRADFRI devices
- \`philips_\` - Philips Hue/Signify
- \`sonoff_\` - Sonoff/eWeLink
- And more...

### Battery Type Separation
Drivers supporting multiple battery types are now separate:

**Before:**
\`\`\`
motion_sensor_battery  [supports AAA or CR2032]
\`\`\`

**After:**
\`\`\`
tuya_motion_sensor_pir_basic_cr2032
tuya_motion_sensor_pir_basic_aaa
\`\`\`

### Naming Convention
\`\`\`
{brand}_{category}_{type}_{battery}
\`\`\`

Examples:
- \`tuya_motion_sensor_pir_basic_cr2032\`
- \`aqara_door_window_sensor_basic_cr2032\`
- \`ikea_wireless_switch_4button_other\`

## Migration Steps

### 1. Note Your Current Setup
- List all your devices
- Note your active flows
- Take screenshots if needed

### 2. Remove Old Devices
- Go to Devices in Homey
- Remove all devices from this app
- **Note:** This will break your flows temporarily

### 3. Update App
- App will auto-update to v4.0.0
- Wait for update to complete

### 4. Re-Pair Devices
- Add devices again
- Select correct driver (check brand & battery)
- Verify device works

### 5. Recreate Flows
- Rebuild your flows with new devices
- Test each flow

## Driver Mapping Examples

| Old Driver | New Driver(s) |
|------------|---------------|
| \`motion_sensor_battery\` | \`tuya_motion_sensor_pir_basic_cr2032\`<br>\`tuya_motion_sensor_pir_basic_aaa\` |
| \`wireless_switch_3gang_cr2032\` | \`tuya_wireless_switch_3button_cr2032\` |
| \`temperature_humidity_sensor_battery\` | \`tuya_temp_humidity_sensor_basic_cr2032\`<br>\`tuya_temp_humidity_sensor_basic_aaa\` |
| \`smart_plug_ac\` | \`tuya_plug_smart_basic_ac\` |
| \`door_window_sensor_battery\` | \`tuya_door_window_sensor_basic_cr2032\` |

Full mapping: [MIGRATION_MAP_v4.json](../scripts/migration/MIGRATION_MAP_v4.json)

## Benefits

✅ Clear brand identification  
✅ Battery type visible in name  
✅ Less confusion when pairing  
✅ Better organization (300+ drivers)  
✅ Optimized battery calculation per type  
✅ Easier troubleshooting  

## Support

Questions? Visit:
- [Community Forum](https://community.homey.app/)
- [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)

## Statistics

- Total drivers: ${stats.toRename + stats.toDuplicate}
- Renamed: ${stats.toRename}
- New (multi-battery): ${stats.toDuplicate}
- Brands supported: ${Object.keys(stats.brands).length}
- Battery types: ${Object.keys(stats.batteries).length}
`;

const docsDir = path.join(rootDir, 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}
fs.writeFileSync(path.join(docsDir, 'MIGRATION_GUIDE_v4.md'), migrationGuide);
console.log('  ✅ MIGRATION_GUIDE_v4.md created\n');

console.log('✅ PHASE 4 TERMINÉE\n');
console.log('Prochaine étape: node scripts/migration/05_validate.js\n');
