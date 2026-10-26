#!/usr/bin/env node
'use strict';
/**
 * P2870 — second, context-aware pass over forum sweep items left as needs-info / pending.
 * Free (public Discourse JSON), no AI, never stores post text (C1/C5): only post numbers, author
 * handles, identities, white-label model codes and symptom-family labels.
 *
 * For each item it reads the window of posts that follows it in the same topic and looks for:
 *   1. the SAME author coming back with a manufacturerName / productId (typical: "here is the
 *      interview" one or two posts later), or anyone replying directly to that post with one;
 *   2. a white-label model code (ZG-204ZM, AY-303Z, …) that is already a productId on a driver;
 *   3. a maintainer reply (dlnraja / johan_bendz) to the post, recorded as `answeredBy`;
 *   4. symptom families (forum-symptoms.js) so the daily resume can jump to the right fix.
 * Then it re-classifies with the shared helper (sweep-identity.classify). Statuses only move
 * forward with evidence: identity found → already-fixed / pending; nothing new → stays needs-info
 * with `resolver.checkedAt` so it is not re-read every day. Drivers are never written here.
 *
 *   node scripts/progress/resolve-needs-info.js [--max=200] [--topics=140352,26439] [--dry] [--recheck]
 */
const fs = require('fs');
const path = require('path');
const { getJson } = require('./lib/sweep-forum');
const { extract, stripHtml, classify, driverIndex } = require('./lib/sweep-identity');
const { extractSymptoms, extractModels } = require('./lib/forum-symptoms');

const ROOT = path.join(__dirname, '../..');
const CP = path.join(ROOT, 'data/leads/sweep-checkpoint.json');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const DRY = process.argv.includes('--dry');
const RECHECK = process.argv.includes('--recheck');
const MAX = Math.max(1, Math.min(2000, Number(arg('max', '200')) || 200));
const TOPICS = arg('topics', '') ? new Set(arg('topics', '').split(',')) : null;
const WINDOW = 30; // posts after the item that may carry the follow-up
const MAINTAINERS = /^(dlnraja|johan_bendz|JohanBendz)$/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** productId values (upper) that are white-label model codes, mapped to their drivers. */
function modelIndex() {
  const out = new Map();
  const dir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(dir)) {
    const f = path.join(dir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    let z; try { z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {}; } catch { continue; }
    for (const p of z.productId || []) {
      const k = String(p).toUpperCase();
      if (/^TS\d/.test(k)) continue;
      if (!out.has(k)) out.set(k, new Set());
      out.get(k).add(d);
    }
  }
  return out;
}

async function windowFor(tid, n, cache) {
  // Discourse returns ~20 posts around /t/<tid>/<n>; two calls cover the follow-up window.
  const got = [];
  for (const start of [n, n + 18]) {
    const key = `${tid}:${Math.floor(start / 18)}`;
    let posts = cache.get(key);
    if (!posts) {
      await sleep(900);
      const r = await getJson(`/t/${tid}/${start}.json`);
      if (r.rateLimited) return { rateLimited: true };
      if (r.error || !r.post_stream) return { error: r.status || 'no-stream' };
      posts = r.post_stream.posts || [];
      cache.set(key, posts);
    }
    got.push(...posts);
  }
  const byNum = new Map();
  for (const p of got) byNum.set(p.post_number, p);
  return { posts: [...byNum.values()].sort((a, b) => a.post_number - b.post_number) };
}

