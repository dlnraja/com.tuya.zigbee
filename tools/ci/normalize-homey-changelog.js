#!/usr/bin/env node
'use strict';
/**
 * P2964 — Normalize .homeychangelog.json to the shape Athom documents:
 *   { "<x.y.z>": { "en": "...", "<lang>": "..." }, ... }
 * Source: https://apps.developer.homey.app/app-store/updates
 *
 * Nothing is lost: entries hidden in a wrapper (a non-version key holding an
 * array of {version, en, ...}, or a version key holding a nested changelog)
 * are lifted to their own version key when that key does not exist yet.
 * Existing well-formed entries always win.
 *
 * Usage: node tools/ci/normalize-homey-changelog.js [file] [--write]
 */
const fs = require('fs');

const VER = /^\d+\.\d+\.\d+$/;
const isEntry = (v) => v && typeof v === 'object' && !Array.isArray(v) && typeof v.en === 'string';
const langOnly = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => /^[a-z]{2}$/.test(k) && typeof v === 'string'));

function normalize(input) {
  const good = {};
  const lifted = [];
  const lift = (ver, entry, from) => {
    if (!VER.test(ver) || !entry || typeof entry.en !== 'string') return;
    if (good[ver] || input[ver] && isEntry(input[ver])) return;
    good[ver] = langOnly(entry);
    lifted.push(`${ver} (from ${from})`);
  };
  for (const [k, v] of Object.entries(input)) if (VER.test(k) && isEntry(v)) good[k] = v;
  for (const [k, v] of Object.entries(input)) {
    if (VER.test(k) && isEntry(v)) continue;
    if (Array.isArray(v)) v.forEach((e) => e && lift(String(e.version || ''), e, k));
    else if (v && typeof v === 'object') for (const [nk, nv] of Object.entries(v)) lift(nk, nv, k);
  }
  const removed = Object.keys(input).filter((k) => !(k in good));
  const ordered = Object.keys(good).sort((a, b) => {
    const A = a.split('.').map(Number); const B = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) if (A[i] !== B[i]) return A[i] - B[i];
    return 0;
  });
  const out = {};
  for (const k of ordered) out[k] = good[k];
  return { out, lifted, removed };
}

if (require.main === module) {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--')) || '.homeychangelog.json';
  const { out, lifted, removed } = normalize(JSON.parse(fs.readFileSync(file, 'utf8')));
  console.log(`changelog: ${Object.keys(out).length} entries, lifted ${lifted.length}, wrappers removed: ${removed.join(', ') || 'none'}`);
  if (process.argv.includes('--write') && (lifted.length || removed.length)) fs.writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
}

module.exports = { normalize };
