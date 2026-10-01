#!/usr/bin/env node
'use strict';
/**
 * scripts/leads/strict-apply.js — strict-rule fingerprint intake + tracking-issue triage (P2790).
 *
 *   node scripts/leads/strict-apply.js --source=leads     [--root=.] [--max=5] [--dry]
 *   node scripts/leads/strict-apply.js --source=quirks    [--root=.] [--dry]
 *   node scripts/leads/strict-apply.js --source=issue557  [--root=.] [--max=5] [--dry] [--reply]
 *   node scripts/leads/strict-apply.js --source=backport --backport-from=<master checkout> [--root=<stable checkout>]
 *
 * STRICT RULE (the only case where a fingerprint is written automatically):
 *   1. the source text names the exact manufacturerName AND the exact productId together
 *      (same paragraph; lead snippet must contain both);
 *   2. the manufacturerName is not in any driver yet (case-insensitive);
 *   3. productId is not TS0601 (DP layouts differ per id) and exactly ONE driver already lists that
 *      productId with sibling manufacturerNames → that driver is the target
 *      (backport: the same driver as on master, which must already list the productId);
 *   4. compose + app.json are edited through a byte-identical JSON round-trip only.
 * Anything else stays a lead (data/leads/strict-apply-report.json), never guessed.
 * Applied couples are logged in data/leads/auto-applied.json (source URL kept) so the stable
 * backport and the next runs are idempotent. Commits go through scripts/ci/safe-auto-commit.js.
 *
 * quirks: leads with a strong firmware keyword (inverted, drops off, wrong scale, ×10, …) for a
 * manufacturerName we already support, exactly one productId, and no quirk record for that
 * manufacturerName yet → appended to lib/data/firmware-quirks.json as status "documented",
 * auto=true (no runtime effect; a human turns it into a workaround). Cap 3 per run.
 *
 * issue557: reads human comments on the tracking issue since the cursor (bots skipped),
 * extracts mfr+pid, runs the same rule, and with --reply posts ONE status comment. Comments by the
 * repo owner are only read when they contain "/triage" (status notes list many ids).
 * Uses GITHUB_TOKEN only; no AI. Node built-ins only.
 */
const fs = require('fs');
const path = require('path');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ROOT = path.resolve(arg('root', process.cwd()));
const SOURCE = arg('source', 'leads');
const MAX = Math.max(0, Number(arg('max', 5)));
const DRY = process.argv.includes('--dry');
const REPLY = process.argv.includes('--reply');
const REPO = process.env.GITHUB_REPOSITORY || 'dlnraja/com.tuya.zigbee';
const TRACKING = Number(process.env.TRACKING_ISSUE || 557);

const MFR_RE = /\b_T[A-Z0-9]{2,5}_[a-zA-Z0-9]{8}\b/g;
const PID_RE = /\b(TS[0-9]{3,4}[A-Z]?)\b/g;
const VALID_MFR = /^_T[A-Z0-9]{2,5}_[a-z0-9]{8}$/i;
const GENERIC_PIDS = new Set(['TS0601']);
// Automated tables / digests are never a primary source.
const DENY_URL = [
  new RegExp(`github\\.com/${REPO.replace('/', '\\/')}/issues/(557|538|335|556)\\b`),
];

const lc = (s) => String(s || '').toLowerCase();
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

function loadRoundTrip(file, compact) {
  const raw = fs.readFileSync(file, 'utf8');
  const obj = JSON.parse(raw);
  const dump = (o) => compact ? JSON.stringify(o) : JSON.stringify(o, null, 2);
  const nl = raw.endsWith('\n') ? '\n' : '';
  if (dump(obj) + nl !== raw) {return null;}
  return { obj, write: (o) => fs.writeFileSync(file, dump(o) + nl) };
}

