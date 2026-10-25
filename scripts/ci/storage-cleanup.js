#!/usr/bin/env node
'use strict';
/**
 * P3033 — CI storage cleanup (GitHub Actions caches + artifacts), run daily by
 * .github/workflows/storage-cleanup.yml. The repo hit 10.66 GB of the 10 GB cache quota in Oct 2026;
 * GitHub then evicts the oldest entries itself, including the state caches some workflows depend on.
 *
 * Selection is pure (selectCacheDeletions / selectArtifactDeletions, unit-tested in
 * test/critical/p3033-storage-cleanup.test.js); the I/O part only lists, deletes and reports.
 *
 * Cache rules, per family (key with its trailing hash / run id / version removed) and ref:
 *  - the ref is gone (deleted branch, closed PR)              -> delete  (ref-gone)
 *  - not the newest entry of its family on that ref           -> delete  (superseded)
 *  - newest on master / stable-v5 / bastien-home              -> keep, whatever its age
 *  - newest of a state family (run_id keyed, state/baseline)  -> keep, whatever its age
 *  - newest, other family, not accessed for 7+ days           -> delete  (idle)
 * Artifacts: delete when older than 14 days, except the newest artifact of a name another
 * workflow downloads from an earlier run (gh run download -n/-p, download-artifact run-id).
 *
 * Usage: node scripts/ci/storage-cleanup.js [--apply] [--out=DIR] [--max-deletions=N] [--json]
 * Without --apply nothing is deleted (dry run). Never exits non-zero for a quota warning (report mode).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const DAY_MS = 86400000;
const PROTECTED_REFS = ['refs/heads/master', 'refs/heads/stable-v5', 'refs/heads/bastien-home'];
const DEFAULTS = { maxIdleDays: 7, artifactMaxAgeDays: 14, maxDeletions: 400, maxPages: 40 };
// WHY: names that say "this cache carries state forward" even when the key is not run_id based.
const STATE_WORD = /state|baseline|ledger|queue|mirrors|checkpoint/i;

// ───────────────────────── pure helpers ─────────────────────────

/** Family of a cache key: hashes become '*', trailing run ids / versions / '-*' are dropped. */
function cacheFamily(key) {
  let k = String(key || '').replace(/[0-9a-f]{16,}/gi, '*');
  let prev;
  do {
    prev = k;
    k = k.replace(/[-_.]v?\d+(?:\.\d+)*$/i, '').replace(/[-_]\*$/, '').replace(/[-_]+$/, '');
  } while (k !== prev && k.length > 0);
  return k;
}

