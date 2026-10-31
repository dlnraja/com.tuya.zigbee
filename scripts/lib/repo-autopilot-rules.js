'use strict';
/**
 * P3022 — pure decision rules for the repo autopilot (scripts/ci/repo-autopilot.js).
 * No I/O here: every input is a plain object, so the rules are unit-tested
 * (test/critical/p3022-repo-autopilot.test.js).
 *
 * Hard rules (owner decisions 2026-10-24/25):
 *  - never post a comment, never send a mail, never close an issue;
 *  - PRs from people (the owner's own fix/codex/port branches, external contributors) are never closed;
 *    external contributions are analysed and their verified couples go to the enrichment pipeline;
 *  - a bot PR is merged (normal merge) only when it is current and its gates are green, otherwise it is
 *    closed when superseded by a newer bot PR of the same kind, or when it is stale (behind + old);
 *  - a bot/* head branch is deleted only when fully superseded and carrying bot commits only;
 *  - a keep/pinned label freezes everything.
 */

const BOT_PREFIXES = ['bot/', 'auto/', 'ai/monthly-audit-', 'kb/', 'market/'];
// P3090 — generated-data bot PRs whose conflicts are resolved by re-syncing with the base (base wins on
// conflicting hunks = newest generated data). Only when every changed file is regenerable data/docs.
const RESYNC_PREFIXES = ['kb/', 'market/', 'bot/'];
const RESYNC_PATHS = /^(data\/|docs\/knowledge\/|reports\/)/;

function resyncable(pr, files) {
  const ref = pr.headRef || (pr.head && pr.head.ref) || '';
  const f = files || [];
  return RESYNC_PREFIXES.some((p) => ref.startsWith(p)) && f.length > 0 && f.length <= 300 && f.every((x) => RESYNC_PATHS.test(String(x)));
}
const DELETABLE_PREFIXES = ['bot/'];
const PROTECTED_BRANCHES = new Set(['master', 'main', 'stable-v5', 'bastien-home', 'gh-pages']);
const PROTECTED_PREFIXES = ['fix/', 'release/', 'hotfix/'];
const KEEP_LABELS = new Set(['keep', 'pinned', 'pin', 'do-not-close', 'dont-close', 'no-autoclose', 'wip']);
const MERGE_BASES = new Set(['master', 'stable-v5', 'bastien-home']);
const DEFAULTS = Object.freeze({ maxBehind: 150, minAgeDays: 7 });

const lc = (s) => String(s || '').toLowerCase();
const DAY = 864e5;

function isBotLogin(login, type) {
  const l = lc(login);
  return type === 'Bot' || /\[bot\]$/.test(l) || l === 'app/github-actions' || l === 'github-actions' || l === 'web-flow';
}

function hasKeepLabel(labels) {
  return (labels || []).some((x) => KEEP_LABELS.has(lc(typeof x === 'string' ? x : x && x.name)));
}

/** 'bot/homey-knowledge-20261019' -> 'bot/homey-knowledge'; 'ai/monthly-audit-2026-10' -> 'ai/monthly-audit'. */
function prKind(ref) {
  return String(ref || '').replace(/[-_/]?\d{4}-?\d{2}(-?\d{2})?(T?\d{4,6})?$/, '').replace(/[-_/]+$/, '');
}

/**
 * Who opened the PR.
 *   'bot'      — same-repo branch with a bot prefix, opened by a bot or by the owner's automation token;
 *   'external' — fork PR, or a same-repo PR by someone who is neither the owner nor a bot;
 *   'human'    — the owner's own work branches (fix/*, codex/*, port/*...).
 */
function prOrigin(pr, owner) {
  const login = pr.author || (pr.user && pr.user.login) || '';
  const type = pr.authorType || (pr.user && pr.user.type);
  const ref = pr.headRef || (pr.head && pr.head.ref) || '';
  const cross = pr.isCrossRepository != null ? pr.isCrossRepository
    : !!(pr.head && pr.head.repo && pr.base && pr.base.repo && pr.head.repo.full_name !== pr.base.repo.full_name);
  if (cross) {return 'external';}
  const bot = isBotLogin(login, type);
  const botRef = BOT_PREFIXES.some((p) => ref.startsWith(p));
  if (botRef && (bot || lc(login) === lc(owner))) {return 'bot';}
  if (bot) {return 'bot';}
  if (lc(login) === lc(owner)) {return 'human';}
  return 'external';
}

