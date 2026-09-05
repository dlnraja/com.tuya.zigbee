'use strict';

/**
 * P2270 — Apply-min discoveries (tier A/B)
 * Dry-run by default. Pass --apply to mutate compose/registry for coded ACTIONS.
 * Never invents productId. Sacred couple = mfr + pid only.
 *
 * WHY: discover:apply-min npm script for PhaseRunner / local enrich.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');

const DISCOVERIES_PATH = path.join(
  ROOT,
  'reports',
  'discussion-harvest-2026-08-26',
  'DISCOVERIES.json',
);

/** Coded minimal actions — only verified couples (no invent). */
const ACTIONS = [
  {
    id: 'D006',
    tier: 'B',
    mfr: '_TZE284_gnpflcoq',
    pid: 'TS0601',
    driver: 'motion_sensor_radar_mmwave',
    note: 'inverted motion via AlarmPolarityManager (code already)',
    mutate: false,
  },
  {
    id: 'P2273-guvc7pdy',
    tier: 'A',
    mfr: '_TZE204_guvc7pdy',
    pid: 'TS0601',
    driver: 'curtain_motor',
    removeFrom: 'switch_1gang',
    note: 'unstolen curtain motor',
    mutate: true,
  },
];

function loadCompose(driverId) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  return { p, j: JSON.parse(fs.readFileSync(p, 'utf8')) };
}

function saveCompose(p, j) {
  fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
}

function hasMfr(j, needle) {
  const re = new RegExp(needle.replace(/^_/, '_?'), 'i');
  return (j.zigbee.manufacturerName || []).some((m) => re.test(String(m)));
}

function removeMfr(j, needle) {
  const re = new RegExp(needle, 'i');
  const before = (j.zigbee.manufacturerName || []).length;
  j.zigbee.manufacturerName = (j.zigbee.manufacturerName || []).filter((m) => !re.test(String(m)));
  return before - j.zigbee.manufacturerName.length;
}

function ensurePid(j, pid) {
  j.zigbee.productId = j.zigbee.productId || [];
  if (!j.zigbee.productId.includes(pid)) j.zigbee.productId.push(pid);
}

function main() {
  let discoveries = [];
  if (fs.existsSync(DISCOVERIES_PATH)) {
    const j = JSON.parse(fs.readFileSync(DISCOVERIES_PATH, 'utf8'));
    discoveries = j.discoveries || j || [];
  }

  const actionable = discoveries.filter(
    (d) => (d.tier === 'A' || d.tier === 'B') && (d.impl === 'pending' || d.impl === 'partial'),
  );

  console.log(`[p2270-apply-min] discoveries=${discoveries.length} actionableA/B=${actionable.length} apply=${APPLY}`);

  for (const d of actionable) {
    console.log(`  watch/pending: ${d.id} ${d.tier} ${d.mfr || ''}+${d.pid || ''} → ${d.summary || ''}`);
  }

  let changed = 0;
  for (const a of ACTIONS) {
    if (!a.mutate) {
      console.log(`  skip(code-only): ${a.id} ${a.mfr}+${a.pid} → ${a.driver} (${a.note})`);
      continue;
    }
    const target = loadCompose(a.driver);
    const okTarget = hasMfr(target.j, a.mfr.replace(/^_TZE\d+_/, '').slice(0, 8)) || hasMfr(target.j, a.mfr);
    if (a.removeFrom) {
      const src = loadCompose(a.removeFrom);
      const n = removeMfr(src.j, a.mfr.split('_').pop());
      if (APPLY && n > 0) {
        saveCompose(src.p, src.j);
        changed += n;
      }
      console.log(`  ${APPLY ? 'REMOVED' : 'would-remove'} ${a.mfr} from ${a.removeFrom}: ${n}`);
    }
    if (!okTarget && APPLY) {
      target.j.zigbee.manufacturerName = target.j.zigbee.manufacturerName || [];
      target.j.zigbee.manufacturerName.push(a.mfr);
      ensurePid(target.j, a.pid);
      saveCompose(target.p, target.j);
      changed += 1;
      console.log(`  ADDED ${a.mfr} → ${a.driver}`);
    } else {
      console.log(`  ${a.driver} already has couple or dry-run for ${a.mfr}`);
    }
  }

  // Also re-run parallel applier when --apply
  if (APPLY) {
    try {
      require('./p2268-apply-parallel-couple-fixes.js');
    } catch (e) {
      console.warn('p2268 applier:', e.message);
    }
  }

  console.log(`[p2270-apply-min] done changed=${changed}`);
  if (!APPLY) console.log('Pass --apply to mutate compose (dry-run default).');
}

main();
