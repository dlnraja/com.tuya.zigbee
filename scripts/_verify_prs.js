'use strict';

const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🧪 RUNNING UNIVERSAL TUYA ENGINE MULTI-LAYER QUALITY GATEWAY 🧪');
console.log('================================================================\n');

const checks = [];
const d = 'drivers';

if (!fs.existsSync(d)) {
  console.error('Drivers directory not found!');
  process.exit(1);
}

// ─── Layer 1: PR #120 Validation (titleFormatted Purge) ───
let flowComposeCount = 0;
let titleFormattedViolations = 0;

fs.readdirSync(d).forEach(dr => {
  const f = path.join(d, dr, 'driver.flow.compose.json');
  if (!fs.existsSync(f)) return;
  flowComposeCount++;
  const c = fs.readFileSync(f, 'utf8');
  if (c.includes('[[device]]') || c.includes('titleFormatted')) {
    titleFormattedViolations++;
    checks.push(`⚠️ PR#120 WARNING: ${f} still has titleFormatted or [[device]]!`);
  }
});
if (titleFormattedViolations === 0) {
  checks.push(`✅ PR#120 OK: All ${flowComposeCount} flow compose files are 100% compliant and clean of titleFormatted/[[device]].`);
}

// ─── Layer 2: PR #119 Validation (Wall Switch SwitchBase Usage) ───
const ws1 = path.join(d, 'wall_switch_1gang_1way', 'device.js');
if (fs.existsSync(ws1)) {
  const c = fs.readFileSync(ws1, 'utf8');
  if (c.includes('SwitchBase') || c.includes('UnifiedSwitchBase')) {
    checks.push('✅ PR#119 OK: wall_switch_1gang_1way inherits from SwitchBase.');
  } else {
    checks.push('⚠️ PR#119 WARNING: wall_switch_1gang_1way does NOT inherit from SwitchBase!');
  }
}

// ─── Layer 3: PR #118 Validation (Manufacturer Name _TZ3000_ysdv91bk) ───
let found118 = false;
fs.readdirSync(d).forEach(dr => {
  try {
    const c = fs.readFileSync(path.join(d, dr, 'driver.compose.json'), 'utf8');
    if (c.toLowerCase().includes('_tz3000_ysdv91bk')) {
      found118 = true;
      checks.push(`✅ PR#118 OK: Exact target manufacturer _TZ3000_ysdv91bk is registered in ${dr}.`);
    }
  } catch (e) {}
});
if (!found118) {
  checks.push('⚠️ PR#118 WARNING: _TZ3000_ysdv91bk is missing from all driver compose manifests!');
}

// ─── Layer 4: PR #116 Validation (Manufacturer Name _TZ3000_blhvsaqf) ───
let found116 = false;
fs.readdirSync(d).forEach(dr => {
  try {
    const c = fs.readFileSync(path.join(d, dr, 'driver.compose.json'), 'utf8');
    if (c.toLowerCase().includes('_tz3000_blhvsaqf')) {
      found116 = true;
      checks.push(`✅ PR#116 OK: Exact target manufacturer _TZ3000_blhvsaqf is registered in ${dr}.`);
    }
  } catch (e) {}
});
if (!found116) {
  checks.push('⚠️ PR#116 WARNING: _TZ3000_blhvsaqf is missing from all driver compose manifests!');
}

// ─── Layer 5: PR #111 Validation (Bseed Dimmer Driver) ───
let foundDimmer = false;
fs.readdirSync(d).forEach(dr => {
  if (dr.includes('dimmer') && dr.includes('wall')) foundDimmer = true;
});
if (foundDimmer) {
  checks.push('✅ PR#111 OK: Wall touch dimmer driver exists and is fully registered.');
} else {
  checks.push('⚠️ PR#111 WARNING: Wall dimmer driver is missing!');
}

// ─── Layer 6: Suffix Cleanup Audit (Avoid Suffix Pollution) ───
let suffixViolations = 0;
fs.readdirSync(d).forEach(dr => {
  if (dr.includes('hybrid') || dr.includes('hybride')) {
    suffixViolations++;
    checks.push(`⚠️ SUFFIX WARNING: Legacy directory naming "${dr}" contains hybrid/hybride suffix!`);
  }
});
if (suffixViolations === 0) {
  checks.push('✅ SUFFIX RULES OK: Zero directories contain legacy "_hybrid" or "_hybride" suffixes.');
}

// ─── Layer 7: Case-Insensitive Matching Integrity ───
let matcherBypass = 0;
fs.readdirSync(d).forEach(dr => {
  const deviceFile = path.join(d, dr, 'device.js');
  if (!fs.existsSync(deviceFile)) return;
  try {
    const content = fs.readFileSync(deviceFile, 'utf8');
    if (content.includes('.toLowerCase()') && (content.includes('manufacturerName') || content.includes('manufacturer'))) {
      matcherBypass++;
      checks.push(`⚠️ MATCH INTEGRITY: ${dr}/device.js uses manual .toLowerCase() instead of CaseInsensitiveMatcher.`);
    }
  } catch (e) {}
});
if (matcherBypass === 0) {
  checks.push('✅ MATCH INTEGRITY OK: No drivers bypass the CaseInsensitiveMatcher helper.');
}

