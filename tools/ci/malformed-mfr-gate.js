#!/usr/bin/env node
'use strict';
// R16: malformed / synthetic manufacturerNames (OCR digit padding such as `_TZE2841000000_xxx`,
// `_TZE28C1000000_xxx`, placeholders like `_TZE200_xxxxx`) can never match a real device and are
// never ADDED. Legacy entries that existing forum-routing tests still lock are listed in
// tools/ci/malformed-mfr-baseline.json (shrink-only); any other malformed name fails.
const fs = require('fs');
const path = require('path');

const PATTERNS = [
  /^_tze28[0-9a-z]1?0{5,6}_/i, // OCR digit padding (PR #512)
  /^_tz[a-z0-9]{1,4}_x{4,}$/i, // placeholder
  /^_tze200_abc123$/i,
];

function isMalformedMfr(m) {
  return typeof m === 'string' && PATTERNS.some((re) => re.test(m));
}

function loadBaseline(root) {
  const p = path.join(root, 'tools', 'ci', 'malformed-mfr-baseline.json');
  if (!fs.existsSync(p)) {return new Set();}
  return new Set(JSON.parse(fs.readFileSync(p, 'utf8')).legacy.map((m) => m.toLowerCase()));
}

function scan(root, { ignoreBaseline = false } = {}) {
  const base = ignoreBaseline ? new Set() : loadBaseline(root);
  const bad = (m) => isMalformedMfr(m) && !base.has(m.toLowerCase());
  const hits = [];
  const dir = path.join(root, 'drivers');
  for (const d of fs.readdirSync(dir)) {
    const p = path.join(dir, d, 'driver.compose.json');
    if (!fs.existsSync(p)) {continue;}
    const z = JSON.parse(fs.readFileSync(p, 'utf8')).zigbee || {};
    for (const m of z.manufacturerName || []) {if (bad(m)) {hits.push(`${d}: ${m}`);}}
  }
  const ap = path.join(root, 'app.json');
  if (fs.existsSync(ap)) {
    for (const drv of JSON.parse(fs.readFileSync(ap, 'utf8')).drivers || []) {
      for (const m of (drv.zigbee && drv.zigbee.manufacturerName) || []) {if (bad(m)) {hits.push(`app.json ${drv.id}: ${m}`);}}
    }
  }
  return hits;
}

module.exports = { isMalformedMfr, scan, loadBaseline };

if (require.main === module) {
  const hits = scan(path.join(__dirname, '..', '..'));
  if (hits.length) {
    console.error(`[malformed-mfr-gate] FAIL ${hits.length} malformed manufacturerName(s) (R16):\n  ${hits.slice(0, 30).join('\n  ')}`);
    process.exit(1);
  }
  console.log(`[malformed-mfr-gate] OK 0 new malformed manufacturerNames (legacy baseline: ${  loadBaseline(path.join(__dirname, '..', '..')).size  })`);
}
