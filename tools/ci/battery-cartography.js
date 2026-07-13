#!/usr/bin/env node
/**
 * P28.2 — Battery Cartography Tool
 * 
 * Maps ALL battery-related code paths in master and stable:
 * 1. lib/battery/* (all battery modules)
 * 2. Drivers using battery code
 * 3. Tuya DPs handled for battery
 * 4. Battery chem profiles
 * 5. Battery capability usages
 * 6. Missing fallbacks and gaps
 */

'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const outputFile = path.join(repoRoot, '.github', 'state', 'battery-cartography.json');

// ─── Collect battery modules ─────────────────────────────────────
function collectBatteryModules() {
  const batteryDir = path.join(repoRoot, 'lib', 'battery');
  if (!fs.existsSync(batteryDir)) return [];

  return fs.readdirSync(batteryDir)
    .filter(f => f.endsWith('.js'))
    .map(f => {
      const filePath = path.join(batteryDir, f);
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      return {
        name: f,
        path: `lib/battery/${f}`,
        sizeKB: Math.round(stat.size / 1024),
        lineCount: content.split('\n').length,
        classes: extractClasses(content),
        methods: extractMethods(content),
        staticConstants: extractStaticConstants(content),
        exports: extractExports(content),
      };
    });
}

function extractClasses(content) {
  const matches = content.match(/class\s+(\w+)/g) || [];
  return matches.map(m => m.replace(/class\s+/, ''));
}