function globToRegExp(glob) {
  const esc = String(glob).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${esc}$`);
}

/** Turn a workflow `key:` template into a glob over real keys (expressions become '*', runner.os -> Linux). */
function keyTemplateToGlob(tpl) {
  return String(tpl || '').trim().replace(/^['"]|['"]$/g, '')
    .replace(/\$\{\{\s*runner\.os\s*\}\}/g, 'Linux')
    .replace(/\$\{\{\s*runner\.arch\s*\}\}/g, 'X64')
    .replace(/\$\{\{[^}]*\}\}/g, '*');
}

/** Family name for display: the glob with its trailing hash / run id part removed. */
function keyTemplateToFamily(tpl) {
  return cacheFamily(keyTemplateToGlob(tpl));
}

/**
 * actions/cache (and /restore, /save) keys declared in one workflow text.
 * Returns [{ glob, family, state, template }]; state = run_id/run_number keyed or a state-like name.
 * A glob made only of wildcards and separators is dropped (it would match every key).
 */
function parseWorkflowCacheKeys(text) {
  const lines = String(text || '').split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)-?\s*uses:\s*actions\/cache(?:\/(?:restore|save))?@/.exec(lines[i]);
    if (!m) {continue;}
    const indent = m[1].length;
    for (let j = i + 1; j < Math.min(lines.length, i + 40); j++) {
      const l = lines[j];
      const ind = l.length - l.trimStart().length;
      if (l.trim() && ind <= indent && /^\s*-\s/.test(l)) {break;}
      const km = /^\s*key:\s*(.+)$/.exec(l);
      if (km) {
        const template = km[1].trim();
        const glob = keyTemplateToGlob(template);
        const family = keyTemplateToFamily(template);
        const state = /github\.run_(id|number|attempt)/.test(template) || STATE_WORD.test(family);
        if (/[A-Za-z0-9]{2,}/.test(glob.replace(/Linux|X64/g, ''))) {out.push({ glob, family, state, template });}
        break;
      }
    }
  }
  return out;
}

/** Artifact names another run downloads later (cross-run consumers). Globs allowed. */
function parseWorkflowArtifactConsumers(text) {
  const t = String(text || '');
  const names = new Set();
  const re = /gh\s+run\s+download\b[^\n]*?\s(?:-n|--name|-p|--pattern)[ =]+['"]?([^\s'"]+)/g;
  for (const m of t.matchAll(re)) {names.add(m[1].replace(/\$\{\{[^}]*\}\}|\$\{?\w+\}?/g, '*'));}
  // download-artifact with run-id: reads an artifact of another run.
  const lines = t.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!/uses:\s*(actions\/download-artifact|dawidd6\/action-download-artifact)@/.test(lines[i])) {continue;}
    const block = lines.slice(i + 1, i + 15);
    const end = block.findIndex((l) => /^\s*-\s/.test(l));
    const body = (end >= 0 ? block.slice(0, end) : block).join('\n');
    if (!/run-id:|run_id:|workflow:/.test(body) && !/dawidd6/.test(lines[i])) {continue;}
    const nm = /(?:name|pattern):\s*['"]?([^\s'"]+)/.exec(body);
    names.add(nm ? nm[1].replace(/\$\{\{[^}]*\}\}/g, '*') : '*');
  }
  return [...names];
}

const ts = (s) => { const v = Date.parse(s); return Number.isFinite(v) ? v : 0; };

function isProtectedRef(ref, protectedRefs = PROTECTED_REFS) { return protectedRefs.includes(ref); }

/** existingRefs null = unknown (API failed): never delete on the "ref gone" rule then. */
function refAlive(ref, existingRefs, protectedRefs = PROTECTED_REFS) {
  if (isProtectedRef(ref, protectedRefs)) {return true;}
  if (!existingRefs) {return true;}
  if (/^refs\/(heads|pull)\//.test(ref)) {return existingRefs.has(ref);}
  return true; // tags and anything else: not judged
}

/**
 * @param caches [{id,key,ref,size_in_bytes,created_at,last_accessed_at}]
 * @param opts {now, existingRefs:Set|null, protectedRefs, stateKeys:[glob over keys], maxIdleDays, maxDeletions}
 * @returns {{ delete: object[], keep: object[], capped: number }}
 */
function selectCacheDeletions(caches, opts = {}) {
  const now = opts.now != null ? opts.now : Date.now();
  const protectedRefs = opts.protectedRefs || PROTECTED_REFS;
  const maxIdleMs = (opts.maxIdleDays != null ? opts.maxIdleDays : DEFAULTS.maxIdleDays) * DAY_MS;
  const stateRes = (opts.stateKeys || []).map(globToRegExp);
  const isState = (c) => STATE_WORD.test(c.family) || stateRes.some((r) => r.test(c.key));
  const groups = new Map();
  for (const c of caches || []) {
    const family = cacheFamily(c.key);
    const g = `${family}\u0000${c.ref}`;
    if (!groups.has(g)) {groups.set(g, []);}
    groups.get(g).push({ ...c, family });
  }
  const del = [];
  const keep = [];
  for (const list of groups.values()) {
    list.sort((a, b) => (ts(b.created_at) - ts(a.created_at)) || ((b.id || 0) - (a.id || 0)));
    list.forEach((c, idx) => {
      const row = { id: c.id, key: c.key, ref: c.ref, family: c.family, size: c.size_in_bytes || 0, last_accessed_at: c.last_accessed_at, created_at: c.created_at };
      if (!refAlive(c.ref, opts.existingRefs, protectedRefs)) {return del.push({ ...row, reason: 'ref-gone' });}
      if (idx > 0) {return del.push({ ...row, reason: 'superseded' });}
      if (isProtectedRef(c.ref, protectedRefs)) {return keep.push({ ...row, reason: 'newest-protected-ref' });}
      if (isState(c)) {return keep.push({ ...row, reason: 'newest-state-family' });}
      const idle = now - ts(c.last_accessed_at || c.created_at);
      if (idle >= maxIdleMs) {return del.push({ ...row, reason: 'idle' });}
      return keep.push({ ...row, reason: 'newest' });
    });
  }
  return capDeletions(del, keep, opts.maxDeletions);
}

function capDeletions(del, keep, maxDeletions) {
  const cap = maxDeletions != null ? maxDeletions : DEFAULTS.maxDeletions;
  // WHY: biggest first so a capped run still frees the most space.
  del.sort((a, b) => b.size - a.size);
  if (del.length <= cap) {return { delete: del, keep, capped: 0 };}
  const extra = del.slice(cap).map((r) => ({ ...r, reason: `capped:${r.reason}` }));
  return { delete: del.slice(0, cap), keep: keep.concat(extra), capped: extra.length };
}

/**
 * @param artifacts [{id,name,size_in_bytes,created_at,expired}]
 * @param opts {now, maxAgeDays, consumers:[glob], maxDeletions}
 */
function selectArtifactDeletions(artifacts, opts = {}) {
  const now = opts.now != null ? opts.now : Date.now();
  const maxAgeMs = (opts.maxAgeDays != null ? opts.maxAgeDays : DEFAULTS.artifactMaxAgeDays) * DAY_MS;
  const consumerRes = (opts.consumers || []).map(globToRegExp);
  const consumed = (name) => consumerRes.some((r) => r.test(name));
  const newestByName = new Map();
  for (const a of artifacts || []) {
    if (a.expired) {continue;}
    const cur = newestByName.get(a.name);
    if (!cur || ts(a.created_at) > ts(cur.created_at)) {newestByName.set(a.name, a);}
  }
  const del = [];
  const keep = [];
  for (const a of artifacts || []) {
    if (a.expired) {continue;}
    const row = { id: a.id, name: a.name, size: a.size_in_bytes || 0, created_at: a.created_at };
    const old = now - ts(a.created_at) >= maxAgeMs;
    if (!old) { keep.push({ ...row, reason: 'recent' }); continue; }
    if (consumed(a.name) && newestByName.get(a.name) === a) { keep.push({ ...row, reason: 'newest-consumed-later' }); continue; }
    del.push({ ...row, reason: 'age' });
  }
  return capDeletions(del, keep, opts.maxDeletions);
}

function totals(rows, sizeField = 'size_in_bytes') {
  let bytes = 0;
  for (const r of rows || []) {bytes += Number(r[sizeField] != null ? r[sizeField] : r.size) || 0;}
  return { count: (rows || []).length, bytes };
}

function fmtBytes(b) {
  if (b >= 1e9) {return `${(b / 1e9).toFixed(2)} GB`;}
  if (b >= 1e6) {return `${(b / 1e6).toFixed(1)} MB`;}
  if (b >= 1e3) {return `${(b / 1e3).toFixed(1)} KB`;}
  return `${b} B`;
}

/** Cache quota from config/platform-limits.json (gha_cache_gb), same thresholds as the budget gate. */
function cacheQuota(cfg) {
  const def = (cfg && cfg.limits && cfg.limits.gha_cache_gb) || {};
  return {
    limitGb: def.limit || 10,
    warnPct: def.warnPct || (cfg && cfg.warnPct) || 80,
    failPct: def.failPct || (cfg && cfg.failPct) || 90,
  };
}

function quotaState(bytes, quota) {
  const pct = (bytes / 1e9 / quota.limitGb) * 100;
  return { pct, warn: pct >= quota.warnPct, overFail: pct >= quota.failPct };
}

function countBy(rows, field) {
  const m = {};
  for (const r of rows) {m[r[field]] = (m[r[field]] || 0) + 1;}
  return m;
}

function buildSummary(r) {
  const L = [];
  L.push(`## Storage cleanup (P3033) — ${r.dryRun ? 'DRY RUN' : 'applied'}`);
  L.push('');
  L.push('| | before | after | deleted |');
  L.push('|---|---|---|---|');
  L.push(`| caches | ${r.before.caches.count} / ${fmtBytes(r.before.caches.bytes)} | ${r.after.caches.count} / ${fmtBytes(r.after.caches.bytes)} | ${r.deleted.caches.count} / ${fmtBytes(r.deleted.caches.bytes)} |`);
  L.push(`| artifacts (not expired) | ${r.before.artifacts.count} / ${fmtBytes(r.before.artifacts.bytes)} | ${r.after.artifacts.count} / ${fmtBytes(r.after.artifacts.bytes)} | ${r.deleted.artifacts.count} / ${fmtBytes(r.deleted.artifacts.bytes)} |`);
  L.push('');
  L.push(`Cache quota: ${r.quota.limitGb} GB (warn ${r.quota.warnPct} %) — after: **${r.after.quotaPct.toFixed(1)} %**${r.after.quotaWarn ? ' ⚠️' : ''}. ${r.usageEndpoint ? `Usage endpoint (lags after deletes): ${fmtBytes(r.usageEndpoint.bytes)} / ${r.usageEndpoint.count} entries.` : ''}`);
  L.push('');
  L.push(`Cache reasons — delete: ${JSON.stringify(countBy(r.cachePlan.delete, 'reason'))}; keep: ${JSON.stringify(countBy(r.cachePlan.keep, 'reason'))}`);
  L.push(`Artifact reasons — delete: ${JSON.stringify(countBy(r.artifactPlan.delete, 'reason'))}; keep: ${JSON.stringify(countBy(r.artifactPlan.keep, 'reason'))}`);
  if (r.refsUnknown) {L.push('- Branch/PR list unavailable: the "ref gone" rule was skipped this run.');}
  if (r.errors.length) {L.push(`- Errors (${r.errors.length}): ${r.errors.slice(0, 5).join(' | ')}`);}
  L.push('');
  L.push(`State cache keys kept newest per ref (from workflow keys): ${r.stateFamilies.join(', ') || 'none'}`);
  L.push(`Artifacts downloaded by later runs: ${r.consumers.join(', ') || 'none'}`);
  const fam = {};
  for (const d of r.cachePlan.delete) {fam[d.family] = (fam[d.family] || 0) + d.size;}
  const top = Object.entries(fam).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (top.length) {
    L.push('');
    L.push(`Top cache families freed: ${  top.map(([f, b]) => `\`${f}\` ${fmtBytes(b)}`).join(', ')}`);
  }
  return `${L.join('\n')  }\n`;
}

// ───────────────────────── I/O ─────────────────────────

/** Workflows plus local composite actions (.github/actions/<name>/action.yml also declare caches). */
function readWorkflows(root = ROOT) {
  const out = [];
  const wf = path.join(root, '.github', 'workflows');
  try {
    for (const f of fs.readdirSync(wf)) {if (/\.ya?ml$/.test(f)) {out.push({ file: f, text: fs.readFileSync(path.join(wf, f), 'utf8') });}}
  } catch { /* no workflows */ }
  const act = path.join(root, '.github', 'actions');
  try {
    for (const d of fs.readdirSync(act)) {
      for (const f of ['action.yml', 'action.yaml']) {
        const p = path.join(act, d, f);
        if (fs.existsSync(p)) {out.push({ file: `actions/${d}/${f}`, text: fs.readFileSync(p, 'utf8') });}
      }
    }
  } catch { /* no local actions */ }
  return out;
}

function token() {
  if (process.env.GITHUB_TOKEN) {return process.env.GITHUB_TOKEN;}
  if (process.env.GH_TOKEN) {return process.env.GH_TOKEN;}
  const r = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8', timeout: 15000 });
  return r.status === 0 ? r.stdout.trim() : '';
}

function makeApi(repo, tok) {
  const { fetchWithRetry } = require(path.join(ROOT, '.github', 'scripts', 'retry-helper.js'));
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'storage-cleanup-p3033' };
  if (tok) {headers.Authorization = `Bearer ${tok}`;}
  const base = `https://api.github.com/repos/${repo}`;
  async function call(p, method = 'GET') {
    // retry-helper: 403/429 rate limits (retry-after / x-ratelimit-reset), 5xx and network errors, bounded.
    const r = await fetchWithRetry(base + p, { method, headers }, { retries: 4, maxDelay: 120000, timeout: 30000, label: `gh ${method}` });
    if (method === 'DELETE') {return r.status === 204 || r.status === 404;}
    if (!r.ok) {throw new Error(`${method} ${p} -> HTTP ${r.status}`);}
    return r.json();
  }
  async function listAll(p, field, maxPages = DEFAULTS.maxPages) {
    const out = [];
    for (let page = 1; page <= maxPages; page++) {
      const sep = p.includes('?') ? '&' : '?';
      const j = await call(`${p}${sep}per_page=100&page=${page}`);
      const items = field ? j[field] || [] : j;
      out.push(...items);
      if (items.length < 100) {break;}
    }
    return out;
  }
  return { call, listAll };
}

