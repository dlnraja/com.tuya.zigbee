#!/usr/bin/env node
'use strict';
/**
 * P3057 (26/10/2026): split the Tuya TS0601 (DP) family out of presence_sensor_radar into the
 * sibling driver presence_sensor_radar_ts0601, to free Athom combo budget without losing a couple.
 *
 * WHY: Athom counts manufacturerName x productId per driver. presence_sensor_radar lists ~1000
 * manufacturer names and ~120 product ids, so every never-shipped _TZE TS0601 radar pinned on it
 * (P3037 sacred, P3038c compensation) costs ~22 combos instead of 1, and the 1500 cap means only
 * 48 of them ever ship. A TS0601-only sibling costs 1 combo per real couple.
 *
 * Rules (decided under owner t561u "Prend les décisions toi même"):
 *  - only _TZE* names (Tuya DP family, model TS0601) move;
 *  - a name shipped on presence_sensor_radar in the last accepted Test build stays (migration);
 *  - all case forms of a name move together; a name any other driver lists stays (no new dual);
 *  - a name with external evidence of a non-TS0601 model that the radar lists stays
 *    (e.g. _TZE200_hl0ss9oa|TS0225), so no real couple leaves its driver;
 *  - the sibling reuses device.js / driver.js / settings; flow cards become app-level cards with
 *    the same ids and filter driver_id=presence_sensor_radar|presence_sensor_radar_ts0601.
 * Idempotent: re-running yields the same files. Usage: node scripts/maintenance/p3057-split-radar-ts0601.js [--check]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PARENT = 'presence_sensor_radar';
const SIB = 'presence_sensor_radar_ts0601';

function selectMoved(root = ROOT) {
  const { loadEvidence } = require(path.join(root, 'scripts', 'leads', 'dual-couples.js'));
  const parent = JSON.parse(fs.readFileSync(path.join(root, 'drivers', PARENT, 'driver.compose.json'), 'utf8'));
  const sibPath = path.join(root, 'drivers', SIB, 'driver.compose.json');
  const sib = fs.existsSync(sibPath) ? JSON.parse(fs.readFileSync(sibPath, 'utf8')) : null;
  const base = JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures', 'athom-last-test-package-couples.json'), 'utf8'));
  const shipped = new Set((base.drivers[PARENT] || { m: [] }).m);
  // Case-insensitive: all case forms of one name move together, or none does (no case split, no dual).
  const shippedLower = new Set([...shipped].map((m) => m.toLowerCase()));
  // A name also listed by another driver keeps its existing (reviewed) dual on the parent: never create a new one.
  const elsewhere = new Set();
  for (const d of fs.readdirSync(path.join(root, 'drivers'))) {
    if (d === PARENT || d === SIB) continue;
    const cp = path.join(root, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(cp)) continue;
    let c;
    try { c = JSON.parse(fs.readFileSync(cp, 'utf8')); } catch { continue; }
    for (const m of (c.zigbee && c.zigbee.manufacturerName) || []) elsewhere.add(String(m).toLowerCase());
  }
  const pids = new Set(parent.zigbee.productId.map((p) => String(p).toUpperCase()));
  pids.delete('TS0601');
  const ev = loadEvidence(root);
  const keep = new Set();
  // External evidence only: ev.internal also holds mfs_db "local" model ids that were read back from
  // our own compose cartesian (circular), so it cannot attest a real couple.
  for (const set of [ev.external]) {
    for (const k of set) {
      const [m, p] = k.split('|');
      if (pids.has(String(p).toUpperCase())) keep.add(m);
    }
  }
  const all = [...parent.zigbee.manufacturerName, ...((sib && sib.zigbee.manufacturerName) || [])];
  const seen = new Set();
  const moved = [];
  for (const m of all) {
    if (seen.has(m)) continue;
    seen.add(m);
    if (!/^_tze/i.test(m)) continue;
    const k = m.toLowerCase();
    if (shippedLower.has(k)) continue;
    if (keep.has(k)) continue;
    if (elsewhere.has(k)) continue;
    moved.push(m);
  }
  const movedLower = new Set(moved.map((m) => m.toLowerCase()));
  const stay = [];
  const seen2 = new Set();
  for (const m of all) {
    if (seen2.has(m) || movedLower.has(m.toLowerCase())) continue;
    seen2.add(m);
    stay.push(m);
  }
  return { parent, moved, stay, keepEvidence: keep, shipped, elsewhere };
}

const FILTER = `driver_id=${PARENT}|${SIB}`;

const isNonNative = (c) => (c >= 0xE000 && c <= 0xE002) || c === 0xEF00 || c === 0xEF01 || (c >= 0xFC00 && c <= 0xFFFF);
/** Parent endpoints minus non-native clusters (and bindings on them). */
function nativeEndpoints(endpoints) {
  const out = {};
  for (const [ep, def] of Object.entries(endpoints || {})) {
    const d = { ...def };
    if (Array.isArray(d.clusters)) d.clusters = d.clusters.filter((c) => !isNonNative(Number(c)));
    if (Array.isArray(d.bindings)) d.bindings = d.bindings.filter((c) => !isNonNative(Number(c)));
    out[ep] = d;
  }
  return out;
}

