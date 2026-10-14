'use strict';

/**
 * P2819 — Surgical Blakadder severe wrong-class couple moves (dry-run default)
 * WHY: Never rewrite whole manufacturerName via unionStrings (collapses dual-case → mass loss).
 * Contre quoi: switch_1gang 1400→364 mfr wipe.
 *
 * Usage: node tools/ci/p2819-apply-blakadder-severe.js [--apply]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const AUDIT = path.join(ROOT, 'reports', 'blakadder-deep-2026-10-14', 'COUPLE_AUDIT.json');

function norm(s) {
  return String(s || '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function loadCompose(driverId) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(fp)) throw new Error(`missing driver ${driverId}`);
  return { fp, json: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

function saveCompose(fp, json) {
  fs.writeFileSync(fp, `${JSON.stringify(json, null, 2)}\n`);
}

/** Remove all case forms of one mfr; leave every other entry untouched. */
function removeMfrSurgical(json, mfrNorm) {
  const list = [].concat(json.zigbee?.manufacturerName || []);
  const next = list.filter((m) => norm(m) !== mfrNorm);
  const removed = list.length - next.length;
  if (removed) json.zigbee.manufacturerName = next;
  return removed;
}

/** Append dual-case mfr only if no case-insensitive match exists. Same for pid. */
function addCoupleSurgical(json, mfr, pid) {
  if (!json.zigbee) json.zigbee = {};
  const mfrs = [].concat(json.zigbee.manufacturerName || []);
  const pids = [].concat(json.zigbee.productId || []);
  const mNorm = norm(mfr);
  let addedM = 0;
  if (!mfrs.some((m) => norm(m) === mNorm)) {
    const lower = mfr.toLowerCase();
    const upper = mfr.toUpperCase();
    mfrs.push(lower);
    addedM++;
    if (upper !== lower) {
      mfrs.push(upper);
      addedM++;
    }
  }

  const p = String(pid).toUpperCase();
  let addedP = 0;
  if (p && !pids.some((x) => String(x).toUpperCase() === p)) {
    pids.push(p);
    addedP++;
  }

  json.zigbee.manufacturerName = mfrs;
  json.zigbee.productId = pids;
  return { addedM, addedP };
}

function targetFor(row) {
  if (row.reason === 'rgb_bulb_on_wall_dimmer') {
    return { add: 'light_rgbcct_ts0505b', remove: ['dimmer_wall_1gang'] };
  }
  if (row.reason === 'wall_switch_on_wireless_button') {
    const pid = String(row.pid || '').toUpperCase();
    let add = 'switch_1gang';
    if (pid === 'TS0002' || pid === 'TS0012') add = 'switch_2gang';
    if (pid === 'TS0003' || pid === 'TS0013') add = 'wall_switch_3gang_1way';
    if (pid === 'TS0601') add = 'wall_switch_3gang_1way';
    return { add, remove: ['button_wireless_2', 'button_wireless_plug'] };
  }
  if (row.reason === 'plug_on_switch_only') {
    return { add: 'plug_smart', remove: ['switch_1gang'] };
  }
  if (row.reason === 'cover_wrong_driver') {
    return { add: 'garage_door_opener', remove: ['sensor_contact_zigbee', 'contact_sensor'] };
  }
  return null;
}

function main() {
  const audit = JSON.parse(fs.readFileSync(AUDIT, 'utf8'));
  // Re-run needs fresh severe list — if already 0 after bad apply, use APPLY_SEVERE plan or regenerate
  let severe = audit.severe || [];
  if (!severe.length) {
    const prev = path.join(ROOT, 'reports', 'blakadder-deep-2026-10-14', 'APPLY_SEVERE.json');
    if (fs.existsSync(prev)) {
      const old = JSON.parse(fs.readFileSync(prev, 'utf8'));
      severe = (old.plan || [])
        .filter((p) => p.to)
        .map((p) => ({
          mfr: p.mfr,
          pid: p.pid,
          reason: p.reason,
          drivers: p.from,
          vendor: p.vendor,
          title: p.title,
        }));
      console.log('Using previous APPLY_SEVERE plan:', severe.length);
    }
  }

  const plan = [];
  const touched = new Map();

  function get(driverId) {
    if (!touched.has(driverId)) {
      const { fp, json } = loadCompose(driverId);
      const mfrCount = (json.zigbee?.manufacturerName || []).length;
      touched.set(driverId, {
        fp,
        json,
        dirty: false,
        mfrBefore: mfrCount,
        plannedRemoved: 0,
        plannedAdded: 0,
      });
    }
    return touched.get(driverId);
  }

  for (const row of severe) {
    const t = targetFor(row);
    if (!t) {
      plan.push({ ...row, action: 'skip_no_target' });
      continue;
    }
    const mfrNorm = norm(row.mfr);
    const pid = String(row.pid).toUpperCase();

    let removed = 0;
    for (const bad of t.remove) {
      try {
        const entry = get(bad);
        const n = removeMfrSurgical(entry.json, mfrNorm);
        if (n) {
          removed += n;
          entry.plannedRemoved += n;
          entry.dirty = true;
        }
      } catch {
        /* absent */
      }
    }

    const good = get(t.add);
    const { addedM, addedP } = addCoupleSurgical(good.json, row.mfr, pid);
    if (addedM || addedP) {
      good.plannedAdded += addedM;
      good.dirty = true;
    }

    plan.push({
      mfr: row.mfr,
      pid,
      reason: row.reason,
      from: row.drivers,
      to: t.add,
      removed,
      addedM,
      addedP,
      vendor: row.vendor,
      title: row.title,
    });
  }

  // Safety: refuse if unexplained loss (beyond planned removals) > 2 entries
  for (const [id, entry] of touched) {
    const after = (entry.json.zigbee?.manufacturerName || []).length;
    const expected = entry.mfrBefore - entry.plannedRemoved + entry.plannedAdded;
    if (Math.abs(after - expected) > 2) {
      console.error(
        `REFUSE ${id}: mfr ${entry.mfrBefore}→${after} (expected ~${expected}; plannedRm=${entry.plannedRemoved} plannedAdd=${entry.plannedAdded})`
      );
      process.exit(2);
    }
  }

  if (APPLY) {
    for (const [id, entry] of touched) {
      if (!entry.dirty) continue;
      const after = (entry.json.zigbee?.manufacturerName || []).length;
      saveCompose(entry.fp, entry.json);
      console.log('wrote', id, `mfr ${entry.mfrBefore}→${after}`);
    }
  }

  const reportPath = path.join(ROOT, 'reports', 'blakadder-deep-2026-10-14', 'APPLY_SEVERE.json');
  fs.writeFileSync(reportPath, `${JSON.stringify({ apply: APPLY, plan }, null, 2)}\n`);
  console.log(APPLY ? 'APPLIED' : 'DRY-RUN', plan.length, 'moves');
  for (const p of plan) console.log(`${p.mfr}+${p.pid} → ${p.to} (rm=${p.removed}, addM=${p.addedM})`);
}

main();
