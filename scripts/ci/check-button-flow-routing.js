#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const JSON_OUTPUT = process.argv.includes('--json');

const report = {
  timestamp: new Date().toISOString(),
  checked: 0,
  errors: [],
  warnings: [],
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function addError(driver, message, details = {}) {
  report.errors.push({ driver, message, ...details });
}

function addWarning(driver, message, details = {}) {
  report.warnings.push({ driver, message, ...details });
}

function getTriggers(flow) {
  return Array.isArray(flow?.triggers) ? flow.triggers : [];
}

function extractButtonPattern(triggers) {
  const matches = new Map();
  for (const card of triggers) {
    const id = card?.id || '';
    const match = id.match(/^(.+)_button_(\d+)gang_button(?:_|$)/);
    if (!match) continue;
    const prefix = match[1];
    const count = Number(match[2]);
    const key = `${prefix}:${count}`;
    if (!matches.has(key)) {
      matches.set(key, { prefix, count, ids: [] });
    }
    matches.get(key).ids.push(id);
  }
  return [...matches.values()];
}

function hasExactHelperCall(driverJs, prefix, count) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`registerButtonFlowCards\\s*\\(\\s*this\\s*,\\s*['"]${escapedPrefix}['"]\\s*,\\s*${count}\\s*\\)`);
  return pattern.test(driverJs);
}

function hasDynamicThisIdHelperCall(driverJs, count) {
  const hasThisIdAlias = /\b(?:const|let|var)\s+\w+\s*=\s*(?:this\.id|resolveDriverId\(this\)|this\.id\s*\|\|)/.test(driverJs);
  const pattern = new RegExp(`registerButtonFlowCards\\s*\\(\\s*this\\s*,\\s*\\w+\\s*,\\s*${count}\\s*\\)`);
  return hasThisIdAlias && pattern.test(driverJs);
}

function hasInlineThisIdHelperCall(driverJs, count) {
  const pattern = new RegExp(`registerButtonFlowCards\\s*\\(\\s*this\\s*,\\s*this\\.id\\s*\\|\\|\\s*['"][^'"]+['"]\\s*,\\s*${count}\\s*\\)`);
  return pattern.test(driverJs);
}

function loadDriverSource(driverPath) {
  const source = fs.readFileSync(driverPath, 'utf8');
  const reexport = source.match(/module\.exports\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/);
  if (!reexport) {
    return source;
  }
  const target = path.resolve(path.dirname(driverPath), reexport[1]);
  const targetPath = target.endsWith('.js') ? target : `${target}.js`;
  if (!fs.existsSync(targetPath)) {
    return source;
  }
  return `${source}\n${fs.readFileSync(targetPath, 'utf8')}`;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

function loadDriverCompose(driverName) {
  const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    addError(driverName, 'Missing driver.compose.json for known button routing guard');
    return null;
  }
  try {
    return readJson(composePath);
  } catch (err) {
    addError(driverName, `Invalid driver.compose.json: ${err.message}`);
    return null;
  }
}

function getManufacturerNames(compose) {
  return normalizeArray(compose?.zigbee?.manufacturerName);
}

function getProductIds(compose) {
  return normalizeArray(compose?.zigbee?.productId);
}

function hasCI(values, expected) {
  const target = String(expected).toLowerCase();
  return normalizeArray(values).some(value => String(value).toLowerCase() === target);
}

function validateConflictData(manufacturerName) {
  const conflictFiles = [
    path.join(ROOT, 'scripts', 'data', 'manufacturer_conflicts.csv'),
    path.join(ROOT, 'scripts', 'data', 'true_manufacturer_conflicts.csv'),
  ];
  for (const file of conflictFiles) {
    if (!fs.existsSync(file)) continue;
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      if (!line.includes(manufacturerName)) continue;
      if (line.includes('button_wireless_1')) {
        addError(rel, 'Known 4-endpoint TS0041 manufacturer is still documented as button_wireless_1', {
          manufacturerName,
          line: index + 1,
        });
      }
    }
  }
}

