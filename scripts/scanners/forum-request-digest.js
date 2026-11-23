#!/usr/bin/env node
'use strict';
/**
 * P3362 - incremental forum request + peer-app idea digest.
 *
 * Reads public Discourse JSON only (no login, no AI, never posts, never opens PRs or issues).
 * Topic 140352 and a rotating slice of other Homey app threads (Johan 26439 is READ ONLY).
 * Extracts device requests (mfr+pid), bugs, wishes, diagnostic UUIDs, and short idea tags
 * from other apps. Writes candidate-task and reply-candidate files for the existing
 * Grok Bot routines. Linked into data/ssot/thread-digests.json. Bounded, cursor-based.
 *
 *   node scripts/scanners/forum-request-digest.js [--budget=80] [--per-topic=20] [--satellites=6]
 *        [--seed=30] [--delay=900] [--dry]
 */
const fs = require('fs');
const path = require('path');
const sd = require('../lib/source-digest');

const ROOT = path.join(__dirname, '../..');
const CURSOR = path.join(ROOT, 'data/leads/forum-request-digest-cursor.json');
const DIGEST = path.join(ROOT, 'data/ssot/forum-request-digest.json');
const SSOT = path.join(ROOT, 'data/ssot/thread-digests.json');
const TASKS = path.join(ROOT, 'data/progress/candidate-tasks.json');
const REPLIES = path.join(ROOT, 'data/progress/forum-reply-candidates.json');
const DIGEST_CAND = path.join(ROOT, 'data/leads/digest-candidates.json');
const HOST = 'community.homey.app';
const OWN_TOPIC = 140352;
const NEVER_REPLY_TOPICS = new Set([26439]);
const NEVER_REPLY_USERS = /^(doekse|drenso)$/i;
const DIAG_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const IDEA_TAGS = [
  [/mode picker|auto\/manual|device mode|advanced settings/i, 'device-settings'],
  [/flow card|when .+ then|and then/i, 'flow-cards'],
  [/battery history|insights|units? %|capability units/i, 'measure-units'],
  [/watchdog|stale value|last seen|no update/i, 'sensor-watchdog'],
  [/sleepy|end ?device|battery drain|do not poll/i, 'sleepy-tx'],
  [/official capability|valve_position|0-1|windowcoverings_set/i, 'official-capabilities'],
  [/re-?pair|fingerprint|unknown zigbee device/i, 'pairing-fingerprint'],
];

const argv = process.argv.slice(2);
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const num = (k, d, lo, hi) => Math.max(lo, Math.min(hi, Number(opt(k, String(d))) || d));
const loadJson = (p, fb) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } };
const writeJson = (p, obj) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(sd.assertClean(obj), null, 1)}\n`);
};

function topicList() {
  let sats = [];
  try {
    sats = require('../../tools/ci/forum-silent-multi-scan.js').DEFAULT_TOPICS || [];
  } catch {
    sats = [{ id: OWN_TOPIC, name: 'universal-tuya-zigbee', replyAllowed: true }];
  }
  return sats;
}

function strip(cooked) {
  return String(cooked || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractDiagIds(text) {
  return [...new Set(String(text || '').toLowerCase().match(DIAG_RE) || [])].slice(0, 8);
}

function classifyRequest(text) {
  const t = String(text || '');
  if (/add support|please add|could you add|device request|fingerprint/i.test(t) && /_T[A-Z0-9]{2,5}_|TS\d{3,4}/i.test(t)) return 'device-request';
  if (/crash|does not work|doesn't work|empty|null|not work|error|stuck|frozen|invalid|unexpected property|no data/i.test(t)) return 'bug';
  if (/would be nice|feature|wish|please (?:add|support|make)|can you add a flow|setting to/i.test(t)) return 'wish';
  if (extractDiagIds(t).length) return 'diag';
  return 'none';
}

function ideaTags(text) {
  const out = [];
  for (const [re, tag] of IDEA_TAGS) if (re.test(text)) out.push(tag);
  return [...new Set(out)].slice(0, 6);
}

function allowReply(topicId, username) {
  if (NEVER_REPLY_TOPICS.has(Number(topicId))) return false;
  if (NEVER_REPLY_USERS.test(String(username || ''))) return false;
  if (/^dlnraja$/i.test(String(username || ''))) return false;
  const list = topicList();
  const meta = list.find((t) => Number(t.id) === Number(topicId));
  if (meta && meta.replyAllowed === false) return false;
  return Number(topicId) === OWN_TOPIC;
}

function buildEntry(topicId, topicName, post, replyAllowed) {
  const text = strip(post.cooked);
  const facts = sd.facts(text);
  const kind = classifyRequest(text);
  const diags = extractDiagIds(text);
  const tags = ideaTags(text);
  if (kind === 'none' && !diags.length && !facts.mfrs.length && !tags.length) return null;
  const url = `https://${HOST}/t/${topicId}/${post.post_number}`;
  const digest = sd.assertClean(sd.build({
    source: `homey-forum-${topicName || topicId}`,
    url,
    title: `topic ${topicId} post ${post.post_number}`,
    body: text.slice(0, 4000),
    labels: [kind !== 'none' ? kind : (tags.length ? 'idea' : 'mention')].concat(tags),
    credit: [],
  }, null));
  const couples = [];
  for (const m of facts.mfrs) for (const p of facts.pids) couples.push(`${m}|${p}`);
  return {
    topic: Number(topicId),
    post: Number(post.post_number),
    url,
    kind: kind === 'none' ? (tags.length ? 'idea' : 'mention') : kind,
    couples: couples.slice(0, 12),
    mfrs: facts.mfrs,
    pids: facts.pids,
    dps: facts.dps,
    diagIds: diags,
    ideas: Number(topicId) === OWN_TOPIC ? [] : tags,
    replyAllowed: !!replyAllowed && allowReply(topicId, post.username),
    digest,
  };
}

