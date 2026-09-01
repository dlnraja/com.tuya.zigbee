'use strict';
const fs = require('fs');
const path = require('path');
const j = JSON.parse(fs.readFileSync(path.join(__dirname, 'portal-diag-parsed.json'), 'utf8'));
const cutoff = Date.parse('2026-08-25T00:00:00Z');
const recent = (j.recent || []).filter((r) => Date.parse(r.createdAt || 0) >= cutoff);

// dedupe by uuid+version+createdAt
const seen = new Set();
const uniq = [];
for (const r of recent) {
  const key = `${r.uuid}|${r.version}|${r.createdAt}|${r.userMessage}`;
  if (seen.has(key)) continue;
  seen.add(key);
  uniq.push(r);
}

const actionable = uniq.filter((r) =>
  r.couples.length
  || r.invalidDriver
  || /unknown|timeout|crash|not work|AC |thermostat|dimmer|TS0044|curtain|Invalid Driver/i.test(r.userMessage || '')
  || /Invalid Driver|Maximum call stack|Could not reach/i.test(r.errHead || '')
);

console.log(JSON.stringify({
  uniqLast7d: uniq.length,
  actionable: actionable.map((r) => ({
    uuid: r.uuid,
    version: r.version,
    createdAt: r.createdAt,
    userMessage: r.userMessage,
    couples: r.couples,
    mfrs: r.mfrs,
    pids: r.pids,
    drivers: r.drivers.slice(0, 6),
    invalidDriver: r.invalidDriver,
    errHead: r.errHead,
    file: r.file,
  })),
}, null, 2));