function validateKnownTs0041Routing() {
  const oneButton = loadDriverCompose('button_wireless_1');
  const fourButtonTs0041 = loadDriverCompose('button_wireless_4_ts0041');
  if (!oneButton || !fourButtonTs0041) return;

  const oneButtonManufacturers = new Set(getManufacturerNames(oneButton));
  const fourButtonManufacturers = new Set(getManufacturerNames(fourButtonTs0041));
  const fourButtonProducts = new Set(getProductIds(fourButtonTs0041));
  const fourEndpointManufacturers = [
    '_tz3000_yj6k7vfo',
    '_TZ3000_yj6k7vfo',
    '_TZ3000_YJ6K7VFO',
    '_tz3000_b4awzgct',
    '_TZ3000_b4awzgct',
    '_TZ3000_B4AWZGCT',
  ];

  if (!fourButtonProducts.has('TS0041')) {
    addError('button_wireless_4_ts0041', 'Known 4-endpoint TS0041 wrapper lost productId TS0041');
  }

  for (const manufacturerName of fourEndpointManufacturers) {
    if (!fourButtonManufacturers.has(manufacturerName)) {
      addError('button_wireless_4_ts0041', 'Known 4-endpoint TS0041 manufacturer missing from dedicated 4-button wrapper', {
        manufacturerName,
      });
    }
    if (oneButtonManufacturers.has(manufacturerName)) {
      addError('button_wireless_1', 'Known 4-endpoint TS0041 manufacturer is routed to 1-button driver', {
        manufacturerName,
      });
    }
    validateConflictData(manufacturerName);
  }
}

function validateKnownTs0044Routing() {
  const fourButton = loadDriverCompose('button_wireless_4');
  const switchOneGang = loadDriverCompose('switch_1gang');
  const handheld = loadDriverCompose('remote_button_wireless_handheld');
  if (!fourButton || !switchOneGang || !handheld) return;

  const fourButtonManufacturers = new Set(getManufacturerNames(fourButton));
  const switchManufacturers = new Set(getManufacturerNames(switchOneGang));
  const handheldManufacturers = new Set(getManufacturerNames(handheld));
  const handheldProducts = new Set(getProductIds(handheld));
  const forumManufacturers = [
    '_tz3000_u3nv1jwk',
    '_TZ3000_u3nv1jwk',
    '_TZ3000_U3NV1JWK',
  ];

  for (const manufacturerName of forumManufacturers) {
    if (!fourButtonManufacturers.has(manufacturerName)) {
      addError('button_wireless_4', 'Forum TS0044 manufacturer missing from E000-capable 4-button driver', {
        manufacturerName,
      });
    }
    if (switchManufacturers.has(manufacturerName)) {
      addError('switch_1gang', 'Forum TS0044 manufacturer is routed to switch_1gang instead of button_wireless_4', {
        manufacturerName,
      });
    }
    if (handheldManufacturers.has(manufacturerName)) {
      addError('remote_button_wireless_handheld', 'Forum TS0044 manufacturer is routed to legacy handheld driver instead of button_wireless_4', {
        manufacturerName,
      });
    }
  }

  if (handheldProducts.has('TS0044')) {
    addError('remote_button_wireless_handheld', 'Legacy handheld driver must not claim generic TS0044 without an exact manufacturer');
  }

  if (
    !handheldManufacturers.has('_disabled_remote_button_wireless_handheld_needs_exact_fingerprint') ||
    !handheldProducts.has('DISABLED_REMOTE_BUTTON_WIRELESS_HANDHELD')
  ) {
    addError('remote_button_wireless_handheld', 'Legacy handheld driver lost its non-matchable manifest-valid sentinel');
  }
}

