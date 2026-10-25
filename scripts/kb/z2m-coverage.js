#!/usr/bin/env node
'use strict';
/**
 * P3039: multi-source Tuya Zigbee coverage matrix (Zigbee2MQTT first, then ZHA, deCONZ, Johan, Blakadder,
 * Hubitat/kkossev, SmartThings Edge, ioBroker, Domoticz, Tasmota). One adapter per project lives in
 * scripts/kb/coverage-sources.js; this file compares every exact upstream couple (manufacturerName+productId)
 * with our three release branches, both in the source manifest (app.json) and in the rebuilt published
 * payload (same compaction as the publish workflows: scripts/maintenance/compact-zigbee-identifiers.cjs).
 *
 * Status per couple and branch (first match wins):
 *   absent      no driver lists the couple (caseless, like our runtime)
 *   compacted   listed in app.json but the exact upstream byte form is not in the rebuilt payload
 *   wrong_class the matching driver's Homey class cannot represent what the upstream device is (Z2M exposes)
 *   partial     upstream DPs missing from the shipped DP catalogue, or exposes without a matching capability
 *   complete    everything above is satisfied (for sources without exposes/DPs: present in the payload)
 *
 * Usage:
 *   node scripts/kb/z2m-coverage.js [--kb <dir>] [--zhc-pkg <dir>] [--root master=<dir> --root stable-v5=<dir> ...]
 *                                    [--sources z2m,zha] [--out-json data/kb/z2m-coverage.json] [--out-md docs/knowledge/Z2M_COVERAGE.md]
 * Without --root the current checkout is used for its own branch and `git worktree add` (detached, temp) for the others.
 * Deterministic for the same inputs: sorted keys, no timestamps besides upstream commit dates.
 * Facts only; no upstream code is copied (see CREDITS.md, docs/knowledge/KB_SOURCES.md).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const { ADAPTERS, WIFI_LEADS, isTuya } = require('./coverage-sources');

const ROOT = path.join(__dirname, '..', '..');
const BRANCHES = ['master', 'stable-v5', 'bastien-home'];
const STATUSES = ['absent', 'compacted', 'wrong_class', 'partial', 'complete'];

/* ------------------------------------------------------------------ expose → Homey capability / class */
// WHY: only standard Homey capabilities; a custom capability on our side never counts as "missing".
const EXPOSE_CAP = {
  temperature: 'measure_temperature', local_temperature: 'measure_temperature', humidity: 'measure_humidity',
  battery: 'measure_battery', battery_low: 'alarm_battery', illuminance: 'measure_luminance', illuminance_lux: 'measure_luminance',
  occupancy: 'alarm_motion', presence: 'alarm_motion', contact: 'alarm_contact', water_leak: 'alarm_water', smoke: 'alarm_smoke',
  carbon_monoxide: 'alarm_co', gas: 'alarm_gas', tamper: 'alarm_tamper', co2: 'measure_co2', pm25: 'measure_pm25',
  power: 'measure_power', energy: 'meter_power', voltage: 'measure_voltage', current: 'measure_current',
  pressure: 'measure_pressure', state: 'onoff', brightness: 'dim', color_temp: 'light_temperature', color_xy: 'light_hue', color_hs: 'light_hue',
  position: 'windowcoverings_set', current_heating_setpoint: 'target_temperature', occupied_heating_setpoint: 'target_temperature',
  lock: 'locked', noise: 'measure_noise', formaldehyd: 'measure_formaldehyde', voc: 'measure_voc',
};
const CLASS_RULES = [
  // [expose that defines the device, acceptable Homey classes]
  ['lock', ['lock']],
  ['climate', ['thermostat', 'heater', 'airconditioning', 'radiator', 'other']],
  ['cover', ['windowcoverings', 'curtain', 'blinds', 'sunshade', 'awning', 'garagedoor', 'other']],
  ['fan', ['fan', 'airpurifier', 'heater', 'humidifier', 'dehumidifier', 'other']],
  ['light', ['light', 'other', 'socket']],
];
const SENSOR_ONLY_BAD = new Set(['socket', 'light', 'windowcoverings', 'curtain', 'thermostat', 'lock', 'fan']);
const SENSOR_EXPOSES = new Set(['temperature', 'humidity', 'occupancy', 'presence', 'contact', 'water_leak', 'smoke', 'carbon_monoxide', 'gas', 'co2', 'pm25', 'illuminance', 'vibration', 'soil_moisture', 'voc', 'formaldehyd']);
const ACTUATOR_EXPOSES = new Set(['state', 'switch', 'light', 'cover', 'climate', 'lock', 'fan', 'brightness', 'position', 'valve']);

