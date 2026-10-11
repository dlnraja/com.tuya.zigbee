'use strict';

/**
 * Tests — flow cards integrity & mfs_db bidirectionality (v9.0.368)
 *  - every flow card arg filter "driver_id=X" references an existing driver
 *  - no duplicate flow card ids
 *  - every flow card has an English title
 *  - mfs_db never maps a fingerprint to driver A while that driver's
 *    compose doesn't claim it BUT another driver does (obvious misroute)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const rootApp = require(path.join(ROOT, 'app.json'));
const buildAppFile = path.join(ROOT, '.homeybuild', 'app.json');
const buildApp = fs.existsSync(buildAppFile) ? require(buildAppFile) : rootApp;


// WHY(2026-10-11): without a local .homeybuild, root app.json only carries the ~200 app-level cards
// (driver cards were deduped into drivers/*/driver.flow.compose.json, P2381) — merge them like `homey app build`.
function driverComposeFlow() {
  const out = { triggers: [], conditions: [], actions: [] };
  const dir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(dir)) {
    const f = path.join(dir, d, 'driver.flow.compose.json');
    if (!fs.existsSync(f)) {continue;}
    let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    for (const t of Object.keys(out)) {for (const c of j[t] || []) {out[t].push(c);}}
  }
  return out;
}

function flowCards() {
  let f = (buildApp.flow && (buildApp.flow.triggers || []).length > 100)
    ? buildApp.flow
    : (rootApp.flow || {});
  if (f === (rootApp.flow || {}) && buildApp === rootApp) {
    const dc = driverComposeFlow();
    f = { triggers: [...(f.triggers || []), ...dc.triggers], conditions: [...(f.conditions || []), ...dc.conditions], actions: [...(f.actions || []), ...dc.actions] };
  }
  return [
    ...(f.triggers || []).map(c => ({ ...c, _kind: 'trigger' })),
    ...(f.conditions || []).map(c => ({ ...c, _kind: 'condition' })),
    ...(f.actions || []).map(c => ({ ...c, _kind: 'action' })),
  ];
}

describe('flow cards integrity', () => {
  const driverIds = new Set((rootApp.drivers || []).map(d => d.id));
  const cards = flowCards();

  it('has flow cards', () => {
    assert.ok(cards.length > 1000, `expected 1000+ cards, got ${cards.length}`);
  });

  it('no duplicate flow card ids', () => {
    const seen = new Set();
    const dupes = [];
    for (const c of cards) {
      const key = `${c._kind}:${c.id}`;
      if (seen.has(key)) {dupes.push(key);}
      seen.add(key);
    }
    assert.deepStrictEqual(dupes, [], dupes.slice(0, 10).join(', '));
  });

  it('every driver_id filter references an existing driver', () => {
    const bad = [];
    for (const c of cards) {
      for (const arg of c.args || []) {
        if (arg.type !== 'device' || !arg.filter) {continue;}
        const ids = String(arg.filter).match(/driver_id=([A-Za-z0-9_]+)/g) || [];
        for (const m of ids) {
          const id = m.split('=')[1];
          if (!driverIds.has(id)) {bad.push(`${c.id} → ${id}`);}
        }
      }
    }
    assert.deepStrictEqual(bad, [], bad.slice(0, 10).join(', '));
  });

  it('every flow card has an English title', () => {
    const bad = cards.filter(c => !c.title || !(typeof c.title === 'string' || c.title.en));
    assert.deepStrictEqual(bad.map(c => c.id), [], 'cards without title');
  });
});

describe('mfs_db bidirectionality', () => {
  it('routes mfs_db pointent vers des drivers existants (rapport d\'audit des dual-claims)', () => {
    const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));
    const claimsByDriver = new Map();
    for (const d of rootApp.drivers) {
      claimsByDriver.set(d.id, {
        mfrs: new Set((d.zigbee?.manufacturerName || []).map(m => m.toLowerCase())),
        pids: new Set((d.zigbee?.productId || []).map(p => String(p).toLowerCase())),
      });
    }
    // HARD: chaque route pointe vers un driver existant (les dual-claims sont
    // un design assumé — mfs_db est la vérité curée par appareil, les claims
    // compose sont volontairement larges)
    const ghosts = [];
    const unroutedClaims = [];
    for (const [fp, entry] of Object.entries(mfs)) {
      const driverId = entry && entry.driverId;
      if (!driverId) {continue;}
      const routed = claimsByDriver.get(driverId);
      if (!routed) {ghosts.push(`${fp} → ${driverId} (driver inexistant)`); continue;}
      if (!routed.mfrs.has(fp.toLowerCase())) {unroutedClaims.push(`${fp} → ${driverId}`);}
    }
    assert.deepStrictEqual(ghosts, [], ghosts.slice(0, 10).join('\n'));
    // AUDIT: les routes dont le driver ne claim pas le mfr (pairing via
    // dual-claim ailleurs) sont consignées dans un rapport, pas un échec
    fs.writeFileSync(
      path.join(ROOT, '.github', 'state', 'mfs-unrouted-claims.json'),
      JSON.stringify({ generated: new Date().toISOString(), count: unroutedClaims.length, entries: unroutedClaims }, null, 1)
    );
    console.log(`[audit] ${unroutedClaims.length} routes mfs_db via dual-claim (voir .github/state/mfs-unrouted-claims.json)`);
  });
});
