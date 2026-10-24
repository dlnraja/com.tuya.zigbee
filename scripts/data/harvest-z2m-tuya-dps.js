#!/usr/bin/env node
'use strict';

/**
 * P3018: harvest every Tuya DP (number, name, value converter) for every exact mfr+pid couple
 * declared in zigbee-herdsman-converters `src/devices/*.ts` (MIT, Koenkk and contributors).
 *
 * Facts only, rewritten into our own compact format (no code copied): for each device definition
 * that carries `meta.tuyaDatapoints`, every fingerprint couple of that same definition receives
 * the DP list. Converter expressions are normalised to short tokens understood by
 * lib/zigbee/DpCatalogDecoder.js (raw, div:10, tf:1, inv, onOff, batt3, lookup:{..}, ...).
 *
 * Input:  $KB_DIR/zhc (local mirror kept by scripts/kb/refresh.sh), else --src <dir>.
 * Output: scripts/data/z2m-tuya-dps.json  { v, commit, date, src, couples: { 'mfr|PID': [[dp, name, conv], ...] } }
 * Keys: manufacturerName as written upstream (case kept; consumers compare caseless), PID upper-case.
 * Deterministic: sorted keys and DPs, so a re-run with the same upstream commit is byte-identical.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'scripts', 'data', 'z2m-tuya-dps.json');

/** Mask strings and comments with spaces (same length) so bracket matching is reliable. */
function mask(src) {
  const out = src.split('');
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') { out[i++] = ' '; } continue; }
    if (c === '/' && d === '*') { out[i++] = ' '; out[i++] = ' '; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] !== '\n') { out[i] = ' '; } i++; } if (i < n) { out[i++] = ' '; out[i++] = ' '; } continue; }
    if (c === '"' || c === '\'' || c === '`') {
      i++;
      while (i < n && src[i] !== c) { if (src[i] === '\\') { out[i++] = ' '; } if (src[i] !== '\n') { out[i] = ' '; } i++; }
      i++;
      continue;
    }
    i++;
  }
  return out.join('');
}

/** Index of the bracket matching the opener at `open` in masked text, or -1. */
function matchBracket(m, open) {
  const pairs = { '[': ']', '{': '}', '(': ')' };
  const stack = [];
  for (let i = open; i < m.length; i++) {
    const ch = m[i];
    if (pairs[ch]) { stack.push(pairs[ch]); } else if (ch === ']' || ch === '}' || ch === ')') {
      if (stack.pop() !== ch) { return -1; }
      if (!stack.length) { return i; }
    }
  }
  return -1;
}

/** Split the inside of a bracket (start+1 .. end-1) at depth-0 commas. Returns [from, to] spans. */
function splitTop(m, start, end) {
  const spans = [];
  let depth = 0;
  let from = start + 1;
  for (let i = start + 1; i < end; i++) {
    const ch = m[i];
    if (ch === '[' || ch === '{' || ch === '(') { depth++; } else if (ch === ']' || ch === '}' || ch === ')') { depth--; } else if (ch === ',' && depth === 0) { spans.push([from, i]); from = i + 1; }
  }
  if (from < end) { spans.push([from, end]); }
  return spans.filter(([a, b]) => m.slice(a, b).trim());
}

// WHY: named upstream lookups re-expressed as raw-value → label facts (no code copied).
const NAMED_LOOKUP = {
  lockUnlock: { true: 'LOCK', false: 'UNLOCK' },
  powerOnBehavior: { 0: 'off', 1: 'on', 2: 'previous' },
  powerOnBehaviorEnum: { 0: 'off', 1: 'on', 2: 'previous' },
  lightType: { 0: 'led', 1: 'incandescent', 2: 'halogen' },
  temperatureUnit: { 0: 'celsius', 1: 'fahrenheit' },
  temperatureUnitEnum: { 0: 'celsius', 1: 'fahrenheit' },
  backlightModeOffNormalInverted: { 0: 'off', 1: 'normal', 2: 'inverted' },
  backlightModeOffLowMediumHigh: { 0: 'off', 1: 'low', 2: 'medium', 3: 'high' },
  switchMode: { 0: 'switch', 1: 'scene' },
  switchMode2: { 0: 'switch', 1: 'curtain' },
  switchType: { 0: 'momentary', 1: 'toggle', 2: 'state' },
  switchType2: { 0: 'toggle', 1: 'state', 2: 'momentary' },
  selfTestResult: { 0: 'checking', 1: 'success', 2: 'failure', 3: 'others' },
  lightMode: { 0: 'normal', 1: 'on', 2: 'off', 3: 'flash' },
};