function expectedClasses(exposes) {
  const ex = new Set(exposes || []);
  const actuator = [...ex].some((e) => ACTUATOR_EXPOSES.has(e));
  const sensor = [...ex].some((e) => SENSOR_EXPOSES.has(e));
  for (const [k, cls] of CLASS_RULES) {
    // WHY: a motion sensor with a night light is still a sensor first; accept both classes.
    if (ex.has(k)) { return { reason: k, ok: new Set(k === 'light' && sensor ? [...cls, 'sensor'] : cls) }; }
  }
  if (sensor && !actuator) { return { reason: 'sensor', bad: SENSOR_ONLY_BAD }; }
  return null;
}

function classOk(cls, exp) {
  if (!exp || !cls) { return true; }
  if (exp.ok) { return exp.ok.has(cls); }
  if (exp.bad) { return !exp.bad.has(cls); }
  return true;
}

function missingCaps(exposes, caps) {
  const have = new Set((caps || []).map((c) => String(c).split('.')[0]));
  const want = new Set();
  for (const e of exposes || []) { if (EXPOSE_CAP[e]) { want.add(EXPOSE_CAP[e]); } }
  // light_hue implies light_saturation; climate state is not onoff on most TRVs
  if (have.has('target_temperature')) { want.delete('onoff'); }
  return [...want].filter((c) => !have.has(c)).sort();
}

/* ------------------------------------------------------------------ branch model */
function readBranch(root) {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const idx = new Map(); // caseless "mfr|PID" → [{id, class, caps}]
  for (const d of app.drivers || []) {
    if (!d.zigbee) { continue; }
    const rec = { id: d.id, class: d.class || null, caps: (d.capabilities || []).map((c) => (typeof c === 'string' ? c : c.id)).filter(Boolean), deprecated: !!d.deprecated };
    for (const m of [].concat(d.zigbee.manufacturerName || [])) {
      for (const p of [].concat(d.zigbee.productId || [])) {
        const k = `${String(m).toLowerCase()}|${String(p).toUpperCase()}`;
        const a = idx.get(k) || [];
        if (!a.some((x) => x.id === rec.id)) { a.push(rec); }
        idx.set(k, a);
      }
    }
  }
  return { version: app.version, id: app.id, idx };
}

/** Read KEY: "value" from the branch's own publish workflow, so each branch is simulated with its real settings. */
function workflowEnv(root, key) {
  const f = path.join(root, '.github/workflows/auto-publish-on-push.yml');
  try { const m = fs.readFileSync(f, 'utf8').match(new RegExp(`${key}:\\s*["']?(\\d+)`)); return m ? m[1] : null; } catch (_e) { return null; }
}

