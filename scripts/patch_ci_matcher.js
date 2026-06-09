const fs = require('fs');
const file = 'drivers/plug_energy_monitor/device.js';
let content = fs.readFileSync(file, 'utf8');

const target1 = `const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');`;
const replacement1 = `const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const CI = require('../../lib/utils/CaseInsensitiveMatcher');`;

if (!content.includes('CaseInsensitiveMatcher')) {
  content = content.replace(target1, replacement1);
}

const target2 = `for (const [configName, config] of Object.entries(ENERGY_DEVICE_CONFIGS)) {
  for (const mfr of config.sensors || []) {
    ENERGY_CONFIG_MAP[mfr.toLowerCase()] = { ...config, configName };
  }
}

// Get config for manufacturer
function getEnergyConfig(manufacturerName) {
  const mfrLower = (manufacturerName || '').toLowerCase();
  return ENERGY_CONFIG_MAP[mfrLower] || ENERGY_DEVICE_CONFIGS.TUYA_DP_STANDARD;
}`;

const replacement2 = `for (const [configName, config] of Object.entries(ENERGY_DEVICE_CONFIGS)) {
  for (const mfr of config.sensors || []) {
    ENERGY_CONFIG_MAP[CI.normalize(mfr)] = { ...config, configName };
  }
}

// Get config for manufacturer
function getEnergyConfig(manufacturerName) {
  const mfrLower = CI.normalize(manufacturerName);
  return ENERGY_CONFIG_MAP[mfrLower] || ENERGY_DEVICE_CONFIGS.TUYA_DP_STANDARD;
}`;

if (content.includes('mfr.toLowerCase()')) {
  content = content.replace(target2, replacement2);
}

fs.writeFileSync(file, content);
console.log('Patched ' + file);
