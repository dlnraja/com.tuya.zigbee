'use strict';
// WHY(P2930, 21/10/2026 Paris): the publish payload of master and stable carried ~25 % orphan
// flow cards (master 1507/6118, stable 1409/5455): cards whose device filter names only drivers
// that the publish step had pruned (102 synthetic drivers) or held. Athom's processor resolves
// every card against the manifest; Bastien hit the same defect (430 orphans, P2928).
// A card whose drivers are all absent can never be used by any Flow, so dropping it is lossless.
// Mixed filters keep the card and only lose the absent driver ids.

function driverFilter(arg) {
  if (!arg || arg.type !== 'device' || typeof arg.filter !== 'string') return null;
  const m = arg.filter.match(/(?:^|&)driver_id=([^&]+)/);
  return m ? m[1].split('|').filter(Boolean) : null;
}

function findOrphanCards(manifest) {
  const ids = new Set((manifest.drivers || []).map((d) => d.id));
  const out = [];
  for (const s of ['triggers', 'conditions', 'actions']) {
    for (const c of (manifest.flow && manifest.flow[s]) || []) {
      for (const a of c.args || []) {
        const named = driverFilter(a);
        if (named && named.length && !named.includes('*') && !named.some((id) => ids.has(id))) { out.push(`${s}.${c.id}`); break; }
      }
    }
  }
  return out;
}

function pruneOrphanCards(manifest) {
  const ids = new Set((manifest.drivers || []).map((d) => d.id));
  let removed = 0; let narrowed = 0;
  for (const s of Object.keys(manifest.flow || {})) {
    if (!Array.isArray(manifest.flow[s])) continue;
    manifest.flow[s] = manifest.flow[s].filter((c) => {
      for (const a of c.args || []) {
        const named = driverFilter(a);
        if (!named || !named.length || named.includes('*')) continue;
        const keep = named.filter((id) => ids.has(id));
        if (!keep.length) { removed++; return false; }
        if (keep.length !== named.length) {
          a.filter = a.filter.replace(/((?:^|&)driver_id=)[^&]+/, `$1${keep.join('|')}`);
          narrowed++;
        }
      }
      return true;
    });
  }
  return { removed, narrowed };
}

module.exports = { findOrphanCards, pruneOrphanCards };

if (require.main === module) {
  const fs = require('fs');
  const file = process.argv[2];
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (process.argv[3] === '--check') {
    const o = findOrphanCards(m);
    console.log(`${o.length} orphan flow card(s)${o.length ? ': ' + o.slice(0, 10).join(', ') : ''}`);
    process.exit(o.length ? 1 : 0);
  }
  const r = pruneOrphanCards(m);
  fs.writeFileSync(file, JSON.stringify(m));
  console.log(`[P2930] orphan flow cards removed ${r.removed}, filters narrowed ${r.narrowed}`);
}