/** A newer bot PR of the same kind that is still open or merged supersedes this one. */
function supersededBy(pr, all) {
  const kind = prKind(pr.headRef);
  const t = Date.parse(pr.createdAt);
  const newer = (all || []).filter((o) => o.number !== pr.number && prKind(o.headRef) === kind
    && Date.parse(o.createdAt) > t && (o.state === 'open' || o.merged));
  newer.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return newer.length ? newer[0].number : null;
}

/** Gates from check runs + commit statuses: 'green' | 'red' | 'pending' | 'none'. */
function gateState(checks) {
  const runs = (checks || []).filter(Boolean);
  if (!runs.length) {return 'none';}
  if (runs.some((c) => c.status && c.status !== 'completed')) {return 'pending';}
  const bad = runs.some((c) => ['failure', 'timed_out', 'cancelled', 'action_required', 'error', 'startup_failure'].includes(c.conclusion));
  if (bad) {return 'red';}
  return runs.some((c) => c.conclusion === 'success') ? 'green' : 'none';
}

/**
 * One decision per open PR.
 * ctx: { owner, now, all, behindBy, files, checks, localGate ('green'|'red'|null), maxBehind, minAgeDays }
 * returns { action: 'skip'|'close'|'merge'|'hold'|'analyse', reason, supersededBy? }
 */
function decidePr(pr, ctx = {}) {
  const o = { ...DEFAULTS, ...ctx };
  if (hasKeepLabel(pr.labels)) {return { action: 'skip', reason: 'keep/pinned label' };}
  const origin = prOrigin(pr, o.owner);
  if (origin === 'external') {return { action: 'analyse', reason: 'external contributor: analyse + enrich, never close' };}
  if (origin === 'human') {return { action: 'skip', reason: 'opened by a person: never touched by automation' };}

  const sup = supersededBy(pr, o.all);
  if (sup) {return { action: 'close', reason: `superseded by #${sup}`, supersededBy: sup };}
  const ageDays = (o.now - Date.parse(pr.createdAt)) / DAY;
  const behind = Number(o.behindBy);
  if (Number.isFinite(behind) && behind > o.maxBehind && ageDays > o.minAgeDays) {
    return { action: 'close', reason: `stale: ${behind} commits behind ${pr.baseRef || 'base'}, ${Math.floor(ageDays)} days old` };
  }
  if (!MERGE_BASES.has(pr.baseRef || 'master')) {return { action: 'hold', reason: `base ${pr.baseRef} is not a release branch` };}
  if ((o.files || []).some((f) => String(f).startsWith('.github/workflows/'))) {
    return { action: 'hold', reason: 'touches .github/workflows (GITHUB_TOKEN cannot merge it; owner review)' };
  }
  if (pr.mergeable === false || pr.mergeableState === 'dirty') {
    if (resyncable(pr, o.files) && !o.resynced) {return { action: 'resync', reason: 'merge conflict on regenerable bot data: re-sync with base (base wins)' };}
    return { action: 'hold', reason: 'merge conflict with base' };
  }
  const gates = gateState(o.checks);
  const local = o.localGate || null;
  if (gates === 'red' || local === 'red') {return { action: 'hold', reason: `gates red (${gates === 'red' ? 'checks' : 'local gates'})` };}
  if (gates === 'pending') {return { action: 'hold', reason: 'checks still running' };}
  if (gates === 'green' || local === 'green') {
    return { action: 'merge', reason: `current (${Number.isFinite(behind) ? behind : '?'} behind) and gates green (${gates === 'green' ? 'checks' : 'local gates'})` };
  }
  return { action: 'hold', reason: 'no gate result yet (needs local gates)', needsLocalGate: true };
}

/**
 * Delete a head branch only when: bot/* prefix, not protected, its PR is closed or merged, it is
 * superseded (a newer same-kind PR exists) or merged, and every commit on it is a bot commit.
 */