function pickTopics(state, satellites) {
  const all = topicList();
  const own = all.find((t) => t.id === OWN_TOPIC) || { id: OWN_TOPIC, name: 'universal-tuya-zigbee', replyAllowed: true };
  const sats = all.filter((t) => t.id !== OWN_TOPIC);
  const start = sats.length ? (Number(state.rotate) || 0) % sats.length : 0;
  const slice = [];
  for (let i = 0; i < Math.min(satellites, sats.length); i++) slice.push(sats[(start + i) % sats.length]);
  return { topics: [own, ...slice], nextRotate: sats.length ? (start + slice.length) % sats.length : 0 };
}

async function readTopic(tid, cur, limit, { getJson, sleep, delayMs, seed }) {
  const topic = await getJson(`/t/${tid}.json`);
  if (topic.rateLimited) return { rateLimited: true, posts: [], read: 0 };
  if (topic.error || !topic.post_stream) return { error: topic.status || 'no-stream', posts: [], read: 0 };
  const stream = topic.post_stream.stream || [];
  const highest = topic.highest_post_number || 0;
  cur.highest = highest;
  const lastId = Number(cur.lastSeenId) || 0;
  let pending = stream.filter((id) => id > lastId);
  if (!lastId && pending.length > seed) pending = pending.slice(-seed);
  pending = pending.slice(0, limit);
  const posts = [];
  let read = 0;
  for (let i = 0; i < pending.length; i += 20) {
    const ids = pending.slice(i, i + 20);
    await sleep(delayMs);
    const r = await getJson(`/t/${tid}/posts.json?${ids.map((id) => `post_ids[]=${id}`).join('&')}`);
    if (r.rateLimited) return { rateLimited: true, posts, read };
    if (r.error || !r.post_stream) return { error: r.status, posts, read };
    const page = (r.post_stream.posts || []).sort((a, b) => a.id - b.id);
    posts.push(...page);
    cur.lastSeenId = Math.max(Number(cur.lastSeenId) || 0, ...ids);
    cur.lastSeenPost = Math.max(Number(cur.lastSeenPost) || 0, ...page.map((p) => Number(p.post_number) || 0));
    read += ids.length;
  }
  cur.at = new Date().toISOString();
  return { posts, read, left: (stream.filter((id) => id > (Number(cur.lastSeenId) || 0)).length) };
}

