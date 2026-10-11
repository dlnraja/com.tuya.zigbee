#!/usr/bin/env node
'use strict';
/**
 * Read-only Athom build status (uses HOMEY_PAT the same way as direct-api-publish.js:
 * delegation token -> AthomAppsAPI). Prints recent builds and, for failed ones, the
 * error fields Athom returns (no secrets). Exit 2 = HOMEY_PAT rejected.
 * Writes data/status/homey-build-status.json.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const r = (id, extra = []) => require.resolve(id, { paths: [...extra, ROOT, process.cwd()] });
const appId = process.argv[2] || JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).homeyAppId || 'com.dlnraja.tuya.zigbee';

(async () => {
  const out = { checked_at: new Date().toISOString(), appId, pat: 'unknown', builds: [] };
  const file = path.join(ROOT, 'data', 'status', `homey-build-status-${appId}.json`);
  const save = () => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n'); };
  if (!process.env.HOMEY_PAT) { out.pat = 'missing'; save(); console.log('HOMEY_PAT missing'); process.exit(2); }
  const homeyRoot = path.dirname(r('homey/package.json'));
  let AthomApi;
  for (const id of ['homey/services/AthomApi', 'homey/lib/AthomApi']) { try { AthomApi = require(r(id)); if (AthomApi.createDelegationToken) break; } catch (_) { /* next */ } }
  const AthomAppsAPI = require(r('homey-api/lib/AthomAppsAPI', [homeyRoot]));
  let token;
  try {
    const t = await AthomApi.createDelegationToken({ audience: 'apps' });
    token = t?.token || t?.access_token || t;
    out.pat = 'valid';
  } catch (e) {
    out.pat = /invalid|unauthor|401|403/i.test(String(e.message)) ? 'invalid' : 'unknown';
    out.error = String(e.message).slice(0, 200);
    save(); console.log(`HOMEY_PAT ${out.pat}: ${out.error}`); process.exit(out.pat === 'invalid' ? 2 : 0);
  }
  const api = new AthomAppsAPI({ token });
  const list = await api.getBuilds({ $token: token, appId, $query: { limit: 10 } }).catch((e) => { out.error = e.message; return []; });
  const builds = (Array.isArray(list) ? list : list?.data || []).sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 8);
  for (const b of builds) {
    const row = { id: b.id, version: b.version, state: b.state, channel: b.channel || null, at: b.stateChangedAt };
    if (/fail|error|revoked/i.test(String(b.state))) {
      const full = await api.getBuild({ $token: token, appId, buildId: b.id }).catch(() => null);
      const src = full || b;
      for (const [k, v] of Object.entries(src)) {
        if (/err|reason|message|log|fail/i.test(k) && v) row[k] = typeof v === 'string' ? v.slice(0, 2000) : JSON.stringify(v).slice(0, 2000);
      }
    }
    out.builds.push(row);
    console.log(JSON.stringify(row));
  }
  save();
})().catch((e) => { console.log('build-status error:', e.message); process.exit(0); });