function extractMethods(content) {
  // Match static and instance method definitions
  const matches = content.match(/(?:static\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g) || [];
  return [...new Set(matches.map(m => {
    const parts = m.match(/(?:static\s+)?(?:async\s+)?(\w+)/);
    return parts ? parts[1] : null;
  }).filter(Boolean))].slice(0, 100);
}

function extractStaticConstants(content) {
  // Match `static NAME = ...`
  const matches = content.match(/static\s+(\w+)\s*=\s*[\{\[]/g) || [];
  return matches.map(m => {
    const parts = m.match(/static\s+(\w+)/);
    return parts ? parts[1] : null;
  }).filter(Boolean);
}

function extractExports(content) {
  // Match `module.exports.NAME` or `exports.NAME`
  const matches = content.match(/module\.exports\.(\w+)|exports\.(\w+)\s*=/g) || [];
  return [...new Set(matches.map(m => {
    const parts = m.match(/(\w+)\s*=/);
    return parts ? parts[1] : null;
  }).filter(Boolean))];
}

// ─── Collect drivers using battery ────────────────────────────────
function collectBatteryDrivers() {
  const driversDir = path.join(repoRoot, 'drivers');
  if (!fs.existsSync(driversDir)) return [];

  const drivers = [];
  const batteryKeywords = [
    'battery', 'UnifiedBatteryHandler', 'BatterySystem', 'BatteryManager',
    'measure_battery', 'alarm_battery', 'batteryPercentageRemaining',
    'tuyaEF00Manager', 'battery_state',
  ];

  for (const driverName of fs.readdirSync(driversDir)) {
    const driverPath = path.join(driversDir, driverName);
    if (!fs.statSync(driverPath).isDirectory()) continue;

    const deviceFile = path.join(driverPath, 'device.js');
    if (!fs.existsSync(deviceFile)) continue;

    const content = fs.readFileSync(deviceFile, 'utf8');
    const matches = batteryKeywords.filter(kw => content.includes(kw));

    if (matches.length > 0) {
      drivers.push({
        driver: driverName,
        keywords: matches,
        lineCount: content.split('\n').length,
        hasUnifiedBatteryHandler: content.includes('UnifiedBatteryHandler'),
        hasBatterySystem: content.includes('BatterySystem'),
        hasBatteryManager: content.includes('BatteryManager'),
        hasBatteryMonitoringMixin: content.includes('BatteryMonitoringMixin'),
        hasTuyaEF00: content.includes('tuyaEF00Manager'),
        hasMeasureBattery: content.includes('measure_battery'),
        hasAlarmBattery: content.includes('alarm_battery'),
        hasReadBattery: /read\s*[\(\s]?\s*battery/i.test(content) || /battery.*read/i.test(content),
        hasOnEndDeviceAnnounce: content.includes('onEndDeviceAnnounce'),
      });
    }
  }
  return drivers;
}

// ─── Collect Tuya battery DPs ────────────────────────────────────
function collectTuyaBatteryDPs() {
  const ubhPath = path.join(repoRoot, 'lib', 'battery', 'UnifiedBatteryHandler.js');
  if (!fs.existsSync(ubhPath)) return null;

  const content = fs.readFileSync(ubhPath, 'utf8');
  return {
    core_percent_dps: extractArray(content, 'BATTERY_CORE_PERCENT_DPS'),
    extended_percent_dps: extractArray(content, 'BATTERY_EXTENDED_PERCENT_DPS'),
    profile_only_dps: extractArray(content, 'BATTERY_PROFILE_ONLY_PERCENT_DPS'),
    state_dps: extractArray(content, 'BATTERY_STATE_DPS'),
    voltage_dps: extractArray(content, 'VOLTAGE_DPS'),
  };
}

function extractArray(content, name) {
  const match = content.match(new RegExp(`const\\s+${name}\\s*=\\s*\\[([^\\]]+)\\]`));
  if (!match) return [];
  return match[1].split(',').map(n => Number(n.trim())).filter(n => Number.isFinite(n));
}

// ─── Collect battery chem profiles ───────────────────────────────
function collectBatteryChemProfiles() {
  const ubhPath = path.join(repoRoot, 'lib', 'battery', 'UnifiedBatteryHandler.js');
  if (!fs.existsSync(ubhPath)) return [];

  const content = fs.readFileSync(ubhPath, 'utf8');
  const match = content.match(/static\s+BATTERY_SPECS\s*=\s*\{([\s\S]+?)\n\s{2}\}/);
  if (!match) return [];

  const profiles = [];
  const lines = match[1].split('\n');
  for (const line of lines) {
    const m = line.match(/^\s+'([^']+)':\s*\{/);
    if (m) profiles.push(m[1]);
  }
  return profiles;
}

// ─── Collect device-to-battery mapping ──────────────────────────
function collectDeviceBatteryMap() {
  const ubhPath = path.join(repoRoot, 'lib', 'battery', 'UnifiedBatteryHandler.js');
  if (!fs.existsSync(ubhPath)) return {};

  const content = fs.readFileSync(ubhPath, 'utf8');
  const match = content.match(/static\s+DEVICE_BATTERY_MAP\s*=\s*\{([\s\S]+?)\n\s{2}\}/);
  if (!match) return {};

  const map = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*'([^']+)':\s*'([^']+)'/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

// ─── Collect known battery profiles (mfr+pid) ───────────────────
function collectKnownProfiles() {
  const ubhPath = path.join(repoRoot, 'lib', 'battery', 'UnifiedBatteryHandler.js');
  if (!fs.existsSync(ubhPath)) return [];

  const content = fs.readFileSync(ubhPath, 'utf8');
  const match = content.match(/static\s+BATTERY_PROFILES\s*=\s*\{([\s\S]+?)\n\s{2}\}/);
  if (!match) return [];

  const profiles = [];
  const lines = match[1].split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*'([^']+)':\s*\{/);
    if (m) profiles.push(m[1]);
  }
  return profiles;
}

// ─── Find settings indexes ───────────────────────────────────────
function findBatterySettings() {
  const settings = [];
  const driversDir = path.join(repoRoot, 'drivers');
  if (!fs.existsSync(driversDir)) return settings;

  for (const driverName of fs.readdirSync(driversDir)) {
    const composeFile = path.join(driversDir, driverName, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      if (!Array.isArray(compose.settings)) continue;
      for (const setting of compose.settings) {
        if (setting.id && /battery|button_mode/.test(setting.id)) {
          settings.push({
            driver: driverName,
            id: setting.id,
            type: setting.type,
            value: setting.value,
          });
        }
      }
    } catch (_e) {
      // ignore
    }
  }
  return settings;
}

// ─── Run analysis ────────────────────────────────────────────────
console.log('🔋 Building battery cartography...');

const cartography = {
  generatedAt: new Date().toISOString(),
  repoRoot,
  batteryModules: collectBatteryModules(),
  tuyaDPs: collectTuyaBatteryDPs(),
  chemProfiles: collectBatteryChemProfiles(),
  deviceBatteryMap: collectDeviceBatteryMap(),
  knownManufacturerProfiles: collectKnownProfiles(),
  driversUsingBattery: collectBatteryDrivers(),
  batterySettings: findBatterySettings(),
};

cartography.summary = {
  totalBatteryModules: cartography.batteryModules.length,
  totalBatteryCodeKB: cartography.batteryModules.reduce((sum, m) => sum + m.sizeKB, 0),
  totalDriversUsingBattery: cartography.driversUsingBattery.length,
  driversWithUnifiedBatteryHandler: cartography.driversUsingBattery.filter(d => d.hasUnifiedBatteryHandler).length,
  driversWithMeasureBattery: cartography.driversUsingBattery.filter(d => d.hasMeasureBattery).length,
  driversWithAlarmBattery: cartography.driversUsingBattery.filter(d => d.hasAlarmBattery).length,
  driversWithTuyaEF00: cartography.driversUsingBattery.filter(d => d.hasTuyaEF00).length,
  driversWithOnEndDeviceAnnounce: cartography.driversUsingBattery.filter(d => d.hasOnEndDeviceAnnounce).length,
  chemProfiles: cartography.chemProfiles.length,
  knownManufacturerProfiles: cartography.knownManufacturerProfiles.length,
  tuyaPercentDPs: cartography.tuyaDPs ? cartography.tuyaDPs.core_percent_dps.length + cartography.tuyaDPs.extended_percent_dps.length : 0,
  tuyaStateDPs: cartography.tuyaDPs ? cartography.tuyaDPs.state_dps.length : 0,
  tuyaVoltageDPs: cartography.tuyaDPs ? cartography.tuyaDPs.voltage_dps.length : 0,
  batterySettingsCount: cartography.batterySettings.length,
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(cartography, null, 2));

console.log('✅ Battery cartography written to:', outputFile);
console.log('   📦 Battery modules:', cartography.summary.totalBatteryModules, `(${cartography.summary.totalBatteryCodeKB}KB)`);
console.log('   🔌 Drivers using battery:', cartography.summary.totalDriversUsingBattery);
console.log('   🧬 Chem profiles:', cartography.summary.chemProfiles);
console.log('   🏷️ Known mfr profiles:', cartography.summary.knownManufacturerProfiles);
console.log('   📊 Tuya DPs:', `${cartography.summary.tuyaPercentDPs} percent + ${cartography.summary.tuyaStateDPs} state + ${cartography.summary.tuyaVoltageDPs} voltage`);
console.log('   ⚙️ Battery settings:', cartography.summary.batterySettingsCount);
