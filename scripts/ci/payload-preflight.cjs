#!/usr/bin/env node
'use strict';
// P2902 payload preflight — run on the exact directory that will be packed and
// uploaded to Athom, before upload. Athom's server-side "processing" step gives
// no error body (build.state=processing_failed, no error/feedback fields), so we
// check locally everything that step can reasonably choke on.
// Usage: node scripts/ci/payload-preflight.cjs <dir> [--json]
// Exit 1 on hard errors, 0 otherwise (warnings printed).
const fs = require('fs');
const path = require('path');

const MAX_PATH = Number(process.env.PREFLIGHT_MAX_PATH || 200);
const MAX_JSON_MB = Number(process.env.PREFLIGHT_MAX_APPJSON_MB || 4);
const IMG = { 'small.png': [75, 75], 'large.png': [500, 500], 'xlarge.png': [1000, 1000] };

function pngSize(file) {
  const fd = fs.openSync(file, 'r');
  const b = Buffer.alloc(24);
  fs.readSync(fd, b, 0, 24, 0);
  fs.closeSync(fd);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

function walk(root) {
  const out = [];
  const stack = [''];
  while (stack.length) {
    const rel = stack.pop();
    const abs = path.join(root, rel);
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (r.split('/').some((s) => s.startsWith('.'))) continue; // packer skips dotfiles
      if (ent.isDirectory()) stack.push(r);
      else out.push({ rel: r, ent });
    }
  }
  return out;
}

