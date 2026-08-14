#!/usr/bin/env node
/**
 * P131 — Patch missing registerRunListener for actuator flow cards.
 * Usage: node tools/ci/patch-missing-flow-listeners.js [--apply] [--only=a,b]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg
  ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean))
  : null;

const PRIORITY = [
  'fan_controller', 'outdoor_2_socket', 'device_plug_smart', 'dimmer_0_10v', 'dimmer_4ch',
  'bulb_white', 'radiator_controller', 'radiator_valve', 'humidifier',
  'device_air_purifier_humidifier', 'led_controller_dimmable', 'led_controller_rgb',
  'led_controller_cct', 'plug_smart', 'smart_scene_panel', 'device_radiator_valve_smart',
  'smart_heater', 'smart_heater_controller', 'hybrid_heater_thermostat',
  'climate_sensor_plug', 'contact_sensor_plug',
];

function infer(card, kind) {
  const id = card.id || '';
  if (/_is_on$/.test(id)) return { type: 'condition', capability: 'onoff', value: true };
  if (/_is_off$/.test(id)) return { type: 'condition', capability: 'onoff', value: false };
  if (/turn_on|_turn_on$/.test(id)) return { type: 'action', capability: 'onoff', value: true };
  if (/turn_off|_turn_off$/.test(id)) return { type: 'action', capability: 'onoff', value: false };
  if (/toggle/.test(id)) return { type: 'action', capability: 'onoff', value: 'toggle' };
  if (/set_brightness|set_dim|_set_dim$|_set_brightness$/.test(id)) {
    return { type: 'action', capability: 'dim', value: 'args' };
  }
  if (/set_speed|set_fan/.test(id)) return { type: 'action', capability: 'dim', value: 'speed_pct' };
  if (/speed_up/.test(id)) return { type: 'action', capability: 'dim', value: 'up' };
  if (/speed_down/.test(id)) return { type: 'action', capability: 'dim', value: 'down' };
  if (/set_target_temperature|set_temperature/.test(id)) {
    return { type: 'action', capability: 'target_temperature', value: 'args' };
  }
  if (/set_switch_([1-4])/.test(id)) {
    const n = id.match(/set_switch_([1-4])/)[1];
    return { type: 'action', capability: n === '1' ? 'onoff' : `onoff.${n}`, value: 'args_bool' };
  }
  if (kind === 'condition') return null;
  return null;
}

function listenerSnippet(cardId, meta) {
  if (meta.type === 'condition') {
    return `
    try {
      const __card = this.homey.flow.getConditionCard('${cardId}');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('${meta.capability}') === ${meta.value};
        });
      }
    } catch (e) { this.error('[FLOW] ${cardId}:', e.message); }
`;
  }
  if (meta.value === 'toggle') {
    return `
    try {
      const __card = this.homey.flow.getActionCard('${cardId}');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const v = !args.device.getCapabilityValue('${meta.capability}');
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('${meta.capability}', v).catch(() => {});
          } else {
            await args.device.setCapabilityValue('${meta.capability}', v).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] ${cardId}:', e.message); }
`;
  }
  if (meta.value === 'speed_pct') {
    return `
    try {
      const __card = this.homey.flow.getActionCard('${cardId}');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const raw = args.speed ?? args.brightness ?? args.dim ?? args.value;
          if (raw === undefined) return false;
          const dim = Number(raw) > 1 ? Number(raw) / 100 : Number(raw);
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('dim', dim).catch(() => {});
          } else {
            await args.device.setCapabilityValue('dim', dim).catch(() => {});
          }
          if (typeof args.device._setFanSpeed === 'function') {
            await args.device._setFanSpeed(dim).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] ${cardId}:', e.message); }
`;
  }
  if (meta.value === 'args') {
    return `
    try {
      const __card = this.homey.flow.getActionCard('${cardId}');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const raw = args.temperature ?? args.brightness ?? args.dim ?? args.value ?? args.speed;
          if (raw === undefined) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('${meta.capability}', raw).catch(() => {});
          } else {
            await args.device.setCapabilityValue('${meta.capability}', raw).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] ${cardId}:', e.message); }
`;
  }
  if (meta.value === 'up' || meta.value === 'down') {
    const delta = meta.value === 'up' ? 0.1 : -0.1;
    return `
    try {
      const __card = this.homey.flow.getActionCard('${cardId}');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const cur = Number(args.device.getCapabilityValue('${meta.capability}')) || 0;
          const next = Math.max(0, Math.min(1, cur + (${delta})));
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('${meta.capability}', next).catch(() => {});
          } else {
            await args.device.setCapabilityValue('${meta.capability}', next).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] ${cardId}:', e.message); }
`;
  }
  if (meta.value === 'args_bool') {
    return `
    try {
      const __card = this.homey.flow.getActionCard('${cardId}');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const v = !!(args.value ?? args.state ?? args.onoff);
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('${meta.capability}', v).catch(() => {});
          } else {
            await args.device.setCapabilityValue('${meta.capability}', v).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] ${cardId}:', e.message); }
`;
  }
  return `
    try {
      const __card = this.homey.flow.getActionCard('${cardId}');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('${meta.capability}', ${meta.value}).catch(() => {});
          } else {
            await args.device.setCapabilityValue('${meta.capability}', ${meta.value}).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] ${cardId}:', e.message); }
`;
}

function ensureOnInit(src, inject) {
  const marker = '/* P131-AUTO-FLOW-LISTENERS */';
  const end = '/* P131-AUTO-FLOW-LISTENERS-END */';
  if (src.includes(marker)) {
    return src.replace(
      /\/\* P131-AUTO-FLOW-LISTENERS \*\/[\s\S]*?\/\* P131-AUTO-FLOW-LISTENERS-END \*\//,
      `${marker}\n${inject}    ${end}`,
    );
  }
  const block = `    ${marker}\n${inject}    ${end}\n`;
  if (/(async\s+onInit\s*\([^)]*\)\s*\{)/.test(src)) {
    return src.replace(/(async\s+onInit\s*\([^)]*\)\s*\{)/, `$1\n${block}`);
  }
  if (/(class\s+\w+[^{]*\{)/.test(src)) {
    return src.replace(
      /(class\s+\w+[^{]*\{)/,
      `$1\n  async onInit() {\n    if (typeof super.onInit === 'function') await super.onInit();\n${block}  }\n`,
    );
  }
  return null;
}

const report = [];
for (const id of (ONLY ? [...ONLY] : PRIORITY)) {
  const dir = path.join(ROOT, 'drivers', id);
  const flowPath = path.join(dir, 'driver.flow.compose.json');
  const driverPath = path.join(dir, 'driver.js');
  if (!fs.existsSync(flowPath) || !fs.existsSync(driverPath)) {
    report.push({ id, skip: 'missing files' });
    continue;
  }
  const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
  let src = fs.readFileSync(driverPath, 'utf8');
  const missing = [];
  let inject = '';
  for (const kind of ['conditions', 'actions']) {
    for (const card of flow[kind] || []) {
      if (!card?.id) continue;
      if (new RegExp(`get(?:Action|Condition)Card\\(['"]${card.id}['"]\\)`).test(src)
          && src.includes('registerRunListener')) continue;
      const meta = infer(card, kind === 'conditions' ? 'condition' : 'action');
      if (!meta) continue;
      if (kind === 'conditions') meta.type = 'condition';
      missing.push(card.id);
      inject += listenerSnippet(card.id, meta);
    }
  }
  if (!missing.length) {
    report.push({ id, skip: 'ok' });
    continue;
  }
  const next = ensureOnInit(src, inject);
  if (!next) {
    report.push({ id, error: 'inject failed' });
    continue;
  }
  report.push({ id, patched: missing.length });
  if (APPLY) fs.writeFileSync(driverPath, next);
}

console.log(JSON.stringify({ apply: APPLY, patched: report.filter((r) => r.patched).length, report }, null, 2));