function validateKnownTs004fRouting() {
  const fourButton = loadDriverCompose('button_wireless_4');
  const twoButton = loadDriverCompose('button_wireless_2');
  const smartKnob = loadDriverCompose('smart_knob_rotary');
  const genericButton = loadDriverCompose('button_wireless');
  const smartRemoteOne = loadDriverCompose('smart_remote_1_button');
  if (!fourButton || !twoButton || !smartKnob || !genericButton || !smartRemoteOne) return;

  const fourButtonManufacturers = getManufacturerNames(fourButton);
  const twoButtonManufacturers = getManufacturerNames(twoButton);
  const smartKnobManufacturers = getManufacturerNames(smartKnob);
  const genericButtonManufacturers = getManufacturerNames(genericButton);
  const smartRemoteOneManufacturers = getManufacturerNames(smartRemoteOne);
  const fourButtonProducts = getProductIds(fourButton);
  const fourButtonTs004fManufacturers = [
    '_TZ3000_kfu8zapd',
    '_TZ3000_xabckq1v',
    '_TZ3000_czuyt8lz',
    '_TZ3000_b3mgfu0d',
    '_TZ3000_rco1yzb1',
    '_TZ3000_abrsvsou',
    '_TZ3000_4fjiwweb',
  ];
  const rotaryManufacturers = [
    '_TZ3000_qja6nq5z',
    '_TZ3000_gwkzibhs',
    '_TZ3000_ugi8ky6u',
  ];

  if (!fourButtonProducts.includes('TS004F')) {
    addError('button_wireless_4', 'Moes/Lidl TS004F variants lost the 4-button productId');
  }

  for (const manufacturerName of fourButtonTs004fManufacturers) {
    if (!hasCI(fourButtonManufacturers, manufacturerName)) {
      addError('button_wireless_4', 'Known TS004F 4-button manufacturer missing from 4-button driver', {
        manufacturerName,
      });
    }
  }

  if (hasCI(twoButtonManufacturers, '_TZ3000_b3mgfu0d')) {
    addError('button_wireless_2', 'Known TS004F b3mgfu0d fingerprint must not collide with 2-button TS0014/TS0044 routes', {
      manufacturerName: '_TZ3000_b3mgfu0d',
    });
  }

  for (const manufacturerName of rotaryManufacturers) {
    if (!hasCI(smartKnobManufacturers, manufacturerName)) {
      addError('smart_knob_rotary', 'Known TS004F rotary knob missing from rotary driver', {
        manufacturerName,
      });
    }
    if (hasCI(fourButtonManufacturers, manufacturerName)) {
      addError('button_wireless_4', 'Known TS004F rotary knob is routed to generic 4-button driver', {
        manufacturerName,
      });
    }
    if (hasCI(genericButtonManufacturers, manufacturerName)) {
      addError('button_wireless', 'Known TS004F rotary knob is still routed to generic button driver', {
        manufacturerName,
      });
    }
  }

  if (hasCI(smartRemoteOneManufacturers, '_TZ3000_rco1yzb1')) {
    addError('smart_remote_1_button', 'Lidl/Moes TS004F LevelControl remote is routed to 1-button driver');
  }

  const missingLevelCluster = Object.entries(fourButton?.zigbee?.endpoints || {})
    .filter(([, endpoint]) => !normalizeArray(endpoint.clusters).includes(8))
    .map(([endpointId]) => endpointId);
  if (missingLevelCluster.length) {
    addError('button_wireless_4', 'Known TS004F 4-button driver lost LevelControl cluster metadata', {
      endpoints: missingLevelCluster,
    });
  }

  const driverSource = fs.readFileSync(path.join(DRIVERS_DIR, 'button_wireless_4', 'device.js'), 'utf8');
  for (const required of ['_setupLevelControlDetection', 'commandStep', 'commandMove', 'commandStop']) {
    if (!driverSource.includes(required)) {
      addError('button_wireless_4', `Known TS004F 4-button driver lost ${required} physical-event handling`);
    }
  }

  const DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
  for (const manufacturerName of fourButtonTs004fManufacturers) {
    const profile = DeviceFingerprintDB.lookup(manufacturerName, 'TS004F');
    if (profile?.driver !== 'button_wireless_4') {
      addError('DeviceFingerprintDB', 'Known TS004F 4-button fingerprint is not compound-routed to button_wireless_4', {
        manufacturerName,
        profile,
      });
    }
  }
  for (const manufacturerName of rotaryManufacturers) {
    const profile = DeviceFingerprintDB.lookup(manufacturerName, 'TS004F');
    if (profile?.driver !== 'smart_knob_rotary') {
      addError('DeviceFingerprintDB', 'Known TS004F rotary fingerprint is not compound-routed to smart_knob_rotary', {
        manufacturerName,
        profile,
      });
    }
  }
}

function validateKnownTs0014WallSwitchRouting() {
  const wallSwitch = loadDriverCompose('wall_switch_4gang_1way');
  const genericSwitch = loadDriverCompose('switch_4gang');
  if (!wallSwitch || !genericSwitch) return;

  const wallManufacturers = getManufacturerNames(wallSwitch);
  const wallProducts = getProductIds(wallSwitch);
  const genericManufacturers = getManufacturerNames(genericSwitch);
  const forumManufacturer = '_TZ3000_mrduubod';

  if (!hasCI(wallManufacturers, forumManufacturer)) {
    addError('wall_switch_4gang_1way', 'Forum #2099 Moes TS0014 manufacturer missing from BSEED wall switch driver', {
      manufacturerName: forumManufacturer,
    });
  }

  if (!hasCI(wallProducts, 'TS0014')) {
    addError('wall_switch_4gang_1way', 'Forum #2099 Moes TS0014 route lost productId TS0014');
  }

  if (hasCI(genericManufacturers, forumManufacturer)) {
    addError('switch_4gang', 'Forum #2099 Moes TS0014 must not be claimed by generic switch_4gang', {
      manufacturerName: forumManufacturer,
    });
  }

  const DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
  const profile = DeviceFingerprintDB.lookup(forumManufacturer, 'TS0014');
  if (profile?.driver !== 'wall_switch_4gang_1way') {
    addError('DeviceFingerprintDB', 'Forum #2099 Moes TS0014 is not compound-routed to wall_switch_4gang_1way', {
      manufacturerName: forumManufacturer,
      profile,
    });
  }
}

