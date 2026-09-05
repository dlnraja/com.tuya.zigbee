'use strict';

/**
 * Sync user-misattribution-registry sacred couples into canonical driver compose.
 * WHY(P2292): audit-sacred-couple --from-registry fails when registry locks a couple
 * but compose lacks exact mfr+pid (often TS0601 vs TS0601_generic drift).
 *
 * Usage:
 *   node tools/ci/sync-registry-couples-to-compose.js           # dry-run
 *   node tools/ci/sync-registry-couples-to-compose.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function main() {
  const reg = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'),
  );
  const changes = [];

  for (const c of reg.cases || []) {
    if (c.doNotTouch === true) continue;
    const driver = c.canonicalDriver;
    const mfr = (c.mfr || [])[0];
    const pid = (c.productId || [])[0];
    if (!driver || !mfr) continue;

    const composePath = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
      changes.push({ caseId: c.id, action: 'skip_no_compose', driver });
      continue;
    }

    const j = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    j.zigbee = j.zigbee || {};
    j.zigbee.manufacturerName = [].concat(j.zigbee.manufacturerName || []);
    j.zigbee.productId = [].concat(j.zigbee.productId || []);

    const needMfr = !j.zigbee.manufacturerName.some((m) => norm(m) === norm(mfr));
    const needPid = pid && !j.zigbee.productId.some((p) => norm(p) === norm(pid));

    if (!needMfr && !needPid) continue;

    if (needMfr) j.zigbee.manufacturerName.push(mfr);
    if (needPid) j.zigbee.productId.push(pid);

    if (APPLY) {
      fs.writeFileSync(composePath, `${JSON.stringify(j, null, 2)}\n`);
    }
    changes.push({
      caseId: c.id,
      action: 'add_couple',
      driver,
      mfr,
      pid: pid || null,
      addedMfr: needMfr,
      addedPid: needPid,
    });
  }

  console.log(`sync-registry-couples: mode=${APPLY ? 'APPLY' : 'dry-run'} changes=${changes.length}`);
  for (const ch of changes) {
    console.log(`  ${ch.caseId} -> ${ch.driver} ${ch.mfr}${ch.pid ? '+' + ch.pid : ''} (+mfr=${!!ch.addedMfr} +pid=${!!ch.addedPid})`);
  }

  if (!APPLY && changes.length) process.exit(0);
}

main();
