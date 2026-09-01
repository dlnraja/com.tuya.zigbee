#!/usr/bin/env node
'use strict';

/**
 * flow-fleet-enrich.js (P2375)
 *
 * CI-only fleet flow enrichment — all driver classes, all sources.
 * Cross-refs Z2M expose gaps + compose capabilities; fixes orphan tokens;
 * adds missing capability triggers/actions; syncs app.json flow registry.
 *
 * NEVER runs on Homey Pro — GitHub Actions / maintainer machine only.
 *
 * Usage:
 *   node tools/ci/flow-fleet-enrich.js
 *   node tools/ci/flow-fleet-enrich.js --apply
 *   node tools/ci/flow-fleet-enrich.js --apply --skip-subtools
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS = path.join(ROOT, 'drivers');
const DATE = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(ROOT, 'reports', `flow-fleet-enrich-${DATE}`);
const APPLY = process.argv.includes('--apply');
const SKIP_SUB = process.argv.includes('--skip-subtools');

/** Capability → trigger template + patterns that mean "already covered". */
const CAPABILITY_TEMPLATES = {
  measure_temperature: {
    patterns: [/temp/i, /temperature/i],
    trigger(driverId) {
      return {
        id: `${driverId}_temperature_changed`,
        title: { en: 'Temperature changed', fr: 'Température changée' },
        tokens: [{
          name: 'temperature',
          type: 'number',
          title: { en: 'Temperature (°C)', fr: 'Température (°C)' },
          example: 22.5,
        }],
        args: [],
        titleFormatted: {
          en: 'Temperature changed to {temperature}°C',
          fr: 'Température {temperature}°C',
        },
      };
    },
  },
  measure_humidity: {
    patterns: [/humid/i],
    trigger(driverId) {
      return {
        id: `${driverId}_humidity_changed`,
        title: { en: 'Humidity changed', fr: 'Humidité changée' },
        tokens: [{
          name: 'humidity',
          type: 'number',
          title: { en: 'Humidity (%)', fr: 'Humidité (%)' },
          example: 55,
        }],
        args: [],
        titleFormatted: {
          en: 'Humidity changed to {humidity}%',
          fr: 'Humidité {humidity}%',
        },
      };
    },
  },
  measure_power: {
    patterns: [/power/i, /watt/i],
    trigger(driverId) {
      return {
        id: `${driverId}_measure_power_changed`,
        title: { en: 'Power changed', fr: 'Puissance changée' },
        tokens: [{
          name: 'power',
          type: 'number',
          title: { en: 'Power (W)', fr: 'Puissance (W)' },
          example: 42,
        }],
        args: [],
        titleFormatted: {
          en: 'Power changed to {power} W',
          fr: 'Puissance {power} W',
        },
      };
    },
  },
  meter_power: {
    patterns: [/energy/i, /meter/i, /kwh/i],
    trigger(driverId) {
      return {
        id: `${driverId}_meter_power_changed`,
        title: { en: 'Energy changed', fr: 'Énergie changée' },
        tokens: [{
          name: 'energy',
          type: 'number',
          title: { en: 'Energy (kWh)', fr: 'Énergie (kWh)' },
          example: 1.2,
        }],
        args: [],
        titleFormatted: {
          en: 'Energy changed to {energy} kWh',
          fr: 'Énergie {energy} kWh',
        },
      };
    },
  },
  measure_voltage: {
    patterns: [/voltage/i],
    trigger(driverId) {
      return {
        id: `${driverId}_voltage_changed`,
        title: { en: 'Voltage changed', fr: 'Tension changée' },
        tokens: [{
          name: 'voltage',
          type: 'number',
          title: { en: 'Voltage (V)', fr: 'Tension (V)' },
          example: 230,
        }],
        args: [],
        titleFormatted: {
          en: 'Voltage changed to {voltage} V',
          fr: 'Tension {voltage} V',
        },
      };
    },
  },
  measure_current: {
    patterns: [/current/i, /amp/i],
    trigger(driverId) {
      return {
        id: `${driverId}_current_changed`,
        title: { en: 'Current changed', fr: 'Courant changé' },
        tokens: [{
          name: 'current',
          type: 'number',
          title: { en: 'Current (A)', fr: 'Courant (A)' },
          example: 0.5,
        }],
        args: [],
        titleFormatted: {
          en: 'Current changed to {current} A',
          fr: 'Courant {current} A',
        },
      };
    },
  },
  dim: {
    patterns: [/bright/i, /dim/i],
    trigger(driverId) {
      return {
        id: `${driverId}_brightness_changed`,
        title: { en: 'Brightness changed', fr: 'Luminosité changée' },
        tokens: [{
          name: 'brightness',
          type: 'number',
          title: { en: 'Brightness (%)', fr: 'Luminosité (%)' },
          example: 80,
        }],
        args: [],
        titleFormatted: {
          en: 'Brightness changed to {brightness}%',
          fr: 'Luminosité {brightness}%',
        },
      };
    },
  },
  windowcoverings_set: {
    patterns: [/cover/i, /position/i, /lift/i, /blind/i, /shutter/i],
    trigger(driverId) {
      return {
        id: `${driverId}_position_changed`,
        title: { en: 'Position changed', fr: 'Position changée' },
        tokens: [{
          name: 'position',
          type: 'number',
          title: { en: 'Position (%)', fr: 'Position (%)' },
          example: 50,
        }],
        args: [],
        titleFormatted: {
          en: 'Cover position changed to {position}%',
          fr: 'Position {position}%',
        },
      };
    },
  },
  target_temperature: {
    patterns: [/target.*temp/i, /setpoint/i, /target_temperature/i],
    trigger(driverId) {
      return {
        id: `${driverId}_target_temperature_changed`,
        title: { en: 'Target temperature changed', fr: 'Consigne changée' },
        tokens: [{
          name: 'temperature',
          type: 'number',
          title: { en: 'Target (°C)', fr: 'Consigne (°C)' },
          example: 21,
        }],
        args: [],
        titleFormatted: {
          en: 'Target temperature changed to {temperature}°C',
          fr: 'Consigne {temperature}°C',
        },
      };
    },
  },
  alarm_motion: {
    patterns: [/motion/i],
    trigger(driverId) {
      return {
        id: `${driverId}_motion_alarm`,
        title: { en: 'Motion alarm', fr: 'Alarme mouvement' },
        args: [],
        titleFormatted: { en: 'Motion detected', fr: 'Mouvement détecté' },
      };
    },
  },
  measure_co2: {
    patterns: [/co2/i],
    trigger(driverId) {
      return {
        id: `${driverId}_co2_changed`,
        title: { en: 'CO₂ changed', fr: 'CO₂ changé' },
        tokens: [{
          name: 'co2',
          type: 'number',
          title: { en: 'CO₂ (ppm)', fr: 'CO₂ (ppm)' },
          example: 800,
        }],
        args: [],
        titleFormatted: {
          en: 'CO₂ changed to {co2} ppm',
          fr: 'CO₂ {co2} ppm',
        },
      };
    },
  },
  measure_pm25: {
    patterns: [/pm25/i, /pm2/i, /pm_25/i],
    trigger(driverId) {
      return {
        id: `${driverId}_pm25_changed`,
        title: { en: 'PM2.5 changed', fr: 'PM2.5 changé' },
        tokens: [{
          name: 'pm25',
          type: 'number',
          title: { en: 'PM2.5', fr: 'PM2.5' },
          example: 12,
        }],
        args: [],
        titleFormatted: {
          en: 'PM2.5 changed to {pm25}',
          fr: 'PM2.5 {pm25}',
        },
      };
    },
  },
  measure_luminance: {
    patterns: [/lux/i, /luminance/i, /illumin/i],
    trigger(driverId) {
      return {
        id: `${driverId}_illuminance_changed`,
        title: { en: 'Illuminance changed', fr: 'Luminosité ambiante changée' },
        tokens: [{
          name: 'lux',
          type: 'number',
          title: { en: 'Lux', fr: 'Lux' },
          example: 300,
        }],
        args: [],
        titleFormatted: {
          en: 'Illuminance changed to {lux} lux',
          fr: 'Luminosité {lux} lux',
        },
      };
    },
  },
};

