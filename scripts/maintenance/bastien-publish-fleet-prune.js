'use strict';

/**
 * P2724 — Bastien house-fleet prune for Athom publish
 * WHY: full 400+ driver Bastien uploads → processing_failed (socket hang up)
 * on builds #104/#105 while Test stays stuck on 1.0.93. House mesh only needs
 * remotes + HOBEIAN switches + climate + a small buffer.
 *
 * Only runs when app.json id === com.dlnraja.tuya.zigbee.bastien.
 * Mutates publish-temp app.json (+ optional driver dirs). Never touches Universal/Stable.
 */

const fs = require('fs');
const path = require('path');

const APP_ID = 'com.dlnraja.tuya.zigbee.bastien';
const SSOT = path.join(__dirname, '..', '..', 'config', 'architecture', 'bastien-publish-fleet-ssot.json');

const BASTIEN_APP_LEVEL_TRIGGERS = new Set(['capability_value_changed_generic', 'device_interaction', 'home_mode_changed']);

/**
 * WHY(P2929 / Bastien diag 17-18/10 v1.0.161): the prune kept only driver-prefixed cards + 3 hardcoded
 * app-level triggers. Every other app-level card the code asks for (auto-off, battery, scene, network…)
 * vanished from the published manifest -> "Invalid Flow Card ID" + Flows/buttons that never fire.
 * Keep each app-level card (id not owned by any driver of the full manifest) that the app code
 * references, unless its device arg is filtered to pruned drivers only (orphan -> Athom invalid_state).
 */
