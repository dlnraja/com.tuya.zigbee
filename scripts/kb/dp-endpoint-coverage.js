#!/usr/bin/env node
'use strict';

/**
 * P3018: DP + endpoint coverage per driver and per exact mfr+pid couple.
 *
 * Crosses (repo files only → deterministic in CI):
 *  - what each driver handles: dpMappings keys (device.js + up to 3 local superclasses) and
 *    DPs named in its hand-written DP handler (`switch (dp) { case N: }`, `dp === N`);
 *  - what sources know: lib/zigbee/data/unknown-dp-catalog.json (Z2M tuyaDatapoints names +
 *    converters, project research) and scripts/data/zha-tuya-dps.json (ZHA quirk DP numbers);
 *  - interviewed endpoints (docs/data/interviews/*.json) against driver.compose.json endpoints,
 *    capabilities, and the runtime EndpointCoverage routes.
 *
 * Every source DP of a couple is classified:
 *   driver  — the driver decodes it itself;
 *   exact   — catalogue converter → exact decode at runtime (UnknownCommandInterpreter step 1b,
 *             and on master DpCatalogDecoder writes it to an existing measurement/alarm capability);
 *   generic — no exact converter (name-only or ZHA number-only) → generic typed value
 *             (bool/value/enum/raw/bitmap), learned, exposed to Flows, kept in store. Never dropped.
 *
 * Usage: node scripts/kb/dp-endpoint-coverage.js            → writes docs/knowledge/KB/DP_ENDPOINT_COVERAGE.md
 *        node scripts/kb/dp-endpoint-coverage.js --check    → CI gate (report-only, except duplicate
 *                                                             numeric keys in one object literal = fail)
 *        node scripts/kb/dp-endpoint-coverage.js --json     → summary JSON on stdout
 */

const fs = require('fs');
const path = require('path');
const { mask, matchBracket, splitTop } = require('../data/harvest-z2m-tuya-dps');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'knowledge', 'KB', 'DP_ENDPOINT_COVERAGE.md');

const ROUTE_CLUSTERS = Object.freeze({ 6: ['onOff', 'onoff'], 1026: ['temperatureMeasurement', 'measure_temperature'], 1029: ['relativeHumidity', 'measure_humidity'], 1024: ['illuminanceMeasurement', 'measure_luminance'], 1030: ['occupancySensing', 'alarm_motion'] });
// infrastructure clusters: inventoried, nothing to route (basic, power cfg, identify, groups, scenes,
// OTA, time, poll control, green power, diagnostics, touchlink, Tuya EF00/E000/E001, ...)
const INFRA = new Set([0, 1, 2, 3, 4, 5, 7, 9, 10, 25, 32, 33, 2821, 4096, 61184, 57344, 57345, 0xe002, 0xed00, 0xfc11, 0xfc57, 0xfcc0]);

function readJson(p, dflt = null) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { return dflt; } }