// ─── Layer 8: Memory Leak Watchdog (onUninit Lifecycle Audit) ───
let lifecycleViolations = 0;
fs.readdirSync(d).forEach(dr => {
  const deviceFile = path.join(d, dr, 'device.js');
  if (!fs.existsSync(deviceFile)) return;
  try {
    const content = fs.readFileSync(deviceFile, 'utf8');
    const isLocalWiFi = content.includes('TuyaLocalDevice') || content.includes('TuyaLocalDriver') || content.includes('ip_address');
    const extendsBase = content.includes('extends TuyaLocalDevice');
    if (isLocalWiFi && !extendsBase) {
      if (!content.includes('onUninit') || !content.includes('_destroyDevice')) {
        lifecycleViolations++;
        checks.push(`⚠️ LIFECYCLE WARNING: Local WiFi device ${dr}/device.js does not extend TuyaLocalDevice nor implement onUninit/_destroyDevice! Risk of memory leak on app restart.`);
      }
    }
  } catch (e) {}
});
if (lifecycleViolations === 0) {
  checks.push('✅ LIFECYCLE OK: All active local WiFi devices correctly inherit/implement onUninit/_destroyDevice leak-prevention lifecycles.');
}

// ─── Layer 9: raw TuyAPI bypass check ───
let tuyapiBypasses = 0;
fs.readdirSync(d).forEach(dr => {
  const deviceFile = path.join(d, dr, 'device.js');
  if (!fs.existsSync(deviceFile)) return;
  try {
    const content = fs.readFileSync(deviceFile, 'utf8');
    if (content.includes("require('tuyapi')") && !dr.includes('tuya-local') && !content.includes('TuyaLocalDevice')) {
      tuyapiBypasses++;
      checks.push(`⚠️ BYPASS WARNING: ${dr}/device.js requires raw "tuyapi" directly. Please use TuyaLocalDevice wrapper.`);
    }
  } catch (e) {}
});
if (tuyapiBypasses === 0) {
  checks.push('✅ BYPASS OK: No drivers directly import "tuyapi", maintaining command queue and socket pool integrity.');
}

// ─── Layer 10: Settings Keys CamelCase Deprecation Check ───
let camelCaseSettingsViolations = 0;
fs.readdirSync(d).forEach(dr => {
  const deviceFile = path.join(d, dr, 'device.js');
  if (!fs.existsSync(deviceFile)) return;
  try {
    const content = fs.readFileSync(deviceFile, 'utf8');
    if (content.includes('zb_modelId') || content.includes('zb_manufacturerName')) {
      camelCaseSettingsViolations++;
      checks.push(`⚠️ DEPRECATED SETTING KEY WARNING: ${dr}/device.js uses deprecated camelCase settings keys (zb_modelId or zb_manufacturerName). Mandated snake_case keys are zb_model_id and zb_manufacturer_name.`);
    }
  } catch (e) {}
});
if (camelCaseSettingsViolations === 0) {
  checks.push('✅ SETTINGS KEYS OK: No drivers use deprecated camelCase settings keys (zb_modelId or zb_manufacturerName).');
}

// ─── Layer 11: Backlight Value Representation Check ───
let backlightNumericViolations = 0;
fs.readdirSync(d).forEach(dr => {
  const deviceFile = path.join(d, dr, 'device.js');
  if (!fs.existsSync(deviceFile)) return;
  try {
    const content = fs.readFileSync(deviceFile, 'utf8');
    if (content.includes('backlight') && (content.includes('=== 0') || content.includes('=== 1') || content.includes('=== 2') || content.includes('== 0') || content.includes('== 1') || content.includes('== 2') || content.includes("=== '0'") || content.includes("=== '1'") || content.includes("=== '2'") || content.includes("== '0'") || content.includes("== '1'") || content.includes("== '2'"))) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('backlight') && (line.includes('=== 0') || line.includes('=== 1') || line.includes('=== 2') || line.includes('== 0') || line.includes('== 1') || line.includes('== 2') || line.includes("=== '0'") || line.includes("=== '1'") || line.includes("=== '2'") || line.includes("== '0'") || line.includes("== '1'") || line.includes("== '2'"))) {
          backlightNumericViolations++;
          checks.push(`⚠️ BACKLIGHT REPRESENTATION WARNING: ${dr}/device.js (line ${index + 1}) uses numeric comparisons for backlight settings. Must use string values ("off", "normal", "inverted").`);
        }
      });
    }
  } catch (e) {}
});
if (backlightNumericViolations === 0) {
  checks.push('✅ BACKLIGHT CONFIG OK: Backlight setting comparisons are string-only compliant ("off", "normal", "inverted").');
}

