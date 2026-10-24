#!/usr/bin/env node
'use strict';

/**
 * P3018b: deCONZ DDF harvest (dresden-elektronik/deconz-rest-plugin devices/**.json, BSD-3-Clause —
 * facts only: manufacturername/modelid couples, Tuya `dpid`, item name, value scaling).
 *
 * Output: scripts/data/deconz-tuya-dps.json  { v, commit, src, couples: { 'mfr|PID': [[dp, name, conv|null]] } }
 * Units: deCONZ stores temperature/humidity/heat setpoint in 0.01 units, current in mA, consumption
 * in Wh → the token is converted to °C / % / A / kWh. Expressions that depend on another item
 * (offset), strings or bit tricks are recorded name-only (conv null).
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'scripts', 'data', 'deconz-tuya-dps.json');

// deCONZ item → [catalogue name, unit factor to the Homey unit]
const ITEM = {
  'state/temperature': ['temperature', 0.01], 'state/humidity': ['humidity', 0.01], 'config/heatsetpoint': ['current_heating_setpoint', 0.01],
  'state/lux': ['illuminance', 1], 'state/power': ['power', 1], 'state/voltage': ['voltage', 1], 'state/current': ['current', 0.001],
  'state/consumption': ['energy', 0.001], 'config/battery': ['battery', 1], 'state/battery': ['battery', 1], 'state/valve': ['valve_position', 1],
  'state/on': ['state', 'bool'], 'state/presence': ['presence', 'bool'], 'state/lowbattery': ['battery_low', 'bool'], 'state/fire': ['smoke', 'bool'],
  'state/water': ['water_leak', 'bool'], 'state/tampered': ['tamper', 'bool'], 'state/vibration': ['vibration', 'bool'], 'state/carbonmonoxide': ['carbon_monoxide', 'bool'],
  // WHY: deCONZ `open` is true when open; the catalogue `contact` means closed → keep a distinct name.
  'state/open': ['door_open', 'bool'], 'state/test': ['self_test', 'bool'], 'config/locked': ['child_lock', 'bool'], 'state/windowopen': ['window_open', 'bool'],
};

const fmt = (n) => String(Math.round(n * 1e6) / 1e6);
function linear(f) { if (!Number.isFinite(f) || f <= 0) { return null; } return Math.abs(f - 1) < 1e-9 ? 'raw' : (f < 1 ? `div:${fmt(1 / f)}` : `mul:${fmt(f)}`); }

/** eval string → { f } linear factor | { tok } | null */
function evalToken(ev) {
  if (!ev) { return { f: 1 }; }
  const t = String(ev).replace(/\s+/g, ' ').replace(/;\s*$/, '').trim();
  if (/R\.item|String\(|ZclFrame|Math\.|\.js$/.test(t)) { return null; }
  let m = t.match(/^Item\.val = Attr\.val$/);
  if (m) { return { f: 1 }; }
  m = t.match(/^Item\.val = \(?Attr\.val \/ ([0-9.]+)\)?$/);
  if (m) { return { f: 1 / Number(m[1]) }; }
  m = t.match(/^Item\.val = \(?(?:Attr\.val \* ([0-9.]+)|\(?([0-9.]+) \* Attr\.val\)?)\)?$/);
  if (m) { return { f: Number(m[1] || m[2]) }; }
  m = t.match(/^Item\.val = \(?Attr\.val == (\d+)(?: \? true : false)?\)?$/);
  if (m) { return { tok: `tf:${m[1]}` }; }
  m = t.match(/^Item\.val = \(?Attr\.val (?:== 0 \? false : true|!= 0)\)?$/);
  if (m) { return { tok: 'bool' }; }
  // if (Attr.val == 0) { Item.val = 'a' } else if (Attr.val == 1) { Item.val = 'b' } else { Item.val = 'c' }
  if (/^if \(Attr\.val == \d+\)/.test(t)) {
    const map = {};
    let max = -1;
    for (const x of t.matchAll(/Attr\.val == (\d+)\) ?\{ ?Item\.val ?= ?'?([^'};]+)'?;? ?\}/g)) { map[x[1]] = x[2].trim(); max = Math.max(max, Number(x[1])); }
    const els = t.match(/else ?\{ ?Item\.val ?= ?'?([^'};]+)'?;? ?\}$/);
    if (els && max >= 0) { map[String(max + 1)] = els[1].trim(); } // WHY: only the next value is certain for the trailing else
    return Object.keys(map).length ? { tok: `lookup:${JSON.stringify(map)}` } : null;
  }
  return null;
}