function mergeUnique(list, items, keyFn, max) {
  const seen = new Set((list || []).map(keyFn));
  const out = [...(list || [])];
  for (const it of items) {
    const k = keyFn(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out.slice(-max);
}

async function run(opts = {}) {
  const budget = opts.budget ?? 80;
  const perTopic = opts.perTopic ?? 20;
  const satellites = opts.satellites ?? 6;
  const seed = opts.seed ?? 30;
  const delayMs = opts.delayMs ?? 900;
  const dry = !!opts.dry;
  const getJson = opts.getJson || require('../progress/lib/sweep-forum').getJson;
  const sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const state = loadJson(CURSOR, { topics: {} });
  state.topics = state.topics || {};
  const { topics, nextRotate } = pickTopics(state, satellites);
  const entries = [];
  const report = [];
  let left = budget;
  let rateLimited = false;
  for (const t of topics) {
    if (left <= 0 || rateLimited) { report.push({ tid: t.id, skipped: left <= 0 ? 'budget' : 'rate-limited' }); continue; }
    const cur = state.topics[t.id] || (state.topics[t.id] = {});
    const r = await readTopic(t.id, cur, Math.min(perTopic, left), { getJson, sleep, delayMs, seed });
    left -= r.read || 0;
    if (r.rateLimited) rateLimited = true;
    const built = [];
    for (const p of r.posts || []) {
      const e = buildEntry(t.id, t.name, p, t.replyAllowed !== false);
      if (e) built.push(e);
    }
    entries.push(...built);
    report.push({ tid: t.id, name: t.name, read: r.read, findings: built.length, lastSeenPost: cur.lastSeenPost, highest: cur.highest, error: r.error, rateLimited: !!r.rateLimited });
    await sleep(delayMs);
  }
  if (!rateLimited) state.rotate = nextRotate;
  state.updated = new Date().toISOString();

  const tasks = entries.filter((e) => e.kind !== 'mention' || e.couples.length || e.ideas.length).map((e) => ({
    kind: e.kind === 'idea' ? 'adopt' : (e.kind === 'bug' || e.kind === 'device-request' ? 'fix' : e.kind),
    target: (e.couples[0] || e.pids.join(', ') || e.ideas.join(', ') || `topic-${e.topic}/${e.post}`),
    hint: [e.kind, e.diagIds.length ? `diag ${e.diagIds[0]}` : '', e.ideas.join(','), e.dps.length ? `DPs ${e.dps.join(',')}` : ''].filter(Boolean).join(' | '),
    url: e.url,
    couples: e.couples,
    diagIds: e.diagIds,
    ideas: e.ideas,
  }));
  const replies = entries.filter((e) => e.replyAllowed && (e.kind === 'device-request' || e.kind === 'bug' || e.kind === 'wish' || e.kind === 'diag')).map((e) => ({
    platform: 'forum',
    thread: `community.homey.app/t/${e.topic}`,
    replyToPost: e.post,
    url: e.url,
    kind: e.kind,
    couples: e.couples,
    diagIds: e.diagIds,
    status: 'candidate',
    note: 'P3362: candidate only. The Homey reponses (anti-flood) routine decides. CI never posts. Never topic 26439, never Doekse/Drenso.',
  }));

  const digestDoc = {
    _meta: {
      generator: 'forum-request-digest',
      note: 'Technical facts only. Public Discourse JSON, read-only, never posted.',
      generated: state.updated,
      rateLimited,
    },
    requests: mergeUnique(loadJson(DIGEST, { requests: [] }).requests, entries.map((e) => ({
      url: e.url, topic: e.topic, post: e.post, kind: e.kind, couples: e.couples,
      mfrs: e.mfrs, pids: e.pids, dps: e.dps, diagIds: e.diagIds, ideas: e.ideas,
    })), (x) => `${x.topic}/${x.post}`, 400),
    report,
  };

  if (!dry) {
    writeJson(CURSOR, state);
    writeJson(DIGEST, digestDoc);
    const ssot = loadJson(SSOT, { _meta: {}, couples: {} });
    ssot._meta = ssot._meta || {};
    ssot._meta.forumRequestDigest = 'data/ssot/forum-request-digest.json';
    ssot.couples = ssot.couples || {};
    for (const e of entries) {
      for (const k of e.couples) {
        const ref = `data/ssot/forum-request-digest.json#${e.topic}/${e.post}`;
        ssot.couples[k] = [...new Set([...(ssot.couples[k] || []), ref])];
      }
    }
    writeJson(SSOT, ssot);
    writeJson(TASKS, {
      _meta: { generator: 'forum-request-digest', note: 'candidate tasks; never auto-applied; consumed by Grok Bot routines' },
      generated: state.updated,
      items: mergeUnique(loadJson(TASKS, { items: [] }).items, tasks, (x) => x.url, 200),
    });
    writeJson(REPLIES, {
      generated: state.updated,
      note: 'P3362 forum reply candidates only. No workflow posts. The anti-flood routine decides.',
      limits: { autoPost: false, neverTopics: [26439], neverUsers: ['Doekse', 'Drenso'] },
      candidates: mergeUnique(loadJson(REPLIES, { candidates: [] }).candidates, replies, (x) => x.url, 80),
    });
    const cand = loadJson(DIGEST_CAND, { _meta: {}, items: [] });
    cand._meta = cand._meta || { generator: 'forum-request-digest', note: 'candidate tasks; never auto-applied' };
    cand.items = mergeUnique(cand.items, tasks.map((t) => ({ kind: t.kind, target: t.target, hint: t.hint, url: t.url })), (x) => x.url, 300);
    writeJson(DIGEST_CAND, cand);
  }
  return { dry, rateLimited, budgetLeft: left, findings: entries.length, tasks: tasks.length, replies: replies.length, topics: report };
}

if (require.main === module) {
  run({
    budget: num('budget', 80, 1, 200),
    perTopic: num('per-topic', 20, 1, 80),
    satellites: num('satellites', 6, 0, 20),
    seed: num('seed', 30, 1, 80),
    delayMs: num('delay', 900, 300, 5000),
    dry: argv.includes('--dry'),
  }).then((r) => {
    const s = JSON.stringify(r, null, 1);
    console.log(s);
    if (process.env.GITHUB_STEP_SUMMARY) {
      try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Forum request digest (P3362)\n\`\`\`json\n${s.slice(0, 4000)}\n\`\`\`\n`); } catch { /* best effort */ }
    }
  }).catch((e) => { console.error(e); process.exitCode = 1; });
}

module.exports = {
  run, classifyRequest, extractDiagIds, ideaTags, allowReply, buildEntry, pickTopics, NEVER_REPLY_TOPICS,
};