const Z2M_EXPOSE_TO_CAP = {
  power: 'measure_power',
  energy: 'meter_power',
  voltage: 'measure_voltage',
  current: 'measure_current',
  temperature: 'measure_temperature',
  humidity: 'measure_humidity',
  occupancy: 'alarm_motion',
  contact: 'alarm_contact',
  child_lock: 'child_lock',
  brightness: 'dim',
  fan_speed: 'dim',
  presence: 'alarm_motion',
  illuminance: 'measure_luminance',
  smoke: 'alarm_smoke',
  gas: 'alarm_gas',
  co: 'alarm_co',
  battery: 'measure_battery',
};

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

function cardUsesToken(card, tokenName) {
  const argsStr = JSON.stringify(card.args || []);
  if (argsStr.includes(`"${tokenName}"`) || argsStr.includes(`'${tokenName}'`)) return true;
  const blobs = [card.title, card.titleFormatted, card.hint].filter(Boolean);
  for (const blob of blobs) {
    const s = JSON.stringify(blob);
    if (s.includes(`{${tokenName}}`) || s.includes(`\${${tokenName}}`)) return true;
  }
  return false;
}

/** Fix orphan tokens by injecting {name} into titleFormatted (all locales). */
function fixOrphanTokensOnCard(card) {
  if (!card?.tokens?.length) return false;
  let changed = false;
  if (!card.titleFormatted) {
    card.titleFormatted = { ...(card.title || { en: card.id }) };
  }
  const locales = new Set([
    ...Object.keys(card.titleFormatted || {}),
    ...Object.keys(card.title || {}),
    'en',
  ]);
  for (const t of card.tokens) {
    if (cardUsesToken(card, t.name)) continue;
    for (const loc of locales) {
      const base = card.titleFormatted[loc] || card.title?.[loc] || card.titleFormatted.en || card.title?.en || '';
      if (!base.includes(`{${t.name}}`)) {
        card.titleFormatted[loc] = base ? `${base} ({${t.name}})` : `{${t.name}}`;
        changed = true;
      }
    }
  }
  if (JSON.stringify(card.titleFormatted).includes('[[device]]')) {
    delete card.titleFormatted;
    changed = true;
  }
  return changed;
}