function rowFor(item, parse) {
  const dp = Number(parse.dpid);
  if (!Number.isInteger(dp) || dp < 0 || dp > 255) { return null; }
  const def = ITEM[item];
  const name = def ? def[0] : item.replace(/^(state|config)\//, '').replace(/\//g, '_');
  const e = evalToken(parse.eval || (parse.script ? 'script.js' : null));
  if (!e) { return [dp, name, null]; }
  if (def && def[1] === 'bool') { return [dp, name, e.tok || (e.f === 1 ? 'bool' : null)]; }
  if (e.tok) { return [dp, name, /^lookup:/.test(e.tok) || !def ? e.tok : null]; }
  return [dp, name, linear(e.f * (def ? def[1] : 1))];
}

function harvest(dir) {
  const out = {};
  const files = [];
  (function rec(d) { for (const x of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, x.name); if (x.isDirectory()) { rec(p); } else if (x.name.endsWith('.json')) { files.push(p); } } }(path.join(dir, 'devices')));
  for (const f of files.sort()) {
    let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_e) { continue; }
    const rows = new Map();
    for (const s of j.subdevices || []) {
      for (const it of s.items || []) {
        const p = it.parse;
        if (p && typeof p === 'object' && p.fn === 'tuya' && p.dpid !== undefined) { const r = rowFor(it.name, p); if (r && !rows.has(r[0])) { rows.set(r[0], r); } }
      }
    }
    if (!rows.size) { continue; }
    const mf = [].concat(j.manufacturername || []);
    const md = [].concat(j.modelid || []);
    // WHY: DDF arrays are index-aligned (mfr[i] ↔ model[i]); a single model applies to all.
    mf.forEach((m, i) => {
      const pid = md.length === mf.length ? md[i] : (md.length === 1 ? md[0] : null);
      if (!m || !pid || String(m).startsWith('$')) { return; }
      const key = `${m}|${String(pid).toUpperCase()}`;
      const prev = new Map((out[key] || []).map((r) => [r[0], r]));
      for (const [dp, r] of rows) { if (!prev.has(dp)) { prev.set(dp, r); } }
      out[key] = [...prev.values()].sort((a, b) => a[0] - b[0]);
    });
  }
  const sorted = {};
  for (const k of Object.keys(out).sort()) { sorted[k] = out[k]; }
  return sorted;
}

if (require.main === module) {
  const ai = process.argv.indexOf('--src');
  const dir = ai > 0 ? process.argv[ai + 1] : path.join(process.env.KB_DIR || '/workspace/kb', 'deconz');
  if (!fs.existsSync(path.join(dir, 'devices'))) { console.error(`harvest-deconz-tuya-dps: no deconz-rest-plugin mirror at ${dir}`); process.exit(0); }
  let commit = null;
  try { commit = cp.execSync('git rev-parse HEAD', { cwd: dir }).toString().trim(); } catch (_e) { /* not a git mirror */ }
  const couples = harvest(dir);
  const next = `${JSON.stringify({ v: 1, commit, src: 'dresden-elektronik/deconz-rest-plugin devices/*.json DDF (BSD-3-Clause) — Tuya dpid + item + scaling (facts only)', couples })}\n`;
  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (prev !== next) { fs.writeFileSync(OUT, next); }
  const rows = Object.values(couples).reduce((a, r) => a + r.length, 0);
  console.log(`harvest-deconz-tuya-dps: couples=${Object.keys(couples).length} rows=${rows}${prev === next ? ' (unchanged)' : ''}`);
}

module.exports = { evalToken, rowFor, harvest };
