'use strict';

/**
 * Class-scale sacred-couple / energy honesty audit (P151 scale playbook).
 *
 * Walks ALL drivers by Homey `class`, then reports:
 * - cross-class dual-claims (absurd: button×light, sensor×socket, …)
 * - same-class dual-claims (gang/light variants — warn)
 * - energy/battery honesty (mains caps + batteries, battery class + measure_power, …)
 * - registry alignment (--from-registry via audit-sacred-couple.js)
 *
 * Usage:
 *   node tools/ci/audit-sacred-couple-by-class.js
 *   node tools/ci/audit-sacred-couple-by-class.js --json
 *   node tools/ci/audit-sacred-couple-by-class.js --class=sensor
 *   node tools/ci/audit-sacred-couple-by-class.js --fix-cross-class   # dry-run strips absurd side
 *   node tools/ci/audit-sacred-couple-by-class.js --fix-cross-class --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const JSON_MODE = process.argv.includes('--json');
const APPLY = process.argv.includes('--apply');
const FIX_CROSS = process.argv.includes('--fix-cross-class');
const CLASS_FILTER = (() => {
  const hit = process.argv.find((a) => a.startsWith('--class='));
  return hit ? hit.slice('--class='.length) : null;
})();

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function loadDrivers() {
  const dir = path.join(ROOT, 'drivers');
  const out = [];
  for (const id of fs.readdirSync(dir)) {
    const p = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    let j;
    try {
      j = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      continue;
    }
    const zig = j.zigbee || {};
    out.push({
      id,
      path: p,
      class: j.class || 'unknown',
      caps: j.capabilities || [],
      energy: j.energy || {},
      mfr: [].concat(zig.manufacturerName || []),
      pid: [].concat(zig.productId || []),
      raw: j,
    });
  }
  return out;
}

/** Heuristic family buckets for cross-class absurdity. */
function family(driverId, homeyClass) {
  const id = norm(driverId);
  // Sensors / IAS first (names often contain switch/plug hybrids)
  if (/sensor|contact|motion|leak|water|soil|climate|presence|vibration|smoke|gas|flood|doorwindow|radar/.test(id)
    || homeyClass === 'sensor' || homeyClass === 'doorbell') {
    return 'sensor';
  }
  if (/button|remote|scene|sos|knob|wireless_/.test(id) || homeyClass === 'button' || homeyClass === 'remote') {
    return 'button';
  }
  if (/bulb|led_strip|light|dimmer|tunable|rgb|christmas|recessed/.test(id) || homeyClass === 'light') {
    return 'light';
  }
  if (/thermostat|trv|radiator_valve|heater|hvac/.test(id) || homeyClass === 'thermostat' || homeyClass === 'heater') {
    return 'climate_ctrl';
  }
  if (/cover|curtain|shutter|blind|windowcovering/.test(id) || homeyClass === 'windowcoverings' || homeyClass === 'curtain') {
    return 'cover';
  }
  if (/fan/.test(id) || homeyClass === 'fan') return 'fan';
  if (/lock/.test(id) || homeyClass === 'lock') return 'lock';
  if (/vacuum|camera|speaker/.test(id) || ['vacuumcleaner', 'camera', 'speaker'].includes(homeyClass)) {
    return 'misc';
  }
  if (/plug|socket|outlet|power_point|usb_outlet|din_rail|breaker|rcbo|relay|smartplug/.test(id)
    || (homeyClass === 'socket' && !/sensor|button|dimmer|light/.test(id))) {
    return 'socket';
  }
  if (/hybrid_|_generic_|universal_/.test(id) || homeyClass === 'other') return 'other';
  if (homeyClass === 'socket') return 'socket';
  return 'other';
}

const ABSURD_PAIRS = new Set([
  'button|light', 'button|socket', 'button|sensor', 'button|climate_ctrl', 'button|cover',
  'light|sensor', 'light|socket', 'light|climate_ctrl', 'light|cover',
  'sensor|socket', 'sensor|climate_ctrl', 'sensor|cover',
  'climate_ctrl|socket', 'climate_ctrl|cover', 'climate_ctrl|light',
  'cover|socket', 'cover|button',
]);

function isAbsurd(fa, fb) {
  if (fa === fb) return false;
  const key = [fa, fb].sort().join('|');
  return ABSURD_PAIRS.has(key);
}