/** Rebuild the payload couple set in a child process (compaction reads env at call time and mutates the file). */
function payloadSet(root) {
  const tmp = path.join(os.tmpdir(), `p3039-payload-${process.pid}-${path.basename(root)}.json`);
  const src = path.join(root, 'app.json');
  fs.copyFileSync(src, tmp);
  const pick = (k, d) => process.env[k] || workflowEnv(root, k) || d;
  const env = {
    ...process.env,
    HOMEY_ZIGBEE_MAX_TOTAL_COMBOS: pick('HOMEY_ZIGBEE_MAX_TOTAL_COMBOS', '15500'),
    HOMEY_ZIGBEE_MAX_DRIVER_COMBOS: pick('HOMEY_ZIGBEE_MAX_DRIVER_COMBOS', '1500'),
    HOMEY_ZIGBEE_MAX_CASE_FORMS: pick('HOMEY_ZIGBEE_MAX_CASE_FORMS', '2'),
  };
  const topMax = pick('HOMEY_ZIGBEE_TOPUP_MAX_TOTAL', '');
  const topDrv = pick('HOMEY_ZIGBEE_TOPUP_MAX_DRIVER', '');
  const topFile = path.join(root, 'scripts/maintenance/ts0601-topup.cjs');
  if (topMax) { env.HOMEY_ZIGBEE_TOPUP_MAX_TOTAL = topMax; }
  // WHY(P3036): publish re-adds TS0601 groups after compaction (same driver set); mirror it when the branch has it.
  const code = `const fs=require('fs');const C=require(${JSON.stringify(path.join(root, 'scripts/maintenance/compact-zigbee-identifiers.cjs'))});
    const source=JSON.parse(fs.readFileSync(${JSON.stringify(src)},'utf8'));
    const r=C.compactManifestFile(${JSON.stringify(tmp)},{});let top=null;
    if(${JSON.stringify(!!topMax)}&&fs.existsSync(${JSON.stringify(topFile)})){const T=require(${JSON.stringify(topFile)});
      const tu=T.topUpFile(source,${JSON.stringify(tmp)},{maxTotal:T.ceilingFromEnv(),maxDriver:Number(${JSON.stringify(topDrv)})||undefined,maxCaseForms:Number(process.env.HOMEY_ZIGBEE_MAX_CASE_FORMS)||2});
      top={addedGroups:tu.addedGroups,afterTotal:tu.afterTotal,ceiling:tu.maxTotal};}
    process.stdout.write(JSON.stringify({afterTotal:top?top.afterTotal:r.afterTotal,compacted:r.afterTotal,max:r.maxTotalCombos,over:!!r.overTotalLimit,topUp:top}));`;
  let info = null;
  try { info = JSON.parse(cp.execFileSync(process.execPath, ['-e', code], { cwd: root, env, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }).toString()); } catch (_e) { info = null; }
  const set = new Set();
  const lower = new Set();
  if (info) {
    const app = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    for (const d of app.drivers || []) {
      if (!d.zigbee) { continue; }
      for (const m of [].concat(d.zigbee.manufacturerName || [])) { for (const p of [].concat(d.zigbee.productId || [])) { set.add(`${m}|${p}`); lower.add(`${String(m).toLowerCase()}|${String(p).toUpperCase()}`); } }
    }
  }
  try { fs.unlinkSync(tmp); } catch (_e) { /* ignore */ }
  return { info, set, lower };
}

function catalogueFor(root) {
  try {
    const p = path.join(root, 'lib/zigbee/DpCatalogDecoder.js');
    delete require.cache[require.resolve(p)];
    const m = require(p);
    return (mfr, pid) => new Set((m.coupleDps(mfr, pid) || []).map((r) => r.dp));
  } catch (_e) { return () => new Set(); }
}

/* ------------------------------------------------------------------ main */
function args(argv) {
  const o = { roots: {}, sources: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const v = () => argv[++i];
    if (a === '--help' || a === '-h') { o.help = true; } else if (a === '--kb') { o.kb = v(); } else if (a === '--zhc-pkg') { o.zhcPkg = v(); } else if (a === '--root') { const [b, d] = v().split('='); o.roots[b] = path.resolve(d); } else if (a === '--sources') { o.sources = v().split(','); } else if (a === '--out-json') { o.outJson = v(); } else if (a === '--out-md') { o.outMd = v(); } else if (a === '--no-worktrees') { o.noWorktrees = true; }
  }
  return o;
}

