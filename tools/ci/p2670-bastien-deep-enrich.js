#!/usr/bin/env node
'use strict';

/**
 * P2670 — Bastien deep complementary enrich (max variants + caps + settings)
 *
 * Contre quoi: shallow compose missing Z2M exposes (countdown / switch_type /
 * alarm_battery / TS0004 electrical / SNZB siblings) while Bastien live mesh
 * already interviews those couples.
 *
 * UNION only — never wipe manufacturerName / productId / capabilities / settings.
 */

const fs = require('fs');
const path = require('path');
const {
  unionCapabilities,
  appendSettingsById,
  mergeZigbeeIdentity,
  appendIdentityStrings,
} = require('../../lib/enrichment/ComplementaryMerge');

const ROOT = path.join(__dirname, '..', '..');

function loadCompose(driverId) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  return { fp, j: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

function saveCompose(fp, j) {
  fs.writeFileSync(fp, `${JSON.stringify(j, null, 2)}\n`);
}

function forceCanonicalPids(zigbee, canonicals) {
  const pids = Array.isArray(zigbee.productId) ? zigbee.productId.slice() : [];
  for (const want of canonicals) {
    const lower = String(want).toLowerCase();
    // Drop case-collapsed lowercase duplicate of the same pid
    for (let i = pids.length - 1; i >= 0; i--) {
      if (String(pids[i]).toLowerCase() === lower && pids[i] !== want) pids.splice(i, 1);
    }
    if (!pids.includes(want)) pids.unshift(want);
  }
  zigbee.productId = pids;
}

/** Homey validate: firmwareUpdates.device.manufacturerName must exact-match zigbee.manufacturerName */
function preserveFirmwareUpdateMfrs(j) {
  const mfr = Array.isArray(j.zigbee?.manufacturerName) ? j.zigbee.manufacturerName : [];
  for (const u of (j.firmwareUpdates && j.firmwareUpdates.updates) || []) {
    for (const n of (u.device && u.device.manufacturerName) || []) {
      if (n && !mfr.includes(n)) mfr.push(n);
    }
  }
  if (j.zigbee) j.zigbee.manufacturerName = mfr;
}

function enrichSwitch1gang() {
  const { fp, j } = loadCompose('switch_1gang');
  j.zigbee = j.zigbee || {};
  mergeZigbeeIdentity(j.zigbee, {
    manufacturerName: ['HOBEIAN', 'Hobeian', 'hobeian', 'heobian', 'Heobian'],
    productId: ['ZG-301Z', 'zg-301z', 'WHD02', 'whd02', 'ZG-302Z1'],
  });
  preserveFirmwareUpdateMfrs(j);
  // Keep generic 1-gang caps; HOBEIAN heal strips phantom power at runtime.
  j.capabilities = unionCapabilities(j.capabilities, [
    'onoff',
    'power_on_behavior',
    'button.toggle',
    'button.identify',
    'button.1',
  ]);
  j.settings = appendSettingsById(j.settings, [
    {
      id: 'countdown_seconds',
      type: 'number',
      label: { en: 'Countdown (seconds)', fr: 'Minuteur (secondes)' },
      hint: {
        en: 'Z2M ZG-301Z countdown 0–43200s. 0 = off. Lighting: prefer 0 + switch_type=state.',
        fr: 'Countdown Z2M ZG-301Z 0–43200 s. 0 = off. Éclairage: 0 + switch_type=state.',
      },
      value: 0,
      min: 0,
      max: 43200,
      units: { en: 's', fr: 's' },
    },
    {
      id: 'hobeian_mesh_calm',
      type: 'checkbox',
      label: { en: 'Force HOBEIAN mesh calm on save', fr: 'Forcer calm mesh HOBEIAN' },
      hint: {
        en: 'Re-run heal: fill pid, strip phantom power, setClass light, energy approx, switch_type=state.',
        fr: 'Relance le heal: pid, strip power, class light, energy, switch_type=state.',
      },
      value: false,
    },
  ]);
  if (j.zigbee.learnmode?.instruction) {
    const lm = j.zigbee.learnmode.instruction;
    lm.en = 'Zigbee Bastien → 1-gang Switch. HOBEIAN ZG-301Z / WHD02: toggle 3×. Update ≥1.0.49 then Repair (countdown+switch_type+light class+mesh calm). NOT Homey Zigbee.';
    lm.fr = 'Zigbee Bastien → Interrupteur 1 voie. HOBEIAN ZG-301Z / WHD02: 3× on/off. Update ≥1.0.49 puis Réparer (countdown+switch_type+class light+mesh). PAS Homey Zigbee.';
  }
  saveCompose(fp, j);
  console.log('OK switch_1gang');
}

function enrichSwitch4gang() {
  const { fp, j } = loadCompose('switch_4gang');
  j.zigbee = j.zigbee || {};
  mergeZigbeeIdentity(j.zigbee, {
    manufacturerName: [
      '_TZ3000_ltt60asa', '_tz3000_ltt60asa', '_TZ3000_LTT60ASA',
      '_TZ3000_mmkbptmx', '_tz3000_mmkbptmx',
      '_TZ3000_liygxtcq', '_tz3000_liygxtcq',
    ],
    productId: ['TS0004', 'TS0004_power', 'TS0004_switch_module', 'SML-04Z'],
  });
  // Bastien interview exposes metering clusters 1794/2820 — union electrical caps.
  j.capabilities = unionCapabilities(j.capabilities, [
    'onoff', 'onoff.gang2', 'onoff.gang3', 'onoff.gang4',
    'measure_power', 'meter_power', 'measure_voltage', 'measure_current',
    'power_on_behavior',
  ]);
  j.settings = appendSettingsById(j.settings, [
    {
      id: 'backlight_mode',
      type: 'dropdown',
      label: { en: 'Backlight mode', fr: 'Mode rétroéclairage' },
      value: 'normal',
      values: [
        { id: 'off', label: { en: 'Off', fr: 'Off' } },
        { id: 'normal', label: { en: 'Normal', fr: 'Normal' } },
        { id: 'inverted', label: { en: 'Inverted', fr: 'Inversé' } },
      ],
    },
  ]);
  saveCompose(fp, j);
  console.log('OK switch_4gang');
}

function enrichClimate() {
  const { fp, j } = loadCompose('climate_sensor');
  j.zigbee = j.zigbee || {};
  mergeZigbeeIdentity(j.zigbee, {
    manufacturerName: [
      '_TZ3000_fllyghyj', '_tz3000_fllyghyj',
      '_TZ3210_fllyghyj', '_tz3210_fllyghyj',
      'eWeLink', 'ewelink', 'EWeLink',
    ],
    productId: [
      'SNZB-02', 'SNZB-02B', 'SNZB-02D', 'SNZB-02DR2', 'SNZB-02LD',
      'SNZB-02M', 'SNZB-02P', 'SNZB-02WD', 'TS0201',
      'CK-TLSR8656-SS5-01(7014)', 'CK-TLSR8656-SS5-02(7014)', 'RHK08',
    ],
  });
  j.capabilities = unionCapabilities(j.capabilities, [
    'measure_temperature', 'measure_humidity', 'measure_battery', 'measure_voltage', 'alarm_battery',
  ]);
  if (!j.energy) j.energy = {};
  j.energy.batteries = appendIdentityStrings(j.energy.batteries || [], ['AAA', 'CR2032', 'CR2450']);
  saveCompose(fp, j);
  console.log('OK climate_sensor');
}

function enrichButtons() {
  for (const [id, extra] of [
    ['button_wireless_1', { caps: ['button.1', 'measure_battery', 'alarm_battery'], pids: ['TS0041', 'TS0041A'], mfrs: ['_TZ3000_axpdxqgu', '_tz3000_axpdxqgu'] }],
    ['button_wireless_2', { caps: ['button.1', 'button.2', 'measure_battery', 'alarm_battery'], pids: ['TS0042'], mfrs: ['_TZ3000_dzwgk7e2', '_tz3000_dzwgk7e2'] }],
    ['button_wireless_3', {
      caps: ['button.1', 'button.2', 'button.3', 'measure_battery', 'alarm_battery'],
      pids: ['TS0043'],
      mfrs: ['_TZ3000_vsxvaj9i', '_tz3000_vsxvaj9i', 'Lonsonho', 'LoraTap'],
    }],
  ]) {
    const { fp, j } = loadCompose(id);
    j.zigbee = j.zigbee || {};
    mergeZigbeeIdentity(j.zigbee, {
      manufacturerName: extra.mfrs,
      productId: extra.pids,
    });
    if (id === 'button_wireless_1') forceCanonicalPids(j.zigbee, ['TS0041']);
    if (id === 'button_wireless_2') forceCanonicalPids(j.zigbee, ['TS0042']);
    if (id === 'button_wireless_3') forceCanonicalPids(j.zigbee, ['TS0043']);
    j.capabilities = unionCapabilities(j.capabilities, extra.caps);
    if (!j.energy) j.energy = {};
    j.energy.batteries = appendIdentityStrings(j.energy.batteries || [], ['CR2032', 'CR2450']);
    if (j.capabilitiesOptions && !j.capabilitiesOptions.alarm_battery) {
      j.capabilitiesOptions.alarm_battery = {
        title: { en: 'Low battery', fr: 'Batterie faible' },
      };
    }
    saveCompose(fp, j);
    console.log('OK', id);
  }
}

function enrichFlow1gang() {
  const fp = path.join(ROOT, 'drivers/switch_1gang/driver.flow.compose.json');
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!Array.isArray(j.actions)) j.actions = [];
  const has = (id) => j.actions.some((a) => a && a.id === id);
  if (!has('switch_1gang_set_switch_type')) {
    j.actions.push({
      id: 'switch_1gang_set_switch_type',
      title: { en: 'Set external switch type', fr: 'Définir type interrupteur externe' },
      titleFormatted: {
        en: 'Set switch type to [[type]]',
        fr: 'Type interrupteur = [[type]]',
      },
      args: [
        {
          name: 'type',
          type: 'dropdown',
          title: { en: 'Type', fr: 'Type' },
          values: [
            { id: 'toggle', title: { en: 'Toggle', fr: 'Toggle' } },
            { id: 'state', title: { en: 'State (lights)', fr: 'State (lumières)' } },
            { id: 'momentary', title: { en: 'Momentary', fr: 'Momentary' } },
          ],
        },
      ],
    });
  }
  if (!has('switch_1gang_clear_countdown')) {
    j.actions.push({
      id: 'switch_1gang_clear_countdown',
      title: { en: 'Clear countdown timer', fr: 'Effacer le minuteur' },
      titleFormatted: { en: 'Clear countdown timer', fr: 'Effacer le minuteur' },
      args: [],
    });
  }
  fs.writeFileSync(fp, `${JSON.stringify(j, null, 2)}\n`);
  console.log('OK switch_1gang flows');
}

