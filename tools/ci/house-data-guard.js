#!/usr/bin/env node
'use strict';
// P3120 (01/11/2026 Paris, t682u): nothing from the Bastien house (device/room names, schedules, presence,
// Homey ids, IEEE addresses, flows) may live in the repo. Classes scanned on every tracked text file:
//   ieee   — 64-bit IEEE address aa:bb:cc:dd:ee:ff:00:11
//   room   — French room / house-part words on a line or in a file tied to the house (path or line says bastien)
//   homeyid — homeyId/cloudId/zoneId/flowId/userId values
// Ratchet: config/house-data-baseline.json holds per-file counts of functional legacy hits (runtime identity
// code awaiting the owner's decision). Any new file or higher count fails CI.
// --redact rewrites docs/, reports/, data/leads/ and *.md hits to neutral tokens (technical facts kept).
// --update-baseline is for a human push only (bot-commit-guard).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const BASELINE = path.join(ROOT, 'config', 'house-data-baseline.json');
const IEEE_RE = /\b(?!(?:00:){7}00\b)(?:[0-9a-f]{2}:){7}[0-9a-f]{2}\b/gi; // all-zero = placeholder, not a device
const ROOM_RE = /\b(salon|cuisine|chambres?|sous[ -]sol|salle de bains?|salle a manger|salle à manger|s[ée]jour|buanderie|cellier|grenier|v[ée]randa|entr[ée]e principale|chambre principale?|bureau de bastien)\b/gi;
const HOMEYID_RE = /["']?(\w*homeyId|cloudId|zoneId|flowId|userId|bootId)["']?\s*[:=]\s*["'][0-9a-f-]{16,}["']|homey-[0-9a-f]{24}\b/gi;
const HOUSE_PATH = /bastien/i;
const SELF = new Set(['tools/ci/house-data-guard.js', 'test/p3120-house-data-guard.test.js', 'config/house-data-baseline.json']);
const SKIP = /(^|\/)node_modules\/|\.(png|jpe?g|gif|webp|ico|zip|gz|pdf|svg)$|^data\/mfs_db\.json$|(^|\/)_?[^/]*app\.json$|(^|\/)locales\//i;
const REDACTABLE = /^(docs|reports|data\/leads)\/|\.md$/;

function count(file, text) {
  let n = 0;
  n += (text.match(IEEE_RE) || []).length;
  n += (text.match(HOMEYID_RE) || []).length;
  const houseFile = HOUSE_PATH.test(file);
  for (const line of text.split('\n')) {
    if (houseFile || /bastien/i.test(line)) n += (line.match(ROOM_RE) || []).length;
  }
  return n;
}

function redact(file, text) {
  const houseFile = HOUSE_PATH.test(file);
  return text.split('\n').map((line) => {
    let l = line.replace(IEEE_RE, '[IEEE-1]').replace(HOMEYID_RE, (m, k) => (k ? `"${k}": "[homey-id-1]"` : 'homey-[homey-id-1]'));
    if (houseFile || /bastien/i.test(l)) l = l.replace(ROOM_RE, '[pièce A]');
    return l;
  }).join('\n');
}

function scan(root = ROOT, files) {
  const list = files || execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const out = {};
  for (const f of list) {
    if (SELF.has(f) || SKIP.test(f)) continue;
    let t; try { t = fs.readFileSync(path.join(root, f), 'utf8'); } catch (e) { continue; }
    if (t.length > 3e6 || t.includes('\u0000')) continue;
    const n = count(f, t); if (n) out[f] = n;
  }
  return out;
}

function compare(found, base) {
  return Object.entries(found).filter(([f, n]) => n > (base[f] || 0)).map(([f, n]) => `${f}: ${n} > baseline ${base[f] || 0}`);
}

function main() {
  const a = process.argv.slice(2);
  if (a.includes('--redact')) {
    for (const [f] of Object.entries(scan())) {
      if (!REDACTABLE.test(f)) continue;
      const p = path.join(ROOT, f); const t = fs.readFileSync(p, 'utf8'); const r = redact(f, t);
      if (r !== t) { fs.writeFileSync(p, r); console.log('redacted', f); }
    }
  }
  const found = scan();
  if (a.includes('--update-baseline')) { fs.writeFileSync(BASELINE, JSON.stringify(found, null, 2) + '\n'); console.log('baseline', Object.keys(found).length); return; }
  const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
  const bad = compare(found, base);
  // counts only, never the matched text (no leak through CI logs)
  if (bad.length) { console.error('::error::house-data leak (counts only):\n' + bad.join('\n')); process.exit(1); }
  console.log(`[house-data-guard] OK (${Object.keys(found).length} legacy files under baseline)`);
}

if (require.main === module) main();
module.exports = { count, redact, scan, compare, IEEE_RE, ROOM_RE };
