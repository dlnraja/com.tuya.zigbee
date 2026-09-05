'use strict';
/**
 * P2270 — Validate discussion harvest report (shadow).
 * Curated discoveries live under reports/discussion-harvest-YYYY-MM-DD/DISCOVERIES.json
 * (ZHA, Z2M, ZHC, forum, git). This script checks count and refreshes SUMMARY.md.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'reports', 'discussion-harvest-2026-08-26');
const file = path.join(DIR, 'DISCOVERIES.json');

if (!fs.existsSync(file)) {
  console.error('Missing', file);
  process.exit(1);
}

const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const n = (j.discoveries || []).length;
const byTier = {};
const byImpl = {};
for (const d of j.discoveries || []) {
  byTier[d.tier] = (byTier[d.tier] || 0) + 1;
  byImpl[d.impl] = (byImpl[d.impl] || 0) + 1;
}

const summary = [
  '# P2270 SUMMARY',
  '',
  `- discoveries: **${n}**`,
  `- by tier: ${JSON.stringify(byTier)}`,
  `- by impl: ${JSON.stringify(byImpl)}`,
  '',
  'See DISCOVERIES.md. Mode: SHADOW. Never invent productId.',
  '',
].join('\n');

fs.writeFileSync(path.join(DIR, 'SUMMARY.md'), summary);
console.log(summary);
if (n < 50) {
  console.error('FAIL: need >= 50 discoveries');
  process.exit(1);
}
console.log('OK');
