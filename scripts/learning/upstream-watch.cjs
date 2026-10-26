#!/usr/bin/env node
'use strict';
/**
 * P3073 §4 / t590u — follow upstream projects "since last time", for free, read-only, at low frequency.
 *
 * One cursor per source in data/learning/upstream-cursors.json (last commit sha, last release tag,
 * newest fork push, newest Reddit post id). Each run only asks the sources whose own interval elapsed,
 * records what is new in a bounded delta ledger (data/learning/upstream-delta-ledger.json, 300 rows)
 * and, once a week, writes a human summary to the job summary / a local file. Nothing is posted,
 * commented, voted or followed anywhere; the report is never published.
 *
 * GitHub: public REST API (GITHUB_TOKEN when present, 60 req/h anonymous otherwise).
 * Reddit: public JSON listing, no login, one request per subreddit every 2 days at most; the first
 *   403/429 (or an HTML wall) stops Reddit for this run and backs that source off for 7 days.
 * Homey forum: not fetched here (forum-poll owns it); its cursor file is mirrored read-only.
 * Upstream text is untrusted: only a short title (≤ 100 chars) and a link are kept, to be rewritten
 * in our words before any use (report-writer linkRef()).
 *
 * CLI: node scripts/learning/upstream-watch.cjs [--dry] [--only=<id,...>] [--report] [--force]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CURSORS = path.join(ROOT, 'data', 'learning', 'upstream-cursors.json');
const LEDGER = path.join(ROOT, 'data', 'learning', 'upstream-delta-ledger.json');
const FORUM_CURSOR = path.join(ROOT, 'data', 'leads', 'forum-lastseen.json');
const MAX_ROWS = 300;
const MAX_PER_SOURCE = 15;
const DAY = 24 * 3600 * 1000;
const BACKOFF_MS = 7 * DAY;
const UA = 'homey-tuya-zigbee-upstream-watch/1.0 (read-only; low frequency)';
const KEYWORDS = /tuya|_tz[a-z0-9]{1,5}_|\bts0\d{3}|\bts1\d{3}|zigbee|\bdp\b|datapoint|quirk|homey|zha|z2m|thermostat|trv|energy|0xef00/i;

// Sources (t590u). kind: commits | releases | forks | reddit. everyH: minimum hours between two reads.
const SOURCES = [
  { id: 'zhc', kind: 'commits', repo: 'Koenkk/zigbee-herdsman-converters', everyH: 24 },
  { id: 'zhc-rel', kind: 'releases', repo: 'Koenkk/zigbee-herdsman-converters', everyH: 24 },
  { id: 'zha-quirks', kind: 'commits', repo: 'zigpy/zha-device-handlers', everyH: 24 },
  { id: 'deconz', kind: 'commits', repo: 'dresden-elektronik/deconz-rest-plugin', everyH: 48 },
  { id: 'johan', kind: 'commits', repo: 'JohanBendz/com.tuya.zigbee', everyH: 24 },
  { id: 'johan-forks', kind: 'forks', repo: 'JohanBendz/com.tuya.zigbee', everyH: 72 },
  { id: 'athom-zigbeedriver', kind: 'releases', repo: 'athombv/node-homey-zigbeedriver', everyH: 72 },
  { id: 'athom-clusters', kind: 'releases', repo: 'athombv/node-zigbee-clusters', everyH: 72 },
  { id: 'athom-sdk-issues', kind: 'commits', repo: 'athombv/homey-apps-sdk-issues', everyH: 72 },
  { id: 'tuya-local', kind: 'commits', repo: 'make-all/tuya-local', everyH: 48 },
  { id: 'localtuya', kind: 'commits', repo: 'rospogrigio/localtuya', everyH: 72 },
  { id: 'hass-localtuya', kind: 'commits', repo: 'xZetsubou/hass-localtuya', everyH: 72 },
  { id: 'tinytuya', kind: 'releases', repo: 'jasonacox/tinytuya', everyH: 72 },
  { id: 'hubitat-kkossev', kind: 'commits', repo: 'kkossev/Hubitat', everyH: 72 },
  { id: 'ha-core-rel', kind: 'releases', repo: 'home-assistant/core', everyH: 72 },
  { id: 'r-homey', kind: 'reddit', sub: 'homey', everyH: 48 },
  { id: 'r-homeassistant', kind: 'reddit', sub: 'homeassistant', everyH: 48 },
  { id: 'r-zigbee', kind: 'reddit', sub: 'zigbee', everyH: 48 },
  { id: 'r-tuya', kind: 'reddit', sub: 'tuya', everyH: 48 },
];

const short = (s, n = 100) => String(s == null ? '' : s).split('\n')[0].replace(/\s+/g, ' ').trim().slice(0, n);
function readJson(f, dflt) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return dflt; } }
function emptyCursors() { return { schema: 1, note: 'P3073 upstream cursors: last thing seen per source (read-only watch).', sources: {} }; }
function emptyLedger() { return { schema: 1, note: 'P3073 bounded upstream delta ledger (300 rows, newest last). Titles are untrusted upstream text: rewrite before use.', rows: [] }; }

function due(src, cur, now, force) {
  if (force) {return true;}
  if (cur && cur.backoffUntil && now < Date.parse(cur.backoffUntil)) {return false;}
  if (!cur || !cur.checkedAt) {return true;}
  return now - Date.parse(cur.checkedAt) >= src.everyH * 3600 * 1000;
}

/** Default fetcher: global fetch, JSON only, 15 s timeout. Returns {status, json}. */
async function httpJson(url, headers = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: ctl.signal });
    const ct = r.headers.get('content-type') || '';
    let json = null;
    if (ct.includes('json')) { try { json = await r.json(); } catch (_) { json = null; } }
    return { status: r.status, json };
  } finally { clearTimeout(t); }
}

