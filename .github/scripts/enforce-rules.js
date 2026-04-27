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

// 7. Manual Identity Comparison (Use CI helper)
const utilFile = path.join(__dirname, '..', '..', 'lib', 'Util.js');
const helperFile = path.join(__dirname, '..', '..', 'lib', 'utils', 'CaseInsensitiveMatcher.js');
for (const d of dirs) {
  const devFile = path.join(DIRS, d, 'device.js');
  if (fs.existsSync(devFile)) {
    const txt = fs.readFileSync(devFile, 'utf8');
    if ((txt.includes('manufacturerName') || txt.includes('modelId') || txt.includes('productId')) && 
        (txt.includes('===') || txt.includes('==') || txt.includes('.toLowerCase()'))) {
      if (!txt.includes('CI.includesCI') && !txt.includes('CaseInsensitiveMatcher')) {
        warn(d + ' potentially uses manual identity comparison. Consider using lib/utils/CaseInsensitiveMatcher.js');
      }
    }
  }
}

// 8. Arithmetic Integrity (Prevent regex corruption)
const arithCheck = path.join(__dirname, '..', '..', 'scripts', 'maintenance', 'ARITHMETIC_INTEGRITY_CHECK.js');
if (fs.existsSync(arithCheck)) {
  console.log('Running Arithmetic Integrity Check...');
  const { execSync } = require('child_process');
  try {
    execSync('node ' + arithCheck, { stdio: 'inherit' });
    console.log('✅ Arithmetic Integrity OK');
  } catch (e) {
    error('Arithmetic Integrity Check FAILED. Regex corruption detected.');
  }
}

// 10. Rule 21: Capability-Based Flow Filtering
for (const d of dirs) {
  const flowFile = path.join(DIRS, d, 'driver.flow.compose.json');
  if (fs.existsSync(flowFile)) {
    try {
      const j = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
      if (j.triggers) {
        for (const t of j.triggers) {
          // If the trigger ID doesn't contain a generic keyword, it should be filtered
          const isGeneric = ['status_changed', 'online', 'offline'].some(k => t.id.includes(k));
          if (!isGeneric && !t.filter && !t.args?.some(a => a.name === 'capability')) {
             // warn(d + ' trigger ' + t.id + ' may be missing capability filtering (Rule 21)');
          }
        }
      }
    } catch (e) {}
  }
}

// 9. Forbidden Invisible Characters
const FORBIDDEN_CHARS = [0xFEFF, 0x200B, 0x00A0, 0x0000];
for (const d of dirs) {
  const files = [path.join(DIRS, d, 'device.js'), path.join(DIRS, d, 'driver.compose.json'), path.join(DIRS, d, 'driver.flow.compose.json')];
  for (const f of files) {
    if (fs.existsSync(f)) {
      const buf = fs.readFileSync(f);
      for (let i = 0; i < buf.length; i++) {
        if (FORBIDDEN_CHARS.includes(buf[i])) {
          error(path.relative(path.join(DIRS, '..'), f) + ' contains forbidden invisible character (char code ' + buf[i] + ')');
          break;
        }
      }
    }
  }
}

console.log('Done. ' + errors + ' errors, ' + warnings + ' warnings.');
if (errors > 0) process.exit(1);