/** Driver-level radar cards -> app-level cards (same ids) shared by both drivers. */
function liftFlowCards(root = ROOT, write = true) {
  const fp = path.join(root, 'drivers', PARENT, 'driver.flow.compose.json');
  const flow = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const out = [];
  for (const type of ['triggers', 'conditions', 'actions']) {
    for (const card of flow[type] || []) {
      const args = (card.args || []).filter((a) => a.type !== 'device');
      const lifted = { ...card, args: [{ type: 'device', name: 'device', filter: FILTER }, ...args] };
      out.push({ type, id: card.id, card: lifted });
      if (write) {
        const dir = path.join(root, '.homeycompose', 'flow', type);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${card.id}.json`), JSON.stringify(lifted, null, 2) + '\n');
      }
    }
  }
  if (write && out.length) fs.writeFileSync(fp, JSON.stringify({ triggers: [], conditions: [], actions: [] }, null, 2) + '\n');
  return out;
}

/**
 * Sacred pins of moved names (TS0601) follow the name to the sibling. A _TZE|TS0601 pin that was
 * never shipped on the radar (e.g. a P3038c compensation pin not yet in compose) goes there too.
 */
function retargetSacred(file, movedSet, shipped = new Set(), stay = [], elsewhere = new Set()) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const lower = (s) => new Set([...s].map((m) => String(m).toLowerCase()));
  const movedL = lower(movedSet); const shippedL = lower(shipped); const stayL = lower(stay);
  let n = 0;
  for (const c of j.couples || []) {
    if ((c.driverId !== PARENT && c.driverId !== SIB) || String(c.pid).toUpperCase() !== 'TS0601') continue;
    const k = String(c.mfr).toLowerCase();
    const toSib = movedL.has(k)
      || (/^_tze/.test(k) && !shippedL.has(k) && !stayL.has(k) && !elsewhere.has(k));
    const want = toSib ? SIB : PARENT;
    if (c.driverId === want) continue;
    c.driverId = want;
    c.note = `${c.note || ''} | P3057: TS0601 family ${toSib ? 'split to ' + SIB : 'kept on ' + PARENT} (same runtime)`.replace(/^ \| /, '');
    n += 1;
  }
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  return n;
}

module.exports = { selectMoved, liftFlowCards, retargetSacred, nativeEndpoints, PARENT, SIB, FILTER };

if (require.main === module) {
  const { parent, moved, stay, shipped, elsewhere } = selectMoved();
  const movedSet = new Set(moved);
  const check = process.argv.includes('--check');
  const sibDir = path.join(ROOT, 'drivers', SIB);
  const sibCompose = {
    ...parent,
    name: {
      en: 'Presence Sensor (Radar / mmWave, Tuya TS0601)',
      fr: 'Capteur de présence (Radar / mmWave, Tuya TS0601)',
      nl: 'Aanwezigheidssensor (Radar / mmWave, Tuya TS0601)',
      de: 'Anwesenheitssensor (Radar / mmWave, Tuya TS0601)',
    },
    images: {
      small: `/drivers/${SIB}/assets/images/small.png`,
      large: `/drivers/${SIB}/assets/images/large.png`,
    },
    // Native first (docs/knowledge/DEVICE_TRUTH.md, Spec 002 native-matrix gate): a new driver lists
    // no non-native cluster as mandatory; 0xEF00 stays an optional runtime layer (same device.js).
    zigbee: {
      ...parent.zigbee,
      manufacturerName: moved,
      productId: ['TS0601'],
      endpoints: nativeEndpoints(parent.zigbee.endpoints),
    },
  };
  if (sibCompose.id) sibCompose.id = SIB;
  const newParent = {
    ...parent,
    zigbee: { ...parent.zigbee, manufacturerName: stay },
  };
  if (check) {
    console.log(JSON.stringify({ moved: moved.length, parentLeft: newParent.zigbee.manufacturerName.length }));
    process.exit(0);
  }
  fs.mkdirSync(path.join(sibDir, 'assets', 'images'), { recursive: true });
  fs.mkdirSync(path.join(sibDir, 'pair'), { recursive: true });
  fs.writeFileSync(path.join(sibDir, 'driver.compose.json'), JSON.stringify(sibCompose, null, 2) + '\n');
  fs.writeFileSync(path.join(ROOT, 'drivers', PARENT, 'driver.compose.json'), JSON.stringify(newParent, null, 2) + '\n');
  const pd = path.join(ROOT, 'drivers', PARENT);
  for (const f of ['assets/icon.svg', 'assets/learnmode.svg', 'assets/images/small.png', 'assets/images/large.png', 'pair/select_driver.html']) {
    if (fs.existsSync(path.join(pd, f))) fs.copyFileSync(path.join(pd, f), path.join(sibDir, f));
  }
  if (fs.existsSync(path.join(pd, 'driver.settings.compose.json'))) {
    fs.copyFileSync(path.join(pd, 'driver.settings.compose.json'), path.join(sibDir, 'driver.settings.compose.json'));
  }
  fs.writeFileSync(path.join(sibDir, 'device.js'), "'use strict';\n\n// P3057: TS0601 family of presence_sensor_radar (same runtime, own combo budget).\nmodule.exports = require('../presence_sensor_radar/device');\n");
  fs.writeFileSync(path.join(sibDir, 'driver.js'), "'use strict';\n\n// P3057: TS0601 family of presence_sensor_radar. Same driver class: the radar flow cards are\n// app-level (filter driver_id=presence_sensor_radar|presence_sensor_radar_ts0601), so both drivers\n// register the same run listeners (idempotent; the listener only reads args.device).\nmodule.exports = require('../presence_sensor_radar/driver');\n");
  fs.writeFileSync(path.join(sibDir, 'driver.flow.compose.json'), JSON.stringify({ triggers: [], conditions: [], actions: [] }, null, 2) + '\n');
  const lifted = liftFlowCards(ROOT, true);
  const n = retargetSacred(path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json'), movedSet, shipped, stay, elsewhere);
  console.log(`moved ${moved.length} _TZE names; ${PARENT} keeps ${newParent.zigbee.manufacturerName.length}; ${lifted.length} flow cards lifted; ${n} sacred pins retargeted`);
}