/** Numeric keys of every `dpMappings` object literal in a file. Returns { dps:Set, dups:[{dp,line}] } */
function dpMappingKeys(src) {
  const m = mask(src);
  const dps = new Set();
  const dups = [];
  const re = /dpMappings\s*(?:\(\)\s*\{[^{}]*?return\s*|=\s*|:\s*)\{/g;
  let hit;
  while ((hit = re.exec(m)) !== null) {
    const open = hit.index + hit[0].length - 1;
    const close = matchBracket(m, open);
    if (close < 0) { continue; }
    const seen = new Set();
    for (const [a, b] of splitTop(m, open, close)) {
      const t = src.slice(a, b);
      const k = t.match(/^\s*['"]?(\d{1,3})['"]?\s*:/);
      if (!k) { continue; }
      const dp = Number(k[1]);
      if (seen.has(dp)) { dups.push({ dp, line: src.slice(0, a).split('\n').length + 1 }); }
      seen.add(dp);
      dps.add(dp);
    }
  }
  return { dps, dups };
}

/** DPs named by a hand-written handler: `switch (dp…) { case N: }` blocks and `dp === N` tests. */
function handlerDps(src) {
  const m = mask(src);
  const out = new Set();
  const sw = /switch\s*\(\s*(?:Number\(\s*)?(?:dp|dpId|dpid|datapoint|dpNumber|id)\b[^)]*\)\s*\{/g;
  let hit;
  while ((hit = sw.exec(m)) !== null) {
    const open = hit.index + hit[0].length - 1;
    const close = matchBracket(m, open);
    if (close < 0) { continue; }
    for (const c of m.slice(open, close).matchAll(/case\s+(\d{1,3})\s*:/g)) { out.add(Number(c[1])); }
  }
  for (const c of m.matchAll(/\b(?:dp|dpId|dpid|dpNumber)\s*===?\s*(\d{1,3})\b/g)) { out.add(Number(c[1])); }
  for (const c of m.matchAll(/\b(\d{1,3})\s*===?\s*(?:dp|dpId|dpid|dpNumber)\b/g)) { out.add(Number(c[1])); }
  return out;
}

/** Local superclass chain (max 3) of a device.js. */
function superFiles(file, depth = 0) {
  if (depth > 3 || !fs.existsSync(file)) { return []; }
  const src = fs.readFileSync(file, 'utf8');
  const ext = src.match(/class\s+\w+\s+extends\s+(?:\w+\(\s*)*(\w+)/);
  if (!ext) { return []; }
  const id = ext[1];
  const req = src.match(new RegExp(`(?:const|let|var)\\s+(?:\\{[^}]*\\b${id}\\b[^}]*\\}|${id})\\s*=\\s*require\\(\\s*['"](\\.[^'"]+)['"]\\s*\\)`));
  if (!req) { return []; }
  let p = path.resolve(path.dirname(file), req[1]);
  if (!p.endsWith('.js')) { p = fs.existsSync(`${p}.js`) ? `${p}.js` : path.join(p, 'index.js'); }
  if (!fs.existsSync(p) || !p.startsWith(ROOT)) { return []; }
  return [p, ...superFiles(p, depth + 1)];
}

function driverInfo(dir) {
  const compose = readJson(path.join(dir, 'driver.compose.json'), {});
  const z = compose.zigbee || {};
  const arr = (v) => (Array.isArray(v) ? v : (v ? [v] : []));
  const dev = path.join(dir, 'device.js');
  const files = fs.existsSync(dev) ? [dev, ...superFiles(dev)] : [];
  const mapped = new Set();
  const handled = new Set();
  const dups = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const r = dpMappingKeys(src);
    r.dps.forEach((d) => mapped.add(d));
    if (f === dev) { r.dups.forEach((d) => dups.push(Object.assign({ file: path.relative(ROOT, f) }, d))); }
    handlerDps(src).forEach((d) => handled.add(d));
  }
  return {
    id: path.basename(dir),
    mfrs: arr(z.manufacturerName).map(String),
    pids: arr(z.productId).map((p) => String(p).toUpperCase()),
    eps: Object.keys(z.endpoints || {}).map(Number).filter(Number.isInteger).sort((a, b) => a - b),
    caps: arr(compose.capabilities).map(String),
    mapped,
    handled,
    dups,
  };
}

/** Duplicate numeric keys inside one object literal (all drivers/*\/device.js + lib/**). acorn when present. */
function duplicateKeys() {
  let acorn = null;
  try { acorn = require('acorn'); } catch (_e) { return { skipped: true, hits: [] }; }
  const files = [];
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) { const f = path.join(ROOT, 'drivers', d, 'device.js'); if (fs.existsSync(f)) { files.push(f); } }
  (function rec(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { rec(p); } else if (p.endsWith('.js')) { files.push(p); } } }(path.join(ROOT, 'lib')));
  const hits = [];
  const walk = (n, cb) => {
    if (!n || typeof n.type !== 'string') { return; }
    cb(n);
    for (const k of Object.keys(n)) {
      if (k === 'loc') { continue; }
      const v = n[k];
      if (Array.isArray(v)) { for (const x of v) { if (x && typeof x.type === 'string') { walk(x, cb); } } } else if (v && typeof v.type === 'string') { walk(v, cb); }
    }
  };
  for (const f of files.sort()) {
    let ast;
    try { ast = acorn.parse(fs.readFileSync(f, 'utf8'), { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true, allowReturnOutsideFunction: true }); } catch (_e) { continue; }
    walk(ast, (n) => {
      if (n.type !== 'ObjectExpression') { return; }
      const keys = {};
      for (const p of n.properties) {
        if (p.type !== 'Property' || p.computed) { continue; }
        const k = p.key.type === 'Literal' ? p.key.value : p.key.name;
        if (!/^\d+$/.test(String(k))) { continue; }
        (keys[k] = keys[k] || []).push(p.loc.start.line);
      }
      for (const [k, l] of Object.entries(keys)) { if (l.length > 1) { hits.push({ file: path.relative(ROOT, f), key: Number(k), lines: l }); } }
    });
  }
  return { skipped: false, hits };
}

function audit() {
  const D = require('../../lib/zigbee/DpCatalogDecoder');
  const cat = readJson(path.join(ROOT, 'lib', 'zigbee', 'data', 'unknown-dp-catalog.json'), { idx: {} });
  const zha = (readJson(path.join(ROOT, 'scripts', 'data', 'zha-tuya-dps.json'), { couples: {} }) || { couples: {} }).couples;
  // WHY(P3018b): the KB index unions DPs per quirk FILE; the per-quirk harvest (zha-quirk-dps.json,
  // already merged into the catalogue) is exact per couple → the file-level numbers only count for
  // couples the per-quirk harvest does not cover (labelled `zha`).
  const zq = (readJson(path.join(ROOT, 'scripts', 'data', 'zha-quirk-dps.json'), { couples: {} }) || { couples: {} }).couples;
  const precise = new Set(Object.keys(zq).map((k) => { const [m, p] = k.split('|'); return `${m.toLowerCase()}|${p.toUpperCase()}`; }));
  const zhaLc = new Map(Object.entries(zha).map(([k, v]) => { const [m, p] = k.split('|'); return [`${m.toLowerCase()}|${p.toUpperCase()}`, v]; }).filter(([k]) => !precise.has(k)));
  const drivers = fs.readdirSync(path.join(ROOT, 'drivers')).filter((d) => fs.existsSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'))).sort().map((d) => driverInfo(path.join(ROOT, 'drivers', d)));

  const byMfr = new Map(); // lc mfr -> [driver]
  for (const d of drivers) { for (const m of d.mfrs) { const k = m.toLowerCase(); if (!byMfr.has(k)) { byMfr.set(k, []); } if (!byMfr.get(k).includes(d)) { byMfr.get(k).push(d); } } } // WHY: caseless variants of one mfr in one compose = one driver

  const couples = [];
  const totals = { couples: 0, dps: 0, driver: 0, exact: 0, generic: 0, catalogApply: 0 };
  const known = new Set([...Object.keys(cat.idx || {}), ...zhaLc.keys()]);
  for (const key of [...known].sort()) {
    const [mfr, pid] = key.split('|');
    const ds = (byMfr.get(mfr) || []).filter((d) => d.pids.includes(pid));
    if (!ds.length) { continue; }
    for (const d of ds) {
      const rows = new Map();
      for (const e of D.coupleDps(mfr, pid)) { rows.set(e.dp, { name: e.name, conv: e.conv }); }
      for (const dp of zhaLc.get(key) || []) { if (!rows.has(dp)) { rows.set(dp, { name: null, conv: null, zha: true }); } }
      const c = { driver: d.id, mfr, pid, driverDps: [], exact: [], generic: [], apply: [] };
      for (const [dp, r] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
        totals.dps++;
        if (d.mapped.has(dp) || d.handled.has(dp)) { c.driverDps.push(dp); totals.driver++; continue; }
        const decodable = r.conv && D.decode(r.conv, /^(tf|onOff|bool|inv)\b/.test(r.conv) ? 1 : 0) !== null || (r.conv && /^lookup:/.test(r.conv));
        if (decodable) {
          c.exact.push(`${dp}:${r.name}`);
          totals.exact++;
          const cap = D.NAME_CAP[r.name] || (/^(measure_(?!battery)|alarm_(?!battery)|meter_)/.test(r.name || '') ? r.name : null);
          if (cap && d.caps.includes(cap)) { c.apply.push(`${dp}→${cap}`); totals.catalogApply++; }
        } else {
          c.generic.push(r.name ? `${dp}:${r.name}` : `${dp}:zha`);
          totals.generic++;
        }
      }
      totals.couples++;
      couples.push(c);
    }
  }

  // endpoints
  const interviews = [];
  const idir = path.join(ROOT, 'docs', 'data', 'interviews');
  const epTotals = { couples: 0, endpoints: 0, declared: 0, routed: 0, listened: 0, infra: 0, gp: 0, gaps: 0, noDriver: 0 };
  for (const f of (fs.existsSync(idir) ? fs.readdirSync(idir) : []).filter((x) => x.endsWith('.json')).sort()) {
    const j = readJson(path.join(idir, f));
    if (!j || !j.manufacturerName || !j.productId || !j.endpoints) { continue; }
    const mfr = String(j.manufacturerName).toLowerCase();
    const pid = String(j.productId).toUpperCase();
    const ds = (byMfr.get(mfr) || []).filter((d) => d.pids.includes(pid));
    epTotals.couples++;
    if (!ds.length) { epTotals.noDriver++; interviews.push({ mfr: j.manufacturerName, pid, driver: null, eps: [] }); continue; }
    for (const d of ds) {
      const row = { mfr: j.manufacturerName, pid, driver: d.id, eps: [] };
      const ids = Object.keys(j.endpoints).map(Number).filter(Number.isInteger).sort((a, b) => a - b);
      const main = Math.min(...ids.filter((x) => x !== 242));
      for (const ep of ids) {
        epTotals.endpoints++;
        const inC = (j.endpoints[ep].inputClusters || []).map(Number);
        if (ep === 242) { epTotals.gp++; row.eps.push({ ep, status: 'green-power (ignored)' }); continue; }
        const declared = d.eps.includes(ep);
        if (declared) { epTotals.declared++; }
        const routes = inC.filter((c) => ROUTE_CLUSTERS[c]).map((c) => {
          const [cl, cap] = ROUTE_CLUSTERS[c];
          const cands = ep === main ? [cap] : [`${cap}.gang${ep}`, `${cap}.${ep}`, `${cap}.channel${ep}`, `${cap}.socket${ep}`];
          const hit = cands.find((x) => d.caps.includes(x));
          return hit ? `${cl}→${hit}` : `${cl}→(exposed)`;
        });
        const functional = inC.filter((c) => !INFRA.has(c) && !ROUTE_CLUSTERS[c]);
        let status;
        if (routes.some((r) => !r.endsWith('(exposed)'))) { status = 'routed'; epTotals.routed++; } else if (routes.length) { status = 'listened+exposed'; epTotals.listened++; } else if (!functional.length) { status = 'infra-only'; epTotals.infra++; } else { status = declared ? 'declared' : 'inventoried'; }
        let gap = null;
        if (functional.length && !declared && status !== 'routed') { gap = `clusters ${functional.map((c) => `0x${c.toString(16).padStart(4, '0')}`).join(',')} not declared in compose and not routable passively`; epTotals.gaps++; }
        row.eps.push({ ep, status, declared, routes, gap });
      }
      interviews.push(row);
    }
  }

  return { totals, couples, epTotals, interviews, dups: duplicateKeys(), driverDups: drivers.flatMap((d) => d.dups) };
}

function perDriver(couples) {
  const m = new Map();
  for (const c of couples) {
    if (!m.has(c.driver)) { m.set(c.driver, { driver: c.driver, couples: 0, driverDps: 0, exact: 0, generic: 0, apply: 0 }); }
    const r = m.get(c.driver);
    r.couples++; r.driverDps += c.driverDps.length; r.exact += c.exact.length; r.generic += c.generic.length; r.apply += c.apply.length;
  }
  return [...m.values()].sort((x, y) => (x.driver < y.driver ? -1 : 1));
}

function render(a) {
  const t = a.totals;
  const e = a.epTotals;
  const L = [
    '# DP + endpoint coverage (P3018)',
    '',
    'Generated by `scripts/kb/dp-endpoint-coverage.js`. Sources: `lib/zigbee/data/unknown-dp-catalog.json` (Z2M tuyaDatapoints names + converters, then fill-ins from ZHA per-quirk builders `scripts/data/zha-quirk-dps.json` and deCONZ DDF `scripts/data/deconz-tuya-dps.json` — fill-only, never replacing a Z2M converter — and project research), `scripts/data/zha-tuya-dps.json` (ZHA DP numbers per quirk file, only for couples the per-quirk harvest does not cover), `docs/data/interviews/*.json`, every `drivers/*/driver.compose.json` + `device.js` (and local superclasses).',
    '',
    '## DPs per exact couple',
    '',
    `Couples audited (known to a source AND served by a driver): **${t.couples}** — source DPs: **${t.dps}**.`,
    '',
    '| class | DPs | runtime behaviour |',
    '|---|---|---|',
    `| driver | ${t.driver} | decoded by the driver (dpMappings or its DP handler) |`,
    `| exact | ${t.exact} | catalogue converter → exact value (UnknownCommandInterpreter 1b); master also writes ${t.catalogApply} of them to an existing measurement/alarm capability via DpCatalogDecoder (guarded: driver-owned caps / DPs, range, one DP per capability) |`,
    `| generic | ${t.generic} | no exact converter in any source → generic typed value (bool/value/enum/raw/bitmap), learned, exposed to Flows, stored as \`_unknown_dp_N\` — never dropped |`,
    '',
    '### Per driver',
    '',
    '| driver | couples | driver DPs | exact | generic | master auto-apply |',
    '|---|---|---|---|---|---|',
    ...perDriver(a.couples).map((r) => `| ${r.driver} | ${r.couples} | ${r.driverDps} | ${r.exact} | ${r.generic} | ${r.apply} |`),
    '',
    '### Generic-fallback DPs per couple (gaps: no exact converter in any source)',
    '',
    'Reason for each: the only sources are a name without converter (Z2M custom / unknown semantics, ZHA v1 ZCL-mapped, deCONZ script) or a ZHA quirk-file DP number (`:zha`). They are decoded as typed generic values until a source documents the scaling.',
    '',
    '| driver | couple | generic DPs |',
    '|---|---|---|',
    ...a.couples.filter((c) => c.generic.length).map((c) => `| ${c.driver} | \`${c.mfr}\` ${c.pid} | ${c.generic.join(' ')} |`),
    '',
    '## Endpoints (interviews × compose × runtime)',
    '',
    `Interviews: **${e.couples}** couples (${e.noDriver} without a driver), **${e.endpoints}** endpoints: ${e.declared} declared in compose, ${e.routed} routed to a capability, ${e.listened} listened + exposed (no matching capability), ${e.infra} infrastructure-only, ${e.gp} green power (EP 242, ignored). Gaps: **${e.gaps}**.`,
    '',
    'Runtime (master, `lib/zigbee/EndpointCoverage.js`): every endpoint is inventoried (store `endpoint_inventory`); onOff / temperature / humidity / illuminance / occupancy reports on an endpoint with no listener are routed to the SAME endpoint\'s capability (`cap` on the main EP, `cap.gangN|cap.N|cap.channelN|cap.socketN` on EP N) or recorded in UnknownCommandSink (learned + Flow `tuya_cluster_received`). No writes, no binds, no reads (zero TX). Writes stay per-endpoint (no cross-gang); alternate-endpoint reads remain a MethodChain fallback.',
    '',
    '| couple | driver | endpoint | status | routes | gap |',
    '|---|---|---|---|---|---|',
    ...a.interviews.filter((r) => r.driver && r.eps.some((x) => x.ep !== 1 || x.gap)).flatMap((r) => r.eps.filter((x) => x.ep !== 1 || x.gap).map((x) => `| \`${r.mfr}\` ${r.pid} | ${r.driver} | ${x.ep} | ${x.status} | ${(x.routes || []).join(' ') || '—'} | ${x.gap || '—'} |`)),
    '',
    '## Gate',
    '',
    `\`--check\` (CI, report-only): fails only on duplicate numeric keys inside one object literal (drivers + lib). Current: ${a.dups.skipped ? 'skipped (acorn missing)' : a.dups.hits.length}.`,
    '',
  ];
  return L.join('\n');
}

if (require.main === module) {
  const a = audit();
  const summary = { totals: a.totals, endpoints: a.epTotals, duplicateKeys: a.dups.hits, dpMappingsDuplicates: a.driverDups };
  if (process.argv.includes('--json')) { console.log(JSON.stringify(summary, null, 2)); process.exit(0); }
  if (process.argv.includes('--check')) {
    console.log(`[dp-endpoint-coverage] couples=${a.totals.couples} dps=${a.totals.dps} driver=${a.totals.driver} exact=${a.totals.exact} generic=${a.totals.generic} | endpoints=${a.epTotals.endpoints} gaps=${a.epTotals.gaps} (report-only)`);
    const bad = a.dups.hits.concat(a.driverDups.map((d) => ({ file: d.file, key: d.dp, lines: [d.line] })));
    if (bad.length) { for (const b of bad) { console.error(`❌ duplicate numeric key ${b.key} in ${b.file}:${b.lines.join(',')}`); } process.exit(1); }
    console.log('✅ no duplicate DP / numeric keys');
    process.exit(0);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, render(a));
  console.log(`DP_ENDPOINT_COVERAGE.md: ${JSON.stringify(a.totals)} endpoints=${JSON.stringify(a.epTotals)}`);
}

module.exports = { perDriver, dpMappingKeys, handlerDps, superFiles, driverInfo, duplicateKeys, audit, render };