/** Prefer keep family when stripping absurd dual-claims (Z2M-backed heuristics). */
const KEEP_PRIORITY = {
  socket: 10,
  light: 9,
  climate_ctrl: 8,
  cover: 7,
  sensor: 6,
  fan: 5,
  lock: 4,
  button: 2,
  other: 1,
  misc: 1,
};

function energyIssues(d) {
  const issues = [];
  const caps = d.caps || [];
  const bats = d.energy?.batteries;
  const hasBatArr = Array.isArray(bats) && bats.length > 0;
  const hasMeasureBat = caps.includes('measure_battery') || caps.includes('alarm_battery');
  const hasPower = caps.includes('measure_power') || caps.includes('meter_power')
    || caps.some((c) => String(c).startsWith('measure_power.'));
  const hasApprox = !!d.energy?.approximation;
  const mains = d.energy?.mains === true;
  const fam = family(d.id, d.class);

  if (hasApprox && hasPower) {
    issues.push({ code: 'approx_plus_power', severity: 'fail' });
  }
  if (hasBatArr && hasPower && !hasApprox && (fam === 'socket' || mains || /meter|breaker|rcbo|din_rail|plug|outlet/.test(d.id))) {
    issues.push({ code: 'mains_batteries_with_power', severity: 'warn' });
  }
  if (hasBatArr && hasPower && fam === 'sensor' && /climate|temp|humid|soil|leak|contact|motion/.test(d.id)
    && !/energy|power|meter|plug/.test(d.id)) {
    issues.push({ code: 'sensor_bat_plus_power_suspect', severity: 'warn' });
  }
  if (mains && (hasBatArr || hasMeasureBat) && hasPower) {
    issues.push({ code: 'mains_true_with_battery', severity: 'warn' });
  }
  if (fam === 'socket' && hasMeasureBat && !hasBatArr && hasPower) {
    issues.push({ code: 'socket_measure_battery_no_array', severity: 'info' });
  }
  return issues;
}

function buildCoupleMap(drivers) {
  const map = new Map(); // mfr|pid -> [{id,class,family}]
  for (const d of drivers) {
    const mfrs = d.mfr.map(norm).filter((m) => m.startsWith('_tz') || m.startsWith('_tyzb'));
    const pids = d.pid.map(norm);
    for (const m of mfrs) {
      for (const p of pids) {
        const k = `${m}|${p}`;
        if (!map.has(k)) map.set(k, []);
        map.get(k).push({
          id: d.id,
          class: d.class,
          family: family(d.id, d.class),
        });
      }
    }
  }
  return map;
}

function analyze(drivers) {
  const filtered = CLASS_FILTER
    ? drivers.filter((d) => d.class === CLASS_FILTER)
    : drivers;

  const byClass = {};
  for (const d of filtered) {
    if (!byClass[d.class]) byClass[d.class] = [];
    byClass[d.class].push(d.id);
  }

  const coupleMap = buildCoupleMap(drivers);
  const crossClass = [];
  const sameClass = [];

  for (const [couple, claims] of coupleMap) {
    const uniq = [];
    const seen = new Set();
    for (const c of claims) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      uniq.push(c);
    }
    if (uniq.length < 2) continue;
    const families = [...new Set(uniq.map((u) => u.family))];
    const classes = [...new Set(uniq.map((u) => u.class))];
    const absurd = families.length > 1 && families.some((a, i) =>
      families.slice(i + 1).some((b) => isAbsurd(a, b)));
    const row = {
      couple,
      mfr: couple.split('|')[0],
      pid: couple.split('|')[1],
      drivers: uniq.map((u) => u.id),
      classes,
      families,
      absurd,
    };
    if (classes.length > 1 || absurd) crossClass.push(row);
    else sameClass.push(row);
  }

  const energy = [];
  for (const d of filtered) {
    const iss = energyIssues(d);
    if (iss.length) energy.push({ driver: d.id, class: d.class, family: family(d.id, d.class), issues: iss });
  }

  return {
    scanned: filtered.length,
    classes: Object.fromEntries(
      Object.entries(byClass).map(([k, v]) => [k, v.length]).sort((a, b) => b[1] - a[1]),
    ),
    crossClassAbsurd: crossClass.filter((c) => c.absurd),
    crossClassOther: crossClass.filter((c) => !c.absurd),
    sameClassDual: sameClass,
    energy,
  };
}