function enrichMfs() {
  const fp = path.join(ROOT, 'data/mfs_db.json');
  const mfs = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const pairs = [
    ['HOBEIAN', ['ZG-301Z', 'WHD02', 'ZG-302Z1', 'ZG-301Z-2CH'], 'switch_1gang'],
    ['Hobeian', ['ZG-301Z', 'WHD02'], 'switch_1gang'],
    ['hobeian', ['ZG-301Z', 'WHD02'], 'switch_1gang'],
    ['_TZ3000_ltt60asa', ['TS0004', 'TS0004_switch_module', 'SML-04Z'], 'switch_4gang'],
    ['_TZ3000_mmkbptmx', ['TS0004'], 'switch_4gang'],
    ['_TZ3000_liygxtcq', ['TS0004'], 'switch_4gang'],
    ['_TZ3000_fllyghyj', ['SNZB-02', 'SNZB-02P', 'TS0201', 'RHK08'], 'climate_sensor'],
    ['eWeLink', ['CK-TLSR8656-SS5-01(7014)', 'CK-TLSR8656-SS5-02(7014)', 'RHK08'], 'climate_sensor'],
    ['_TZ3000_vsxvaj9i', ['TS0043'], 'button_wireless_3'],
    ['_TZ3000_axpdxqgu', ['TS0041'], 'button_wireless_1'],
    ['_TZ3000_dzwgk7e2', ['TS0042'], 'button_wireless_2'],
  ];
  for (const [mfr, pids, driverId] of pairs) {
    const prev = mfs[mfr] || {};
    const models = appendIdentityStrings(prev.modelIds || [], pids);
    mfs[mfr] = {
      ...prev,
      driverId: prev.driverId || driverId,
      source: prev.source || 'p2670-bastien-deep-enrich',
      modelIds: models,
      modelIdsCount: models.length,
    };
  }
  fs.writeFileSync(fp, JSON.stringify(mfs));
  console.log('OK mfs_db');
}

function main() {
  enrichSwitch1gang();
  enrichSwitch4gang();
  enrichClimate();
  enrichButtons();
  enrichFlow1gang();
  enrichMfs();
  console.log('P2670 complementary enrich done');
}

main();