function preflight(root) {
  const errors = [];
  const warns = [];
  const files = walk(root);
  const set = new Set(files.map((f) => f.rel));
  const lower = new Map();
  for (const { rel, ent } of files) {
    const abs = path.join(root, rel);
    if (ent.isSymbolicLink()) {
      try { fs.statSync(abs); warns.push(`symlink (dereferenced): ${rel}`); } catch { errors.push(`dangling symlink: ${rel}`); }
    }
    if (rel.length > MAX_PATH) errors.push(`path longer than ${MAX_PATH}: ${rel}`);
    if (/[^\x20-\x7e]/.test(rel)) errors.push(`non-ASCII path: ${JSON.stringify(rel)}`);
    if (/[\\:*?"<>|]/.test(rel)) errors.push(`reserved character in path: ${rel}`);
    if (/(^|\/)(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(rel)) errors.push(`reserved file name: ${rel}`);
    const k = rel.toLowerCase();
    if (lower.has(k)) errors.push(`case-colliding paths: ${lower.get(k)} vs ${rel}`);
    else lower.set(k, rel);
    try { fs.accessSync(abs, fs.constants.R_OK); } catch { errors.push(`unreadable: ${rel}`); }
    try { if (fs.statSync(abs).size === 0 && /\.(json|js|png|svg)$/.test(rel)) errors.push(`empty file: ${rel}`); } catch { /* reported above */ }
    if (rel.endsWith('.json') && !rel.startsWith('node_modules/') && !rel.startsWith('assets/templates/')) {
      try { JSON.parse(fs.readFileSync(abs, 'utf8')); } catch (e) { errors.push(`invalid JSON: ${rel} (${e.message.slice(0, 80)})`); }
    }
    const base = path.basename(rel);
    if (IMG[base] && /^drivers\/[^/]+\/assets\/images\//.test(rel)) {
      const s = pngSize(abs);
      if (!s) errors.push(`not a PNG: ${rel}`);
      else if (s[0] !== IMG[base][0] || s[1] !== IMG[base][1]) errors.push(`image ${rel} is ${s.join('x')}, expected ${IMG[base].join('x')}`);
    }
    // Relative require() closure: every ./ or ../ require must resolve inside the payload.
    if (rel.endsWith('.js') && !rel.startsWith('node_modules/')) {
      // strip block + line comments so commented-out examples are not flagged
      const src = fs.readFileSync(abs, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
      const re = /require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
      let m;
      while ((m = re.exec(src))) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1]));
        const cands = [target, `${target}.js`, `${target}.json`, `${target}/index.js`];
        if (cands.some((c) => set.has(c))) continue;
        // A require guarded by try/catch in the preceding lines is an optional CI-only module.
        const before = src.slice(Math.max(0, m.index - 400), m.index);
        const t = before.search(/try\s*\{(?![\s\S]*try\s*\{)/);
        if (t >= 0 && !/\bcatch\b/.test(before.slice(t))) warns.push(`optional require('${m[1]}') absent in ${rel} (try-guarded)`);
        else errors.push(`unresolved require('${m[1]}') in ${rel}`);
      }
    }
  }

  const appPath = path.join(root, 'app.json');
  if (!fs.existsSync(appPath)) { errors.push('app.json missing'); return { errors, warns, files: files.length }; }
  const appBytes = fs.statSync(appPath).size;
  if (appBytes > MAX_JSON_MB * 1024 * 1024) errors.push(`app.json ${(appBytes / 1048576).toFixed(2)} MB > ${MAX_JSON_MB} MB`);
  const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
  const ids = new Map();
  for (const d of app.drivers || []) {
    if (ids.has(d.id)) errors.push(`duplicate driver id: ${d.id}`);
    ids.set(d.id, true);
    if (!fs.existsSync(path.join(root, 'drivers', d.id))) errors.push(`driver dir missing for ${d.id}`);
    for (const f of ['driver.js', 'device.js']) if (!set.has(`drivers/${d.id}/${f}`)) warns.push(`drivers/${d.id}/${f} missing`);
    for (const k of ['small', 'large']) {
      const p = d.images && d.images[k];
      if (p && !set.has(p.replace(/^\//, ''))) errors.push(`driver ${d.id} image ${k} points to missing ${p}`);
    }
  }
  for (const dir of fs.existsSync(path.join(root, 'drivers')) ? fs.readdirSync(path.join(root, 'drivers')) : []) {
    if (!ids.has(dir) && !dir.startsWith('.')) warns.push(`driver dir not in manifest: drivers/${dir}`);
  }
  const caps = new Set(Object.keys(app.capabilities || {}));
  for (const type of ['triggers', 'conditions', 'actions']) {
    const seen = new Set();
    for (const c of (app.flow && app.flow[type]) || []) {
      if (!c.id) { errors.push(`flow ${type} card without id`); continue; }
      if (seen.has(c.id)) errors.push(`duplicate flow ${type} id: ${c.id}`);
      seen.add(c.id);
      const argNames = new Set();
      for (const a of c.args || []) {
        if (!a.name) errors.push(`flow ${type} ${c.id}: arg without name`);
        if (argNames.has(a.name)) errors.push(`flow ${type} ${c.id}: duplicate arg ${a.name}`);
        argNames.add(a.name);
        if (a.type === 'device' && a.filter) {
          const m = /driver_id=([^&]+)/.exec(a.filter);
          if (m) for (const id of m[1].split('|')) {
            if (id === '*') continue;
            if (!/^[a-z0-9_-]+$/i.test(id)) warns.push(`flow ${type} ${c.id}: malformed device filter token "${id}"`);
            else if (!ids.has(id)) warns.push(`flow ${type} ${c.id}: device filter names driver ${id} absent from this payload`);
          }
        }
      }
    }
  }
  for (const d of app.drivers || []) for (const cap of d.capabilities || []) {
    const base = String(cap).split('.')[0];
    if (caps.size && !caps.has(base) && !caps.has(cap) && /^(measure|meter|alarm|onoff|dim|light|target|thermostat|windowcoverings|button|volume|speaker|locked|homealarm|vacuumcleaner|channel)_?/.test(base) === false) {
      warns.push(`driver ${d.id}: capability ${cap} not system-like and not custom`);
    }
  }
  if (!fs.existsSync(path.join(root, 'locales', 'en.json'))) warns.push('locales/en.json missing');
  return { errors, warns, files: files.length, drivers: ids.size, appJsonBytes: appBytes };
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: payload-preflight.cjs <dir>'); process.exit(2); }
  const r = preflight(path.resolve(dir));
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`[payload-preflight] ${r.files} files, ${r.drivers} drivers, app.json ${((r.appJsonBytes || 0) / 1048576).toFixed(2)} MB`);
    for (const w of r.warns.slice(0, 40)) console.log(`  WARN ${w}`);
    if (r.warns.length > 40) console.log(`  ... ${r.warns.length - 40} more warnings`);
    for (const e of r.errors) console.log(`  ERROR ${e}`);
  }
  process.exit(r.errors.length ? 1 : 0);
}
module.exports = { preflight };
