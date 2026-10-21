'use strict';
/**
 * P2936 cross-research: offline index of external reference sources (read-only, own parser).
 * Sources (shallow clones, path from XR_REF, default .cache/xr-ref):
 *   zhc/                      Koenkk/zigbee-herdsman-converters  (src/devices/*.ts)
 *   ext/zha-device-handlers   zigpy/zha-device-handlers          (zhaquirks/**.py)
 *   ext/deconz-rest-plugin    dresden-elektronik DDF             (devices/**.json)
 *   ext/zigbee                blakadder/zigbee                   (_zigbee/*.md)
 *   ext/tuya-local            make-all/tuya-local                (devices/*.yaml, WiFi names only)
 *   johan-app.json            JohanBendz/com.tuya.zigbee app.json
 * Each "record" = one device definition: { src, file, url, mfrs[], pids[], text } where text is a
 * short lower-case haystack (model/vendor/description) for keyword deduction. The index is cached in
 * .cache/xr-ref/index.json keyed by the source HEADs, so rebuilding is incremental and bounded.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MFR_RE = /(?:^|[^A-Za-z0-9])(_T[A-Z0-9]{2,5}_[A-Za-z0-9]{8}|_TYZB0[12]_[A-Za-z0-9]{8}|TUYATEC-[A-Za-z0-9]{8})(?![A-Za-z0-9])/g;
const PID_RE = /(?:^|[^A-Za-z0-9])(TS[0-9]{3}[0-9A-F][A-Z]?)(?![A-Za-z0-9])/g;
const all = (re, t) => { const o = new Set(); let m; re.lastIndex = 0; while ((m = re.exec(t))) o.add(m[1]); return [...o]; };

function walk(dir, ext, out = [], cap = 20000) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (out.length >= cap) break;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!e.name.startsWith('.') && e.name !== 'node_modules') walk(p, ext, out, cap); } else if (ext.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}
const head = (d) => { try { return execSync('git rev-parse HEAD', { cwd: d, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return fs.existsSync(d) ? String(fs.statSync(d).mtimeMs) : 'absent'; } };
const pick = (s, re) => { const m = re.exec(s); return m ? m[1] : ''; };

function zhc(base) {
  const recs = [];
  for (const f of walk(path.join(base, 'src/devices'), ['.ts'])) {
    const src = fs.readFileSync(f, 'utf8');
    for (const chunk of src.split(/\n {4}\{\n/).slice(1)) {
      const mfrs = all(MFR_RE, chunk); const pids = all(PID_RE, chunk);
      const zm = (chunk.match(/zigbeeModel:\s*\[([^\]]*)\]/) || [])[1] || '';
      const fpM = [...chunk.matchAll(/modelID:\s*"([^"]+)"[^}]*?manufacturerName:\s*"([^"]+)"/g)].map((x) => [x[2], x[1]]);
      const model = pick(chunk, /model:\s*"([^"]+)"/); const vendor = pick(chunk, /vendor:\s*"([^"]+)"/);
      const desc = pick(chunk, /description:\s*"([^"]+)"/);
      if (!model && !mfrs.length) continue;
      recs.push({ src: 'z2m', file: path.basename(f), url: `https://www.zigbee2mqtt.io/devices/${encodeURIComponent(model.replace(/\//g, '_'))}.html`,
        mfrs, pids, couples: fpM, text: `${vendor} ${model} ${desc} ${zm}`.toLowerCase().slice(0, 400) });
    }
  }
  return recs;
}
function zha(base) {
  return walk(path.join(base, 'zhaquirks'), ['.py']).map((f) => {
    const t = fs.readFileSync(f, 'utf8');
    return { src: 'zha', file: path.relative(base, f), url: `https://github.com/zigpy/zha-device-handlers/blob/dev/${path.relative(base, f)}`,
      mfrs: all(MFR_RE, t), pids: all(PID_RE, t), text: path.basename(f, '.py').toLowerCase() };
  }).filter((r) => r.mfrs.length);
}
function deconz(base) {
  const recs = [];
  for (const f of walk(path.join(base, 'devices'), ['.json'])) {
    if (f.includes('/generic/')) continue;
    let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    const ms = [].concat(j.manufacturername || []); const ps = [].concat(j.modelid || []);
    const couples = ms.map((m, i) => [m, ps[i] || ps[0]]).filter((x) => x[1]);
    recs.push({ src: 'deconz', file: path.relative(base, f), url: `https://github.com/dresden-elektronik/deconz-rest-plugin/blob/master/${path.relative(base, f)}`,
      mfrs: ms.filter((m) => /^_T|^_TYZB|^TUYATEC/.test(m)), pids: ps.filter((p) => /^TS/.test(p)), couples, text: `${j.vendor || ''} ${j.product || ''}`.toLowerCase() });
  }
  return recs;
}
function blakadder(base) {
  return walk(path.join(base, '_zigbee'), ['.md']).map((f) => {
    const t = fs.readFileSync(f, 'utf8').split('\n---')[0];
    return { src: 'blakadder', file: path.basename(f), url: `https://zigbee.blakadder.com/${path.basename(f, '.md')}.html`,
      mfrs: all(MFR_RE, t), pids: all(PID_RE, t),
      text: `${pick(t, /vendor:\s*(.+)/)} ${pick(t, /model:\s*(.+)/)} ${pick(t, /title:\s*(.+)/)} ${pick(t, /zigbeemodel:\s*(.+)/)}`.toLowerCase().replace(/['"[\]]/g, '') };
  });
}
function tuyaLocal(base) {
  return walk(path.join(base, 'custom_components/tuya_local/devices'), ['.yaml']).map((f) => {
    const t = fs.readFileSync(f, 'utf8').slice(0, 1500);
    return { src: 'tuya-local', file: path.basename(f), url: `https://github.com/make-all/tuya-local/blob/main/custom_components/tuya_local/devices/${path.basename(f)}`,
      mfrs: [], pids: [], wifi: true, text: `${path.basename(f, '.yaml').replace(/_/g, ' ')} ${pick(t, /name:\s*(.+)/)} ${(t.match(/manufacturer:\s*(.+)/g) || []).join(' ')} ${(t.match(/model:\s*(.+)/g) || []).join(' ')}`.toLowerCase() };
  });
}
function johan(file) {
  let j; try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
  return (j.drivers || []).filter((d) => d.zigbee).map((d) => ({ src: 'johan', file: d.id, url: `https://github.com/JohanBendz/com.tuya.zigbee/tree/master/drivers/${d.id}`,
    mfrs: d.zigbee.manufacturerName || [], pids: [].concat(d.zigbee.productId || []), driver: d.id, text: `${d.id} ${(d.name && d.name.en) || ''}`.toLowerCase() }));
}

function build(refDir, cacheFile) {
  const parts = { zhc: path.join(refDir, 'zhc'), zha: path.join(refDir, 'ext/zha-device-handlers'), deconz: path.join(refDir, 'ext/deconz-rest-plugin'),
    blak: path.join(refDir, 'ext/zigbee'), tl: path.join(refDir, 'ext/tuya-local'), johan: path.join(refDir, 'johan-app.json') };
  const key = Object.values(parts).map(head).join('|');
  let prevMfrs = null;
  if (cacheFile && fs.existsSync(cacheFile)) { try { const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); if (c.key === key) return c; prevMfrs = new Set(c.records.flatMap((r) => r.mfrs.map((m) => m.toLowerCase()))); } catch { /* rebuild */ } }
  const records = [...zhc(parts.zhc), ...zha(parts.zha), ...deconz(parts.deconz), ...blakadder(parts.blak), ...tuyaLocal(parts.tl), ...johan(parts.johan)];
  // upstream watch: manufacturerNames that appeared upstream since the previous index (incremental diff)
  const delta = prevMfrs ? [...new Set(records.flatMap((r) => r.mfrs.map((m) => m.toLowerCase())))].filter((m) => !prevMfrs.has(m)) : [];
  const out = { key, delta, built: new Date().toISOString(), present: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, fs.existsSync(v)])), records };
  if (cacheFile) { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(out)); }
  return out;
}

/** mfr (lc) -> records; couple "mfr|pid" (lc) -> records confirming that exact pairing. */
function lookup(index) {
  const byMfr = new Map(); const byCouple = new Map();
  const add = (m, k, r) => { if (!m.has(k)) m.set(k, []); if (!m.get(k).includes(r)) m.get(k).push(r); };
  for (const r of index.records) {
    for (const m of r.mfrs) add(byMfr, m.toLowerCase(), r);
    for (const [m, p] of r.couples || []) add(byCouple, `${m}|${p}`.toLowerCase(), r);
    // tuya.fingerprint("TSxxxx", [mfrs]) / johan driver / zha signature: one pid per record = exact pairing
    if (r.pids.length === 1) for (const m of r.mfrs) add(byCouple, `${m}|${r.pids[0]}`.toLowerCase(), r);
  }
  return { byMfr, byCouple };
}

module.exports = { build, lookup, MFR_RE, PID_RE, all };
