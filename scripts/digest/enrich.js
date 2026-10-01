'use strict';
/**
 * scripts/digest/enrich.js — "enrichment leads" extractor + repo cross-check (Node built-ins only).
 * REPORT-ONLY: never edits drivers, never invents an id — only what literally appears in the text.
 *
 * extract(text) finds: Tuya manufacturerName, productId (TS0xxx), DP numbers ("DP 109", "dp113"),
 *   cluster ids (0x0405, 0xEF00/61184, 0xE000, 0xE001, "cluster 1026"…), endpoints, raw frames /
 *   Buffer payloads (hex only), flow-card mentions, TX/RX hints, Z2M / ZHA references, diag UUIDs.
 * buildIndex() scans a BOUNDED set of repo files (drivers/<id>/driver.compose.json, device.js,
 *   driver.flow.compose.json, lib/**, data/*.json ≤3 MB, .homeycompose/flow) once and caches the
 *   token index in .cache/digest-enrich-index.json keyed by git HEAD (or file count+mtime).
 * check(ex, idx) labels each lead: "mapped in <driver>" (driver that owns the same mfr),
 *   "known (repo)" or "unmapped" → enrichment lead.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LIMITS = { maxFiles: 4000, maxFileBytes: 3 * 1024 * 1024, maxTotalBytes: 160 * 1024 * 1024 };
const INDEX_VERSION = 3;

// Well-known ZCL clusters (names only for display; presence is still checked in the repo).
const ZCL = {
  0x0000: 'basic', 0x0001: 'powerConfiguration', 0x0003: 'identify', 0x0004: 'groups', 0x0005: 'scenes', 0x0006: 'onOff',
  0x0008: 'levelControl', 0x000a: 'time', 0x0019: 'ota', 0x0020: 'pollControl', 0x0102: 'windowCovering', 0x0201: 'thermostat',
  0x0202: 'fanControl', 0x0204: 'thermostatUI', 0x0300: 'colorControl', 0x0400: 'illuminance', 0x0402: 'temperature',
  0x0403: 'pressure', 0x0405: 'humidity', 0x0406: 'occupancy', 0x040d: 'co2', 0x042a: 'pm25', 0x0500: 'iasZone',
  0x0501: 'iasAce', 0x0502: 'iasWd', 0x0702: 'metering', 0x0b04: 'electricalMeasurement', 0x0b05: 'diagnostics',
  0x1000: 'touchlink', 0xe000: 'tuyaE000', 0xe001: 'tuyaE001', 0xe002: 'tuyaE002', 0xef00: 'tuyaEF00', 0xfc00: 'mfrFC00',
};
// Clusters implemented natively by Homey's zigbee-clusters library (SDK3). Everything else needs a
// complementary layer (custom Cluster class / BoundCluster / raw frame handler) in this app.
const NATIVE = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 26, 32, 257, 258, 513, 514, 768,
  1024, 1025, 1026, 1027, 1028, 1029, 1030, 1280, 1281, 1282, 1794, 2820, 2821, 4096]);
/** native | tuya (EF00/E000/E001/E002/FDxx raw) | mfr (0xFC00–0xFFFF) | zcl (standard but not in zigbee-clusters) */
function classify(n) {
  if (NATIVE.has(n)) return 'native';
  if ([0xef00, 0xe000, 0xe001, 0xe002, 0xed00].includes(n) || (n >= 0xfd00 && n <= 0xfdff)) return 'tuya';
  if (n >= 0xfc00) return 'mfr';
  return 'zcl';
}
const CLASS_LABEL = { native: 'natif Homey', tuya: 'Tuya non-natif', mfr: 'spécifique fabricant', zcl: 'ZCL non géré nativement' };