function validateForumSoilSensorRouting() {
  const soilSensor = loadDriverCompose('soil_sensor');
  const climateSensor = loadDriverCompose('climate_sensor');
  if (!soilSensor || !climateSensor) return;

  const soilManufacturers = getManufacturerNames(soilSensor);
  const soilProducts = getProductIds(soilSensor);
  const climateManufacturers = getManufacturerNames(climateSensor);
  const legacyPath = path.join(DRIVERS_DIR, 'soilsensor_2', 'driver.compose.json');
  const legacySoil = fs.existsSync(legacyPath) ? readJson(legacyPath) : null;
  const legacyManufacturers = getManufacturerNames(legacySoil);
  const forumSoilFingerprints = [
    { manufacturerName: '_TZE200_npj9bug3', source: 'Forum #2091' },
    { manufacturerName: '_TZE284_myd45weu', source: 'Forum #2097' },
  ];

  if (!hasCI(soilProducts, 'TS0601')) {
    addError('soil_sensor', 'Forum TS0601 soil sensor route lost productId TS0601');
  }

  for (const { manufacturerName, source } of forumSoilFingerprints) {
    if (!hasCI(soilManufacturers, manufacturerName)) {
      addError('soil_sensor', `${source} soil sensor fingerprint missing from dedicated soil_sensor driver`, {
        manufacturerName,
      });
    }
    if (hasCI(climateManufacturers, manufacturerName)) {
      addError('climate_sensor', `${source} soil sensor fingerprint is still routed to climate_sensor`, {
        manufacturerName,
      });
    }
    if (hasCI(legacyManufacturers, manufacturerName)) {
      addError('soilsensor_2', `${source} soil sensor fingerprint is still routed to legacy soilsensor_2`, {
        manufacturerName,
      });
    }
  }

  const DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
  for (const { manufacturerName, source } of forumSoilFingerprints) {
    const profile = DeviceFingerprintDB.lookup(manufacturerName, 'TS0601');
    if (profile?.driver !== 'soil_sensor') {
      addError('DeviceFingerprintDB', `${source} TS0601 soil fingerprint is not compound-routed to soil_sensor`, {
        manufacturerName,
        profile,
      });
    }
  }
}

function validateSwitchButtonCapabilityFallback() {
  const basePath = path.join(ROOT, 'lib', 'devices', 'UnifiedSwitchBase.js');
  const baseSource = fs.existsSync(basePath) ? fs.readFileSync(basePath, 'utf8') : '';
  const requiredSnippets = [
    '_registerButtonCapabilityListeners',
    'registerCapabilityListener(capability',
    'this._registerButtonCapabilityListeners()',
    '_triggerPhysicalFlow',
  ];

  for (const snippet of requiredSnippets) {
    if (!baseSource.includes(snippet)) {
      addError('UnifiedSwitchBase', 'Switch base lost button.N capability listener fallback', { snippet });
    }
  }

  for (const driverName of ['wall_switch_1gang_1way', 'wall_switch_2gang_1way', 'wall_switch_3gang_1way', 'wall_switch_4gang_1way']) {
    const compose = loadDriverCompose(driverName);
    if (!compose) continue;
    const buttonCaps = normalizeArray(compose.capabilities).filter(capability => /^button\.\d+$/.test(capability));
    if (!buttonCaps.length) continue;

    const devicePath = path.join(DRIVERS_DIR, driverName, 'device.js');
    const deviceSource = fs.existsSync(devicePath) ? fs.readFileSync(devicePath, 'utf8') : '';
    if (!deviceSource.includes('UnifiedSwitchBase')) {
      addError(driverName, 'Driver declares button.N capabilities without inheriting UnifiedSwitchBase fallback listeners', {
        buttonCaps,
      });
    }
  }
}

