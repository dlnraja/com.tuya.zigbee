'use strict';

/**
 * P2358 — NeedActionInvestigator must not invent TS0001 via PRODUCT_ID_DEFAULTS
 * when mfr is already in rain_sensor compose (_TZ3210_tgvtvdoc).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { resolveCoupleCandidates } = require('../../lib/enrichment/NeedActionInvestigator');

function loadComposeIndex() {
  const byMfr = new Map();
  const dir = path.join(__dirname, '..', '..', 'drivers');
  for (const id of fs.readdirSync(dir)) {
    const fp = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(fp));
      const mfrs = c.zigbee?.manufacturerName || [];
      const pids = c.zigbee?.productId || [];
      for (const m of mfrs) {
        const ml = String(m).trim().toLowerCase();
        if (!byMfr.has(ml)) byMfr.set(ml, []);
        byMfr.get(ml).push({ driver: id, pids: [...pids] });
      }
    } catch { /* skip */ }
  }
  return byMfr;
}

const model = {
  pidCandidates: [
    'TS0001', 'TS0002', 'TS0044', 'TS011F', 'TS0207', 'TS0601',
  ],
};

const context = {
  composeIndex: loadComposeIndex(),
  truthIndex: new Map(),
  postsByUser: new Map(),
  diagExcerpts: [],
  username: 'FKey',
};

const cands = resolveCoupleCandidates('_TZ3210_tgvtvdoc', model, context);
assert.ok(cands.length > 0, 'expected rain compose candidates');
assert.ok(
  !cands.some((c) => String(c.pid).toUpperCase() === 'TS0001'),
  `must not invent TS0001; got ${cands.map((c) => c.pid).join(',')}`,
);
assert.ok(
  cands.every((c) => c.driver === 'rain_sensor' || c.source === 'driver-compose'),
  'candidates should stay on rain_sensor compose',
);
assert.ok(
  cands.some((c) => /TS0207|TS0601/i.test(c.pid)),
  'expected TS0207/TS0601 from rain_sensor compose',
);

console.log('P2358 OK — tgvtvdoc candidates:', cands.map((c) => `${c.pid}@${c.driver}`).join(', '));