/** Homey interview block (developer tools / diag JSON): ids, endpointDescriptors, attributes, powerSource. */
function parseInterview(text) {
  if (!/inputClusters|endpointDescriptors/.test(text)) return null;
  const iv = { endpoints: [], attrs: 0, clusterNames: [] };
  const mm = /"modelId"\s*:\s*"([^"]{2,40})"/.exec(text); if (mm) iv.modelId = mm[1].replace(/[^\w.-]/g, '');
  const mf = /"manufacturerName"\s*:\s*"([^"]{2,40})"/.exec(text); if (mf) iv.manufacturerName = mf[1].replace(/[^\w.-]/g, '');
  const ps = /"powerSource"\s*:\s*"([a-zA-Z ]{2,20})"/.exec(text); if (ps) iv.powerSource = ps[1];
  for (const m of text.matchAll(/"endpointId"\s*:\s*(\d{1,3})[^{}]{0,400}?"inputClusters"\s*:\s*\[([\d,\s]*)\][^{}]{0,200}?"outputClusters"\s*:\s*\[([\d,\s]*)\]/g)) {
    const nums = (x) => x.split(',').map((v) => Number(v.trim())).filter((v) => !Number.isNaN(v) && String(v) !== '');
    iv.endpoints.push({ id: Number(m[1]), in: nums(m[2]), out: nums(m[3]) });
  }
  iv.clusterNames = uniq([...text.matchAll(/"([a-zA-Z][a-zA-Z0-9]{2,40})"\s*:\s*\{\s*"attributes"\s*:/g)].map((m) => m[1])).slice(0, 30);
  iv.attrs = (text.match(/"acl"\s*:\s*\[/g) || []).length;
  return iv.endpoints.length || iv.modelId || iv.manufacturerName ? iv : null;
}

const hex4 = (n) => '0x' + n.toString(16).toUpperCase().padStart(4, '0');
const uniq = (a) => [...new Set(a)];
const clean = (s, n = 50) => String(s).replace(/[^\w\s.\-/#:]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

// ---------------------------------------------------------------- extraction (untrusted text)
function extract(raw) {
  const text = String(raw || '').slice(0, 200000);
  const out = {};
  out.interview = parseInterview(text);
  out.mfr = uniq((text.match(/\b_(?:TZ[0-9A-Z]{4}|TZE[0-9]{3}|TYZB0[0-9]|TYST11|TZB[0-9]{3})_[a-z0-9]{8}\b/gi) || []).map((s) => s.toLowerCase()));
  out.pid = uniq((text.match(/\bTS[01][0-9]{3}[A-Z]?\b/g) || []).map((s) => s.toUpperCase()));
  out.dp = uniq([...text.matchAll(/\b(?:dp|datapoint|dpid)[\s#:=_-]{0,3}(\d{1,3})\b/gi)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 256)).sort((a, b) => a - b);
  const cl = [];
  for (const m of text.matchAll(/\b0x([0-9a-f]{4})\b/gi)) {
    const n = parseInt(m[1], 16);
    const ctx = text.slice(Math.max(0, m.index - 30), m.index).toLowerCase();
    if (ZCL[n] !== undefined || n >= 0xe000 || /cluster/.test(ctx)) cl.push(n);
  }
  for (const m of text.matchAll(/\bcluster\s*(?:id)?\s*[#:=]?\s*0x([0-9a-f]{2})\b/gi)) cl.push(parseInt(m[1], 16));
  for (const m of text.matchAll(/\bcluster\s*(?:id)?\s*[#:=]?\s*(\d{1,5})\b/gi)) cl.push(Number(m[1]));
  for (const m of text.matchAll(/\b(61184|57344|57345|57346)\b/g)) cl.push(Number(m[1]));
  for (const m of text.matchAll(/\b(EF00|E000|E001|E002)\b/g)) cl.push(parseInt(m[1], 16));
  if (out.interview) {
    for (const ep of out.interview.endpoints) cl.push(...ep.in, ...ep.out);
    if (out.interview.manufacturerName && /^_T/.test(out.interview.manufacturerName)) out.mfr = uniq([...out.mfr, out.interview.manufacturerName.toLowerCase()]);
    if (out.interview.modelId && /^TS[01]\d{3}[A-Z]?$/.test(out.interview.modelId)) out.pid = uniq([...out.pid, out.interview.modelId.toUpperCase()]);
  }
  out.cluster = uniq(cl.filter((n) => n >= 0 && n <= 0xffff)).sort((a, b) => a - b);
  out.endpoint = uniq([...[...text.matchAll(/\b(?:endpoint|ep)\s*[#:=]?\s*(\d{1,3})\b/gi)].map((m) => Number(m[1])), ...(out.interview ? out.interview.endpoints.map((e) => e.id) : [])].filter((n) => n > 0 && n < 241)).sort((a, b) => a - b);
  const frames = [];
  for (const m of text.matchAll(/Buffer\.from\(\s*\[([0-9a-fx,\s]{6,300})\]/gi)) frames.push(m[1].split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n)).map((n) => n.toString(16).padStart(2, '0')).join(' '));
  for (const m of text.matchAll(/<Buffer((?: [0-9a-f]{2}){3,64})/gi)) frames.push(m[1].trim());
  for (const m of text.matchAll(/\b(?:[0-9a-f]{2}[ :]){5,63}[0-9a-f]{2}\b/gi)) {
    const bytes = m[0].split(/[ :]/);
    if (bytes.length === 8 && m[0].includes(':')) continue; // IEEE address, not a frame
    if (new Set(bytes.map((b) => b.toLowerCase())).size === 1) continue; // ff ff ff… padding
    frames.push(bytes.join(' '));
  }
  out.frame = uniq(frames.map((f) => f.toLowerCase().slice(0, 60))).slice(0, 5);
  const flows = [];
  for (const m of text.matchAll(/\bflow\s*cards?\b(?:\s*[:\-]?\s*["“'«]([^"”'»\n]{3,60})["”'»])?/gi)) flows.push(m[1] ? clean(m[1]) : '(mention)');
  out.flow = uniq(flows).slice(0, 6);
  const tx = {};
  for (const m of text.matchAll(/\b(tx|rx|sent|received|transmit(?:ted)?|configureReporting|reporting|bind(?:ing)?|zclFrame|dataRequest|dataReport)\b/gi)) {
    const k = m[1].toLowerCase(); tx[k] = (tx[k] || 0) + 1;
  }
  out.txrx = tx;
  const refs = [];
  for (const m of text.matchAll(/github\.com\/Koenkk\/zigbee-herdsman-converters\/(?:pull|issues)\/(\d+)/gi)) refs.push(`ext-conv#${m[1]}`);
  for (const m of text.matchAll(/github\.com\/Koenkk\/zigbee2mqtt\/(?:pull|issues)\/(\d+)/gi)) refs.push(`ext-app#${m[1]}`);
  for (const m of text.matchAll(/github\.com\/zigpy\/zha-device-handlers\/(?:pull|issues)\/(\d+)/gi)) refs.push(`ext-quirk#${m[1]}`);
  for (const m of text.matchAll(/zigbee2mqtt\.io\/devices\/([A-Za-z0-9_.\-]{2,60})\.html/gi)) refs.push(`ext-device:${m[1]}`);
  for (const m of text.matchAll(/github\.com\/Koenkk\/zigbee-herdsman-converters\/blob\/[^/\s]+\/(src\/[A-Za-z0-9_/.\-]{3,80})/gi)) refs.push(`ext-src:${m[1]}`);
  out.ref = uniq(refs).slice(0, 10);
  out.refMention = (text.match(/\b(z2m|zigbee2mqtt|zha|quirks?|herdsman)\b/gi) || []).length;
  out.uuid = uniq((text.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi) || []).map((s) => s.toLowerCase())).slice(0, 5);
  return out;
}

function isEmpty(ex) {
  return !ex.interview && !ex.mfr.length && !ex.pid.length && !ex.dp.length && !ex.cluster.length && !ex.endpoint.length && !ex.frame.length &&
    !ex.flow.length && !ex.ref.length && !ex.uuid.length;
}

// ---------------------------------------------------------------- repo index (bounded + cached)
function listFiles(root) {
  const files = [];
  const add = (p) => { if (files.length < LIMITS.maxFiles) files.push(p); };
  const drv = path.join(root, 'drivers');
  if (fs.existsSync(drv)) {
    for (const d of fs.readdirSync(drv).sort()) {
      for (const f of ['driver.compose.json', 'device.js', 'driver.flow.compose.json']) {
        const p = path.join(drv, d, f);
        if (fs.existsSync(p)) add(p);
      }
    }
  }
  const walk = (dir, depth, filter) => {
    if (!fs.existsSync(dir) || depth > 6) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1, filter); else if (filter(e.name)) add(p);
    }
  };
  walk(path.join(root, 'lib'), 0, (n) => /\.(js|json)$/.test(n));
  walk(path.join(root, '.homeycompose', 'flow'), 0, (n) => n.endsWith('.json'));
  const data = path.join(root, 'data');
  if (fs.existsSync(data)) for (const n of fs.readdirSync(data).sort()) if (n.endsWith('.json')) add(path.join(data, n));
  return files;
}

function cacheKey(root, files) {
  try { return execSync('git rev-parse HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (_) {
    let m = 0; for (const f of files) m = Math.max(m, fs.statSync(f).mtimeMs);
    return `${files.length}-${Math.round(m)}`;
  }
}

function buildIndex(root = process.cwd(), cacheFile = path.join(root, '.cache', 'digest-enrich-index.json')) {
  const files = listFiles(root);
  const key = cacheKey(root, files);
  try {
    const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (c.v === INDEX_VERSION && c.key === key) return hydrate(c);
  } catch (_) { /* no cache */ }
  const idx = { v: INDEX_VERSION, key, built: new Date().toISOString(), files: 0, bytes: 0, mfr: {}, pid: {}, drivers: {}, dp: [], cluster: [], refs: [], uuid: [], flow: [], handler: [] };
  const G = { dp: new Set(), cluster: new Set(), refs: new Set(), uuid: new Set(), flow: new Set(), handler: new Set() };
  const NAMED = { tuya: 0xef00, tuyaspecific: 0xef00, manuspecificTuya: 0xef00, tuyaE000: 0xe000, tuyaE001: 0xe001, tuyaE002: 0xe002 };
  const drvOf = (p) => { const m = /drivers[\\/]([^\\/]+)[\\/]/.exec(p); return m ? m[1] : null; };
  const D = (d) => (idx.drivers[d] = idx.drivers[d] || { dp: [], cluster: [], endpoint: [] });
  for (const f of files) {
    let st; try { st = fs.statSync(f); } catch (_) { continue; }
    if (st.size > LIMITS.maxFileBytes || idx.bytes + st.size > LIMITS.maxTotalBytes) continue;
    const txt = fs.readFileSync(f, 'utf8');
    idx.files++; idx.bytes += st.size;
    const d = drvOf(f);
    const base = path.basename(f);
    if (d && base === 'driver.compose.json') {
      try {
        const z = JSON.parse(txt).zigbee || {};
        for (const m of [].concat(z.manufacturerName || [])) { const k = String(m).toLowerCase(); (idx.mfr[k] = idx.mfr[k] || []).includes(d) || idx.mfr[k].push(d); }
        for (const p of [].concat(z.productId || [])) { const k = String(p).toUpperCase(); (idx.pid[k] = idx.pid[k] || []).includes(d) || idx.pid[k].push(d); }
        for (const [ep, def] of Object.entries(z.endpoints || {})) {
          D(d).endpoint.push(Number(ep));
          for (const c of [].concat(def.clusters || [], def.bindings || [])) { D(d).cluster.push(Number(c)); G.cluster.add(Number(c)); }
        }
      } catch (_) { /* bad json */ }
    }
    if (d && base === 'driver.flow.compose.json' || /homeycompose[\\/]flow/.test(f)) {
      for (const m of txt.matchAll(/"(?:title|titleFormatted)"\s*:\s*\{[^}]*"en"\s*:\s*"([^"]{3,80})"/g)) G.flow.add(m[1].toLowerCase().replace(/\[\[[^\]]*\]\]/g, '').replace(/\s+/g, ' ').trim());
    }
    // DP numbers: "dp: 109", "dp109", "DP_109", case 109: (device.js), keyed maps in DP-ish files
    const dps = [...txt.matchAll(/\b(?:dp|dpid|datapoint)[\s#:=_'"-]{0,3}(\d{1,3})\b/gi)].map((m) => Number(m[1]));
    if (base === 'device.js') dps.push(...[...txt.matchAll(/\bcase\s+(\d{1,3})\s*:/g)].map((m) => Number(m[1])));
    if (/dp|datapoint/i.test(f)) dps.push(...[...txt.matchAll(/^\s*['"]?(\d{1,3})['"]?\s*:\s*[{\['"]/gm)].map((m) => Number(m[1])));
    for (const n of dps) if (n > 0 && n < 256) { G.dp.add(n); if (d) D(d).dp.push(n); }
    for (const m of txt.matchAll(/\b0x([0-9a-f]{4})\b/gi)) { const n = parseInt(m[1], 16); G.cluster.add(n); if (d) D(d).cluster.push(n); }
    for (const m of txt.matchAll(/\bcluster(?:Id)?\s*[:=]\s*(\d{1,5})\b/gi)) { G.cluster.add(Number(m[1])); if (d) D(d).cluster.push(Number(m[1])); }
    for (const m of txt.matchAll(/\b(?:endpoint|ep)(?:Id)?\s*[:=]\s*(\d{1,3})\b/gi)) if (d) D(d).endpoint.push(Number(m[1]));
    // complementary handlers: custom Cluster classes, BoundCluster, raw frame handlers → which cluster ids they cover
    if (/\bBoundCluster\b|handleFrame\s*\(|extends\s+Cluster\b|Cluster\.addCluster\s*\(|static\s+get\s+ID\s*\(/.test(txt)) {
      for (const m of txt.matchAll(/\b0x([0-9a-f]{4})\b/gi)) G.handler.add(parseInt(m[1], 16));
      for (const m of txt.matchAll(/\bID\s*\(\s*\)\s*\{\s*return\s+(0x[0-9a-f]+|\d+)/gi)) G.handler.add(Number(m[1]));
      for (const m of txt.matchAll(/\b(61184|57344|57345|57346)\b/g)) G.handler.add(Number(m[1]));
      for (const [nm, id] of Object.entries(NAMED)) if (txt.includes(nm)) G.handler.add(id);
    }
    for (const r of extract(txt.length > 400000 ? txt.slice(0, 400000) : txt).ref) G.refs.add(r);
    for (const m of txt.matchAll(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi)) G.uuid.add(m[0].toLowerCase());
  }
  for (const k of Object.keys(G)) idx[k] = [...G[k]];
  for (const d of Object.values(idx.drivers)) for (const k of ['dp', 'cluster', 'endpoint']) d[k] = uniq(d[k]);
  try { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(idx)); } catch (_) {}
  return hydrate(idx);
}

function hydrate(idx) {
  idx._handler = new Set(idx.handler || []);
  idx._dp = new Set(idx.dp); idx._cluster = new Set(idx.cluster); idx._refs = new Set(idx.refs); idx._uuid = new Set(idx.uuid);
  return idx;
}

// ---------------------------------------------------------------- cross-check + render
function check(ex, idx) {
  const owners = uniq(ex.mfr.flatMap((m) => idx.mfr[m] || []));
  const inOwners = (k, v) => owners.filter((d) => idx.drivers[d] && idx.drivers[d][k].includes(v));
  const lab = (k, v, globalSet) => {
    const o = inOwners(k, v);
    if (o.length) return { v, s: 'mapped', where: o.slice(0, 2) };
    if (owners.length) return { v, s: 'notInOwner', where: owners.slice(0, 2) }; // device known, this id not in its driver
    if (globalSet && globalSet.has(v)) return { v, s: 'known' };
    return { v, s: 'unmapped' };
  };
  return {
    owners,
    mfr: ex.mfr.map((m) => (idx.mfr[m] ? { v: m, s: 'mapped', where: idx.mfr[m].slice(0, 2) } : { v: m, s: 'unmapped' })),
    pid: ex.pid.map((p) => (idx.pid[p] ? { v: p, s: 'known' } : { v: p, s: 'unmapped' })),
    dp: ex.dp.map((n) => lab('dp', n, idx._dp)),
    cluster: ex.cluster.map((n) => {
      const cls = classify(n);
      const needs = cls !== 'native' && !idx._handler.has(n); // non-native with no complementary layer in the repo
      return { ...lab('cluster', n, idx._cluster), name: ZCL[n], cls, needsHandler: needs, nonNative: cls !== 'native' };
    }),
    interview: ex.interview,
    // endpoints only make sense for a known device; otherwise just a mention
    endpoint: ex.endpoint.map((n) => (owners.length ? lab('endpoint', n, null) : { v: n, s: 'mention' })),
    flow: ex.flow.map((f) => (f === '(mention)' ? { v: f, s: 'mention' } : { v: f, s: idx.flow.some((t) => t.includes(f.toLowerCase())) ? 'known' : 'unmapped' })),
    ref: ex.ref.map((r) => ({ v: r, s: idx._refs.has(r) ? 'known' : 'unmapped' })),
    uuid: ex.uuid.map((u) => ({ v: u.slice(0, 8) + '…', s: idx._uuid.has(u) ? 'known' : 'new' })),
    frame: ex.frame, txrx: ex.txrx, refMention: ex.refMention,
  };
}

const ICON = { mapped: '✅', known: '☑️', notInOwner: '⚠️ absent de', unmapped: '❌', new: '🆕', mention: '💬' };
function fmt(list, show = (x) => String(x.v)) {
  return list.map((x) => `${show(x)} ${ICON[x.s] || ''}${x.where ? ' ' + x.where.join(',') : ''}`).join(', ');
}

/** One compact markdown block for one text (post / issue). Returns '' when nothing found. */
function renderLeads(c) {
  const L = [];
  if (c.mfr.length) L.push(`mfr: ${fmt(c.mfr, (x) => '`' + x.v + '`')}`);
  if (c.pid.length) L.push(`pid: ${fmt(c.pid)}`);
  if (c.dp.length) L.push(`DP: ${fmt(c.dp)}`);
  if (c.interview) {
    const iv = c.interview;
    L.push(`interview Homey: ${[iv.manufacturerName && '`' + iv.manufacturerName + '`', iv.modelId, iv.powerSource && 'power=' + iv.powerSource].filter(Boolean).join(' ')}` +
      (iv.endpoints.length ? ' · ' + iv.endpoints.map((e) => `ep${e.id} in[${e.in.map(hex4).join(',')}] out[${e.out.map(hex4).join(',')}]`).join(' ; ') : '') +
      (iv.attrs ? ` · ${iv.attrs} attribut(s)` : ''));
  }
  if (c.cluster.length) L.push(`clusters: ${fmt(c.cluster, (x) => `${hex4(x.v)}${x.name ? '/' + x.name : ''} [${CLASS_LABEL[x.cls]}${x.needsHandler ? ' — 🧩 handler complémentaire absent' : ''}]`)}`);
  if (c.endpoint.length) L.push(`endpoints: ${fmt(c.endpoint, (x) => 'ep' + x.v)}`);
  if (c.frame.length) L.push(`trames brutes: ${c.frame.map((f) => '`' + f + '`').join(' · ')}`);
  if (c.flow.length) L.push(`flow cards: ${fmt(c.flow, (x) => x.v)}`);
  const tx = Object.entries(c.txrx || {});
  if (tx.length) L.push(`TX/RX: ${tx.map(([k, v]) => `${k}×${v}`).join(' ')}`);
  if (c.ref.length || c.refMention) L.push(`Réf. externes: ${[c.ref.length ? fmt(c.ref) : '', c.refMention ? `${c.refMention} mention(s)` : ''].filter(Boolean).join(' — ')}`);
  if (c.uuid.length) L.push(`diag UUID: ${fmt(c.uuid)}`);
  return L.join(' · ');
}

/** Flat list of unmapped leads (for the headline). */
function unmappedLeads(c) {
  const u = [];
  for (const k of ['mfr', 'pid', 'dp', 'cluster', 'endpoint', 'flow', 'ref']) {
    for (const x of c[k]) {
      if (k === 'cluster' && x.cls === 'native') continue; // native ZCL (time/ota/identify…) handled by Homey: not a lead
      if (x.s === 'unmapped' || x.s === 'notInOwner') u.push(`${k}:${k === 'cluster' ? hex4(x.v) : x.v}`);
    }
  }
  for (const x of c.cluster) if (x.needsHandler) u.push(`needs-handler:${hex4(x.v)}`);
  return uniq(u);
}

const LEGEND = '_Légende : ✅ mappé dans le driver qui porte ce mfr · ⚠️ absent du driver qui porte ce mfr · ☑️ connu ailleurs dans le repo · ❌ absent (piste d\'enrichissement) · 🆕 diag inconnu · 💬 simple mention · 🧩 cluster non natif Homey sans couche complémentaire (BoundCluster / custom Cluster / handleFrame) dans lib/ ou drivers/. Heuristique, à vérifier — rien n\'est modifié automatiquement._';

module.exports = { classify, parseInterview, extract, isEmpty, buildIndex, check, renderLeads, unmappedLeads, LEGEND, hex4, LIMITS };

if (require.main === module) {
  // CLI: node enrich.js "<text>"  or  echo text | node enrich.js
  const t0 = Date.now();
  const idx = buildIndex();
  const run = (txt) => { const c = check(extract(txt), idx); console.log(renderLeads(c) || '(rien)'); console.log('unmapped:', unmappedLeads(c).join(' ') || '—'); };
  console.error(`index: ${idx.files} files, ${(idx.bytes / 1e6).toFixed(1)} MB, ${Object.keys(idx.mfr).length} mfr, ${idx.dp.length} dp, ${idx.cluster.length} clusters, ${idx.refs.length} refs (${Date.now() - t0} ms)`);
  if (process.argv[2]) run(process.argv.slice(2).join(' ')); else { let s = ''; process.stdin.on('data', (d) => (s += d)).on('end', () => run(s)); }
}