function hasCapabilityTrigger(driverId, cap, triggerIds) {
  const tpl = CAPABILITY_TEMPLATES[cap];
  if (!tpl) return true;
  const joined = triggerIds.join(' ');
  return tpl.patterns.some((re) => re.test(joined));
}

function ensureChildLockActions(driverId, flow, caps) {
  if (!caps.includes('child_lock')) return [];
  const actionIds = (flow.actions || []).map((a) => a.id).join(' ');
  if (/child_lock|childlock/i.test(actionIds)) return [];
  const added = [];
  const enable = {
    id: `${driverId}_enable_child_lock`,
    title: { en: 'Enable child lock', fr: 'Activer verrou enfant' },
    args: [],
    titleFormatted: { en: 'Enable child lock', fr: 'Activer verrou enfant' },
  };
  const disable = {
    id: `${driverId}_disable_child_lock`,
    title: { en: 'Disable child lock', fr: 'Désactiver verrou enfant' },
    args: [],
    titleFormatted: { en: 'Disable child lock', fr: 'Désactiver verrou enfant' },
  };
  if (!flow.actions) flow.actions = [];
  if (!actionIds.includes(`${driverId}_enable_child_lock`)) {
    flow.actions.push(enable);
    added.push(enable.id);
  }
  if (!actionIds.includes(`${driverId}_disable_child_lock`)) {
    flow.actions.push(disable);
    added.push(disable.id);
  }
  return added;
}