function buildIndex(root) {
  const byMfr = new Map();
  const byPid = new Map();
  const dir = path.join(root, 'drivers');
  for (const d of fs.readdirSync(dir)) {
    const f = path.join(dir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    const j = readJson(f, null);
    const z = j && j.zigbee;
    if (!z) {continue;}
    for (const m of z.manufacturerName || []) {
      if (!byMfr.has(lc(m))) {byMfr.set(lc(m), new Set());}
      byMfr.get(lc(m)).add(d);
    }
    if ((z.manufacturerName || []).length) {
      for (const p of z.productId || []) {
        const k = String(p).toUpperCase();
        if (!byPid.has(k)) {byPid.set(k, new Set());}
        byPid.get(k).add(d);
      }
    }
  }
  return { byMfr, byPid };
}

/** Pure decision (unit-tested). */
function decide(idx, mfr, pid, forcedDriver) {
  if (!VALID_MFR.test(mfr || '') || /x{6,}/i.test(mfr)) {return { status: 'lead', why: 'not a valid manufacturerName' };}
  const P = String(pid || '').toUpperCase();
  if (!/^TS[0-9]{3,4}[A-Z]?$/.test(P)) {return { status: 'lead', why: 'no exact productId in the source' };}
  const known = idx.byMfr.get(lc(mfr));
  if (known && known.size) {return { status: 'already', why: `already in ${[...known].join(', ')}` };}
  if (GENERIC_PIDS.has(P)) {return { status: 'lead', why: `${P}: DP layout differs per id, needs a capture` };}
  const drivers = [...idx.byPid.get(P) || []];
  if (forcedDriver) {
    if (!drivers.includes(forcedDriver)) {return { status: 'lead', why: `${forcedDriver} has no ${P} sibling here` };}
    return { status: 'apply', driver: forcedDriver };
  }
  if (drivers.length !== 1) {return { status: 'lead', why: drivers.length ? `${P} is in ${drivers.length} drivers (ambiguous)` : `${P} not in any driver` };}
  return { status: 'apply', driver: drivers[0] };
}

function applyCouple(root, driver, mfr) {
  const cf = path.join(root, 'drivers', driver, 'driver.compose.json');
  const af = path.join(root, 'app.json');
  const c = loadRoundTrip(cf, false);
  const a = fs.existsSync(af) ? loadRoundTrip(af, true) : null;
  if (!c || !a) {return 'json round-trip not byte-identical, skipped';}
  const ad = (a.obj.drivers || []).find((d) => d.id === driver);
  if (!ad || !ad.zigbee || !Array.isArray(ad.zigbee.manufacturerName)) {return `driver ${driver} missing in app.json`;}
  if (!c.obj.zigbee.manufacturerName.some((m) => m === mfr)) {c.obj.zigbee.manufacturerName.push(mfr);}
  if (!ad.zigbee.manufacturerName.some((m) => m === mfr)) {ad.zigbee.manufacturerName.push(mfr);}
  if (!DRY) { c.write(c.obj); a.write(a.obj); }
  return null;
}

function pairsFromText(text) {
  const out = [];
  for (const para of String(text || '').split(/\n\s*\n/)) {
    const mfrs = [...new Set(para.match(MFR_RE) || [])];
    const pids = [...new Set((para.match(PID_RE) || []).map((p) => p.toUpperCase()))];
    if (mfrs.length === 1 && pids.length === 1) {out.push({ mfr: mfrs[0], pid: pids[0] });}
    else {for (const m of mfrs.slice(0, 10)) {out.push({ mfr: m, pid: pids.length === 1 ? pids[0] : null, ambiguous: pids.length !== 1 || mfrs.length > 1 });}}
  }
  return out;
}

async function gh(p, opts = {}) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'tuya-strict-apply', 'X-GitHub-Api-Version': '2022-11-28' };
  if (process.env.GITHUB_TOKEN) {headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;}
  if (opts.body) {headers['Content-Type'] = 'application/json';}
  const res = await fetch(`https://api.github.com${p}`, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: AbortSignal.timeout(30000) });
  if (!res.ok) {throw new Error(`${opts.method || 'GET'} ${p}: HTTP ${res.status}`);}
  return res.status === 204 ? null : res.json();
}