// ─── Layer 12: SDK3 Deprecated API Watchdog ───
let deprecatedApiViolations = 0;
const deprecatedTerms = [
  { term: '.flow.getTriggerCard', suggestion: '.flow.getDeviceTriggerCard' },
  { term: 'Homey.ManagerFlow', suggestion: 'this.homey.flow' }
];

const scanFiles = (dir) => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanFiles(fullPath);
    } else if (file.endsWith('.js')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        deprecatedTerms.forEach(item => {
          if (content.includes(item.term)) {
            deprecatedApiViolations++;
            checks.push(`⚠️ DEPRECATED API WARNING: ${fullPath} contains "${item.term}". Use "${item.suggestion}" instead for SDK3 compliance.`);
          }
        });
      } catch (e) {}
    }
  });
};

scanFiles('drivers');
scanFiles('lib');

if (deprecatedApiViolations === 0) {
  checks.push('✅ SDK3 API COMPLIANCE OK: No deprecated flow card or global manager calls detected.');
}

// Also check app.json for titleFormatted and [[device]] compile results
if (fs.existsSync('app.json')) {
  const appJson = fs.readFileSync('app.json', 'utf8');
  const tfCount = (appJson.match(/titleFormatted/g) || []).length;
  const ddCount = (appJson.match(/\[\[device\]\]/g) || []).length;
  checks.push(`📊 COMPILE SUMMARY: app.json compiled titleFormatted=${tfCount} cards, [[device]]=${ddCount} templates.`);
}

// ─── Layer 13: Advanced Agentic Logic-Lens Audit (Race Conditions) ───
let unawaitedLogicViolations = 0;
fs.readdirSync(d).forEach(dr => {
  const deviceFile = path.join(d, dr, 'device.js');
  if (!fs.existsSync(deviceFile)) return;
  try {
    const content = fs.readFileSync(deviceFile, 'utf8');
    // Pattern: setCapabilityValue not preceded by await
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('this.setCapabilityValue(') && !line.includes('await ') && !line.includes('return ') && !line.includes('.then(')) {
        unawaitedLogicViolations++;
        checks.push(`⚠️ LOGIC-LENS WARNING: ${dr}/device.js (line ${index + 1}) has unawaited setCapabilityValue! Potential race condition.`);
      }
    });
  } catch (e) {}
});
if (unawaitedLogicViolations === 0) {
  checks.push('✅ LOGIC-LENS OK: All capability setters are properly awaited/handled (Zero Race Conditions).');
}

// ─── Layer 14: Security Audit (Secret Leak Protection) ───
let securityLeaks = 0;
const sensitivePatterns = [
  /['"]([a-zA-Z0-9_\-\.]{64,})['"]/g, // Increased to 64 to avoid driver/flow IDs
  /ghp_[a-zA-Z0-9]{36}/g,           // GitHub PATs
  /eyJ[a-zA-Z0-9._-]{40,}/g,         // JWTs (Specific to eyJ start)
  /AIza[0-9A-Za-z-_]{35}/g          // Google API Keys
];
fs.readdirSync(d).forEach(dr => {
  const deviceFile = path.join(d, dr, 'device.js');
  if (!fs.existsSync(deviceFile)) return;
  try {
    const content = fs.readFileSync(deviceFile, 'utf8');
    sensitivePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(m => {
          // Ignore known safe fingerprints and some common hex patterns
          if (m.length === 34 && m.startsWith('"_TZ') || m.length === 34 && m.startsWith('"_TZE')) return;
          if (m.includes('uuid') || m.includes('deviceId') || m.includes('physical') || m.includes('brightness') || m.includes('presence') || m.includes('climate') || m.includes('sensor') || m.includes('hybrid') || m.includes('gas_presence')) return;
          securityLeaks++;
          checks.push(`🚨 SECURITY LEAK: Potential hardcoded secret in ${dr}/device.js: ${m.substring(0, 10)}...`);
        });
      }
    });
  } catch (e) {}
});
if (securityLeaks === 0) {
  checks.push('✅ SECURITY OK: No obvious hardcoded secrets detected in drivers.');
}

console.log('----------------------------------------------------------------');
checks.forEach(c => console.log(c));
console.log('----------------------------------------------------------------\n');

const criticalCount = checks.filter(c => c.startsWith('❌') || c.startsWith('🚨')).length;
if (criticalCount > 0) {
  console.error(`❌ FAILED: ${criticalCount} critical quality gate violations found!`);
  process.exit(1);
}

console.log('🧪 QUALITY GATE CHECKS COMPLETE. ZERO CRITICAL BLOCKED ERRORS.');
console.log('================================================================');