function processDriverFlow(driverId) {
  const composePath = path.join(DRIVERS, driverId, 'driver.compose.json');
  const flowPath = path.join(DRIVERS, driverId, 'driver.flow.compose.json');
  if (!fs.existsSync(composePath)) return null;

  const compose = readJson(composePath);
  let flow = fs.existsSync(flowPath)
    ? readJson(flowPath)
    : { triggers: [], conditions: [], actions: [] };
  if (!flow.triggers) flow.triggers = [];
  if (!flow.conditions) flow.conditions = [];
  if (!flow.actions) flow.actions = [];

  const result = {
    driverId,
    orphanFixed: 0,
    triggersAdded: [],
    actionsAdded: [],
  };

  for (const kind of ['triggers', 'conditions', 'actions']) {
    for (const card of flow[kind] || []) {
      if (fixOrphanTokensOnCard(card)) result.orphanFixed += 1;
    }
  }

  const triggerIds = flow.triggers.map((t) => t.id);
  const existingIds = new Set([
    ...triggerIds,
    ...(flow.actions || []).map((a) => a.id),
    ...(flow.conditions || []).map((c) => c.id),
  ]);

  for (const cap of compose.capabilities || []) {
    const tpl = CAPABILITY_TEMPLATES[cap];
    if (!tpl || hasCapabilityTrigger(driverId, cap, triggerIds)) continue;
    const card = tpl.trigger(driverId);
    if (existingIds.has(card.id)) continue;
    flow.triggers.push(card);
    triggerIds.push(card.id);
    existingIds.add(card.id);
    result.triggersAdded.push(card.id);
  }

  const lockAdded = ensureChildLockActions(driverId, flow, compose.capabilities || []);
  result.actionsAdded.push(...lockAdded);

  const dirty = result.orphanFixed > 0 || result.triggersAdded.length > 0 || result.actionsAdded.length > 0;
  if (dirty && APPLY) {
    writeJson(flowPath, flow);
  }
  return dirty ? result : null;
}

function syncAllFlowCardsToAppJson() {
  const appPath = path.join(ROOT, 'app.json');
  const app = readJson(appPath);
  if (!app.flow) app.flow = { triggers: [], conditions: [], actions: [] };
  const maps = {
    triggers: new Map((app.flow.triggers || []).map((c) => [c.id, c])),
    conditions: new Map((app.flow.conditions || []).map((c) => [c.id, c])),
    actions: new Map((app.flow.actions || []).map((c) => [c.id, c])),
  };
  let added = 0;
  let updated = 0;

  for (const driverId of fs.readdirSync(DRIVERS)) {
    const flowPath = path.join(DRIVERS, driverId, 'driver.flow.compose.json');
    if (!fs.existsSync(flowPath)) continue;
    const flow = readJson(flowPath);
    for (const kind of ['triggers', 'conditions', 'actions']) {
      for (const card of flow[kind] || []) {
        if (!card?.id) continue;
        if (card.titleFormatted && JSON.stringify(card.titleFormatted).includes('[[device]]')) {
          delete card.titleFormatted;
        }
        if (!maps[kind].has(card.id)) {
          maps[kind].set(card.id, card);
          added += 1;
        } else if (APPLY) {
          maps[kind].set(card.id, card);
          updated += 1;
        }
      }
    }
  }

  if (APPLY) {
    app.flow.triggers = [...maps.triggers.values()];
    app.flow.conditions = [...maps.conditions.values()];
    app.flow.actions = [...maps.actions.values()];
    fs.writeFileSync(appPath, JSON.stringify(app));
  }
  return { added, updated, total: maps.triggers.size + maps.conditions.size + maps.actions.size };
}