function branchDeletable(ref, { prState, merged, superseded, commits, labels, behindBy, maxBehind = DEFAULTS.maxBehind } = {}) {
  const r = String(ref || '');
  if (!r || PROTECTED_BRANCHES.has(r)) {return { ok: false, reason: 'protected branch' };}
  if (PROTECTED_PREFIXES.some((p) => r.startsWith(p))) {return { ok: false, reason: 'protected prefix' };}
  if (!DELETABLE_PREFIXES.some((p) => r.startsWith(p))) {return { ok: false, reason: 'not a bot/* branch' };}
  if (hasKeepLabel(labels)) {return { ok: false, reason: 'keep/pinned label' };}
  if (prState === 'open') {return { ok: false, reason: 'PR still open' };}
  // A closed (unmerged) bot PR whose branch fell far behind is abandoned: the next run of the same
  // automation regenerates it from the current base, so nothing on it is still needed.
  const abandoned = prState === 'closed' && Number.isFinite(Number(behindBy)) && behindBy !== null && Number(behindBy) > maxBehind;
  if (!merged && !superseded && !abandoned) {return { ok: false, reason: 'not superseded' };}
  if (!Array.isArray(commits)) {return { ok: false, reason: 'commit list unknown' };}
  const human = commits.filter((c) => !isBotLogin(c.author, c.authorType) && !isBotLogin(c.committer, c.committerType));
  if (human.length) {return { ok: false, reason: `${human.length} human commit(s)` };}
  return { ok: true, reason: merged ? 'merged bot branch' : superseded ? 'superseded bot branch' : `closed bot PR, ${behindBy} commits behind` };
}

