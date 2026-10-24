#!/usr/bin/env node
'use strict';

/**
 * P3018b: precise per-quirk ZHA harvest (zigpy/zha-device-handlers, Apache-2.0 — facts only:
 * fingerprint couples, DP ids, attribute names and scalings; no code copied).
 *
 * Why: the old KB index (index/zha/entries.json) unions every DP of a quirk FILE onto every
 * fingerprint of that file, so a couple inherits DPs of unrelated devices. Here each
 * `TuyaQuirkBuilder(...)…add_to_registry()` chain (quirks v2) and each v1 quirk class
 * (MODELS_INFO + the MCU cluster classes it references) is read on its own.
 *
 * Output: scripts/data/zha-quirk-dps.json
 *   { v, commit, src, couples: { 'mfr|PID': [[dp, name, conv|null], ...] } }
 * conv tokens are the DpCatalogDecoder tokens (raw, div:N, mul:N, bool, tf:N, lookup:{...}).
 * Units: ZHA stores temperature/humidity/soil moisture in 0.01 units → token gives °C / %.
 *
 * Usage: node scripts/data/harvest-zha-quirk-dps.js [--src /workspace/kb/zha]
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'scripts', 'data', 'zha-quirk-dps.json');

/** Blank Python strings + comments (same length) so brackets/commas can be matched safely. */
function pyMask(src) {
  const out = src.split('');
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '#') { while (i < src.length && src[i] !== '\n') { out[i++] = ' '; } continue; }
    if (c === '"' || c === "'") {
      const triple = src.startsWith(c.repeat(3), i);
      const q = triple ? c.repeat(3) : c;
      let j = i + q.length;
      while (j < src.length && !src.startsWith(q, j)) { if (src[j] === '\\') { j++; } if (!triple && src[j] === '\n') { break; } j++; }
      const end = Math.min(src.length, j + q.length);
      for (let k = i + q.length; k < end - q.length; k++) { if (out[k] !== '\n') { out[k] = '_'; } }
      i = end;
      continue;
    }
    i++;
  }
  return out.join('');
}

function closeOf(m, open) {
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const stack = [];
  for (let i = open; i < m.length; i++) {
    const c = m[i];
    if (pairs[c]) { stack.push(pairs[c]); } else if (c === ')' || c === ']' || c === '}') { if (stack.pop() !== c) { return -1; } if (!stack.length) { return i; } }
  }
  return -1;
}

/** Top-level comma split of src[open+1 .. close-1] (masked m for structure). */
function args(src, m, open, close) {
  const out = [];
  let depth = 0;
  let a = open + 1;
  for (let i = open + 1; i < close; i++) {
    const c = m[i];
    if ('([{'.includes(c)) { depth++; } else if (')]}'.includes(c)) { depth--; } else if (c === ',' && depth === 0) { out.push(src.slice(a, i).trim()); a = i + 1; }
  }
  const last = src.slice(a, close).trim();
  if (last) { out.push(last); }
  return out;
}

function kw(list) {
  const pos = [];
  const named = {};
  for (const a of list) {
    const k = a.match(/^([a-z_]+)\s*=\s*([\s\S]+)$/);
    if (k) { named[k[1]] = k[2].trim(); } else { pos.push(a); }
  }
  return { pos, named };
}