function currentBranch() {
  try { return cp.execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (_e) { return null; }
}

function ensureRoots(o) {
  const made = [];
  if (!o.roots.master && !o.roots['stable-v5'] && !o.roots['bastien-home']) {
    const cur = process.env.GITHUB_REF_NAME || currentBranch();
    if (BRANCHES.includes(cur)) { o.roots[cur] = ROOT; }
  }
  if (o.noWorktrees) { return made; }
  for (const b of BRANCHES) {
    if (o.roots[b]) { continue; }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `p3039-${b}-`));
    try {
      cp.execSync(`git fetch -q origin ${b}`, { cwd: ROOT, stdio: 'ignore' });
      cp.execSync(`git worktree add -q --detach "${dir}" FETCH_HEAD`, { cwd: ROOT, stdio: 'ignore' });
      o.roots[b] = dir; made.push(dir);
    } catch (_e) { /* branch unavailable: matrix says "not evaluated" */ }
  }
  return made;
}

function build(o) {
  const kb = o.kb || process.env.KB_DIR || '/workspace/kb';
  const sources = {};
  const couples = new Map(); // exact "mfr|pid" → { mfr, pid, src: {source: ref}, exposes, dps, model }
  const nonTuya = {};
  for (const [name, fn] of ADAPTERS) {
    if (o.sources && !o.sources.includes(name)) { continue; }
    const r = fn(kb, o);
    sources[name] = { missing: !!r.missing, ...(r.meta || {}), entries: r.entries.length };
    nonTuya[name] = 0;
    const seen = new Set();
    for (const e of r.entries) {
      const mfr = String(e.mfr).trim(); const pid = String(e.pid).trim();
      if (!mfr || !pid) { continue; }
      const k = `${mfr}|${pid}`;
      if (!(e.tuya || isTuya(mfr, pid))) { if (!seen.has(k)) { nonTuya[name]++; seen.add(k); } continue; }
      const c = couples.get(k) || { mfr, pid, src: {}, exposes: null, dps: null, model: null };
      if (!c.src[name]) { c.src[name] = e.ref; }
      if (e.exposes && !c.exposes) { c.exposes = e.exposes; c.model = e.model; }
      if (e.dps && e.dps.length && !c.dps) { c.dps = e.dps; }
      if (!c.model && e.model) { c.model = e.model; }
      couples.set(k, c);
    }
    sources[name].tuyaCouples = [...couples.values()].filter((c) => c.src[name]).length;
    sources[name].nonTuyaCouples = nonTuya[name];
  }
  return { kb, sources, couples };
}

function evaluate(couples, roots) {
  const branches = {};
  for (const b of BRANCHES) {
    if (!roots[b] || !fs.existsSync(path.join(roots[b], 'app.json'))) { branches[b] = null; continue; }
    const br = readBranch(roots[b]);
    const pay = payloadSet(roots[b]);
    const cat = catalogueFor(roots[b]);
    branches[b] = { br, pay, cat };
  }
  const rows = [];
  for (const k of [...couples.keys()].sort()) {
    const c = couples.get(k);
    const row = { k, s: Object.keys(c.src), m: c.model || null, b: {} };
    const exp = expectedClasses(c.exposes);
    for (const b of BRANCHES) {
      const B = branches[b];
      if (!B) { continue; }
      const drv = B.br.idx.get(`${c.mfr.toLowerCase()}|${c.pid.toUpperCase()}`) || [];
      if (!drv.length) { row.b[b] = ['absent']; continue; }
      const d = drv.find((x) => !x.deprecated) || drv[0];
      if (B.pay.info && !B.pay.set.has(k)) {
        // WHY: Homey matches bytes exactly; a payload that kept only another case form still misses this device.
        row.b[b] = ['compacted', d.id, B.pay.lower.has(`${c.mfr.toLowerCase()}|${c.pid.toUpperCase()}`) ? 'case_only' : 'dropped'];
        continue;
      }
      if (!classOk(d.class, exp)) { row.b[b] = ['wrong_class', d.id, d.class, exp.reason]; continue; }
      const miss = missingCaps(c.exposes, d.caps);
      const dpHave = B.cat(c.mfr, c.pid);
      const dpMiss = (c.dps || []).filter((x) => !dpHave.has(x));
      if (miss.length || dpMiss.length) { row.b[b] = ['partial', d.id, miss, dpMiss]; continue; }
      row.b[b] = ['complete', d.id];
    }
    if (drvDual(branches, c)) { row.dual = true; }
    rows.push(row);
  }
  const meta = {};
  for (const b of BRANCHES) {
    const B = branches[b];
    meta[b] = B ? { app: B.br.id, version: B.br.version, payload: B.pay.info } : null;
  }
  return { rows, meta };
}

