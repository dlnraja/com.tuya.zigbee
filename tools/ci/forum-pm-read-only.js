#!/usr/bin/env node
'use strict';

/**
 * Read-only Homey Community PM harvest (T157628).
 *
 * WHY: Forum private replies often carry fingerprints / diagnostic UUIDs that
 * public topic 140352 never shows. Comment: session SSO via HOMEY_EMAIL +
 * HOMEY_PASSWORD (GitHub secrets). Never invent a pid from a retail SKU.
 * HOW: Discourse inbox/sent JSON with session cookies or Api-Key.
 * WHO: CI bot (master). Artifacts only — not Homey runtime.
 * WHEN: workflow_dispatch (no cron).
 * AGAINST: forum-pm-scanner.js historically POSTed replies; this script has
 * no POST code path at all.
 */

const fs = require('fs');
const path = require('path');

const { getForumAuth, authHeaders, FORUM } = require('../../.github/scripts/forum-auth');

const USERNAME = process.env.FORUM_USERNAME || 'dlnraja';
const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, '.github', 'state', 'forum');
const MAX_THREADS = Math.min(40, Math.max(1, Number(process.env.FORUM_PM_MAX_THREADS || 20)));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MFR_RE = /(_T[A-Z0-9]{2,6}[A-Z0-9]?[A-Z0-9]?_[A-Za-z0-9]{4,16})/gi;
const PID_RE = /\b(TS[0-9]{3,4}[A-Z]?)\b/g;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniq(list) {
  return [...new Set((list || []).filter(Boolean))];
}

async function forumGet(ep, auth) {
  const headers = {
    Accept: 'application/json',
    'User-Agent': UA,
    Referer: `${FORUM}/`,
    ...authHeaders(auth, false),
  };
  const res = await fetch(`${FORUM}${ep}`, { headers });
  if (!res.ok) {
    console.log(`GET ${ep} -> ${res.status}`);
    return null;
  }
  return res.json();
}

function extractSignals(text) {
  const body = String(text || '');
  return {
    manufacturers: uniq([...body.matchAll(MFR_RE)].map((m) => m[1])),
    productIds: uniq([...body.matchAll(PID_RE)].map((m) => m[1])),
    diagnosticUuids: uniq([...body.matchAll(UUID_RE)].map((m) => m[0].toLowerCase())),
  };
}

async function listPmTopics(auth, box) {
  const ep = box === 'sent'
    ? `/topics/private-messages-sent/${USERNAME}.json`
    : `/topics/private-messages/${USERNAME}.json`;
  const data = await forumGet(ep, auth);
  const topics = data?.topic_list?.topics || [];
  return topics.map((t) => ({
    id: t.id,
    title: t.title,
    posts: t.posts_count,
    lastPosted: t.last_posted_at,
    slug: t.slug,
    box,
    participants: (t.participants || []).map((p) => p.username).filter(Boolean),
  }));
}

async function fetchThread(topicId, auth) {
  const first = await forumGet(`/t/${topicId}.json`, auth);
  if (!first) return null;
  const posts = [];
  const seen = new Set();
  const add = (p) => {
    if (!p || seen.has(p.id)) return;
    seen.add(p.id);
    const text = stripHtml(p.cooked);
    posts.push({
      id: p.id,
      num: p.post_number,
      user: p.username,
      date: p.created_at,
      replyTo: p.reply_to_post_number || null,
      text,
      ...extractSignals(text),
    });
  };
  for (const p of first.post_stream?.posts || []) add(p);
  const stream = first.post_stream?.stream || [];
  const remaining = stream.filter((id) => ![...seen].includes(id) && !first.post_stream.posts.some((p) => p.id === id));
  for (let i = 0; i < remaining.length; i += 20) {
    const chunk = remaining.slice(i, i + 20);
    const q = chunk.map((id) => `post_ids[]=${id}`).join('&');
    const extra = await forumGet(`/t/${topicId}/posts.json?${q}`, auth);
    for (const p of extra?.post_stream?.posts || []) add(p);
    await sleep(250);
  }
  posts.sort((a, b) => a.num - b.num);
  return {
    id: topicId,
    title: first.title,
    archetype: first.archetype,
    posts,
  };
}

