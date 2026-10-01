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
const log = (...a) => console.error('[digest]', ...a);

async function gh(path, { method = 'GET', body, allow404 = false, raw = false } = {}) {
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
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'dlnraja-digest-bot', 'X-GitHub-Api-Version': '2022-11-28' };
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
    const remaining = Number(res.headers.get('x-ratelimit-remaining'));
    if ((res.status === 403 || res.status === 429) && (remaining === 0 || res.headers.get('retry-after'))) {
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
      const wait = res.headers.get('retry-after') ? Number(res.headers.get('retry-after')) * 1000 : Math.max(0, reset - Date.now()) + 1000;
      if (wait > 120000) throw new Error(`rate limited on ${url} (reset in ${Math.round(wait / 1000)}s) — set GITHUB_TOKEN`);
      log(`rate limited, waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    if (res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${(await res.text()).slice(0, 300)}`);
    if (raw) return res.text();
    const t = await res.text();
    return t ? JSON.parse(t) : {};
  }
  throw new Error(`giving up on ${url}`);
}

async function fetchJson(url, { tries = 4 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'dlnraja-digest-bot' }, signal: AbortSignal.timeout(30000) });
      if (res.status === 429) { await sleep(Number(res.headers.get('retry-after') || 10) * 1000); continue; }
      if (!res.ok) throw new Error(`${url} -> ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(3000 * (i + 1));
    }
  }
}

/** Raw file content at ref via contents API (works for public repos without token). */
async function fileAt(repo, ref, path) {
  const j = await gh(`/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(ref)}`, { allow404: true });
  if (!j) return null;
  if (j.content) return Buffer.from(j.content, 'base64').toString('utf8');
  // Files > 1 MB (e.g. the generated root app.json) come back without content: use raw URL.
  if (j.download_url) {
    const res = await fetch(j.download_url, { headers: { 'User-Agent': 'dlnraja-digest-bot' }, signal: AbortSignal.timeout(60000) });
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
    "| `daily-digest.yml` (nouveau) | Homey 08:16 + Labs AscendOS/Pulse 08:49 (Paris), jours ouvrés ; inclut diags Gmail |",
    "| `forum-poll.yml` › step *Forum watch* | Nouveaux posts topic 140352 + mfr/productId absents des drivers (4×/jour) |",
    "| `autonomous-verification.yml` › job *ci-health* | Rouge/vert des workflows master & stable-v5 (toutes les 6 h, transitions seulement) |",
    "| `notifications.yml` › job *digest-event* | PR ouverte/mergée + CI rouge/vert sur master (temps réel) |",
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

module.exports = { renderBody, gh, fetchJson, fileAt, findTrackingIssue, loadState, saveState, postComment, summary, paris, short, esc, log, sleep, REPO, DRY, FORCE };