function ghHeaders() {
  const tok = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  return tok ? { Authorization: `Bearer ${tok}`, 'X-GitHub-Api-Version': '2022-11-28' } : { 'X-GitHub-Api-Version': '2022-11-28' };
}

/** Read one source. Returns { cursor, rows, blocked }. Never throws on HTTP errors. */
async function readSource(src, prev, get) {
  const gh = (p) => get(`https://api.github.com/repos/${src.repo}${p}`, ghHeaders());
  const rows = [];
  const cur = { ...(prev || {}) };
  if (src.kind === 'commits') {
    const r = await gh('/commits?per_page=30');
    if (r.status !== 200 || !Array.isArray(r.json)) {return { cursor: cur, rows, error: r.status };}
    const list = r.json;
    const head = list[0] && list[0].sha;
    if (prev && prev.last) {
      for (const c of list) {
        if (c.sha === prev.last) {break;}
        const title = short(c.commit && c.commit.message);
        if (KEYWORDS.test(title)) {rows.push({ kind: 'commit', ref: String(c.sha).slice(0, 10), title, url: c.html_url });}
      }
    }
    if (head) {cur.last = head;}
  } else if (src.kind === 'releases') {
    const r = await gh('/releases?per_page=10');
    if (r.status !== 200 || !Array.isArray(r.json)) {return { cursor: cur, rows, error: r.status };}
    const head = r.json[0] && r.json[0].tag_name;
    if (prev && prev.last) {
      for (const rel of r.json) {
        if (rel.tag_name === prev.last) {break;}
        rows.push({ kind: 'release', ref: short(rel.tag_name, 40), title: short(rel.name || rel.tag_name), url: rel.html_url });
      }
    }
    if (head) {cur.last = head;}
  } else if (src.kind === 'forks') {
    const r = await gh('/forks?sort=newest&per_page=30');
    if (r.status !== 200 || !Array.isArray(r.json)) {return { cursor: cur, rows, error: r.status };}
    // Cursor = newest push time among forks; new rows = forks pushed since.
    let newest = prev && prev.last ? prev.last : '';
    for (const f of r.json) {
      const p = f.pushed_at || '';
      if (prev && prev.last && p > prev.last) {rows.push({ kind: 'fork-push', ref: short(f.full_name, 60), title: short(f.description || f.full_name), url: f.html_url });}
      if (p > newest) {newest = p;}
    }
    if (newest) {cur.last = newest;}
  } else if (src.kind === 'reddit') {
    const r = await get(`https://www.reddit.com/r/${src.sub}/new.json?limit=25&raw_json=1`, {});
    if (r.status === 403 || r.status === 429 || (r.status === 200 && !r.json)) {return { cursor: cur, rows, blocked: true, error: r.status };}
    if (r.status !== 200) {return { cursor: cur, rows, error: r.status };}
    const kids = ((r.json && r.json.data && r.json.data.children) || []).map((k) => k.data || {});
    const head = kids[0] && kids[0].name;
    if (prev && prev.last) {
      for (const p of kids) {
        if (p.name === prev.last) {break;}
        const title = short(p.title);
        // No author, no body: only a title that looks relevant and its permalink.
        if (KEYWORDS.test(title)) {rows.push({ kind: 'post', ref: short(p.name, 20), title, url: `https://www.reddit.com${short(p.permalink, 200)}` });}
      }
    }
    if (head) {cur.last = head;}
  }
  return { cursor: cur, rows: rows.slice(0, MAX_PER_SOURCE) };
}