function drvDual(branches, c) {
  const B = branches.master;
  if (!B) { return false; }
  return (B.br.idx.get(`${c.mfr.toLowerCase()}|${c.pid.toUpperCase()}`) || []).filter((x) => !x.deprecated).length > 1;
}

function summarize(rows, sources) {
  const per = {};
  for (const s of ['all', ...Object.keys(sources)]) {
    per[s] = {};
    for (const b of BRANCHES) {
      const cnt = Object.fromEntries(STATUSES.map((x) => [x, 0]));
      let n = 0;
      for (const r of rows) { if ((s === 'all' || r.s.includes(s)) && r.b[b]) { cnt[r.b[b][0]]++; n++; } }
      per[s][b] = n ? { total: n, ...cnt } : null;
    }
  }
  return per;
}

function markdown(out) {
  const L = [];
  L.push('# Tuya Zigbee coverage matrix (P3039)', '');
  L.push('Generated by `node scripts/kb/z2m-coverage.js` (wired into `scripts/kb/refresh.sh`, workflow **KB refresh**). Facts only: exact upstream couples (manufacturerName + productId) compared with our three branches, in `app.json` and in the rebuilt published payload (same compaction as the publish workflows). One reliable source is enough; the source of every couple is kept in `data/kb/z2m-coverage.json` (`s` = sources, first URL per source in `src`).', '');
  L.push('Statuses: **absent** (no driver), **compacted** (in app.json, dropped from the payload), **wrong_class** (driver class cannot represent the device, Z2M exposes), **partial** (Z2M DPs missing from the shipped DP catalogue or exposes without a capability), **complete**.', '');
  L.push('## Upstream sources', '', '| Source | Version / commit | Tuya couples | Non-Tuya couples (out of scope) | Note |', '|---|---|---:|---:|---|');
  for (const [k, s] of Object.entries(out.sources)) {
    const v = s.missing ? 'mirror missing' : (s.version || (s.commit ? `${s.commit.slice(0, 10)} (${(s.date || '').slice(0, 10)})` : (s.repos || []).map((r) => `${r.repo.replace('https://github.com/', '')}@${(r.commit || '').slice(0, 10)}`).join(', ')));
    L.push(`| ${k} | ${v} | ${s.tuyaCouples || 0} | ${s.nonTuyaCouples || 0} | ${s.note || (s.ambiguousSkipped ? `${s.ambiguousSkipped} ambiguous ids skipped` : '')} |`);
  }
  L.push('', `Wi-Fi / LAN projects (${WIFI_LEADS.join(', ')}) belong to the separate wifi-local matrix: leads only here.`, '');
  L.push('## Branch payloads', '', '| Branch | App | Version | Payload combos / cap | Compacted, other case form kept |', '|---|---|---|---|---:|');
  for (const b of BRANCHES) { const m = out.branches[b]; L.push(m ? `| ${b} | ${m.app} | ${m.version} | ${m.payload ? `${m.payload.compacted} / ${m.payload.max}${m.payload.topUp ? ` + TS0601 top-up → ${m.payload.topUp.afterTotal} / ${m.payload.topUp.ceiling}` : ''}${m.payload.over ? ' (over)' : ''}` : 'payload not rebuilt'} | ${m.compactedCaseOnly || 0} |` : `| ${b} | not evaluated | | | |`); }
  L.push('', 'The payload cap (15,500 couples, our own heuristic shared with the publish workflows, plus the P3036 TS0601 top-up where the branch has it) is the binding limit: any couple added to app.json beyond it is compacted out again, so new couples are only worth adding together with a compaction gain (P3036). Couples we cannot ship are listed as on hold, never removed.');
  L.push('', '## Counts per source and branch', '');
  L.push('| Source | Branch | Total | Absent | Compacted | Wrong class | Partial | Complete |', '|---|---|---:|---:|---:|---:|---:|---:|');
  for (const [s, per] of Object.entries(out.summary)) {
    for (const b of BRANCHES) { const c = per[b]; if (c) { L.push(`| ${s} | ${b} | ${c.total} | ${c.absent} | ${c.compacted} | ${c.wrong_class} | ${c.partial} | ${c.complete} |`); } }
  }
  const ex = (st, b, n = 25) => out.rows.filter((r) => r.b[b] && r.b[b][0] === st).slice(0, n).map((r) => `\`${r.k}\`${r.b[b][1] ? ` → ${r.b[b][1]}` : ''}${st === 'wrong_class' ? ` (class ${r.b[b][2]}, expected ${r.b[b][3]})` : ''}${st === 'partial' ? ` (caps: ${r.b[b][2].join(' ') || '-'}; DPs: ${r.b[b][3].join(',') || '-'})` : ''} [${r.s.join(',')}]`);
  for (const st of ['absent', 'compacted', 'wrong_class', 'partial']) {
    L.push('', `## Examples: ${st} (master, first 25, full list in the JSON)`, '');
    for (const x of ex(st, 'master')) { L.push(`- ${x}`); }
  }
  L.push('');
  return L.join('\n');
}