async function existingRefsOf(api, errors) {
  try {
    const refs = new Set();
    for (const b of await api.listAll('/branches')) {refs.add(`refs/heads/${b.name}`);}
    for (const pr of await api.listAll('/pulls?state=open')) {
      refs.add(`refs/pull/${pr.number}/merge`);
      refs.add(`refs/pull/${pr.number}/head`);
    }
    return refs;
  } catch (e) {
    errors.push(`refs: ${e.message}`);
    return null;
  }
}

function parseArgs(argv) {
  const a = { apply: false, out: '', json: false, maxDeletions: DEFAULTS.maxDeletions };
  for (const s of argv) {
    if (s === '--apply') {a.apply = true;}
    else if (s === '--dry-run') {a.apply = false;}
    else if (s === '--json') {a.json = true;}
    else if (s.startsWith('--out=')) {a.out = s.slice(6);}
    else if (s.startsWith('--max-deletions=')) {a.maxDeletions = Math.max(0, parseInt(s.slice(16), 10) || 0);}
  }
  return a;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const repo = process.env.GITHUB_REPOSITORY || 'dlnraja/com.tuya.zigbee';
  const api = makeApi(repo, token());
  const errors = [];
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'platform-limits.json'), 'utf8')); } catch { /* defaults */ }
  const quota = cacheQuota(cfg);

  const wfs = readWorkflows();
  const stateDecl = wfs.flatMap((w) => parseWorkflowCacheKeys(w.text)).filter((k) => k.state);
  const stateKeys = [...new Set(stateDecl.map((k) => k.glob))].sort();
  const stateFamilies = [...new Set(stateDecl.map((k) => k.glob))].sort();
  const consumers = [...new Set(wfs.flatMap((w) => parseWorkflowArtifactConsumers(w.text)))].sort();

  const caches = await api.listAll('/actions/caches?sort=created_at&direction=desc', 'actions_caches');
  let artifacts = [];
  try { artifacts = await api.listAll('/actions/artifacts', 'artifacts'); } catch (e) { errors.push(`artifacts: ${e.message}`); }
  let usageEndpoint = null;
  try { const u = await api.call('/actions/cache/usage'); usageEndpoint = { bytes: u.active_caches_size_in_bytes, count: u.active_caches_count }; } catch { /* optional */ }
  const existingRefs = await existingRefsOf(api, errors);

  const now = Date.now();
  const cachePlan = selectCacheDeletions(caches, { now, existingRefs, stateKeys, maxDeletions: args.maxDeletions });
  const artifactPlan = selectArtifactDeletions(artifacts, { now, consumers, maxDeletions: args.maxDeletions });

  const done = { caches: [], artifacts: [] };
  if (args.apply) {
    for (const c of cachePlan.delete) {
      try { if (await api.call(`/actions/caches/${c.id}`, 'DELETE')) {done.caches.push(c);} else {errors.push(`cache ${c.id} not deleted`);} } catch (e) { errors.push(`cache ${c.id}: ${e.message}`); }
    }
    for (const a of artifactPlan.delete) {
      try { if (await api.call(`/actions/artifacts/${a.id}`, 'DELETE')) {done.artifacts.push(a);} else {errors.push(`artifact ${a.id} not deleted`);} } catch (e) { errors.push(`artifact ${a.id}: ${e.message}`); }
    }
  }
  const deleted = args.apply
    ? { caches: totals(done.caches, 'size'), artifacts: totals(done.artifacts, 'size') }
    : { caches: totals(cachePlan.delete, 'size'), artifacts: totals(artifactPlan.delete, 'size') };

  const liveArtifacts = artifacts.filter((a) => !a.expired);
  const before = { caches: totals(caches), artifacts: totals(liveArtifacts) };
  let afterCaches;
  if (args.apply) {
    try { afterCaches = totals(await api.listAll('/actions/caches', 'actions_caches')); } catch (e) { errors.push(`relist: ${e.message}`); }
  }
  if (!afterCaches) {afterCaches = { count: before.caches.count - deleted.caches.count, bytes: before.caches.bytes - deleted.caches.bytes };}
  const afterArtifacts = { count: before.artifacts.count - deleted.artifacts.count, bytes: before.artifacts.bytes - deleted.artifacts.bytes };
  const q = quotaState(afterCaches.bytes, quota);
  const report = {
    dryRun: !args.apply, repo, generatedAt: new Date(now).toISOString(), quota,
    before, after: { caches: afterCaches, artifacts: afterArtifacts, quotaPct: q.pct, quotaWarn: q.warn },
    deleted, usageEndpoint, refsUnknown: !existingRefs, stateFamilies, consumers, cachePlan, artifactPlan, errors,
  };
  const md = buildSummary(report);
  if (process.env.GITHUB_STEP_SUMMARY) { try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md); } catch { /* ignore */ } }
  if (args.out) {
    fs.mkdirSync(args.out, { recursive: true });
    fs.writeFileSync(path.join(args.out, 'storage-cleanup.json'), `${JSON.stringify(report, null, 2)  }\n`);
    fs.writeFileSync(path.join(args.out, 'SUMMARY.md'), md);
  }
  if (q.warn) {console.log(`::warning title=Actions cache still at ${q.pct.toFixed(1)} % of ${quota.limitGb} GB::After cleanup the cache uses ${fmtBytes(afterCaches.bytes)}. Look at the biggest families in the storage-cleanup summary.`);}
  if (errors.length) {console.log(`::warning title=Storage cleanup had ${errors.length} error(s)::${errors.slice(0, 3).join(' | ')}`);}
  console.log(args.json ? JSON.stringify(report, null, 2) : md);
  return report;
}

module.exports = {
  PROTECTED_REFS, DEFAULTS, cacheFamily, globToRegExp, keyTemplateToGlob, keyTemplateToFamily, readWorkflows, parseWorkflowCacheKeys,
  parseWorkflowArtifactConsumers, refAlive, selectCacheDeletions, selectArtifactDeletions, totals, fmtBytes,
  cacheQuota, quotaState, buildSummary, parseArgs, main,
};

if (require.main === module) {
  main().catch((e) => {
    // Report mode: a broken cleanup must be visible, but it never blocks anything else.
    console.log(`::warning title=Storage cleanup failed::${e && e.message}`);
    process.exitCode = 0;
  });
}
