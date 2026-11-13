'use strict';

/** Same set as homey-lib App.RESERVED_SETTING_PREFIXES (homey 4.4.1 / homey-lib). */
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

function collectSettingIds(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectSettingIds(item, out);
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  if (typeof node.id === 'string' && node.type) out.push(node.id);
  if (Array.isArray(node.children)) collectSettingIds(node.children, out);
  if (Array.isArray(node.settings)) collectSettingIds(node.settings, out);
  if (Array.isArray(node.drivers)) {
    for (const driver of node.drivers) collectSettingIds(driver && driver.settings, out);
  }
  return out;
}

function reservedSettingHits(json) {
  return collectSettingIds(json)
    .map((id) => ({ id, prefix: reservedPrefix(id) }))
    .filter((hit) => hit.prefix);
}

module.exports = { RESERVED_SETTING_PREFIXES, reservedPrefix, collectSettingIds, reservedSettingHits };