function candidatesFromLeads(root) {
  const file = path.join(root, 'data/leads/github-leads.json');
  const leads = readJson(file, { leads: [] }).leads || [];
  const out = [];
  for (const l of leads) {
    if ((l.knownDrivers || []).length || DENY_URL.some((re) => re.test(l.url))) {continue;}
    const pid = (l.pids || []).length === 1 ? l.pids[0] : null;
    const exact = pid && String(l.snippet || '').toUpperCase().includes(pid) && String(l.snippet || '').includes(l.mfr);
    out.push({ mfr: l.mfr, pid: exact ? pid : null, source: l.url });
  }
  return out;
}

async function candidatesFromIssue(root) {
  const curFile = path.join(root, 'data/leads/issue557-cursor.json');
  const cur = readJson(curFile, {});
  const since = cur.since || new Date(Date.now() - 14 * 864e5).toISOString();
  const runAt = new Date().toISOString();
  const out = [];
  for (let page = 1; page <= 5; page++) {
    const list = await gh(`/repos/${REPO}/issues/${TRACKING}/comments?since=${encodeURIComponent(since)}&per_page=100&page=${page}`);
    for (const c of list) {
      if (c.user?.type === 'Bot' || /\[bot\]$/.test(c.user?.login || '')) {continue;}
      if (/<!--\s*(strict-apply|safe-auto-commit)/.test(c.body || '')) {continue;}
      // Owner status notes mention many ids; the owner opts in per comment with "/triage".
      if (c.user?.login === REPO.split('/')[0] && !/(^|\s)\/triage\b/.test(c.body || '')) {continue;}
      for (const p of pairsFromText(c.body)) {out.push({ ...p, pid: p.ambiguous ? null : p.pid, source: c.html_url });}
    }
    if (list.length < 100) {break;}
  }
  return { out, save: () => { if (!DRY) {fs.mkdirSync(path.dirname(curFile), { recursive: true }); fs.writeFileSync(curFile, `${JSON.stringify({ since: runAt }, null, 2)}\n`);} } };
}

const STRONG_FW = /invert|leaves? the network|drops? off|keep-?alive|wrong (scale|unit)|divide|x10|×10/;

