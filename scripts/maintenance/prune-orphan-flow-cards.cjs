'use strict';

/**
 * P2798: remove Flow cards whose `device` arg filter only targets drivers that
 * are not present in the (publish) manifest. compact-zigbee-identifiers prunes
 * synthetic drivers from the publish app.json but leaves their device cards,
 * which are unusable (no device can ever match) and bloat the manifest that
 * Athom's build processor has to digest.
 *
 * Conservative: a card is only removed when EVERY condition of EVERY `|` group
 * of its device filter is a plain `driver_id=<id>` naming an absent driver.
 * Cards with capability filters, wildcards, `!=`, or any present driver stay.
 */

function filterDriverIds(filter) {
  const ids = [];
  const raw = String(filter || '').trim();
  if (!raw) {return null;}
  for (const group of raw.split('|')) {
    for (const cond of group.split('&')) {
      const c = cond.trim();
      if (!c) {continue;}
      const m = /^driver_id=([A-Za-z0-9_-]+)$/.exec(c);
      if (!m) {return null;} // not a pure driver_id filter -> keep the card
      ids.push(m[1]);
    }
  }
  return ids.length ? ids : null;
}

function pruneOrphanFlowCards(manifest) {
  const present = new Set((manifest.drivers || []).map((d) => d && d.id).filter(Boolean));
  const result = { removed: 0, bytes: 0, drivers: 0, cards: [] };
  if (!manifest.flow || present.size === 0) {return result;}
  const orphanDrivers = new Set();
  for (const type of ['triggers', 'conditions', 'actions']) {
    const cards = manifest.flow[type];
    if (!Array.isArray(cards)) {continue;}
    manifest.flow[type] = cards.filter((card) => {
      const devArgs = (card && Array.isArray(card.args) ? card.args : []).filter((a) => a && a.type === 'device');
      if (devArgs.length === 0) {return true;}
      for (const arg of devArgs) {
        const ids = filterDriverIds(arg.filter);
        if (!ids || ids.some((id) => present.has(id))) {return true;}
      }
      for (const arg of devArgs) {for (const id of filterDriverIds(arg.filter)) {orphanDrivers.add(id);}}
      result.removed += 1;
      result.bytes += Buffer.byteLength(JSON.stringify(card)) + 1;
      result.cards.push(`${type}:${card.id}`);
      return false;
    });
  }
  result.drivers = orphanDrivers.size;
  return result;
}

module.exports = { pruneOrphanFlowCards, filterDriverIds };

if (require.main === module) {
  const fs = require('fs');
  const file = process.argv[2] || 'app.json';
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const res = pruneOrphanFlowCards(manifest);
  if (process.argv.includes('--apply') && res.removed > 0) {fs.writeFileSync(file, JSON.stringify(manifest));}
  console.log(JSON.stringify({ file, removed: res.removed, bytes: res.bytes, drivers: res.drivers }));
}
