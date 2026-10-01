'use strict';
/**
 * scripts/digest/lib.js — shared helpers for the free "Grok bot replacement" digests.
 * Node >= 20 built-ins only (global fetch, child_process). No npm deps.
 *
 * State lives in the body of ONE tracking issue ("🤖 Daily digest", label bot-digest)
 * inside a hidden HTML comment. Editing the body is silent; posting a comment makes
 * GitHub e-mail the owner (= free notification). Each digest owns one state key and
 * re-reads the body right before writing, so concurrent digests do not clobber each other.
 *
 * Env:
 *   GITHUB_TOKEN        token (Actions GITHUB_TOKEN). Optional for public reads.
 *   GITHUB_REPOSITORY   owner/repo hosting the tracking issue (default dlnraja/com.tuya.zigbee)
 *   DIGEST_DRY_RUN=1    never write (print the comment + new state instead)
 *   DIGEST_USE_GH_CLI=1 local testing: route API calls through an authenticated `gh api`
 *   DIGEST_FORCE=1      post even if nothing changed (manual dispatch "force")
 *   DIGEST_MIN_RATE_REMAINING (50) stop gracefully below this x-ratelimit-remaining
 *   DIGEST_MAX_API_CALLS (250)     hard cap of GitHub API calls per run
 * Every GitHub call is spaced by a random 300–800 ms delay.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');

const API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPOSITORY || 'dlnraja/com.tuya.zigbee';
const DRY = process.env.DIGEST_DRY_RUN === '1';
const FORCE = process.env.DIGEST_FORCE === '1';
const ISSUE_TITLE = '🤖 Daily digest';
const ISSUE_LABEL = 'bot-digest';
const STATE_RE = /<!-- digest-state:BEGIN\n([\s\S]*?)\ndigest-state:END -->/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (min, max) => sleep(min + Math.floor(Math.random() * (max - min + 1)));
const UA = 'dlnraja-com.tuya.zigbee-digest/1.0 (+https://github.com/dlnraja/com.tuya.zigbee)';
const MIN_REMAINING = Number(process.env.DIGEST_MIN_RATE_REMAINING || 50);
let apiCalls = 0;

/** Thrown to stop a digest gracefully (rate limit low / remote asked us to back off). */
class StopDigest extends Error { constructor(msg) { super(msg); this.name = 'StopDigest'; } }
/** Wrap a script's main(): StopDigest => exit 0 with a notice (no state write, no retry storm). */
function run(main) {
  main().catch((e) => {
    if (e && e.name === 'StopDigest') { console.log(`::notice::digest stopped gracefully: ${e.message}`); process.exit(0); }
    console.error(e); process.exit(1);
  });
}
const log = (...a) => console.error('[digest]', ...a);