const CODE_DIRS = ['lib', 'drivers', 'app.js'];
const CARD_CALL_RE = /get(?:Device)?(?:Trigger|Action|Condition)Card\(\s*['"]([\w.-]+)['"]/g;

function collectReferencedCardIds(rootDir) {
  const ids = new Set();
  const walk = (p) => {
    let st;
    try { st = fs.statSync(p); } catch (_e) { return; }
    if (st.isDirectory()) {
      if (/node_modules|[\\/]\.git$/.test(p)) return;
      for (const n of fs.readdirSync(p)) walk(path.join(p, n));
    } else if (p.endsWith('.js')) {
      let t = '';
      try { t = fs.readFileSync(p, 'utf8'); } catch (_e) { return; }
      for (const m of t.matchAll(CARD_CALL_RE)) ids.add(m[1]);
    }
  };
  for (const d of CODE_DIRS) walk(path.join(rootDir, d));
  return ids;
}

/** @returns {'keep'|'drop'} and trims a driver_id filter to kept drivers in place. */
function appLevelCardDecision(card, keptIds) {
  for (const a of card.args || []) {
    if (a.type !== 'device' || typeof a.filter !== 'string') continue;
    const m = a.filter.match(/driver_id=([^&]+)/);
    if (!m) continue;
    const kept = m[1].split('|').filter((id) => keptIds.has(id));
    if (!kept.length) return 'drop';
    a.filter = a.filter.replace(m[0], `driver_id=${kept.join('|')}`);
  }
  return 'keep';
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadKeepSet() {
  const ssot = readJson(SSOT);
  const keep = new Set(ssot.keepDriverIds || []);
  const prefixes = Array.isArray(ssot.alwaysKeepPrefixes) ? ssot.alwaysKeepPrefixes : [];
  return { keep, prefixes, ssot };
}

function shouldKeep(id, keep, prefixes) {
  if (!id) return false;
  if (keep.has(id)) return true;
  return prefixes.some((p) => id.startsWith(p));
}

/**
 * @param {string} destAppJson path to publish-temp app.json
 * @param {{ destDir?: string }} [opts]
 * @returns {{ before: number, after: number, removed: string[] }}
 */
function pruneBastienPublishFleet(destAppJson, opts = {}) {
  if (!fs.existsSync(destAppJson)) {
    throw new Error(`P2724: missing ${destAppJson}`);
  }
  const manifest = readJson(destAppJson);
  if (manifest.id !== APP_ID) {
    return { before: (manifest.drivers || []).length, after: (manifest.drivers || []).length, removed: [], skipped: true };
  }
  const { keep, prefixes } = loadKeepSet();
  const before = (manifest.drivers || []).length;
  const removed = [];
  const keptDrivers = [];
  for (const d of manifest.drivers || []) {
    if (shouldKeep(d.id, keep, prefixes)) {
      keptDrivers.push(d);
    } else {
      removed.push(d.id);
    }
  }
  if (keptDrivers.length < 8) {
    throw new Error(`P2724: refuse prune — only ${keptDrivers.length} drivers would remain (need ≥8)`);
  }
  const allDriverIds = (manifest.drivers || []).map((d) => d.id);
  manifest.drivers = keptDrivers;
  const keptIds = new Set(keptDrivers.map((d) => d.id));
  const referenced = opts.referencedCardIds || collectReferencedCardIds(opts.codeRoot || path.join(__dirname, '..', '..'));
  const isDriverOwned = (id) => allDriverIds.some((d) => id === d || id.startsWith(`${d}_`));
  // Earlier publish steps (publish-hold) may already have dropped drivers whose cards remain:
  // ownership also knows every driver folder of the repo.
  let repoDriverIds = [];
  try { repoDriverIds = fs.readdirSync(path.join(opts.codeRoot || path.join(__dirname, '..', '..'), 'drivers')); } catch (_e) { /* soft */ }
  const byLen = [...new Set([...allDriverIds, ...repoDriverIds])].sort((a, b) => b.length - a.length);
  const ownerOf = (id) => byLen.find((d) => id === d || id.startsWith(`${d}_`)) || null;
  const appLevelKept = [];

  // WHY(P2724 / Athom #106 invalid_state): keep ONLY flow cards for kept drivers.
  // Soft "return true" left 1500+ orphan fleet triggers → Athom processor invalid_state.
  for (const section of ['triggers', 'conditions', 'actions']) {
    const cards = manifest.flow && manifest.flow[section];
    if (!Array.isArray(cards)) continue;
    manifest.flow[section] = cards.filter((c) => {
      const id = String(c.id || '');
      // P2915: app-level triggers fired on every device event; pruning them made each call log
      // "Invalid Flow Card ID" (Bastien 1.0.161 diag 18/10) and the feature never fired.
      if (section === 'triggers' && BASTIEN_APP_LEVEL_TRIGGERS.has(id)) return true;
      if (!isDriverOwned(id) && referenced.has(id) && appLevelCardDecision(c, keptIds) === 'keep') {
        appLevelKept.push(id);
        return true;
      }
      // P2928: owner = LONGEST driver id prefix over the FULL fleet. `climate_sensor_` used to claim
      // cards of pruned `climate_sensor_device` / `climate_sensor_dimmer` -> 430 orphan cards shipped.
      // A device arg filtered by driver_id names the real owner (ids like `switch_2gang_..._switch`
      // belong to driver `switch`, not `switch_2gang`): trust it, trimmed to kept drivers.
      const hasDriverFilter = (c.args || []).some((a) => a && a.type === 'device' && /driver_id=/.test(String(a.filter || '')));
      if (hasDriverFilter) return appLevelCardDecision(c, keptIds) === 'keep';
      const owner = ownerOf(id);
      return !!owner && keptIds.has(owner);
    });
  }

  // WHY(P2726 / Athom #107): rewrite capability icons that pointed at pruned radar_sensor
  rewriteCapabilityAssetPaths(manifest);

  fs.writeFileSync(destAppJson, JSON.stringify(manifest));

  if (opts.destDir) {
    ensurePresenceRadarDistanceSvg(opts.destDir);
    const driversDir = path.join(opts.destDir, 'drivers');
    if (fs.existsSync(driversDir)) {
      for (const rid of removed) {
        const p = path.join(driversDir, rid);
        if (fs.existsSync(p)) {
          if (rid === 'radar_sensor' || rid === 'radar_sensor_2') {
            ensurePresenceRadarDistanceSvg(opts.destDir);
          }
          fs.rmSync(p, { recursive: true, force: true });
        }
      }
    }
  }

  return { before, after: keptDrivers.length, removed, appLevelKept, skipped: false };
}

function rewriteCapabilityAssetPaths(manifest) {
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string' && v.includes('/drivers/radar_sensor')) {
        o[k] = v
          .replace(/\/drivers\/radar_sensor_2\//g, '/drivers/presence_sensor_radar/')
          .replace(/\/drivers\/radar_sensor\//g, '/drivers/presence_sensor_radar/');
      } else if (v && typeof v === 'object') {
        walk(v);
      }
    }
  };
  walk(manifest.capabilities);
  walk(manifest.drivers);
}

function ensurePresenceRadarDistanceSvg(destDir) {
  if (!destDir) return;
  const dest = path.join(destDir, 'drivers', 'presence_sensor_radar', 'assets', 'distance.svg');
  if (fs.existsSync(dest)) return;
  const candidates = [
    path.join(destDir, 'drivers', 'radar_sensor', 'assets', 'distance.svg'),
    path.join(__dirname, '..', '..', 'drivers', 'radar_sensor', 'assets', 'distance.svg'),
    path.join(__dirname, '..', '..', 'drivers', 'presence_sensor_radar', 'assets', 'distance.svg'),
  ];
  for (const src of candidates) {
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      return;
    }
  }
}

module.exports = { pruneBastienPublishFleet, collectReferencedCardIds, appLevelCardDecision, APP_ID, SSOT, rewriteCapabilityAssetPaths, ensurePresenceRadarDistanceSvg };

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node bastien-publish-fleet-prune.js <path/to/app.json> [destDir]');
    process.exit(2);
  }
  const r = pruneBastienPublishFleet(target, { destDir: process.argv[3] });
  console.log(JSON.stringify(r, null, 2));
}
