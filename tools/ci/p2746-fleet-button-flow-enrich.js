'use strict';

/**
 * P2746 — Fleet enrich button/remote Homey Flows (Bastien)
 *
 * Contre quoi: token name === arg name (`button`) → Homey tagged Flows dead;
 * missing measure_battery_changed on remotes with measure_battery.
 *
 * Dry-run by default. Apply: node tools/ci/p2746-fleet-button-flow-enrich.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');

const REMOTE_RE = /button_wireless|scene_switch|smart_remote|wall_remote|handheld_remote|remote_button|button_emergency/;

const BATTERY_CHANGED_TEMPLATE = (driverId) => ({
  id: `${driverId}_measure_battery_changed`,
  title: {
    en: 'The battery level changed',
    fr: 'Le niveau de la batterie a changé',
    nl: 'Batterijniveau is veranderd',
    de: 'Batteriestand hat sich geändert',
  },
  hint: {
    en: 'Fires when measure_battery updates (passive ZCL). Token = new %.',
    fr: 'Se déclenche quand measure_battery change (ZCL passif). Jeton = nouveau %.',
  },
  tokens: [
    {
      name: 'battery',
      type: 'number',
      title: { en: 'Battery', fr: 'Batterie', nl: 'Batterij', de: 'Batterie' },
      example: 87,
    },
  ],
  args: [],
  titleFormatted: {
    en: 'The battery level changed',
    fr: 'Le niveau de la batterie a changé',
    nl: 'Batterijniveau is veranderd',
    de: 'Batteriestand hat sich geändert',
  },
});

function loadJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function hasBatteryCap(driverDir) {
  const composePath = path.join(driverDir, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return false;
  try {
    const caps = loadJson(composePath).capabilities || [];
    return caps.includes('measure_battery');
  } catch {
    return false;
  }
}

function fixTokenArgCollisions(triggers) {
  let n = 0;
  for (const t of triggers) {
    if (!t || typeof t !== 'object') continue;
    const argNames = new Set((t.args || []).map((a) => a && a.name).filter(Boolean));
    if (!Array.isArray(t.tokens)) continue;
    for (const tok of t.tokens) {
      if (!tok || !tok.name) continue;
      if (argNames.has(tok.name)) {
        // Prefer button → button_id; gang → gang_id; else suffix _token
        if (tok.name === 'button') tok.name = 'button_id';
        else if (tok.name === 'gang') tok.name = 'gang_id';
        else tok.name = `${tok.name}_token`;
        n += 1;
      }
    }
  }
  return n;
}

function ensureBatteryChanged(driverId, flow, driverDir) {
  if (!hasBatteryCap(driverDir)) return false;
  const triggers = flow.triggers || (flow.triggers = []);
  const ids = new Set(triggers.map((t) => t && t.id).filter(Boolean));
  if ([...ids].some((id) => /measure_battery_changed|battery_changed$/i.test(id))) {
    return false;
  }
  // Insert after battery_low if present, else append
  const lowIdx = triggers.findIndex((t) => t && /battery_low$/i.test(t.id || ''));
  const card = BATTERY_CHANGED_TEMPLATE(driverId);
  if (lowIdx >= 0) triggers.splice(lowIdx + 1, 0, card);
  else triggers.push(card);
  return true;
}

function main() {
  const driversRoot = path.join(ROOT, 'drivers');
  const dirs = fs.readdirSync(driversRoot).filter((d) => {
    if (!REMOTE_RE.test(d)) return false;
    return fs.existsSync(path.join(driversRoot, d, 'driver.flow.compose.json'));
  });

  const report = {
    patch: 'P2746',
    apply: APPLY,
    driversScanned: dirs.length,
    collisionRenames: 0,
    batteryCardsAdded: 0,
    filesTouched: [],
  };

  for (const d of dirs) {
    const dir = path.join(driversRoot, d);
    const flowPath = path.join(dir, 'driver.flow.compose.json');
    let flow;
    try {
      flow = loadJson(flowPath);
    } catch {
      continue;
    }
    if (!Array.isArray(flow.triggers)) continue;

    const renamed = fixTokenArgCollisions(flow.triggers);
    const addedBatt = ensureBatteryChanged(d, flow, dir);
    if (renamed || addedBatt) {
      report.collisionRenames += renamed;
      if (addedBatt) report.batteryCardsAdded += 1;
      report.filesTouched.push(d);
      if (APPLY) {
        fs.writeFileSync(flowPath, `${JSON.stringify(flow, null, 2)}\n`, 'utf8');
      }
    }
  }

  const outDir = path.join(ROOT, 'reports', 'bastien-flow-fleet-p2746');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!APPLY) console.log('\nDry-run only. Re-run with --apply to write.');
}

main();