async function main() {
  const cp = JSON.parse(fs.readFileSync(CP, 'utf8'));
  const models = modelIndex();
  driverIndex();
  const cache = new Map();
  const todo = cp.items.filter((it) => {
    const m = /^forum:(\d+)#(\d+)$/.exec(it.id);
    if (!m || it.manual) return false;
    if (TOPICS && !TOPICS.has(m[1])) return false;
    if (!['needs-info', 'pending'].includes(it.status)) return false;
    return RECHECK || !(it.resolver && it.resolver.checkedAt);
  }).slice(0, MAX);
  const moves = {}; let checked = 0; let rateLimited = false;
  const seen = { followupIds: 0, models: 0, knownModels: 0, answered: 0, symptoms: 0, ownMissing: 0 };
  for (const it of todo) {
    const [, tid, ns] = /^forum:(\d+)#(\d+)$/.exec(it.id);
    const n = Number(ns);
    const w = await windowFor(tid, n, cache);
    if (w.rateLimited) { rateLimited = true; break; }
    if (w.error) { it.resolver = { ...(it.resolver || {}), lastError: String(w.error) }; continue; }
    checked++;
    const own = w.posts.find((p) => p.post_number === n);
    const ownText = own ? stripHtml(own.cooked) : '';
    const author = it.author || (own && own.username);
    const ids = { mfrs: [...(it.mfrs || [])], pids: [...(it.pids || [])], request: true };
    const via = [];
    for (const p of w.posts) {
      if (p.post_number <= n || p.post_number > n + WINDOW) continue;
      const sameAuthor = author && p.username === author;
      const replyTo = p.reply_to_post_number === n;
      if (!sameAuthor && !replyTo) continue;
      const e = extract(stripHtml(p.cooked));
      if (e.mfrs.length || e.pids.length) {
        for (const m of e.mfrs) if (!ids.mfrs.some((x) => x.toLowerCase() === m.toLowerCase())) ids.mfrs.push(m);
        for (const q of e.pids) if (!ids.pids.includes(q)) ids.pids.push(q);
        via.push(`${sameAuthor ? 'followup' : 'reply'}#${p.post_number}`);
      }
    }
    const answer = w.posts.find((p) => p.post_number > n && p.post_number <= n + WINDOW
      && MAINTAINERS.test(p.username) && (p.reply_to_post_number === n || p.post_number === n + 1));
    const mdl = extractModels(ownText);
    const knownModels = mdl.models.filter((x) => models.has(x));
    const symptoms = extractSymptoms(ownText);
    if (via.length) seen.followupIds++;
    if (mdl.models.length) seen.models++;
    if (knownModels.length) seen.knownModels++;
    if (answer) seen.answered++;
    if (symptoms.length) seen.symptoms++;
    if (!own) seen.ownMissing++;
    const before = it.status;
    let status = before; let why = it.why;
    if (via.length && ids.mfrs.length) {
      const c = classify({ ...ids, mfrs: ids.mfrs.slice(0, 12), pids: ids.pids.slice(0, 8) });
      if (c.status === 'already-fixed' || c.status === 'pending') {
        status = c.status; why = `${c.why} (via ${via.join(',')})`;
        it.mfrs = ids.mfrs.slice(0, 12); it.pids = ids.pids.slice(0, 8);
        it.missing = c.cov.missing.length ? c.cov.missing : undefined;
      }
    } else if (before === 'needs-info' && knownModels.length && !ids.mfrs.length) {
      // White-label model code that is already a productId: the device class is covered.
      status = 'already-fixed';
      why = `model-known (${knownModels.slice(0, 3).map((x) => `${x}→${[...models.get(x)].slice(0, 2).join('/')}`).join(', ')})`;
    }
    it.status = status; it.why = why;
    it.resolver = {
      checkedAt: new Date().toISOString().slice(0, 10),
      via: via.length ? via : undefined,
      models: mdl.models.length ? mdl.models : undefined,
      brands: mdl.brands.length ? mdl.brands : undefined,
      symptoms: symptoms.length ? symptoms : undefined,
      answeredBy: answer ? `${answer.username}#${answer.post_number}` : undefined,
      from: status !== before ? before : undefined,
    };
    if (status !== before) moves[`${before}->${status}`] = (moves[`${before}->${status}`] || 0) + 1;
  }
  cp.stats = cp.items.reduce((a, x) => { a[x.status] = (a[x.status] || 0) + 1; return a; }, {});
  cp.resolver = { at: new Date().toISOString(), checked, moves, seen, rateLimited, remaining: cp.items.filter((x) => /^forum:/.test(x.id) && ['needs-info', 'pending'].includes(x.status) && !(x.resolver && x.resolver.checkedAt)).length };
  if (!DRY) fs.writeFileSync(CP, `${JSON.stringify(cp, null, 2)}\n`);
  console.log(JSON.stringify(cp.resolver));
}

let done = false;
process.on('beforeExit', () => { if (!done) { console.error('[resolve-needs-info] drained before finishing'); process.exitCode = 3; } });
main().then(() => { done = true; }).catch((e) => { console.error(e); process.exit(1); });