function main() {
  const o = args(process.argv);
  if (o.help) { process.stdout.write(fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => /^ \*   node /.test(l) || /^ \*\s+\[--/.test(l)).join('\n') + '\n'); return; }
  const made = ensureRoots(o);
  try {
    const { sources, couples } = build(o);
    const { rows, meta } = evaluate(couples, o.roots);
    const src = {};
    for (const [k, c] of couples) { src[k] = c.src; }
    const out = { schema: 1, generator: 'scripts/kb/z2m-coverage.js', sources, branches: meta, summary: summarize(rows, sources), rows, src };
    for (const b of BRANCHES) {
      if (meta[b]) { meta[b].compactedCaseOnly = rows.filter((r) => r.b[b] && r.b[b][0] === 'compacted' && r.b[b][2] === 'case_only').length; }
    }
    const outJson = o.outJson || path.join(ROOT, 'data/kb/z2m-coverage.json');
    const outMd = o.outMd || path.join(ROOT, 'docs/knowledge/Z2M_COVERAGE.md');
    fs.mkdirSync(path.dirname(outJson), { recursive: true });
    fs.writeFileSync(outJson, `${JSON.stringify(out)}\n`);
    fs.writeFileSync(outMd, markdown(out));
    const a = out.summary.all;
    for (const b of BRANCHES) { if (a[b]) { console.log(b, JSON.stringify(a[b])); } }
  } finally {
    for (const d of made) { try { cp.execSync(`git worktree remove --force "${d}"`, { cwd: ROOT, stdio: 'ignore' }); } catch (_e) { /* ignore */ } }
  }
}

module.exports = { expectedClasses, classOk, missingCaps, readBranch, summarize, markdown, EXPOSE_CAP, STATUSES };
if (require.main === module) { main(); }
