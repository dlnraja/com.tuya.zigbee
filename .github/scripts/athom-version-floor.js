#!/usr/bin/env node
'use strict';
// WHY(2026-10-10, user rule): Homey versions must ALWAYS be strictly incremental on all apps
// (master, stable, bastien), including diagnostic/bisect uploads. Athom rejects (AggregateError /
// processing_failed) a version <= one already uploaded.
//
//   node athom-version-floor.js            -> print highest known version (Athom builds, git tags,
//                                             .github/homey-version-floor, local manifests)
//   node athom-version-floor.js --apply    -> set manifests to that highest so a +1 bump goes above it
//   node athom-version-floor.js --gate     -> exit 1 if app.json version <= highest Athom/floor/tag
// Env: HOMEY_PAT (optional; Athom lookup is skipped with a warning when absent), APP_ID (default
// from app.json id). Writes HOMEY_VERSION_FLOOR to $GITHUB_ENV when available.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const FLOOR_FILE = path.join(ROOT, '.github', 'homey-version-floor');
const MANIFESTS = ['app.json', '.homeycompose/app.json', 'package.json'].map((f) => path.join(ROOT, f));

const parse = (v) => { const m = String(v || '').match(/(\d+)\.(\d+)\.(\d+)/); return m ? m.slice(1).map(Number) : null; };
const cmp = (a, b) => { const x = parse(a), y = parse(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
const maxOf = (list) => list.filter((v) => parse(v)).sort(cmp).pop() || null;
const readVer = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')).version; } catch { return null; } };

async function athomVersions(appId) {
  const pat = process.env.HOMEY_PAT;
  if (!pat) { console.warn('::warning::HOMEY_PAT absent: Athom build history not consulted'); return []; }
  try { // preferred: same SDK client as verify-test-version (homey CLI AthomApi delegation)
    const c = require('./homey-apps-api-client');
    const client = await c.createClient();
    const vs = (await c.getBuilds(client, appId, { limit: 500 })).map((b) => b.version).filter(Boolean);
    if (vs.length) return vs;
  } catch (e) { console.warn(`SDK build list failed: ${String(e.message).split('\n')[0]}`); }
  let token = pat;
  try {
    const r = await fetch('https://api.athom.com/delegation/token', {
      method: 'POST', headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ audience: 'apps' }),
    });
    const b = await r.json().catch(() => ({}));
    token = b.token || (typeof b === 'string' ? b : pat);
  } catch (e) { console.warn(`delegation failed: ${e.message}`); }
  for (const url of [`https://apps-api.athom.com/api/v1/app/${appId}/build`, `https://apps-api.athom.com/api/v1/apps/${appId}/builds`]) {
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      if (!r.ok) continue;
      const body = await r.json();
      const list = Array.isArray(body) ? body : (body.items || body.data || body.builds || body.results || []);
      const vs = list.map((b) => b && (b.version || b.appVersion || b.semver)).filter(Boolean);
      if (vs.length) return vs;
    } catch (e) { console.warn(`builds fetch failed: ${e.message}`); }
  }
  console.warn('::warning::Athom build list unavailable');
  return [];
}

function tagVersions() {
  try { return execFileSync('git', ['tag', '-l', 'v*'], { cwd: ROOT, encoding: 'utf8' }).split('\n').map((t) => t.replace(/^v/, '')); }
  catch { return []; }
}

(async () => {
  const appId = process.env.APP_ID || JSON.parse(fs.readFileSync(MANIFESTS[0], 'utf8')).id;
  const local = readVer(MANIFESTS[0]);
  const athom = maxOf(await athomVersions(appId));
  // tags: only same major line as local (stray tags like v34.0.1 exist in history)
  const major = (parse(local) || [0])[0];
  const tag = maxOf(tagVersions().filter((v) => parse(v) && parse(v)[0] === major));
  const file = fs.existsSync(FLOOR_FILE) ? fs.readFileSync(FLOOR_FILE, 'utf8').trim() : null;
  const uploaded = maxOf([athom, tag, file]);
  console.log(`version-floor app=${appId} local=${local} athom=${athom} tag=${tag} file=${file} -> uploadedMax=${uploaded}`);
  if (process.env.GITHUB_ENV && uploaded) fs.appendFileSync(process.env.GITHUB_ENV, `HOMEY_VERSION_FLOOR=${uploaded}\n`);

  if (process.argv.includes('--gate')) {
    if (uploaded && cmp(local, uploaded) <= 0) {
      console.error(`::error::Version would not be strictly incremental: ${local} <= ${uploaded} (highest already uploaded/known). Refusing upload.`);
      process.exit(1);
    }
    console.log(`version gate OK: ${local} > ${uploaded}`);
    return;
  }
  if (process.argv.includes('--apply') && uploaded && cmp(uploaded, local) > 0) {
    for (const f of MANIFESTS) {
      if (!fs.existsSync(f)) continue;
      const s = fs.readFileSync(f, 'utf8');
      fs.writeFileSync(f, s.replace(/("version"\s*:\s*")[^"]+(")/, `$1${uploaded}$2`));
    }
    console.log(`manifests raised ${local} -> ${uploaded} (next bump goes above)`);
  }
})().catch((e) => { console.error(e); process.exit(process.argv.includes('--gate') ? 1 : 0); });
