'use strict';
/**
 * P3048 — minimal polite GitHub REST client for the automation scripts (free: GITHUB_TOKEN only).
 * Pause between calls, honours Retry-After / x-ratelimit-reset on 403/429 (max 2 waits, <= 90 s each),
 * never throws on read failures when { soft: true } (returns null). No third-party service.
 */
const API = process.env.GITHUB_API_URL || 'https://api.github.com';
const REPO = process.env.GITHUB_REPOSITORY || 'dlnraja/com.tuya.zigbee';
const PAUSE_MS = Number(process.env.AUTOMATION_GH_PAUSE_MS || 250);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let calls = 0;

function waitMs(res) {
  const ra = Number(res.headers.get('retry-after'));
  if (Number.isFinite(ra) && ra > 0) return Math.min(ra * 1000, 90000);
  const reset = Number(res.headers.get('x-ratelimit-reset'));
  if (Number.isFinite(reset) && reset > 0) return Math.min(Math.max(reset * 1000 - Date.now(), 1000), 90000);
  return 30000;
}

async function gh(apiPath, { method = 'GET', body, soft = false, raw = false, accept } = {}) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) { if (soft) return null; throw new Error('GITHUB_TOKEN missing'); }
  for (let attempt = 0; attempt < 3; attempt++) {
    if (calls++) await sleep(PAUSE_MS);
    let res;
    try {
      res = await fetch(apiPath.startsWith('http') ? apiPath : `${API}${apiPath}`, {
        method, body: body ? JSON.stringify(body) : undefined, redirect: 'follow',
        headers: { Authorization: `Bearer ${token}`, Accept: accept || 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'dlnraja-automation-p3048' },
        signal: AbortSignal.timeout(30000),
      });
    } catch (e) {
      if (attempt < 2) { await sleep(5000); continue; }
      if (soft) return null; throw e;
    }
    if ((res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')) && attempt < 2) { await sleep(waitMs(res)); continue; }
    if (!res.ok) { if (soft) return null; throw new Error(`GitHub ${method} ${apiPath} -> HTTP ${res.status}`); }
    if (res.status === 204) return {};
    return raw ? res.text() : res.json();
  }
  return null;
}

module.exports = { gh, REPO, sleep, callCount: () => calls };

/** P3048: newest unexpired artifact `name` from `branch`, returned as a Buffer (zip), or null. Read-only. */
async function latestArtifactZip(name, branch = 'master') {
  const r = await gh(`/repos/${REPO}/actions/artifacts?name=${encodeURIComponent(name)}&per_page=30`, { soft: true });
  const a = ((r && r.artifacts) || []).filter((x) => !x.expired && (!branch || (x.workflow_run || {}).head_branch === branch))
    .sort((x, y) => Date.parse(y.created_at) - Date.parse(x.created_at))[0];
  if (!a) return null;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const res = await fetch(a.archive_download_url, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'com.tuya.zigbee-automation' }, redirect: 'follow' });
  if (!res.ok) return null;
  return { artifact: a, zip: Buffer.from(await res.arrayBuffer()) };
}
module.exports.latestArtifactZip = latestArtifactZip;