const str = (s) => {
  const t = String(s || '').trim();
  const m = t.match(/^(?:[rbuf]?)(["'])([\s\S]*)\1$/);
  if (m) { return m[2]; }
  const d = t.match(/\.AttributeDefs\.(\w+)\.name$/); // Cluster.AttributeDefs.<attr>.name
  return d ? d[1] : null;
};
const num = (s) => { if (s === undefined || s === null) { return null; } const t = String(s).replace(/_/g, ''); const n = /^0x[0-9a-f]+$/i.test(t) ? parseInt(t, 16) : Number(t); return Number.isFinite(n) ? n : null; };
const fmt = (n) => String(Math.round(n * 1e6) / 1e6);

/** Simple `lambda x: …` → token (only exact linear forms; anything else → null = generic). */
function lambdaToken(s) {
  if (!s) { return null; }
  const t = String(s).replace(/\s+/g, ' ').trim();
  let m = t.match(/^lambda (\w+): \1$/);
  if (m) { return 'raw'; }
  m = t.match(/^lambda (\w+): \(?\1\)? ?\/{1,2} ?([0-9_.e]+)$/);
  if (m && num(m[2]) > 0) { return `div:${fmt(num(m[2]))}`; }
  m = t.match(/^lambda (\w+): \(?\1\)? ?\* ?([0-9_.e]+)$/) || t.match(/^lambda (\w+): ([0-9_.e]+) ?\* ?\(?\1\)?$/);
  if (m && num(m[2]) !== null) { return `mul:${fmt(num(m[2]))}`; }
  m = t.match(/^lambda (\w+): (?:bool\(\1\)|\1 != 0|\1 > 0|not not \1)$/);
  if (m) { return 'bool'; }
  m = t.match(/^lambda (\w+): \1 == ([0-9x]+)$/) || t.match(/^lambda (\w+): True if \1 == ([0-9x]+) else False$/);
  if (m) { return `tf:${num(m[2])}`; }
  m = t.match(/^lambda (\w+): (?:not \1|\1 == 0)$/);
  if (m) { return 'inv'; }
  return null;
}

/** Enum classes (`class X(t.enum8): name = 0x00`) of the whole quirk tree. */
function enumClasses(files) {
  const out = new Map();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const re = /^class (\w+)\((?:t\.)?(?:enum\d+|enum_factory\([^)]*\)|IntEnum|enum\.IntEnum)\):\s*\n((?:[ \t]+.*\n|\s*\n)+)/gm;
    let h;
    while ((h = re.exec(src)) !== null) {
      const map = {};
      for (const l of h[2].matchAll(/^[ \t]+(\w+)\s*=\s*(0x[0-9a-fA-F]+|\d+)\s*$/gm)) { map[String(num(l[2]))] = l[1].toLowerCase(); }
      if (Object.keys(map).length && !out.has(h[1])) { out.set(h[1], map); }
    }
  }
  return out;
}

/** linear token × 1/100 (ZCL centi-units → °C / %). */
function centi(tok) {
  const [k, a] = String(tok).split(':');
  const f = k === 'raw' ? 1 : k === 'div' ? 1 / Number(a) : k === 'mul' ? Number(a) : NaN;
  if (!Number.isFinite(f) || f <= 0) { return null; }
  const g = f / 100;
  return Math.abs(g - 1) < 1e-9 ? 'raw' : (g < 1 ? `div:${fmt(1 / g)}` : `mul:${fmt(g)}`);
}

/** One builder call → [dp, name, conv] | null */
function builderRow(method, a, enums) {
  const { pos, named } = kw(a);
  const dp = num(named.dp_id !== undefined ? named.dp_id : pos[0]);
  if (!Number.isInteger(dp) || dp < 0 || dp > 255) { return null; }
  const attr = str(named.attribute_name) || str(method === 'number' || method === 'sensor' || method === 'enum' ? '' : pos[1]) || null;
  const scaleTok = (def) => { const sc = named.scale !== undefined ? num(named.scale) : def; if (!(sc > 0)) { return null; } const f = sc / 100; return f === 1 ? 'raw' : (f < 1 ? `div:${fmt(1 / f)}` : `mul:${fmt(f)}`); };
  switch (method) {
  case 'temperature': return [dp, 'temperature', named.converter ? lambdaToken(named.converter) && null : scaleTok(100)];
  case 'humidity': return [dp, 'humidity', scaleTok(100)];
  case 'soil_moisture': return [dp, 'soil_moisture', scaleTok(100)];
  case 'battery': return [dp, 'battery', named.power_cfg ? null : 'raw'];
  case 'illuminance': return [dp, 'illuminance', named.converter ? lambdaToken(named.converter) : 'raw'];
  case 'contact': return [dp, 'contact', 'bool'];
  case 'gas': return [dp, 'gas', 'bool'];
  case 'smoke': return [dp, 'smoke', 'bool'];
  case 'vibration': return [dp, 'vibration', 'bool'];
  case 'co2': return [dp, 'co2', named.scale === undefined ? 'raw' : null];
  case 'voc': return [dp, 'voc', null];
  case 'pm25': return [dp, 'pm25', named.scale === undefined ? 'raw' : (num(named.scale) === 1 ? 'raw' : null)];
  case 'formaldehyde': return [dp, 'formaldehyd', null];
  case 'electrical_conductivity': return [dp, 'conductivity', named.scale === undefined ? 'raw' : null];
  case 'metering': return [dp, 'energy', null];
  case 'onoff': return [dp, 'state', 'bool'];
  case 'switch': return [dp, attr || 'switch', 'bool'];
  case 'binary_sensor': return [dp, attr || 'binary', named.converter ? lambdaToken(named.converter) : 'bool'];
  case 'number': {
    const mul = num(named.multiplier);
    return [dp, attr || `dp_${dp}`, mul && mul !== 1 ? `mul:${fmt(mul)}` : 'raw'];
  }
  case 'sensor': {
    if (named.converter) { return [dp, attr || `dp_${dp}`, lambdaToken(named.converter)]; }
    const d = num(named.divisor) || 1;
    const m = num(named.multiplier) || 1;
    const f = m / d;
    return [dp, attr || `dp_${dp}`, f === 1 ? 'raw' : (f < 1 ? `div:${fmt(1 / f)}` : `mul:${fmt(f)}`)];
  }
  case 'enum': {
    const cls = named.enum_class;
    const map = cls && enums.get(cls.trim());
    return [dp, attr || `dp_${dp}`, map ? `lookup:${JSON.stringify(map)}` : null];
  }
  case 'dp': case 'dp_attribute': case 'attribute': {
    const name = str(named.attribute_name) || str(method === 'dp' ? pos[2] : pos[1]);
    if (!name) { return null; }
    const lt = named.converter ? lambdaToken(named.converter) : 'raw';
    const ep = String(named.ep_attribute || (method === 'dp' ? pos[1] : '') || 'TuyaMCUCluster');
    // WHY: tuya_dp may target a ZCL cluster attribute; its value is then in ZCL units, not the DP's.
    if (/TuyaMCUCluster|tuya_manufacturer|TuyaLocalCluster/i.test(ep) && !/Thermostat|Temperature|Humidity|Occupancy|OnOff|Metering|Electrical|Power|Cover|Level/i.test(ep.replace(/TuyaMCUCluster/g, ''))) { return [dp, name, lt]; }
    const zclName = name === 'measured_value' ? (/Temperature/i.test(ep) ? 'temperature' : /Humidity/i.test(ep) ? 'humidity' : /Soil/i.test(ep) ? 'soil_moisture' : /Illuminance/i.test(ep) ? 'illuminance_zcl' : name) : name;
    if (/^(temperature|humidity|soil_moisture|local_temperature|occupied_heating_setpoint|unoccupied_heating_setpoint)$/.test(zclName)) {
      return [dp, zclName, lt ? centi(lt) : null];
    }
    if (/^(on_off|occupancy)$/.test(name)) { return [dp, name === 'on_off' ? 'state' : 'occupancy', named.converter ? (lt === 'bool' || lt === 'inv' || /^tf:/.test(lt || '') ? lt : null) : 'bool']; }
    return [dp, zclName, null];
  }
  default: return null;
  }
}

function harvestV2(src, m, enums, out) {
  const re = /\b(?:Tuya)?QuirkBuilder\s*\(/g;
  let h;
  let n = 0;
  while ((h = re.exec(m)) !== null) {
    const start = h.index;
    const reg = m.indexOf('.add_to_registry', start);
    if (reg < 0) { continue; }
    const chainM = m.slice(start, reg);
    const chain = src.slice(start, reg);
    const couples = [];
    const rows = [];
    const call = /(^|\.)\s*(?:(?:Tuya)?QuirkBuilder|applies_to|tuya_([a-z0-9_]+))\s*\(/g;
    let c;
    while ((c = call.exec(chainM)) !== null) {
      const open = c.index + c[0].length - 1;
      const close = closeOf(chainM, open);
      if (close < 0) { break; }
      const a = args(chain, chainM, open, close);
      if (!c[2]) {
        const { pos, named } = kw(a);
        const mfr = str(named.manufacturer || pos[0]);
        const pid = str(named.model || pos[1]);
        if (mfr && pid && mfr.length <= 40) { couples.push([mfr, pid]); }
      } else {
        const r = builderRow(c[2], a, enums);
        if (r) { rows.push(r); }
      }
      call.lastIndex = close + 1;
    }
    if (couples.length && rows.length) { n++; for (const [mfr, pid] of couples) { add(out, mfr, pid, rows); } }
    re.lastIndex = reg;
  }
  return n;
}

function add(out, mfr, pid, rows) {
  const key = `${mfr}|${String(pid).toUpperCase()}`;
  if (!out.has(key)) { out.set(key, new Map()); }
  const m = out.get(key);
  for (const [dp, name, conv] of rows) { if (!m.has(dp)) { m.set(dp, [dp, String(name).slice(0, 48), conv || null]); } }
}

/** v1: `dp_to_attribute = { N: DPToAttributeMapping(ep, "attr", converter=…) }` in cluster classes. */
function harvestV1(src, m, out) {
  const classes = [];
  for (const h of m.matchAll(/^class (\w+)\(([^)]*)\):/gm)) { classes.push({ name: h[1], bases: h[2].split(',').map((s) => s.trim().split('.').pop()), start: h.index }); }
  classes.forEach((c, i) => { c.end = i + 1 < classes.length ? classes[i + 1].start : m.length; });
  const dpOf = new Map();
  for (const c of classes) {
    const body = m.slice(c.start, c.end);
    const at = body.search(/dp_to_attribute\s*(?::[^=]*)?=\s*\{/);
    if (at < 0) { continue; }
    const open = c.start + body.indexOf('{', at);
    const close = closeOf(m, open);
    if (close < 0) { continue; }
    const rows = [];
    for (const a of args(src, m, open, close)) {
      const k = a.match(/^(\d{1,3})\s*:\s*DPToAttributeMapping\s*\(([\s\S]*)\)\s*$/);
      if (!k) { continue; }
      const am = pyMask(k[2]);
      const { pos, named } = kw(args(`(${k[2]})`, `(${am})`, 0, k[2].length + 1));
      const name = str(named.attribute_name || pos[1]);
      if (!name) { continue; }
      // WHY: v1 mappings write ZCL attributes (ZCL units) → name + DP id only, no scaling claimed.
      rows.push([Number(k[1]), name, null]);
    }
    if (rows.length) { dpOf.set(c.name, rows); }
  }
  const rowsFor = (name, depth = 0) => {
    if (dpOf.has(name)) { return dpOf.get(name); }
    const c = classes.find((x) => x.name === name);
    if (!c || depth > 3) { return null; }
    for (const b of c.bases) { const r = rowsFor(b, depth + 1); if (r) { return r; } }
    return null;
  };
  let n = 0;
  for (const c of classes) {
    const bodyM = m.slice(c.start, c.end);
    if (!/MODELS_INFO/.test(bodyM)) { continue; }
    const body = src.slice(c.start, c.end);
    const mi = bodyM.indexOf('MODELS_INFO');
    const open = bodyM.indexOf('[', mi);
    const close = open >= 0 ? closeOf(bodyM, open) : -1;
    if (close < 0) { continue; }
    const couples = [...body.slice(open, close).matchAll(/\(\s*["']([^"']{1,40})["']\s*,\s*["']([^"']{1,20})["']\s*\)/g)].map((x) => [x[1], x[2]]);
    const repl = bodyM.indexOf('replacement');
    const refs = new Set([...src.slice(c.start + (repl >= 0 ? repl : 0), c.end).matchAll(/\b([A-Z]\w+)\b/g)].map((x) => x[1]));
    const rows = [];
    for (const r of refs) { const x = rowsFor(r); if (x) { rows.push(...x); } }
    if (couples.length && rows.length) { n++; for (const [mfr, pid] of couples) { add(out, mfr, pid, rows); } }
  }
  return n;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p, acc); } else if (e.name.endsWith('.py')) { acc.push(p); }
  }
  return acc;
}