// ---------- issues ----------
const MFR_RE = /\b_T[A-Z0-9]{2,5}_[a-zA-Z0-9]{8}\b/g;
const PID_RE = /\b(TS[0-9]{3,4}[A-Z]?|TY[0-9]{4}|SNZB-[0-9A-Z]+)\b/g;
const DP_RE = /\b(?:dp|datapoint)\s*[#:=]?\s*(\d{1,3})\b/gi;
const DIAG_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const VERSION_RE = /\bv?(\d{1,2}\.\d{1,2}\.\d{2,4})\b/g;
const SYMPTOMS = [
  ['unknown-device', /unknown (zigbee )?device|not recogni[sz]ed|generic zigbee|paired as (a )?(switch|plug|unknown)/i],
  ['no-reports', /no (data|values?|reports?)|not (updating|reporting)|stays? (at )?0|shows? nothing|no reading/i],
  ['wrong-value', /wrong (value|scale|unit)|x ?10|×10|divided|2\s?310|inverted|reversed|opposite/i],
  ['battery', /battery/i],
  ['commands-fail', /does(n'?t| not) (switch|turn|respond|work)|no response|cannot control|not controllable|commands? (fail|ignored)/i],
  ['crash', /crash|out of memory|exception|stack ?trace|app (stops?|restarts?)/i],
  ['pairing', /pair(ing)?|interview|configure keeps loading/i],
  ['flow', /flow card|invalid_flow_card|trigger/i],
];

function extractIssue(text) {
  const t = String(text || '');
  const pairs = [];
  const seen = new Set();
  for (const para of t.split(/\n\s*\n/)) {
    const mfrs = [...new Set(para.match(MFR_RE) || [])];
    const pids = [...new Set((para.match(PID_RE) || []).map((p) => p.toUpperCase()))];
    for (const m of mfrs.slice(0, 10)) {
      const exact = mfrs.length === 1 && pids.length === 1;
      const pid = exact ? pids[0] : null;
      const k = `${lc(m)}|${pid || ''}`;
      if (seen.has(k)) {continue;}
      seen.add(k);
      pairs.push({ mfr: m, pid, exact });
    }
  }
  // An exact pair found anywhere wins over the same mfr without pid.
  const exactM = new Set(pairs.filter((p) => p.exact).map((p) => lc(p.mfr)));
  const couples = pairs.filter((p) => p.exact || !exactM.has(lc(p.mfr))).slice(0, 12);
  const dps = [...new Set([...t.matchAll(DP_RE)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 256))].slice(0, 20);
  const diagIds = [...new Set((t.match(DIAG_RE) || []).map(lc))].slice(0, 5);
  const versions = [...new Set([...t.matchAll(VERSION_RE)].map((m) => m[1]))].slice(0, 5);
  const symptoms = SYMPTOMS.filter(([, re]) => re.test(t)).map(([k]) => k);
  return { couples, dps, diagIds, versions, symptoms };
}

/**
 * index: { byMfr: Map(lcMfr -> Set(driver)), byDriver: Map(driver -> { mfrs:Set(lc), pids:Set(UC) }) }
 * returns per couple { mfr, pid, status: 'supported'|'variant'|'new'|'ambiguous', drivers }
 */
function coupleStatus(c, index) {
  const drivers = [...((index.byMfr && index.byMfr.get(lc(c.mfr))) || [])];
  if (!drivers.length) {return { ...c, status: c.pid ? 'new' : 'ambiguous', drivers: [] };}
  if (!c.pid) {return { ...c, status: 'supported', drivers };}
  const exact = drivers.filter((d) => { const e = index.byDriver.get(d); return e && e.pids.has(String(c.pid).toUpperCase()); });
  return exact.length ? { ...c, status: 'supported', drivers: exact } : { ...c, status: 'variant', drivers };
}

/** A commit subject that can stand as a fix link (credits, ledger, journal and digest commits cannot). */
function isFixSubject(s) {
  const t = String(s || '');
  if (/^(chore|docs|test|ci|style|build)(\(|:)/i.test(t)) {return false;}
  if (/credit|ledger|journal|digest|sweep|changelog/i.test(t)) {return false;}
  return /^(fix|feat|perf|refactor|port)(\(|:)|\bfix(es|ed)?\b|\bsupport\b/i.test(t);
}

const TRACKING_LABELS = new Set(['bot-digest', 'tracking', 'digest']);

/**
 * Classify one issue.
 *   'tracking'          — bot digest / tracking issue (left alone);
 *   'already-supported' — every couple is on a driver with its exact pid and no open symptom, or a fix commit references it;
 *   'fix-in-code'       — the device is supported but a symptom is reported (or the pid is a new variant of a known mfr);
 *   'new-couple'        — an exact mfr+pid not on any driver: goes to the strict-apply lead pipeline (source = the issue);
 *   'needs-info'        — no usable identity.
 */
function classifyIssue(issue, index, { fixCommits = [] } = {}) {
  const labels = (issue.labels || []).map((x) => lc(typeof x === 'string' ? x : x.name));
  const x = extractIssue(`${issue.title || ''}\n\n${issue.body || ''}\n\n${(issue.comments || []).join('\n\n')}`);
  const couples = x.couples.map((c) => coupleStatus(c, index));
  const base = { number: issue.number, author: issue.author, ...x, couples, fixCommits: fixCommits.slice(0, 5) };
  if (labels.some((l) => TRACKING_LABELS.has(l)) || isBotLogin(issue.author, issue.authorType)) {
    return { ...base, cls: 'tracking', actionable: false };
  }
  const news = couples.filter((c) => c.status === 'new');
  const variants = couples.filter((c) => c.status === 'variant');
  const supported = couples.filter((c) => c.status === 'supported');
  const bugSymptoms = x.symptoms.filter((s) => s !== 'pairing' || couples.length === 0);
  if (news.length) {return { ...base, cls: 'new-couple', actionable: true };}
  if (variants.length) {return { ...base, cls: 'fix-in-code', actionable: true, why: 'known manufacturer with a new productId' };}
  if (supported.length) {
    if (fixCommits.length) {return { ...base, cls: 'already-supported', actionable: false, why: 'supported and referenced by a fix commit' };}
    if (bugSymptoms.length) {return { ...base, cls: 'fix-in-code', actionable: true, why: `supported, symptom(s): ${bugSymptoms.join(', ')}` };}
    return { ...base, cls: 'already-supported', actionable: false, why: 'every couple is on its driver' };
  }
  if (fixCommits.length) {return { ...base, cls: 'already-supported', actionable: false, why: 'referenced by fix commit(s); no couple in the text' };}
  return { ...base, cls: 'needs-info', actionable: false };
}

/** Draft reply for the report only (never posted). English, short, no promise. */
function draftReply(r) {
  const who = r.author ? `@${r.author}` : 'Hi';
  const list = (r.couples || []).filter((c) => c.pid || c.mfr).map((c) => `\`${c.mfr}\`${c.pid ? ` / \`${c.pid}\`` : ''}${c.drivers && c.drivers.length ? ` → \`${c.drivers[0]}\`` : ''}`).join(', ');
  const commits = (r.fixCommits || []).map((s) => String(s).slice(0, 10)).join(', ');
  switch (r.cls) {
    case 'already-supported':
      return `${who} thanks for the report. ${list || 'This device'} is supported in the current test version${commits ? ` (fix: ${commits})` : ''}. Could you update to the latest test build, re-pair the device if it still shows as unknown, and tell us if it works? If not, please send a diagnostic report from the app settings.`;
    case 'fix-in-code':
      return `${who} thanks for the details. ${list || 'The device'} is known, and the reported behaviour (${(r.symptoms || []).join(', ') || 'see report'}) is queued for a fix. A diagnostic report sent right after the problem happens would help us confirm it.`;
    case 'new-couple':
      return `${who} thanks! ${list} is not in the app yet. It is queued for support; once it ships in a test build you will need to re-pair the device.`;
    case 'needs-info':
      return `${who} thanks for the report. To find the right driver we need the device's manufacturerName and modelId (Homey developer tools → Zigbee, or the device interview), and ideally a diagnostic report.`;
    default:
      return '';
  }
}

/** Lead record for data/leads/github-leads.json (strict-apply --source=leads reads it). Exact couples only. */
function leadFromCouple(c, url, seen) {
  if (!c || !c.pid || c.status !== 'new') {return null;}
  return { mfr: c.mfr, pids: [c.pid], dps: [], firmware: [], knownDrivers: [], url, snippet: `${c.mfr} ${c.pid}`, seen, via: 'repo-autopilot' };
}

/** Merge leads additively: key mfr|url, never drops or edits an existing lead. */
function mergeLeads(existing, add) {
  const out = Array.isArray(existing) ? existing.slice() : [];
  const keys = new Set(out.map((l) => `${lc(l.mfr)}|${l.url}`));
  let added = 0;
  for (const l of add || []) {
    if (!l) {continue;}
    const k = `${lc(l.mfr)}|${l.url}`;
    if (keys.has(k)) {continue;}
    keys.add(k);
    out.push(l);
    added++;
  }
  return { leads: out, added };
}

/** Couples added by a contributor diff: '+' lines of driver.compose.json files (mfr + pid tokens). */
function contribCouples(files) {
  const out = [];
  for (const f of files || []) {
    const m = /^drivers\/([^/]+)\/driver\.compose\.json$/.exec(f.filename || '');
    if (!m) {continue;}
    const added = String(f.patch || '').split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
    const mfrs = [...new Set(added.match(MFR_RE) || [])];
    const pids = [...new Set((added.match(PID_RE) || []).map((p) => p.toUpperCase()))];
    for (const mfr of mfrs.slice(0, 40)) {out.push({ driver: m[1], mfr, pid: pids.length === 1 ? pids[0] : null, exact: pids.length === 1 });}
  }
  return out;
}

/** Summary of an external PR for the report and the lead pipeline. */
function analyseExternal(pr, files, index) {
  const names = (files || []).map((f) => f.filename);
  const couples = contribCouples(files).map((c) => coupleStatus(c, index));
  return {
    number: pr.number, author: pr.author, headRef: pr.headRef,
    files: names.length, tests: names.filter((n) => /(^|\/)tests?\//.test(n) || /\.test\.js$/.test(n)).length,
    workflows: names.filter((n) => n.startsWith('.github/workflows/')).length,
    drivers: [...new Set(names.map((n) => (/^drivers\/([^/]+)\//.exec(n) || [])[1]).filter(Boolean))].slice(0, 20),
    couples,
    newCouples: couples.filter((c) => c.status === 'new' && c.pid).length,
  };
}

module.exports = {
  BOT_PREFIXES, PROTECTED_BRANCHES, KEEP_LABELS, DEFAULTS,
  RESYNC_PREFIXES, resyncable,
  isBotLogin, hasKeepLabel, prKind, prOrigin, supersededBy, gateState, decidePr, branchDeletable,
  extractIssue, coupleStatus, isFixSubject, classifyIssue, draftReply, leadFromCouple, mergeLeads, contribCouples, analyseExternal,
};