function recordQuirks(root) {
  const qf = path.join(root, 'lib/data/firmware-quirks.json');
  const rt = loadRoundTrip(qf, false);
  if (!rt) {return { added: 0, why: 'firmware-quirks.json round-trip not byte-identical' };}
  const have = new Set();
  for (const q of rt.obj.quirks || []) {for (const m of q.mfr || []) {have.add(lc(m));}}
  const leads = readJson(path.join(root, 'data/leads/github-leads.json'), { leads: [] }).leads || [];
  let added = 0;
  for (const l of leads) {
    if (added >= Math.min(3, MAX)) {break;}
    if (!(l.knownDrivers || []).length || (l.pids || []).length !== 1 || have.has(lc(l.mfr))) {continue;}
    // bug reports only (issues/comments); source files in forks/peers are code, not evidence of a bug
    if (!/\/issues\/\d+/.test(l.url) || DENY_URL.some((re) => re.test(l.url)) || !(l.firmware || []).some((f) => STRONG_FW.test(f))) {continue;}
    rt.obj.quirks.push({
      id: `auto_${lc(l.mfr).replace(/[^a-z0-9]+/g, '_').replace(/^_+/, '')}_${(l.firmware || []).find((f) => STRONG_FW.test(f)).replace(/[^a-z0-9]+/gi, '_')}`,
      mfr: [l.mfr], pid: [l.pids[0]],
      bug: `auto-recorded lead (keywords: ${(l.firmware || []).join(', ')}): ${String(l.snippet || '').replace(/[`|]/g, "'").slice(0, 220)}`,
      workaround: 'not applied: auto-recorded from a lead, needs human review before any runtime workaround',
      status: 'documented', auto: true, source: [l.url],
    });
    have.add(lc(l.mfr));
    added++;
  }
  if (added && !DRY) {rt.write(rt.obj);}
  return { added };
}

async function main() {
  if (SOURCE === 'quirks') {
    const r = recordQuirks(ROOT);
    console.log(JSON.stringify({ source: SOURCE, ...r }));
    if (process.env.GITHUB_OUTPUT) {fs.appendFileSync(process.env.GITHUB_OUTPUT, `applied=${r.added}\n`);}
    return;
  }
  const idx = buildIndex(ROOT);
  const logFile = path.join(ROOT, 'data/leads/auto-applied.json');
  const log = readJson(logFile, { note: 'couples written by scripts/leads/strict-apply.js (strict rule); source kept', applied: [] });
  let cands = [];
  let saveCursor = () => {};
  if (SOURCE === 'leads') {cands = candidatesFromLeads(ROOT);}
  else if (SOURCE === 'issue557') { const r = await candidatesFromIssue(ROOT); cands = r.out; saveCursor = r.save; }
  else if (SOURCE === 'backport') {
    const from = arg('backport-from');
    if (!from) {throw new Error('--backport-from=<master checkout> required');}
    cands = (readJson(path.join(from, 'data/leads/auto-applied.json'), { applied: [] }).applied || []).map((e) => ({ ...e, forced: e.driver }));
  } else {throw new Error(`unknown --source=${SOURCE}`);}

  const results = [];
  const seen = new Set();
  let applied = 0;
  for (const c of cands) {
    const key = `${lc(c.mfr)}|${c.pid || ''}`;
    if (seen.has(key)) {continue;}
    seen.add(key);
    const d = decide(idx, c.mfr, c.pid, c.forced);
    if (d.status === 'apply') {
      if (applied >= MAX) { results.push({ ...c, status: 'lead', why: `run cap ${MAX} reached` }); continue; }
      const err = applyCouple(ROOT, d.driver, c.mfr);
      if (err) { results.push({ ...c, status: 'lead', why: err }); continue; }
      applied++;
      idx.byMfr.set(lc(c.mfr), new Set([d.driver]));
      results.push({ ...c, status: 'applied', driver: d.driver });
      if (SOURCE !== 'backport') {log.applied.push({ mfr: c.mfr, pid: c.pid, driver: d.driver, source: c.source, date: new Date().toISOString().slice(0, 10) });}
    } else {
      results.push({ ...c, status: d.status, why: d.why });
    }
  }
  if (!DRY && SOURCE !== 'backport') {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    if (applied) {fs.writeFileSync(logFile, `${JSON.stringify(log, null, 1)}\n`);}
    fs.writeFileSync(path.join(ROOT, 'data/leads/strict-apply-report.json'), `${JSON.stringify({ source: SOURCE, generated: new Date().toISOString().slice(0, 10), results: results.filter((r) => r.status !== 'already') }, null, 1)}\n`);
  }
  saveCursor();
  const counts = results.reduce((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m; }, {});
  console.log(JSON.stringify({ source: SOURCE, applied, counts }));
  if (process.env.GITHUB_OUTPUT) {fs.appendFileSync(process.env.GITHUB_OUTPUT, `applied=${applied}\n`);}

  if (SOURCE === 'issue557' && REPLY && results.length && !DRY && process.env.GITHUB_TOKEN) {
    const row = (r) => `| \`${r.mfr}\` | ${r.pid ? `\`${r.pid}\`` : '—'} | ${r.status === 'applied' ? `added to \`${r.driver}\`` : r.status === 'already' ? r.why : `lead: ${r.why}`} | ${r.source} |`;
    const body = `<!-- strict-apply -->\nAutomated triage of new comments (strict rule: exact manufacturerName + productId in the comment, and exactly one driver already listing that productId).\n\n| manufacturerName | productId | status | comment |\n|---|---|---|---|\n${results.slice(0, 40).map(row).join('\n')}\n\nApplied couples land on master through the gated auto-commit; everything else stays a lead until a device interview or diagnostic is shared.`;
    await gh(`/repos/${REPO}/issues/${TRACKING}/comments`, { method: 'POST', body: { body } });
  }
}

module.exports = { decide, pairsFromText, buildIndex, GENERIC_PIDS };
if (require.main === module) {main().catch((e) => { console.error(`strict-apply: ${e.message}`); process.exit(0); });}