async function gh(path, { method = 'GET', body, allow404 = false, raw = false } = {}) {
  if (apiCalls++ > 0) await jitter(300, 800); // be gentle: spread calls out
  if (apiCalls > Number(process.env.DIGEST_MAX_API_CALLS || 250)) throw new StopDigest(`API call budget exceeded (${apiCalls})`);
  if (process.env.DIGEST_USE_GH_CLI === '1') {
    const args = ['api', '-X', method, path.replace(API, ''), '-H', 'Accept: application/vnd.github+json'];
    if (body) args.push('--input', '-');
    const r = spawnSync('gh', args, { input: body ? JSON.stringify(body) : undefined, encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0) {
      if (allow404 && /404|Not Found/.test(r.stderr + r.stdout)) return null;
      throw new Error(`gh api ${method} ${path}: ${(r.stderr || r.stdout).slice(0, 300)}`);
    }
    return r.stdout.trim() ? JSON.parse(r.stdout) : {};
  }
  const url = path.startsWith('http') ? path : API + path;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': UA, 'X-GitHub-Api-Version': '2022-11-28' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  if (body) headers['Content-Type'] = 'application/json';
  for (let attempt = 0; attempt < 4; attempt++) {
    let res;
    try {
      res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
    } catch (e) {
      log(`network error ${url}: ${e.message}`);
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (res.status === 404 && allow404) return null;
    const remHdr = res.headers.get('x-ratelimit-remaining');
    const remaining = remHdr == null ? Infinity : Number(remHdr);
    if ((res.status === 403 || res.status === 429) && (remaining === 0 || res.headers.get('retry-after'))) {
      const ra = Number(res.headers.get('retry-after') || 0) * 1000;
      if (ra > 0 && ra <= 60000 && attempt === 0) { log(`Retry-After ${ra / 1000}s`); await sleep(ra); continue; } // one polite retry max
      throw new StopDigest(`GitHub rate limit hit on ${path} (remaining=${remHdr}, retry-after=${res.headers.get('retry-after')})`);
    }
    if (remaining < MIN_REMAINING) throw new StopDigest(`x-ratelimit-remaining=${remaining} < ${MIN_REMAINING}`);
    if (res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${(await res.text()).slice(0, 300)}`);
    if (raw) return res.text();
    const t = await res.text();
    return t ? JSON.parse(t) : {};
  }
  throw new Error(`giving up on ${url}`);
}

/**
 * Polite public JSON fetch (Discourse). Descriptive UA, NO retry on 429/403 (throws
 * StopDigest with .status so the caller can record a back-off), one retry on network/5xx.
 */
async function fetchJson(url) {
  for (let i = 0; i < 2; i++) {
    let res;
    try {
      res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
    } catch (e) {
      if (i) throw e;
      await jitter(5000, 10000);
      continue;
    }
    if (res.status === 429 || res.status === 403) {
      const err = new StopDigest(`${url} -> ${res.status} (retry-after=${res.headers.get('retry-after')})`);
      err.status = res.status; err.retryAfter = Number(res.headers.get('retry-after') || 0);
      throw err;
    }
    if (res.status >= 500 && !i) { await jitter(5000, 10000); continue; }
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  }
}

/** Raw file content at ref via contents API (works for public repos without token). */
async function fileAt(repo, ref, path) {
  const j = await gh(`/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(ref)}`, { allow404: true });
  if (!j) return null;
  if (j.content) return Buffer.from(j.content, 'base64').toString('utf8');
  // Files > 1 MB (e.g. the generated root app.json) come back without content: use raw URL.
  if (j.download_url) {
    const res = await fetch(j.download_url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) });
    return res.ok ? res.text() : null;
  }
  return null;
}

// ---------- tracking issue + state ----------
async function findTrackingIssue({ create = true } = {}) {
  const list = await gh(`/repos/${REPO}/issues?state=open&labels=${ISSUE_LABEL}&per_page=10`);
  let issue = (list || []).find((i) => !i.pull_request && i.title === ISSUE_TITLE) || (list || []).find((i) => !i.pull_request);
  if (issue || !create) return issue || null;
  if (DRY) { log('DRY: would create tracking issue'); return null; }
  try { await gh(`/repos/${REPO}/labels`, { method: 'POST', body: { name: ISSUE_LABEL, color: '5319e7', description: 'Free GitHub Actions digest (state + notifications)' } }); } catch (_) { /* exists */ }
  issue = await gh(`/repos/${REPO}/issues`, { method: 'POST', body: { title: ISSUE_TITLE, labels: [ISSUE_LABEL], body: renderBody({}) } });
  log(`created tracking issue #${issue.number}`);
  return issue;
}

function parseState(body) {
  const m = STATE_RE.exec(body || '');
  if (!m) return {};
  try { return JSON.parse(m[1]); } catch (_) { return {}; }
}

function renderBody(state) {
  return [
    '# 🤖 Daily digest',
    '',
    'Issue de suivi des digests **gratuits** (GitHub Actions + `GITHUB_TOKEN`) qui remplacent les routines Grok Bot.',
    'Chaque commentaire = quelque chose a changé (GitHub envoie un e-mail au propriétaire). Rien de nouveau ⇒ silence.',
    '',
    '| Workflow | Rôle |',
    '|---|---|',
    "| `daily-digest.yml` (nouveau) | Homey 08:16 + Labs 08:49 + Forum 10:23 + Inspiration 11:41 (Paris), jours ouvrés ; inclut diags Gmail |",
    "| `daily-digest.yml` › job *inspiration* | JohanBendz : issues/PR (ouvertes+fermées, bots inclus) + workflows → pistes non mappées + recherche Z2M/ZHA/Blakadder (11:41 Paris, ≤100 éléments/jour) |",
    "| `daily-digest.yml` › job *forum* | Nouveaux posts topic 140352 + mfr/productId absents des drivers (10:23 Paris, jours ouvrés) |",
    "| `autonomous-verification.yml` › job *ci-health* | Rouge/vert des workflows master & stable-v5 (08:30 + 16:15 Paris jours ouvrés, transitions seulement) |",
    "| `notifications.yml` › job *digest-event* | PR ouverte/mergée + CI rouge/vert sur master (temps réel, ≤1 commentaire CI / 30 min) |",
    '',
    `_Dernière mise à jour de l'état : ${new Date().toISOString()}_ — ne pas éditer le bloc ci-dessous (état machine).`,
    '',
    '<!-- digest-state:BEGIN',
    JSON.stringify(state),
    'digest-state:END -->',
  ].join('\n');
}

async function loadState(key) {
  // Local dry-run with a state file: no API call for the tracking issue.
  const issue = DRY && process.env.DIGEST_STATE_FILE ? null : await findTrackingIssue({ create: !DRY });
  const full = issue ? parseState(issue.body) : {};
  if (process.env.DIGEST_STATE_FILE && fs.existsSync(process.env.DIGEST_STATE_FILE)) {
    Object.assign(full, JSON.parse(fs.readFileSync(process.env.DIGEST_STATE_FILE, 'utf8')));
  }
  return { issue, prev: full[key] || null };
}

async function saveState(issue, key, value) {
  if (DRY || !issue) {
    log(`DRY: new state[${key}] =`, JSON.stringify(value).slice(0, 600));
    if (process.env.DIGEST_STATE_FILE) {
      let cur = {};
      try { cur = JSON.parse(fs.readFileSync(process.env.DIGEST_STATE_FILE, 'utf8')); } catch (_) {}
      cur[key] = value;
      fs.writeFileSync(process.env.DIGEST_STATE_FILE, JSON.stringify(cur, null, 1));
    }
    return;
  }
  const fresh = await gh(`/repos/${REPO}/issues/${issue.number}`); // re-read: merge only our key
  const st = parseState(fresh.body);
  st[key] = value;
  const body = renderBody(st);
  if (body.length > 65000) throw new Error('state too large for issue body');
  await gh(`/repos/${REPO}/issues/${issue.number}`, { method: 'PATCH', body: { body } });
}

async function postComment(issue, markdown) {
  if (DRY || !issue) {
    console.log('----- DRY RUN: comment that would be posted -----\n' + markdown + '\n-----');
    return;
  }
  await gh(`/repos/${REPO}/issues/${issue.number}/comments`, { method: 'POST', body: { body: markdown } });
  log(`commented on #${issue.number}`);
}

function summary(md) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
}

/** Paris-time label for an ISO timestamp. */
function paris(iso) {
  if (!iso) return '?';
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) + ' (Paris)';
}
const short = (sha) => (sha || '').slice(0, 7);
const esc = (s) => String(s || '').replace(/[|<>@]/g, (c) => ({ '|': '\\|', '<': '&lt;', '>': '&gt;', '@': '@\u200b' }[c])).slice(0, 120);

module.exports = { renderBody, run, StopDigest, jitter, UA, gh, fetchJson, fileAt, findTrackingIssue, loadState, saveState, postComment, summary, paris, short, esc, log, sleep, REPO, DRY, FORCE };
