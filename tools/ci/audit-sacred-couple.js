'use strict';

/**
 * Audit one manufacturer (or sacred couple) across compose, registry, mfs_db, collisions.
 *
 * Usage:
 *   node tools/ci/audit-sacred-couple.js --mfr=_TZ3000_k4ej3ww2
 *   node tools/ci/audit-sacred-couple.js --mfr=_TZ3000_k4ej3ww2 --pid=TS0207 --json
 *   node tools/ci/audit-sacred-couple.js --from-registry   # all registry cases
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const JSON_MODE = process.argv.includes('--json');
const FROM_REG = process.argv.includes('--from-registry');

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function loadComposeDrivers() {
  const dir = path.join(ROOT, 'drivers');
  const out = [];
  for (const d of fs.readdirSync(dir)) {
    const composePath = path.join(dir, d, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    let j;
    try {
      j = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch {
      continue;
    }
    const zig = j.zigbee || {};
    out.push({
      id: d,
      mfr: [].concat(zig.manufacturerName || []),
      pid: [].concat(zig.productId || []),
      caps: j.capabilities || [],
      energy: j.energy || null,
      clusters: zig.endpoints?.['1']?.clusters || zig.endpoints?.[1]?.clusters || null,
    });
  }
  return out;
}

function auditCouple(mfr, pid, drivers) {
  const nm = norm(mfr);
  const np = pid ? norm(pid) : null;
  const claimingMfr = drivers.filter((d) => d.mfr.some((m) => norm(m) === nm));
  const claimingPid = np
    ? drivers.filter((d) => d.pid.some((p) => norm(p) === np))
    : [];
  const claimingBoth = np
    ? drivers.filter(
      (d) => d.mfr.some((m) => norm(m) === nm) && d.pid.some((p) => norm(p) === np),
    )
    : claimingMfr;

  let registry = null;
  try {
    const Mis = require(path.join(ROOT, 'lib', 'pairing', 'UserMisattributionRegistry'));
    registry = Mis.lookup(mfr, pid || undefined);
  } catch {
    registry = null;
  }

  let mfs = null;
  try {
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json')));
    const key = Object.keys(db).find((k) => norm(k) === nm);
    if (key) mfs = { key, ...db[key] };
  } catch {
    mfs = null;
  }

  // Cartesian phantoms: mfr listed with many pids on same driver
  const phantoms = [];
  for (const d of claimingMfr) {
    for (const p of d.pid) {
      if (np && norm(p) === np) continue;
      if (registry?.notProductIds?.some((x) => norm(x) === norm(p))) {
        phantoms.push({ driver: d.id, pid: p, reason: 'registry_notProductId_but_in_compose_cartesian' });
      }
    }
  }

  const verdict = {
    mfr,
    pid: pid || null,
    composeDriversWithMfr: claimingMfr.map((d) => d.id),
    composeDriversWithPid: claimingPid.map((d) => d.id),
    composeExactCouple: claimingBoth.map((d) => d.id),
    pairingConflict: claimingBoth.length > 1,
    mfrExclusive: claimingMfr.length === 1,
    registryCanonical: registry?.canonicalDriver || null,
    registryForbidden: registry?.forbiddenDrivers || [],
    registryAligned:
      !registry ||
      (claimingBoth.length === 1 && claimingBoth[0].id === registry.canonicalDriver),
    mfsDriverId: mfs?.driverId || mfs?.driverHint || null,
    mfsModelIds: mfs?.modelIds || mfs?.modelId || null,
    cartesianPhantoms: phantoms,
    energyCaps: claimingBoth[0]
      ? {
        caps: claimingBoth[0].caps.filter((c) => /battery|power|meter|energy/i.test(c)),
        batteries: claimingBoth[0].energy?.batteries || null,
      }
      : null,
    clusters: claimingBoth[0]?.clusters || null,
  };

  if (registry && claimingMfr.some((d) => registry.forbiddenDrivers?.includes(d.id))) {
    // WHY(P2256): forbidMode "couple" allows same brand on other drivers with other pids
    // (HOBEIAN climate vs soil vs presence). Only fail if a forbidden driver claims
    // the exact couple, or mode is mfr-wide ban.
    const mode = registry.forbidMode || 'mfr';
    if (mode === 'couple') {
      const badExact = claimingBoth.filter((d) => registry.forbiddenDrivers.includes(d.id));
      if (badExact.length) {
        verdict.forbiddenDriverStillClaimsMfr = badExact.map((d) => d.id);
      }
    } else {
      verdict.forbiddenDriverStillClaimsMfr = claimingMfr
        .filter((d) => registry.forbiddenDrivers.includes(d.id))
        .map((d) => d.id);
    }
  }

  return verdict;
}

function main() {
  const drivers = loadComposeDrivers();
  const results = [];

  if (FROM_REG) {
    const reg = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'data', 'user-misattribution-registry.json'), 'utf8'),
    );
    for (const c of reg.cases || []) {
      // WHY(P2256): external/doNotTouch couples (e.g. SergeP Nous/SoPhos) must not
      // fail publish — they are intentionally outside our driver lock.
      if (c.doNotTouch === true) continue;
      const mfr = (c.mfr || [])[0];
      const pid = (c.productId || [])[0];
      if (!mfr) continue;
      results.push({ caseId: c.id, ...auditCouple(mfr, pid, drivers) });
    }
  } else {
    const mfr = arg('mfr');
    if (!mfr) {
      console.error('Usage: --mfr=_TZ3000_k4ej3ww2 [--pid=TS0207] | --from-registry');
      process.exit(2);
    }
    results.push(auditCouple(mfr, arg('pid'), drivers));
  }

  const summary = {
    timestamp: new Date().toISOString(),
    results,
    failures: results.filter(
      (r) => r.pairingConflict || r.registryAligned === false || r.forbiddenDriverStillClaimsMfr?.length,
    ),
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    for (const r of results) {
      console.log(`\n=== ${r.mfr}${r.pid ? ' + ' + r.pid : ''} ===`);
      console.log(' exact couple drivers:', r.composeExactCouple.join(', ') || '(none)');
      console.log(' mfr exclusive:', r.mfrExclusive, r.composeDriversWithMfr.join(', '));
      console.log(' registry:', r.registryCanonical, 'aligned:', r.registryAligned);
      console.log(' mfs:', r.mfsDriverId, JSON.stringify(r.mfsModelIds));
      console.log(' conflict:', r.pairingConflict);
      if (r.cartesianPhantoms?.length) {
        console.log(' cartesian phantoms:', r.cartesianPhantoms.length, r.cartesianPhantoms.slice(0, 5));
      }
      console.log(' energy:', JSON.stringify(r.energyCaps));
    }
    console.log(`\nfailures: ${summary.failures.length}`);
  }

  process.exit(summary.failures.length ? 1 : 0);
}

main();
