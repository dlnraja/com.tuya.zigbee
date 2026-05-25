const fs = require('fs');
const path = require('path');

let errors = 0;
let warnings = 0;
function error(msg) {
  console.error('❌ ERROR:', msg);
  errors++;
}
function warn(msg) {
  console.warn('⚠️ WARN:', msg);
  warnings++;
}

function stripComments(code) {
  // Strip single-line comments but preserve line structures
  let clean = code.replace(/\/\/.*$/gm, '');
  // Strip multi-line comments
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
  return clean;
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
    const txt = stripComments(fs.readFileSync(devFile, 'utf8'));
    if (txt.includes("require('../../lib/TuyaZigbeeDevice')")) {
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
for (const d of dirs) {
  const devFile = path.join(DIRS, d, 'device.js');
  if (fs.existsSync(devFile)) {
    const origTxt = fs.readFileSync(devFile, 'utf8');
    const txt = stripComments(origTxt);
    const m = txt.match(/get\s+mainsPowered\(\)\s*\{\s*return\s+(true|false)/);
    if (m && m[1] === 'true') {
      const compFile = path.join(DIRS, d, 'driver.compose.json');
      if (fs.existsSync(compFile)) {
         try {
           const cj = JSON.parse(fs.readFileSync(compFile, 'utf8'));
           if (cj.capabilities && cj.capabilities.includes('measure_battery')) {
              if (!txt.includes('removeCapability("measure_battery")') && !txt.includes("removeCapability('measure_battery')")) {
                 error(d + ' is mainsPowered but has measure_battery without removeCapability() pruning block! Strict SDK3 enforcement.');
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
  const txt = stripComments(fs.readFileSync(mixinPath, 'utf8'));
  if (txt.includes('setCapabilityValue(')) {
    warn('VirtualButtonMixin.js natively found calling setCapabilityValue. Ensure flow trigger triggers use _safeSetCapability.');
  }
}

// 7. Phantom SDK v3 Flow Card Methods (must use getConditionCard/getActionCard)
for (const d of dirs) {
  const devFile = path.join(DIRS, d, 'device.js');
  const drvFile = path.join(DIRS, d, 'driver.js');
  const filesToCheck = [devFile, drvFile];
  for (const f of filesToCheck) {
    if (fs.existsSync(f)) {
      const txt = stripComments(fs.readFileSync(f, 'utf8'));
      if (txt.includes('getDeviceConditionCard') || txt.includes('getDeviceActionCard')) {
        error(d + ' (' + path.basename(f) + ') uses phantom SDK v3 flow card getters (use getConditionCard/getActionCard on this.homey.flow instead)');
      }
    }
  }
}

// 8. Settings Keys in Javascript code (zb_model_id NOT zb_modelId)
for (const d of dirs) {
  const devFile = path.join(DIRS, d, 'device.js');
  const drvFile = path.join(DIRS, d, 'driver.js');
  const filesToCheck = [devFile, drvFile];
  for (const f of filesToCheck) {
    if (fs.existsSync(f)) {
      const txt = stripComments(fs.readFileSync(f, 'utf8'));
      if (txt.includes('zb_modelId') || txt.includes('zb_manufacturerName')) {
        error(d + ' (' + path.basename(f) + ') uses camelCase settings keys zb_modelId/zb_manufacturerName in code instead of zb_model_id/zb_manufacturer_name');
      }
    }
  }
}

// 9. Direct require of tuyapi (forbidden connection bypass)
for (const d of dirs) {
  if (d === 'wifi_camera') continue;
  const devFile = path.join(DIRS, d, 'device.js');
  if (fs.existsSync(devFile)) {
    const txt = stripComments(fs.readFileSync(devFile, 'utf8'));
    if (txt.includes("require('tuyapi')") || txt.includes('require("tuyapi")')) {
      error(d + ' direct-requires tuyapi bypassing the local connection pool queue!');
    }
  }
}

// 10. Manual casing of manufacturerName/productId/modelId (use CaseInsensitiveMatcher)
for (const d of dirs) {
  const devFile = path.join(DIRS, d, 'device.js');
  if (fs.existsSync(devFile)) {
    const txt = stripComments(fs.readFileSync(devFile, 'utf8'));
    // Regex looking for raw .toLowerCase() or .toUpperCase() on manufacturerName, productId, modelId
    if (/(manufacturerName|productId|modelId)\.(toLowerCase|toUpperCase)/i.test(txt)) {
      warn(d + ' performs manual casing operations on pairing fields (use lib/utils/CaseInsensitiveMatcher.js instead)');
    }
  }
}

console.log('Done. ' + errors + ' errors, ' + warnings + ' warnings.');
if (errors > 0) process.exit(1);