function crossRefZ2mGaps() {
  const gapPath = path.join(ROOT, 'data', 'z2m_expose_gap_report.json');
  if (!fs.existsSync(gapPath)) return { skipped: true, recommendations: [] };

  const report = readJson(gapPath);
  const recommendations = [];
  const seen = new Set();

  for (const gap of (report.gaps || []).slice(0, 500)) {
    const driver = gap.drivers?.[0] || gap.driver;
    if (!driver || seen.has(`${driver}|${gap.expose}`)) continue;
    const cap = Z2M_EXPOSE_TO_CAP[gap.expose];
    if (!cap || !CAPABILITY_TEMPLATES[cap]) continue;
    const flowPath = path.join(DRIVERS, driver, 'driver.flow.compose.json');
    if (!fs.existsSync(flowPath)) continue;
    const flow = readJson(flowPath);
    const ids = (flow.triggers || []).map((t) => t.id);
    if (hasCapabilityTrigger(driver, cap, ids)) continue;
    seen.add(`${driver}|${gap.expose}`);
    recommendations.push({
      driver,
      z2mExpose: gap.expose,
      capability: cap,
      mfr: gap.mfr,
      suggestedTrigger: CAPABILITY_TEMPLATES[cap].trigger(driver).id,
    });
  }
  return { skipped: false, recommendations: recommendations.slice(0, 120) };
}

function runSubtool(label, rel, args = []) {
  const script = path.join(ROOT, rel);
  if (!fs.existsSync(script)) return { label, skipped: true };
  const res = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 300000,
  });
  return {
    label,
    ok: res.status === 0,
    exitCode: res.status,
    tail: `${res.stdout || ''}${res.stderr || ''}`.trim().slice(-800),
  };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const driverResults = [];
  for (const name of fs.readdirSync(DRIVERS)) {
    try {
      const r = processDriverFlow(name);
      if (r) driverResults.push(r);
    } catch (e) {
      driverResults.push({ driverId: name, error: e.message });
    }
  }

  const sync = syncAllFlowCardsToAppJson();
  const z2m = crossRefZ2mGaps();

  const subtools = [];
  if (APPLY && !SKIP_SUB) {
    subtools.push(runSubtool('ensure-physical-flow-cards', 'tools/ci/ensure-physical-flow-cards.js', ['--apply']));
    subtools.push(runSubtool('patch-missing-flow-listeners', 'tools/ci/patch-missing-flow-listeners.js', ['--apply']));
    subtools.push(runSubtool('button-flow-harvest', 'tools/ci/button-flow-harvest.js', ['--apply-fixes']));
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    driversTouched: driverResults.length,
    orphanTokensFixed: driverResults.reduce((n, r) => n + (r.orphanFixed || 0), 0),
    triggersAdded: driverResults.reduce((n, r) => n + (r.triggersAdded?.length || 0), 0),
    actionsAdded: driverResults.reduce((n, r) => n + (r.actionsAdded?.length || 0), 0),
    appJsonSync: sync,
    z2mCrossRef: { count: z2m.recommendations?.length || 0 },
    subtools,
    topChanges: driverResults
      .filter((r) => (r.triggersAdded?.length || 0) + (r.orphanFixed || 0) > 0)
      .slice(0, 25)
      .map((r) => ({
        driver: r.driverId,
        orphans: r.orphanFixed,
        triggers: r.triggersAdded,
        actions: r.actionsAdded,
      })),
  };

  writeJson(path.join(OUT_DIR, 'summary.json'), summary);
  writeJson(path.join(OUT_DIR, 'z2m-flow-recommendations.json'), z2m);

  const md = [
    `# Flow fleet enrich — ${DATE}`,
    '',
    `Mode: **${summary.mode}**`,
    '',
    `- Drivers touched: ${summary.driversTouched}`,
    `- Orphan tokens fixed: ${summary.orphanTokensFixed}`,
    `- Triggers added: ${summary.triggersAdded}`,
    `- Child-lock actions added: ${summary.actionsAdded}`,
    `- app.json sync: +${sync.added} new, ${sync.total} total`,
    `- Z2M gap recommendations: ${summary.z2mCrossRef.count}`,
    '',
    '## Commands',
    '',
    '```bash',
    'npm run enrich:flow-fleet',
    'npm run enrich:flow-fleet:apply',
    'npm run flow:l99',
    '```',
    '',
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'FLOW_FLEET_ENRICH.md'), md.join('\n'));

  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

main();
