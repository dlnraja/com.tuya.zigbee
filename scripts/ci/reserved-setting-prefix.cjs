'use strict';

const fs = require('fs');
const path = require('path');

/** Same set as homey-lib App.RESERVED_SETTING_PREFIXES (homey 4.4.1). */
const RESERVED_SETTING_PREFIXES = [
  'homey:',
  'zw_',
  'zb_',
  'mtr_',
  'thread_',
  'zone_',
  'energy_',
  'satellite_mode_',
  'homekit_',
];

function reservedPrefix(id) {
  if (typeof id !== 'string') return '';
  return RESERVED_SETTING_PREFIXES.find((prefix) => id.startsWith(prefix)) || '';
}

function walkSettings(list, out) {
  if (!Array.isArray(list)) return;
  for (const setting of list) {
    if (!setting || typeof setting !== 'object') continue;
    if (setting.type === 'group') {
      walkSettings(setting.children, out);
      continue;
    }
    if (typeof setting.id === 'string') out.push(setting.id);
    if (Array.isArray(setting.children)) walkSettings(setting.children, out);
  }
}

function reservedSettingHits(json) {
  const ids = [];
  if (Array.isArray(json && json.settings)) walkSettings(json.settings, ids);
  if (Array.isArray(json && json.drivers)) {
    for (const driver of json.drivers) {
      if (driver && Array.isArray(driver.settings)) walkSettings(driver.settings, ids);
    }
  }
  return ids
    .map((id) => ({ id, prefix: reservedPrefix(id) }))
    .filter((hit) => hit.prefix);
}

function scanRoot(root) {
  const hits = [];
  const files = [];
  for (const rel of ['app.json', path.join('.homeycompose', 'app.json')]) {
    const file = path.join(root, rel);
    if (fs.existsSync(file)) files.push(file);
  }
  const drivers = path.join(root, 'drivers');
  if (fs.existsSync(drivers)) {
    for (const id of fs.readdirSync(drivers)) {
      for (const name of ['driver.compose.json', 'driver.settings.compose.json']) {
        const file = path.join(drivers, id, name);
        if (fs.existsSync(file)) files.push(file);
      }
    }
  }
  for (const file of files) {
    let json;
    try { json = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { continue; }
    for (const hit of reservedSettingHits(json)) {
      hits.push({ file: path.relative(root, file), id: hit.id, prefix: hit.prefix });
    }
  }
  return hits;
}

module.exports = {
  RESERVED_SETTING_PREFIXES,
  reservedPrefix,
  walkSettings,
  reservedSettingHits,
  scanRoot,
};
