#!/usr/bin/env node
'use strict';

/**
 * Lock TB25 ZCL wall-switch sacred couples onto subdevice drivers
 * and strip climate/sensor cartesian productIds.
 *
 * WHY: Homey pairing is manufacturerName × productId. A 3-gang wall
 * driver that also lists TS0601/TS0201 steals climate pairing and
 * cannot safely host TB25-3 sub-device tiles.
 * HOW: compose manufacturerName + productId lock (sacred couple).
 * WHO: Homey pairing (BOTH intent; applied on master first).
 * WHEN: pair / re-pair.
 * AGAINST: climate_sensor / switch_3gang catch-all cartesian.
 *
 * Does not invent 606/808/ZMS-206 pids.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function variantsTz3000(suffix) {
  const s = String(suffix).toLowerCase();
  const u = s.toUpperCase();
  return [
    `_TZ3000_${s}`,
    `_tz3000_${s}`,
    `_TZ3000_${u}`,
    `_tz3000_${u}`,
  ];
}

function loadCompose(driver) {
  const fp = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  return { fp, json: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

function saveCompose(fp, json) {
  fs.writeFileSync(fp, `${JSON.stringify(json, null, 2)}\n`);
}

function addMfrs(json, list) {
  const cur = json.zigbee.manufacturerName || [];
  const seen = new Set(cur.map((x) => String(x)));
  for (const m of list) {
    if (!seen.has(m)) {
      cur.push(m);
      seen.add(m);
    }
  }
  json.zigbee.manufacturerName = cur;
}

function removeTz3000Suffixes(json, suffixes) {
  const drop = new Set(suffixes.map((s) => s.toLowerCase()));
  json.zigbee.manufacturerName = (json.zigbee.manufacturerName || []).filter((m) => {
    const s = String(m);
    const mLow = s.toLowerCase();
    if (!mLow.startsWith('_tz3000_')) return true;
    const suf = mLow.slice('_tz3000_'.length);
    return !drop.has(suf);
  });
}

const CONNECTED_GROUP = {
  type: 'group',
  label: {
    en: 'Connected switches',
    nl: 'Gekoppelde schakelaars',
    fr: 'Interrupteurs liés',
    de: 'Verbundene Schalter',
  },
  children: [
    {
      id: 'connected_siblings',
      type: 'label',
      label: {
        en: 'This wall unit',
        nl: 'Dit wandapparaat',
        fr: 'Cet interrupteur mural',
        de: 'Diese Wandeinheit',
      },
      value: '—',
    },
    {
      id: 'traffic_stats',
      type: 'label',
      label: {
        en: 'Network activity',
        nl: 'Netwerkactiviteit',
        fr: 'Activité réseau',
        de: 'Netzwerkaktivität',
      },
      value: '—',
    },
  ],
};

const INCHING_GROUP = {
  type: 'group',
  label: {
    en: 'Pulse / inching',
    nl: 'Puls / inching',
    fr: 'Impulsion / inching',
    de: 'Impuls / Inching',
  },
  children: [
    {
      id: 'inching',
      type: 'checkbox',
      label: {
        en: 'Pulse mode (auto-off)',
        nl: 'Pulsmodus (automatisch uit)',
        fr: 'Mode impulsion (extinction auto)',
        de: 'Impulsmodus (Auto-Aus)',
      },
      hint: {
        en: 'Change LED and pulse only on the main gang tile. Homey Flows cover timers/countdowns.',
        nl: 'LED en puls alleen op de hoofdtegel. Timers via Flows.',
        fr: 'LED et impulsion uniquement sur la tuile principale. Les minuteries passent par les Flows.',
      },
      value: false,
    },
    {
      id: 'inching_duration',
      type: 'number',
      label: {
        en: 'Pulse duration (seconds)',
        nl: 'Pulsduur (seconden)',
        fr: "Durée d'impulsion (secondes)",
        de: 'Impulsdauer (Sekunden)',
      },
      value: 60,
      min: 1,
      max: 3600,
    },
  ],
};

function ensureSettings(json) {
  if (!Array.isArray(json.settings)) json.settings = [];
  const ids = new Set();
  for (const g of json.settings) {
    for (const c of g.children || []) ids.add(c.id);
  }
  if (!ids.has('connected_siblings')) json.settings.push(CONNECTED_GROUP);
  else {
    for (const g of json.settings) {
      if ((g.children || []).some((c) => c.id === 'connected_siblings')
        && !(g.children || []).some((c) => c.id === 'traffic_stats')) {
        g.children.push(CONNECTED_GROUP.children[1]);
      }
    }
  }
  if (!ids.has('inching')) json.settings.push(INCHING_GROUP);
}

function main() {
  const tb25_3 = ['yervjnlj', 'vjhcenzo', 'qxcnwv26', 'eqsair32', 'f09j9qjb', 'fawk5xjv', 'ok0ggpk7'];
  const tb25_3_mfrs = tb25_3.flatMap(variantsTz3000);

  const three = loadCompose('wall_switch_3gang_1way');
  addMfrs(three.json, tb25_3_mfrs);
  three.json.zigbee.productId = ['TS0003', 'TS0013'];
  ensureSettings(three.json);
  saveCompose(three.fp, three.json);

  const catch3 = loadCompose('switch_3gang');
  removeTz3000Suffixes(catch3.json, tb25_3);
  saveCompose(catch3.fp, catch3.json);

  const four = loadCompose('wall_switch_4gang_1way');
  addMfrs(four.json, variantsTz3000('lwthnp7j'));
  four.json.zigbee.productId = ['TS0004', 'TS0014', 'TS000F', 'TS0726'];
  ensureSettings(four.json);
  saveCompose(four.fp, four.json);

  const catch4 = loadCompose('switch_4gang');
  removeTz3000Suffixes(catch4.json, ['lwthnp7j']);
  saveCompose(catch4.fp, catch4.json);

  console.log('Locked TB25-3 → wall_switch_3gang_1way (TS0003/TS0013)');
  console.log('Locked TB25-4 ZCL lwthnp7j → wall_switch_4gang_1way (TS0004/TS0014/TS000F)');
}

main();
