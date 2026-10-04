#!/usr/bin/env node
'use strict';
// Usage:
//   node scripts/progress/ledger-cli.js check <key> [updatedAt]   -> exit 0 = process, 3 = skip (done & unchanged)
//   node scripts/progress/ledger-cli.js record <key> <status> [commit] [note...]
//   node scripts/progress/ledger-cli.js next <namespace> [n]     -> next n keys not done
//   node scripts/progress/ledger-cli.js stats
//   node scripts/progress/ledger-cli.js queue [all]   -> master_queue (read FIRST at each resumption); open items unless 'all'
//   node scripts/progress/ledger-cli.js tick <id> <status> [evidence...]  -> update a master_queue item
const L = require('../lib/ledger');
const [cmd, key, ...rest] = process.argv.slice(2);
const l = L.load();
const CP = require('path').join(__dirname, '../../data/leads/resume-checkpoint.json');
if (cmd === 'queue' || cmd === 'tick') {
  const fs = require('fs');
  const cp = JSON.parse(fs.readFileSync(CP, 'utf8'));
  const mq = cp.master_queue || { items: [] };
  if (cmd === 'tick') {
    const it = mq.items.find((i) => String(i.id) === String(key));
    if (!it) { console.error(`no master_queue item ${key}`); process.exit(2); }
    it.status = rest[0];
    if (rest.length > 1) {it.evidence = rest.slice(1).join(' ');}
    mq.updated = new Date().toISOString();
    fs.writeFileSync(CP, `${JSON.stringify(cp, null, 1)}\n`);
    console.log(JSON.stringify(it));
  } else {
    for (const i of mq.items) {if (key === 'all' || i.status !== 'verified') {console.log(`${String(i.id).padStart(3)} [${i.status}] ${i.item}${i.evidence ? ` — ${i.evidence}` : ''}`);}}
  }
  process.exit(0);
}
if (cmd === 'check') { process.exit(L.shouldProcess(l, key, { updatedAt: rest[0] }) ? 0 : 3); }
if (cmd === 'record') {
  const [status, commit, ...note] = rest;
  L.record(l, key, { status, commit: commit && commit !== '-' ? commit : undefined, note: note.join(' ') || undefined, by: process.env.LEDGER_BY || process.env.GITHUB_WORKFLOW });
  L.save(l); console.log(JSON.stringify(l.items[key]));
} else if (cmd === 'next') {
  const n = Number(rest[0] || 10);
  const keys = Object.keys(l.items).filter((k) => k.startsWith(`${key  }:`) && l.items[k].status !== 'done')
    .sort((a, b) => Number(a.split(':')[1]) - Number(b.split(':')[1]) || a.localeCompare(b));
  console.log(keys.slice(0, n).join('\n'));
} else if (cmd === 'stats' || !cmd) {
  const s = {};
  for (const [k, v] of Object.entries(l.items)) { const ns = k.split(':')[0]; s[ns] = s[ns] || {}; s[ns][v.status] = (s[ns][v.status] || 0) + 1; }
  console.log(JSON.stringify(s, null, 1));
}