/** One pass. opts: { now, get, only, force, cursors, ledger }. Returns { cursors, ledger, read, added, skipped }. */
async function run(opts = {}) {
  const now = opts.now || Date.now();
  const get = opts.get || httpJson;
  const cursors = opts.cursors || readJson(CURSORS, emptyCursors());
  const ledger = opts.ledger || readJson(LEDGER, emptyLedger());
  cursors.sources = cursors.sources || {}; ledger.rows = ledger.rows || [];
  const iso = new Date(now).toISOString();
  let read = 0; let added = 0; let redditBlocked = false; const skipped = [];
  for (const src of SOURCES) {
    if (opts.only && !opts.only.includes(src.id)) {continue;}
    const prev = cursors.sources[src.id];
    if (!due(src, prev, now, opts.force)) { skipped.push(src.id); continue; }
    if (src.kind === 'reddit' && redditBlocked) { skipped.push(src.id); continue; }
    let res;
    try { res = await readSource(src, prev, get); } catch (e) { res = { cursor: { ...(prev || {}) }, rows: [], error: short(e && e.message, 60) }; }
    read++;
    const cur = { ...res.cursor, checkedAt: iso, kind: src.kind, what: src.repo || `r/${src.sub}` };
    if (res.error) {cur.lastError = String(res.error);} else {delete cur.lastError;}
    if (res.blocked) { cur.backoffUntil = new Date(now + BACKOFF_MS).toISOString(); redditBlocked = true; } else {delete cur.backoffUntil;}
    if (!res.error && prev && prev.last && cur.last !== prev.last) {cur.changedAt = iso;}
    cursors.sources[src.id] = cur;
    for (const row of res.rows) { ledger.rows.push({ at: iso, source: src.id, ...row }); added++; }
  }
  if (ledger.rows.length > MAX_ROWS) {ledger.rows.splice(0, ledger.rows.length - MAX_ROWS);}
  // Mirror the forum cursor (owned by forum-poll) so one file answers "what did we last see where".
  const forum = readJson(FORUM_CURSOR, null);
  if (forum && forum.topics) {
    const t = forum.topics; const ids = Object.keys(t).slice(0, 20);
    cursors.forum = { owner: 'forum-poll (data/leads/forum-lastseen.json)', topics: Object.fromEntries(ids.map((k) => [k, { lastSeenPost: t[k].lastSeenPost || t[k].highest || 0, at: t[k].at || null }])) };
  }
  cursors.updatedAt = iso;
  return { cursors, ledger, read, added, skipped };
}

/** Weekly human report (never published: job summary or a local file only). */
function weeklyReport(ledger, cursors, now = Date.now()) {
  const { createReport, linkRef } = require(path.join(ROOT, 'scripts', 'lib', 'report-writer.js'));
  const since = now - 7 * DAY;
  const rows = (ledger.rows || []).filter((r) => Date.parse(r.at) >= since);
  const bySrc = {};
  for (const r of rows) {(bySrc[r.source] = bySrc[r.source] || []).push(r);}
  const blocked = Object.entries(cursors.sources || {}).filter(([, c]) => c.backoffUntil).map(([k]) => k);
  const rep = createReport({
    title: 'Upstream watch, last 7 days (P3073)',
    summary: `${rows.length} new item(s) worth a look across ${Object.keys(bySrc).length} source(s). This list is for us only and is never posted; each item still has to pass the usual promotion rules before anything changes in the app.`,
    lang: 'en',
  });
  const table = [];
  for (const [src, list] of Object.entries(bySrc)) {
    for (const r of list.slice(-8)) {table.push([src, r.kind, linkRef({ id: r.ref, url: r.url, prefix: '' })]);}
  }
  if (table.length) {rep.table(['Source', 'Kind', 'Link'], table);}
  if (blocked.length) {rep.table(['Paused source', 'Why'], blocked.map((b) => [b, 'refused a read; paused 7 days']));}
  rep.thanks('Zigbee2MQTT', 'ZHA quirks', 'deCONZ', 'tuya-local', 'localtuya', 'tinytuya', 'Hubitat (kkossev)', 'Home Assistant', 'Johan Bendz and the fork maintainers', 'Athom SDK');
  return rep;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const opt = (k) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
  const dry = args.includes('--dry');
  (async () => {
    try {
      const only = opt('only') ? opt('only').split(',') : null;
      const res = await run({ only, force: args.includes('--force') });
      console.log(`[upstream-watch] read ${res.read} source(s), ${res.added} new row(s), ${res.skipped.length} not due`);
      if (!dry) {
        fs.mkdirSync(path.dirname(CURSORS), { recursive: true });
        fs.writeFileSync(CURSORS, JSON.stringify(res.cursors, null, 1) + '\n');
        fs.writeFileSync(LEDGER, JSON.stringify(res.ledger, null, 1) + '\n');
      }
      const monday = new Date().getUTCDay() === 1;
      if (args.includes('--report') && (monday || args.includes('--force'))) {
        weeklyReport(res.ledger, res.cursors).write({ file: path.join(ROOT, '.github', 'state', 'upstream-week.md') });
      }
    } catch (e) {
      console.log(`::warning::upstream-watch skipped: ${short(e && e.message, 120)}`);
    }
  })();
}

module.exports = { SOURCES, run, readSource, due, weeklyReport, emptyCursors, emptyLedger, MAX_ROWS, MAX_PER_SOURCE, BACKOFF_MS, KEYWORDS };
