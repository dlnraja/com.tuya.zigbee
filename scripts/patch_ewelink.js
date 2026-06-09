const fs = require('fs');
const file = 'drivers/plug_energy_monitor/device.js';

let content = fs.readFileSync(file, 'utf8');

// Fix 1: Add eWeLink to ZCL_ELECTRICAL
const target1 = `'SONOFF', 'Sonoff',  // Sonoff S60ZBTPF/S60ZBTPG/S60ZBTPE`;
const replacement1 = `'SONOFF', 'Sonoff', 'eWeLink', 'ewelink', 'EWELINK', // Sonoff & eWeLink`;
if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
}

// Fix 2: Make lookup case insensitive
const target2 = `// Build manufacturer -> config lookup
const ENERGY_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(ENERGY_DEVICE_CONFIGS)) {
  for (const mfr of config.sensors || []) {
    ENERGY_CONFIG_MAP[mfr] = { ...config, configName };
  }
}

// Get config for manufacturer
function getEnergyConfig(manufacturerName) {
  return ENERGY_CONFIG_MAP[manufacturerName] || ENERGY_DEVICE_CONFIGS.TUYA_DP_STANDARD;
}`;

const replacement2 = `// Build manufacturer -> config lookup
const ENERGY_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(ENERGY_DEVICE_CONFIGS)) {
  for (const mfr of config.sensors || []) {
    ENERGY_CONFIG_MAP[mfr.toLowerCase()] = { ...config, configName };
  }
}

// Get config for manufacturer
function getEnergyConfig(manufacturerName) {
  const mfrLower = (manufacturerName || '').toLowerCase();
  return ENERGY_CONFIG_MAP[mfrLower] || ENERGY_DEVICE_CONFIGS.TUYA_DP_STANDARD;
}`;

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
}

fs.writeFileSync(file, content);
console.log('Patched ' + file);