function validateButtonRuntimeCoverage() {
  const buttonDevicePath = path.join(ROOT, 'lib', 'devices', 'ButtonDevice.js');
  const source = fs.existsSync(buttonDevicePath) ? fs.readFileSync(buttonDevicePath, 'utf8') : '';
  const requiredSnippets = [
    '_pulseButtonCapability',
    '_recordButtonPressForBatteryEstimate',
    '_estimateButtonBatteryFallback',
    'last_battery_estimated',
    'remote_button_pressed',
  ];

  for (const snippet of requiredSnippets) {
    if (!source.includes(snippet)) {
      addError('ButtonDevice', 'Button runtime lost stable UI/battery fallback coverage', { snippet });
    }
  }

  const legacyManagerPath = path.join(ROOT, 'lib', 'ButtonRemoteManager.js');
  const legacySource = fs.existsSync(legacyManagerPath) ? fs.readFileSync(legacyManagerPath, 'utf8') : '';
  if (!legacySource.includes('_pulseButtonCapability')) {
    addError('ButtonRemoteManager', 'Legacy remote manager no longer pulses visible button capabilities');
  }
}

function run() {
  const helperPath = path.join(ROOT, 'lib', 'FlowCardHelper.js');
  const helperText = fs.existsSync(helperPath) ? fs.readFileSync(helperPath, 'utf8') : '';
  for (const required of ['triple', 'release', '_battery_low']) {
    if (!helperText.includes(required)) {
      addError('FlowCardHelper', `Button helper no longer registers ${required} routes`);
    }
  }

  validateKnownTs0041Routing();
  validateKnownTs0044Routing();
  validateKnownTs004fRouting();
  validateKnownTs0014WallSwitchRouting();
  validateForumSoilSensorRouting();
  validateSwitchButtonCapabilityFallback();
  validateButtonRuntimeCoverage();

  const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  for (const driverName of driverDirs) {
    const flowPath = path.join(DRIVERS_DIR, driverName, 'driver.flow.compose.json');
    const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.js');
    if (!fs.existsSync(flowPath) || !fs.existsSync(driverPath)) continue;

    let flow;
    try {
      flow = readJson(flowPath);
    } catch (err) {
      addError(driverName, `Invalid driver.flow.compose.json: ${err.message}`);
      continue;
    }

    const patterns = extractButtonPattern(getTriggers(flow));
    if (patterns.length === 0) continue;
    report.checked++;

    const driverJs = loadDriverSource(driverPath);
    const hasCustomRunListeners = driverJs.includes('registerRunListener') || driverJs.includes('onRunListener');
    const helperCalls = [...driverJs.matchAll(/registerButtonFlowCards\s*\(\s*this\s*,\s*['"]([^'"]+)['"]\s*,\s*(\d+)\s*\)/g)]
      .map(match => ({ prefix: match[1], count: Number(match[2]) }));

    for (const pattern of patterns) {
      if (
        hasExactHelperCall(driverJs, pattern.prefix, pattern.count) ||
        hasDynamicThisIdHelperCall(driverJs, pattern.count) ||
        hasInlineThisIdHelperCall(driverJs, pattern.count) ||
        hasCustomRunListeners
      ) {
        continue;
      }
      addError(driverName, 'Button flow helper does not match declared flow-card IDs', {
        expected: `registerButtonFlowCards(this, '${pattern.prefix}', ${pattern.count})`,
        found: helperCalls,
        examples: pattern.ids.slice(0, 3),
      });
    }

    const helperIndex = driverJs.indexOf('registerButtonFlowCards');
    const beforeHelper = helperIndex === -1 ? driverJs : driverJs.slice(0, helperIndex);
    const guardCount = (beforeHelper.match(/if\s*\(\s*this\._flowCardsRegistered\s*\)/g) || []).length;
    if (guardCount > 1) {
      addWarning(driverName, 'Flow registration guard appears duplicated before helper call');
    }
  }
}

run();

if (JSON_OUTPUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Button flow routing: ${report.checked} drivers checked, ${report.errors.length} errors, ${report.warnings.length} warnings`);
  for (const err of report.errors) {
    console.error(`ERROR [${err.driver}] ${err.message}`);
  }
  for (const warn of report.warnings) {
    console.warn(`WARN [${warn.driver}] ${warn.message}`);
  }
}

process.exit(report.errors.length > 0 ? 1 : 0);