function summarize(threads) {
  const manufacturers = [];
  const productIds = [];
  const diagnosticUuids = [];
  const byUser = {};
  for (const t of threads) {
    for (const p of t.posts || []) {
      manufacturers.push(...(p.manufacturers || []));
      productIds.push(...(p.productIds || []));
      diagnosticUuids.push(...(p.diagnosticUuids || []));
      if (!byUser[p.user]) byUser[p.user] = { posts: 0, manufacturers: [], diagnosticUuids: [] };
      byUser[p.user].posts += 1;
      byUser[p.user].manufacturers.push(...(p.manufacturers || []));
      byUser[p.user].diagnosticUuids.push(...(p.diagnosticUuids || []));
    }
  }
  for (const u of Object.keys(byUser)) {
    byUser[u].manufacturers = uniq(byUser[u].manufacturers);
    byUser[u].diagnosticUuids = uniq(byUser[u].diagnosticUuids);
  }
  return {
    manufacturers: uniq(manufacturers),
    productIds: uniq(productIds),
    diagnosticUuids: uniq(diagnosticUuids),
    byUser,
  };
}

async function main() {
  if (process.env.FORUM_AUTO_POST === '1') {
    console.error('REFUSE: forum-pm-read-only.js never posts (T157628). Unset FORUM_AUTO_POST.');
    process.exit(2);
  }

  console.log('== Forum PM read-only harvest ==');
  const auth = await getForumAuth();
  if (!auth) {
    console.log('No forum auth (need HOMEY_EMAIL+HOMEY_PASSWORD or DISCOURSE_API_KEY). Exit 0.');
    process.exit(0);
  }
  console.log('Auth type:', auth.type);

  const inbox = await listPmTopics(auth, 'inbox');
  await sleep(400);
  const sent = await listPmTopics(auth, 'sent');
  const seenIds = new Set();
  const topics = [];
  for (const t of [...inbox, ...sent]) {
    if (seenIds.has(t.id)) continue;
    seenIds.add(t.id);
    topics.push(t);
  }
  console.log(`Inbox ${inbox.length} / sent ${sent.length} / unique ${topics.length}`);

  const selected = topics.slice(0, MAX_THREADS);
  const threads = [];
  for (const t of selected) {
    const full = await fetchThread(t.id, auth);
    if (full) {
      threads.push({ ...t, ...full });
      console.log(`  PM ${t.id}: ${full.posts.length} posts — ${(full.title || '').slice(0, 60)}`);
    }
    await sleep(350);
  }

  const summary = summarize(threads);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    timestamp: new Date().toISOString(),
    username: USERNAME,
    policy: 'read-only-never-post',
    authType: auth.type,
    topicCount: topics.length,
    fetched: threads.length,
    summary,
    threads: threads.map((t) => ({
      id: t.id,
      title: t.title,
      box: t.box,
      lastPosted: t.lastPosted,
      participants: t.participants,
      posts: (t.posts || []).map((p) => ({
        num: p.num,
        user: p.user,
        date: p.date,
        manufacturers: p.manufacturers,
        productIds: p.productIds,
        diagnosticUuids: p.diagnosticUuids,
        text: String(p.text || '').slice(0, 4000),
      })),
    })),
  };
  const outFile = path.join(OUT_DIR, 'pm-inbox.json');
  fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);
  console.log('Wrote', outFile);
  console.log('Mfrs:', summary.manufacturers.join(', ') || '(none)');
  console.log('Pids:', summary.productIds.join(', ') || '(none)');
  console.log('Diag UUIDs:', summary.diagnosticUuids.join(', ') || '(none)');

  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = [
      '## Forum PM read-only',
      `Auth: \`${auth.type}\` · threads fetched: ${threads.length}/${topics.length}`,
      '',
      '| Signal | Count |',
      '|---|---|',
      `| Manufacturers | ${summary.manufacturers.length} |`,
      `| Product IDs | ${summary.productIds.length} |`,
      `| Diagnostic UUIDs | ${summary.diagnosticUuids.length} |`,
      '',
      'Policy: never POST. Implement silently. Do not invent pids.',
      '',
    ].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(0);
});
