#!/usr/bin/env node
'use strict';

/**
 * Intelligent driver settings enrichment (L99 / forum-driven)
 * WHY: Homey users need power_scale / Solar Sync / backlight strings without
 * inventing sacred couples. Dry-run by default; --apply writes compose JSON.
 *
 * Track: BOTH for energy/backlight strings; MASTER_ONLY Solar Sync checkboxes.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');
const APPLY = process.argv.includes('--apply');
const MASTER_FEATURES = !process.argv.includes('--both-only');

const POWER_SCALE = {
  id: 'power_scale',
  type: 'dropdown',
  label: { en: 'Power Measurement Scale', fr: 'Échelle de puissance' },
  value: '1',
  values: [
    { id: '0.1', label: { en: '÷10', fr: '÷10' } },
    { id: '1', label: { en: '×1 (Default)', fr: '×1 (défaut)' } },
    { id: '10', label: { en: '×10', fr: '×10' } },
  ],
  hint: { en: 'Use if W/kWh readings are 10× too high or low.', fr: 'Si W/kWh sont ×10 trop hauts ou bas.' },
};

const BIDIRECTIONAL = {
  id: 'bidirectional',
  type: 'checkbox',
  label: { en: 'Bidirectional (import/export)', fr: 'Bidirectionnel (import/export)' },
  value: false,
  hint: { en: 'Enable when the meter reports exported energy.', fr: 'Activer si le compteur reporte l’énergie exportée.' },
};

const BACKLIGHT = {
  id: 'backlight_mode',
  type: 'dropdown',
  label: { en: 'Backlight mode', fr: 'Mode rétroéclairage' },
  value: 'normal',
  values: [
    { id: 'off', label: { en: 'Off', fr: 'Éteint' } },
    { id: 'normal', label: { en: 'Normal', fr: 'Normal' } },
    { id: 'inverted', label: { en: 'Inverted', fr: 'Inversé' } },
  ],
  hint: { en: 'Strings only: off / normal / inverted.', fr: 'Chaînes uniquement : off / normal / inverted.' },
};

const SOLAR_SYNC = {
  id: 'enable_natural_light',
  type: 'checkbox',
  label: { en: 'Enable Solar Sync (Daylight Atmosphere)', fr: 'Activer Synchro solaire (Atmosphère jour)' },
  value: false,
  hint: { en: 'Sun-driven white temperature over the day.', fr: 'Blanc piloté par le soleil au fil du jour.' },
};

const MEASUREMENT_GROUP = {
  type: 'group',
  label: { en: 'Measurement Settings', fr: 'Paramètres de mesure' },
  children: [POWER_SCALE, BIDIRECTIONAL],
};

function readCompose(driverId) {
  const p = path.join(DRIVERS, driverId, 'driver.compose.json');
  if (!fs.existsSync(p)) {return null;}
  return { path: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) };
}

function hasSettingId(settings, id) {
  if (!Array.isArray(settings)) {return false;}
  for (const s of settings) {
    if (s.id === id) {return true;}
    if (s.children && hasSettingId(s.children, id)) {return true;}
  }
  return false;
}

function caps(data) {
  return new Set(data.capabilities || []);
}

const changes = [];

function note(driverId, msg, mutator) {
  const c = readCompose(driverId);
  if (!c) {return;}
  const before = JSON.stringify(c.data.settings || []);
  mutator(c.data);
  const after = JSON.stringify(c.data.settings || []);
  if (before === after) {return;}
  changes.push({ driverId, msg, path: c.path, data: c.data });
}

// --- Energy meters / plugs with metering caps ---
const ENERGY_DRIVERS = [
  'energy_meter_din',
  'energy_meter_3phase',
  'power_clamp_meter',
  'device_din_rail_meter',
  'device_air_purifier_din',
  'smartplug',
  'wall_socket',
  'outdoor_2_socket',
  'plug_energy_monitor',
  'switch_1gang',
  'switch_2gang',
  'switch_3gang',
];

for (const id of ENERGY_DRIVERS) {
  note(id, 'add power_scale (+ bidirectional if exported)', (data) => {
    const c = caps(data);
    if (!c.has('measure_power') && !c.has('meter_power')) {return;}
    if (!Array.isArray(data.settings)) {data.settings = [];}

    // Replace wrong battery-centric settings on DIN siblings
    if (id === 'device_din_rail_meter') {
      const hasBatteryNoise = hasSettingId(data.settings, 'power_source')
        || hasSettingId(data.settings, 'battery_type');
      if (hasBatteryNoise || !hasSettingId(data.settings, 'power_scale')) {
        data.settings = [JSON.parse(JSON.stringify(MEASUREMENT_GROUP))];
      }
      return;
    }

    if (!hasSettingId(data.settings, 'power_scale')) {
      // Prefer appending into existing measurement group
      const group = data.settings.find((s) => s.type === 'group' && /measure|power|energy/i.test(JSON.stringify(s.label || {})));
      if (group && Array.isArray(group.children)) {
        group.children.push(JSON.parse(JSON.stringify(POWER_SCALE)));
        if (c.has('meter_power.exported') && !hasSettingId(data.settings, 'bidirectional')) {
          group.children.push(JSON.parse(JSON.stringify(BIDIRECTIONAL)));
        }
      } else if (data.settings.length === 0) {
        const g = JSON.parse(JSON.stringify(MEASUREMENT_GROUP));
        if (!c.has('meter_power.exported')) {
          g.children = g.children.filter((x) => x.id !== 'bidirectional');
        }
        data.settings.push(g);
      } else {
        data.settings.push(JSON.parse(JSON.stringify(POWER_SCALE)));
        if (c.has('meter_power.exported') && !hasSettingId(data.settings, 'bidirectional')) {
          data.settings.push(JSON.parse(JSON.stringify(BIDIRECTIONAL)));
        }
      }
    }
  });
}

// --- Backlight strings on gang switches ---
for (const id of ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang']) {
  note(id, 'add backlight_mode strings', (data) => {
    if (!Array.isArray(data.settings)) {data.settings = [];}
    if (hasSettingId(data.settings, 'backlight_mode')) {return;}
    data.settings.push({
      type: 'group',
      label: { en: 'LED Indicator (Backlight)', fr: 'Indicateur LED' },
      children: [JSON.parse(JSON.stringify(BACKLIGHT))],
    });
  });
}

// --- Solar Sync on tunable lights (MASTER_ONLY) ---
if (MASTER_FEATURES) {
  for (const id of [
    'bulb_rgbw_universal',
    'light_bulb_tunable_white',
    'bulb_tunable_white',
    'light_bulb_dimmable_tunable',
    'bulb_white_ambiance',
  ]) {
    note(id, 'Solar Sync checkbox (brand-free label)', (data) => {
      const c = caps(data);
      if (!c.has('light_temperature') && !c.has('light_color_temp') && !c.has('light_hue')) {return;}
      if (!Array.isArray(data.settings)) {data.settings = [];}

      // Scrub existing Natural Light label
      const scrub = (arr) => {
        for (const s of arr || []) {
          if (s.id === 'enable_natural_light' && s.label) {
            s.label = { en: 'Enable Solar Sync (Daylight Atmosphere)', fr: 'Activer Synchro solaire (Atmosphère jour)' };
            s.hint = s.hint || { en: 'Sun-driven white temperature over the day.' };
          }
          if (s.children) {scrub(s.children);}
        }
      };
      scrub(data.settings);

      if (!hasSettingId(data.settings, 'enable_natural_light')) {
        data.settings.push(JSON.parse(JSON.stringify(SOLAR_SYNC)));
      }
    });
  }
}

console.log(`enrich-driver-settings-intelligent: ${changes.length} driver(s) to update (apply=${APPLY})`);
for (const ch of changes) {
  console.log(`  - ${ch.driverId}: ${ch.msg}`);
  if (APPLY) {
    fs.writeFileSync(ch.path, `${JSON.stringify(ch.data, null, 2)}\n`);
  }
}

const reportDir = path.join(ROOT, 'reports', `settings-enrich-${new Date().toISOString().slice(0, 10)}`);
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'plan.json'), JSON.stringify({
  at: new Date().toISOString(),
  apply: APPLY,
  changes: changes.map((c) => ({ driverId: c.driverId, msg: c.msg })),
}, null, 2));

if (!APPLY) {
  console.log('Dry-run only. Re-run with --apply to write.');
}
process.exit(0);
