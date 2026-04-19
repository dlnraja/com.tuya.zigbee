const fs = require('fs');
const path = require('path');

let errors = 0;
let warnings = 0;
function error(msg) {
  console.error(' ERROR:', msg);
  errors++;
}
function warn(msg) {
  console.warn(' WARN:', msg);
  warnings++;
}

console.log('--- ENFORCING WINDSURFRULES ---');

const DIRS = path.join(__dirname, '..', '..', 'drivers');
if (!fs.existsSync(DIRS)) {
  console.log('Run from repo root. DIRS not found.');
  process.exit(1);
}

const dirs = fs.readdirSync(DIRS).filter(d => fs.statSync(path.join(DIRS, d)).isDirectory());

// 1. Settings Keys (zb_model_id NOT zb_modelId)
for (const d of dirs) {
  const compFile = path.join(DIRS, d, 'driver.compose.json');
  if (fs.existsSync(compFile)) {
    const txt = fs.readFileSync(compFile, 'utf8');
    if (txt.includes('zb_modelId') || txt.includes('zb_manufacturerName')) {
      error(d + ' uses invalid camelCase settings keys (use zb_model_id/zb_manufacturer_name)');
    }
  }
}

// 2. NO titleFormatted with [[device]] in TRIGGERS
for (const d of dirs) {
  const flowFile = path.join(DIRS, d, 'driver.flow.compose.json');
  if (fs.existsSync(flowFile)) {
    try {
      const j = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
      if (j.triggers) {
        for (const t of j.triggers) {
          if (t.titleFormatted && JSON.stringify(t.titleFormatted).includes('[[device]]')) {
            error(d + ' uses titleFormatted with [[device]] in TRIGGERS (' + t.id + ')');
          }
        }
      }
    } catch (e) {}
  }
}

// 3. Imports (TuyaZigbeeDevice must be from lib/tuya/)
for (const d of dirs) {
  const devFile = path.join(DIRS, d, 'device.js');
  if (fs.existsSync(devFile)) {
    const txt = fs.readFileSync(devFile, 'utf8');
    if (txt.includes('require(\'../../lib/TuyaZigbeeDevice\')')) {
      error(d + ' imports TuyaZigbeeDevice from wrong path (should be lib/tuya/)');
    }
  }
}

// 4. Wildcards in fingerprints
for (const d of dirs) {
  const compFile = path.join(DIRS, d, 'driver.compose.json');
  if (fs.existsSync(compFile)) {
    const txt = fs.readFileSync(compFile, 'utf8');
    if (txt.includes('_TZE284_*') || txt.includes('_TZ3000_*') || txt.includes('_TZE200_*')) {
      error(d + ' contains wildcards in manufacturerName (invalid in SDK3)');
    }
  }
}

// 5. Battery cap check for mains devices
// WARNING only  many Tuya devices support dual power (mains + battery backup)
// This is not a blocking error since removing measure_battery would break
// devices that DO have battery backup (e.g. IR blasters with battery)
for (const d of dirs) {
  const devFile = path.join(DIRS, d, 'device.js');
  if (fs.existsSync(devFile)) {
    const txt = fs.readFileSync(devFile, 'utf8');
    const m = txt.match(/get\s+mainsPowered\(\)\s*\{\s*return\s+(true|false)/);
    if (m && m[1] === 'true') {
      const compFile = path.join(DIRS, d, 'driver.compose.json');
      if (fs.existsSync(compFile)) {
         try {
           const cj = JSON.parse(fs.readFileSync(compFile, 'utf8'));
           if (cj.capabilities && cj.capabilities.includes('measure_battery')) {
              if (!txt.includes('removeCapability("measure_battery")') && !txt.includes("removeCapability('measure_battery')")) {
                 warn(d + ' is mainsPowered but has measure_battery  consider adding removeCapability() or removing from compose');
              }
           }
         } catch(e) {}
      }
    }
  }
}

// 6. Virtual Button Flow Triggers (must use _safeSetCapability)
const mixinPath = path.join(DIRS, '..', 'lib', 'mixins', 'VirtualButtonMixin.js');
if (fs.existsSync(mixinPath)) {
  const txt = fs.readFileSync(mixinPath, 'utf8');
  if (txt.includes('setCapabilityValue(')) {
    // If it includes setCapabilityValue directly outside of _safeSetCapability implementation, flag a warning.
    // It's a rough check but helps audit future mistakes.
    warn('VirtualButtonMixin.js natively found calling setCapabilityValue. Ensure flow trigger triggers use _safeSetCapability.');
  }
}

console.log('Done. ' + errors + ' errors, ' + warnings + ' warnings.');
if (errors > 0) process.exit(1);