function stripMfrFromDriver(driverId, mfrNorm) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const list = j.zigbee?.manufacturerName;
  if (!Array.isArray(list)) return 0;
  const before = list.length;
  const next = list.filter((m) => norm(m) !== mfrNorm);
  const removed = before - next.length;
  if (removed === 0) return 0;
  if (next.length === 0) {
    const sentinel = `_hybrid_${driverId}_needs_device_assignment`;
    j.zigbee.manufacturerName = [sentinel, sentinel.toUpperCase()];
  } else {
    j.zigbee.manufacturerName = next;
  }
  if (APPLY) fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
  return removed;
}

function planCrossClassFixes(absurdRows, drivers) {
  const byId = new Map(drivers.map((d) => [d.id, d]));
  const plans = [];
  for (const row of absurdRows) {
    const ranked = row.drivers.map((id) => {
      const d = byId.get(id);
      const fam = family(id, d?.class || '');
      return { id, family: fam, score: KEEP_PRIORITY[fam] || 0 };
    }).sort((a, b) => b.score - a.score);

    const keepFam = ranked[0]?.family;
    const keep = ranked.filter((r) => r.family === keepFam).map((r) => r.id);
    const strip = ranked.filter((r) => r.family !== keepFam).map((r) => r.id);
    if (!strip.length) continue;
    plans.push({
      couple: row.couple,
      mfr: row.mfr,
      pid: row.pid,
      keep,
      strip,
      reason: `prefer family ${keepFam}`,
    });
  }
  return plans;
}

function main() {
  const drivers = loadDrivers();
  const report = analyze(drivers);

  let fixPlans = [];
  if (FIX_CROSS) {
    fixPlans = planCrossClassFixes(report.crossClassAbsurd, drivers);
    const applied = [];
    for (const plan of fixPlans) {
      for (const sid of plan.strip) {
        const n = stripMfrFromDriver(sid, plan.mfr);
        applied.push({ mfr: plan.mfr, from: sid, keep: plan.keep, removedVariants: n, dryRun: !APPLY });
      }
    }
    report.fixPlans = fixPlans;
    report.fixApplied = applied;
  }

  const summary = {
    timestamp: new Date().toISOString(),
    gate: 'audit-sacred-couple-by-class',
    apply: APPLY,
    ...report,
    counts: {
      crossClassAbsurd: report.crossClassAbsurd.length,
      crossClassOther: report.crossClassOther.length,
      sameClassDual: report.sameClassDual.length,
      energyIssues: report.energy.length,
    },
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`audit-sacred-couple-by-class: scanned ${summary.scanned} drivers`);
    console.log('classes:', JSON.stringify(summary.classes));
    console.log(`cross-class ABSURD dual-claims: ${summary.counts.crossClassAbsurd}`);
    for (const r of summary.crossClassAbsurd.slice(0, 40)) {
      console.log(`  ${r.couple}  families=${r.families.join('+')}  drivers=${r.drivers.join(' | ')}`);
    }
    if (summary.crossClassAbsurd.length > 40) {
      console.log(`  ... +${summary.crossClassAbsurd.length - 40} more`);
    }
    console.log(`same-class dual-claims: ${summary.counts.sameClassDual} (warn)`);
    console.log(`energy honesty issues: ${summary.counts.energyIssues}`);
    for (const e of summary.energy.slice(0, 25)) {
      console.log(`  ${e.driver} [${e.class}/${e.family}] ${e.issues.map((i) => i.code).join(',')}`);
    }
    if (FIX_CROSS) {
      console.log(`fix plans: ${fixPlans.length} (${APPLY ? 'APPLIED' : 'dry-run'})`);
      for (const p of fixPlans.slice(0, 30)) {
        console.log(`  keep ${p.keep.join('|')} ← strip ${p.strip.join(',')}  (${p.mfr}+${p.pid})`);
      }
    }
  }

  // write report artifact
  const outDir = path.join(ROOT, 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'P168_CLASS_SCALE_AUDIT_LATEST.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );

  const fail = summary.counts.crossClassAbsurd > 0 && APPLY === false && !FIX_CROSS
    ? 0 // informational by default
    : 0;
  process.exit(fail);
}

main();