/** Normalise one converter expression to a token (unknown → other:<name>). */
function convToken(expr) {
  const s = String(expr || '').replace(/\s+/g, ' ').trim();
  if (!s) { return 'raw'; }
  let m;
  if ((m = s.match(/divideBy(\d+)FromOnly\b/))) { return `divFrom:${m[1]}`; }
  if ((m = s.match(/divideByFromOnly\(\s*(\d+)\s*\)/))) { return `divFrom:${m[1]}`; }
  if ((m = s.match(/divideByWithLimits\(\s*(\d+)/))) { return `div:${m[1]}`; }
  if ((m = s.match(/divideBy\(\s*(\d+)\s*\)/))) { return `div:${m[1]}`; }
  if ((m = s.match(/\bdivideBy(\d+)\b/))) { return `div:${m[1]}`; }
  if ((m = s.match(/multiplyBy\(\s*(\d+)\s*\)/)) || (m = s.match(/\bmultiplyBy(\d+)\b/))) { return `mul:${m[1]}`; }
  if (/trueFalseInvert\b/.test(s) || /valueConverter\.inverse\b/.test(s)) { return 'inv'; }
  if ((m = s.match(/trueFalse(?:Enum)?(\d)\b/))) { return `tf:${m[1]}`; }
  if ((m = s.match(/trueFalse\(\s*(?:new Enum\()?\s*(\d+)/))) { return `tf:${m[1]}`; }
  if (/\bonOffNotStrict\b/.test(s)) { return 'bool'; }
  if (/\bonOffEnumOn0\b/.test(s)) { return 'tf:0'; }
  if (/\bonOffEnumOn1\b/.test(s)) { return 'tf:1'; }
  if (/\bvalueConverter\.onOff\b/.test(s)) { return 'onOff'; }
  if (/\bbatteryState\b/.test(s)) { return 'batt3'; }
  if (/\btwosComplement8BitScaled10x\b/.test(s)) { return 'twos8:10'; }
  if (/\btwosComplement8Bit\b/.test(s)) { return 'twos8:1'; }
  if (/valueConverter\.power\b/.test(s)) { return 'power'; }
  if (/\bplus1\b/.test(s)) { return 'plus1'; }
  if ((m = s.match(/\bscale0_(\d+)to0_(\d+)\b/))) { return `scale:0,${m[1]},0,${m[2]}`; }
  if ((m = s.match(/\bscale\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/))) { return `scale:${m[1]},${m[2]},${m[3]},${m[4]}`; }
  if (/valueConverter(?:Basic)?\.raw\b/.test(s) || /\bcountdown\b/.test(s)) { return 'raw'; }
  if ((m = s.match(/(?:valueConverter|tuya\.valueConverter)\.(\w+)\b/)) && NAMED_LOOKUP[m[1]]) { return `lookup:${JSON.stringify(NAMED_LOOKUP[m[1]])}`; }
  if ((m = s.match(/\blookup\(\s*\{((?:[^{}()]|\([^()]*\))*)\}/))) {
    const pairs = [];
    for (const p of m[1].split(',')) {
      const k = p.match(/^\s*["']?([^"':]+?)["']?\s*:\s*(?:new Enum\(|tuya\.enum\(|Enum\()?\s*(true|false|-?\d+)\s*\)?\s*$/);
      if (k) { pairs.push([k[2], k[1].trim()]); }
    }
    if (pairs.length) { return `lookup:${JSON.stringify(Object.fromEntries(pairs))}`; }
    return 'lookup';
  }
  if ((m = s.match(/valueConverter\.(\w+)/))) { return `other:${m[1]}`; }
  if ((m = s.match(/(\w+)\s*\(?/))) { return `other:${m[1]}`; }
  return 'other';
}

/** Parse one TS file text. Returns Map('mfr|PID' -> Map(dp -> [name, conv])). */
function parseDefinitions(src, file = '') {
  const m = mask(src);
  const out = new Map();
  const re = /tuyaDatapoints\s*:\s*\[/g;
  let hit;
  while ((hit = re.exec(m)) !== null) {
    const open = hit.index + hit[0].length - 1;
    const close = matchBracket(m, open);
    if (close < 0) { continue; }
    // enclosing definition object: walk back to the nearest '{' that closes after `close`
    // and whose text declares a fingerprint/model (device definition level).
    let defStart = -1;
    let defEnd = -1;
    let depthProbe = 0;
    for (let i = hit.index; i >= 0; i--) {
      const ch = m[i];
      if (ch === '}' || ch === ']' || ch === ')') { depthProbe++; } else if (ch === '{' || ch === '[' || ch === '(') {
        if (depthProbe > 0) { depthProbe--; continue; }
        if (ch !== '{') { continue; }
        const end = matchBracket(m, i);
        if (end > close && /\b(fingerprint|zigbeeModel)\s*:/.test(m.slice(i, end))) {
          // keep climbing while the parent object still is the same definition (meta → def)
          defStart = i; defEnd = end;
          if (/\b(model|vendor)\s*:/.test(m.slice(i, end))) { break; }
        }
      }
    }
    if (defStart < 0) { continue; }
    const def = src.slice(defStart, defEnd + 1);
    const couples = [];
    for (const f of def.matchAll(/fingerprint\(\s*["']([^"']+)["']\s*,\s*\[([\s\S]*?)\]\s*\)/g)) {
      const body = f[2].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      for (const x of body.matchAll(/["']([^"']+)["']/g)) { couples.push([x[1], f[1]]); }
    }
    for (const f of def.matchAll(/modelID\s*:\s*["']([^"']+)["']\s*,\s*manufacturerName\s*:\s*["']([^"']+)["']/g)) { couples.push([f[2], f[1]]); }
    for (const f of def.matchAll(/manufacturerName\s*:\s*["']([^"']+)["']\s*,\s*modelID\s*:\s*["']([^"']+)["']/g)) { couples.push([f[1], f[2]]); }
    if (!couples.length) { continue; }
    const dps = new Map();
    for (const [a, b] of splitTop(m, open, close)) {
      if (m[a + (m.slice(a, b).search(/\S/))] !== '[') { continue; }
      const s0 = a + m.slice(a, b).indexOf('[');
      const e0 = matchBracket(m, s0);
      if (e0 < 0) { continue; }
      const parts = splitTop(m, s0, e0).map(([x, y]) => src.slice(x, y).trim());
      const dp = Number(parts[0]);
      const nm = (parts[1] || '').match(/^["']([^"']+)["']$/);
      if (!Number.isInteger(dp) || dp < 0 || dp > 255 || !nm) { continue; }
      if (!dps.has(dp)) { dps.set(dp, [nm[1].slice(0, 48), convToken(parts[2])]); }
    }
    if (!dps.size) { continue; }
    for (const [mfr, pid] of couples) {
      if (!mfr || !pid || mfr.length > 40 || pid.length > 40) { continue; }
      const key = `${mfr}|${pid.toUpperCase()}`;
      if (!out.has(key)) { out.set(key, new Map()); }
      const row = out.get(key);
      for (const [dp, v] of dps) { if (!row.has(dp)) { row.set(dp, v); } }
    }
  }
  void file;
  return out;
}

function harvest(dir) {
  const devDir = path.join(dir, 'src', 'devices');
  const all = new Map();
  for (const f of fs.readdirSync(devDir).filter((x) => x.endsWith('.ts')).sort()) {
    const src = fs.readFileSync(path.join(devDir, f), 'utf8');
    if (!src.includes('tuyaDatapoints')) { continue; }
    for (const [k, row] of parseDefinitions(src, f)) {
      if (!all.has(k)) { all.set(k, new Map()); }
      for (const [dp, v] of row) { if (!all.get(k).has(dp)) { all.get(k).set(dp, v); } }
    }
  }
  const couples = {};
  for (const k of [...all.keys()].sort()) {
    couples[k] = [...all.get(k).entries()].sort((a, b) => a[0] - b[0]).map(([dp, [n, c]]) => [dp, n, c]);
  }
  return couples;
}

/**
 * ZHA quirks DP numbers per couple, from the KB index built by scripts/kb/refresh.sh
 * ($KB_DIR/index/zha/entries.json, zigpy/zha-device-handlers, Apache-2.0). Numbers only.
 */
function harvestZha(indexFile) {
  if (!fs.existsSync(indexFile)) { return null; }
  const j = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  const rows = Array.isArray(j) ? j : (j.entries || Object.values(j));
  const m = new Map();
  let commit = null;
  for (const r of rows) {
    const dps = (r && Array.isArray(r.dps) ? r.dps : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 255);
    if (!dps.length) { continue; }
    commit = commit || (r.cite && r.cite.commit) || null;
    for (const f of r.fingerprints || []) {
      if (!f || !f.mfr || !f.pid || String(f.mfr).length > 40) { continue; }
      const key = `${f.mfr}|${String(f.pid).toUpperCase()}`;
      if (!m.has(key)) { m.set(key, new Set()); }
      for (const d of dps) { m.get(key).add(d); }
    }
  }
  const couples = {};
  for (const k of [...m.keys()].sort()) { couples[k] = [...m.get(k)].sort((a, b) => a - b); }
  return { v: 1, commit, src: 'zigpy/zha-device-handlers quirks via KB index (Apache-2.0) — DP numbers only', couples };
}

if (require.main === module) {
  const ai = process.argv.indexOf('--src');
  const dir = ai > 0 ? process.argv[ai + 1] : path.join(process.env.KB_DIR || '/workspace/kb', 'zhc');
  if (!fs.existsSync(path.join(dir, 'src', 'devices'))) { console.error(`harvest-z2m-tuya-dps: no herdsman mirror at ${dir} (run scripts/kb/refresh.sh or pass --src)`); process.exit(0); }
  let commit = null;
  let date = null;
  try { commit = cp.execSync('git rev-parse HEAD', { cwd: dir }).toString().trim(); date = cp.execSync('git log -1 --format=%cI', { cwd: dir }).toString().trim(); } catch (_e) { /* not a git mirror */ }
  const couples = harvest(dir);
  const out = { v: 1, commit, date, src: 'zigbee-herdsman-converters src/devices/*.ts meta.tuyaDatapoints (MIT) — facts only, see docs/knowledge/KB_SOURCES.md', couples };
  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const next = `${JSON.stringify(out)}\n`;
  if (prev !== next) { fs.writeFileSync(OUT, next); }
  const dpCount = Object.values(couples).reduce((a, r) => a + r.length, 0);
  console.log(`harvest-z2m-tuya-dps: ${Object.keys(couples).length} couples, ${dpCount} DP rows${prev === next ? ' (unchanged)' : ''}`);
  const zha = harvestZha(path.join(process.env.KB_DIR || '/workspace/kb', 'index', 'zha', 'entries.json'));
  if (zha) {
    const zOut = path.join(ROOT, 'scripts', 'data', 'zha-tuya-dps.json');
    const zNext = `${JSON.stringify(zha)}\n`;
    if (!fs.existsSync(zOut) || fs.readFileSync(zOut, 'utf8') !== zNext) { fs.writeFileSync(zOut, zNext); }
    console.log(`harvest-zha-dps: ${Object.keys(zha.couples).length} couples`);
  }
}

module.exports = { mask, matchBracket, splitTop, convToken, parseDefinitions, harvest, harvestZha };