function harvest(zhaDir) {
  const qdir = path.join(zhaDir, 'zhaquirks');
  const files = walk(qdir).sort();
  const enums = enumClasses(files);
  const out = new Map();
  let v2 = 0;
  let v1 = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    if (!/tuya|Tuya/.test(src)) { continue; }
    const m = pyMask(src);
    v2 += harvestV2(src, m, enums, out);
    v1 += harvestV1(src, m, out);
  }
  const couples = {};
  for (const k of [...out.keys()].sort()) { couples[k] = [...out.get(k).values()].sort((a, b) => a[0] - b[0]); }
  return { couples, stats: { v2, v1, couples: Object.keys(couples).length, rows: Object.values(couples).reduce((a, r) => a + r.length, 0) } };
}

if (require.main === module) {
  const ai = process.argv.indexOf('--src');
  const dir = ai > 0 ? process.argv[ai + 1] : path.join(process.env.KB_DIR || '/workspace/kb', 'zha');
  if (!fs.existsSync(path.join(dir, 'zhaquirks'))) { console.error(`harvest-zha-quirk-dps: no zha-device-handlers mirror at ${dir}`); process.exit(0); }
  let commit = null;
  try { commit = cp.execSync('git rev-parse HEAD', { cwd: dir }).toString().trim(); } catch (_e) { /* not a git mirror */ }
  const { couples, stats } = harvest(dir);
  const next = `${JSON.stringify({ v: 1, commit, src: 'zigpy/zha-device-handlers zhaquirks (Apache-2.0) — per-quirk couples, DP ids, attribute names, scalings (facts only)', couples })}\n`;
  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (prev !== next) { fs.writeFileSync(OUT, next); }
  console.log(`harvest-zha-quirk-dps: v2 chains=${stats.v2} v1 quirks=${stats.v1} couples=${stats.couples} rows=${stats.rows}${prev === next ? ' (unchanged)' : ''}`);
}

module.exports = { pyMask, lambdaToken, builderRow, harvest };
