#!/usr/bin/env node
'use strict';
// P3144 (t749u): incremental, read-only miner of a Homey Community category (default Apps, id 7).
// Diff mode: only topics whose highest_post_number moved past the stored watermark are read.
// Adaptive: after N empty runs the scan backs off (skips runs) until something moves again.
// No AI. External text is DATA ONLY: sanitized + redacted by scripts/lib/source-digest (fail closed).
// Never posts. State: data/leads/forum-lastseen.json -> categories[<id>].
const fs = require('fs');
const path = require('path');
const sd = require('../lib/source-digest');
const ROOT = path.join(__dirname, '..', '..');
const STATE = path.join(ROOT, 'data/leads/forum-lastseen.json');
const SSOT = path.join(ROOT, 'data/ssot/thread-digests.json');
const BASE = 'https://community.homey.app';
const RELEVANT = /zigbee|tuya|energy|power|presence|radar|climate|thermostat|trv|heat|cover|curtain|blind|shutter|garage|light|dimmer|homekit|insight|flow|sensor|button|switch|aqara|sonoff|ikea|hue|repair|diagnos/i;
const SKIP = /\b(car|camera|vacuum|tesla|vehicle|robot)\b/i;

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return d; } };

function selectTopics(topics, seen) {
  return topics.filter((t) => t && RELEVANT.test(t.title || '') && !SKIP.test(t.title || ''))
    .filter((t) => !seen[t.id] || (t.highest_post_number || t.posts_count || 0) > (seen[t.id].highest || 0));
}
/** Adaptive frequency: back off 2^emptyRuns (max 8) runs when nothing changed. */
function shouldRun(cat, runNo) {
  const e = Math.min(3, cat.emptyRuns || 0); const every = 2 ** e;
  return every <= 1 || (runNo % every) === 0;
}
function digestTopic(t, posts) {
  const body = posts.map((p) => String(p.cooked || '').replace(/<[^>]+>/g, ' ')).join('\n');
  const d = sd.build({ source: 'homey-forum-apps', url: `${BASE}/t/${t.id}`, title: t.title, body, labels: ['apps-category'] }, null);
  return sd.assertClean(d);
}
async function getJson(u) {
  const r = await fetch(u, { headers: { 'User-Agent': 'com.tuya.zigbee-forum-scan (read-only)', Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`);
  return r.json();
}
async function main() {
  const cat = arg('category', '7'); const pages = Number(arg('pages', '3')); const budget = Number(arg('budget', '25'));
  const state = readJson(STATE, { topics: {} }); state.categories = state.categories || {};
  const c = state.categories[cat] = state.categories[cat] || { seen: {}, emptyRuns: 0, runs: 0 };
  c.runs = (c.runs || 0) + 1;
  if (!shouldRun(c, c.runs) && !process.env.FORCE_SCAN) { console.log(`[cat-scan] backoff (emptyRuns=${c.emptyRuns})`); fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n'); return; }
  let topics = [];
  for (let p = 0; p < pages; p++) {
    try { const j = await getJson(`${BASE}/c/apps/${cat}/l/latest.json?page=${p}`); topics.push(...((j.topic_list || {}).topics || [])); } catch (e) { console.log(`[cat-scan] page ${p}: ${e.message}`); break; }
  }
  const todo = selectTopics(topics, c.seen).slice(0, budget);
  const digests = [];
  for (const t of todo) {
    try {
      const j = await getJson(`${BASE}/t/${t.id}.json`);
      const from = (c.seen[t.id] && c.seen[t.id].highest) || 0;
      const posts = ((j.post_stream || {}).posts || []).filter((p) => p.post_number > from || p.post_number === 1);
      digests.push(digestTopic(t, posts));
      c.seen[t.id] = { highest: t.highest_post_number || t.posts_count || 0, at: new Date().toISOString().slice(0, 10) };
    } catch (e) { if (e.code === 'PRIVACY_LEAK') console.log(`[cat-scan] ${t.id} dropped (privacy)`); else console.log(`[cat-scan] ${t.id}: ${e.message}`); }
  }
  c.emptyRuns = digests.length ? 0 : (c.emptyRuns || 0) + 1;
  c.lastRun = new Date().toISOString();
  fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');
  if (!digests.length) { console.log('[cat-scan] no change'); return; }
  const md = path.join(ROOT, `docs/knowledge/forum-apps/category-${cat}.md`);
  fs.mkdirSync(path.dirname(md), { recursive: true });
  const head = fs.existsSync(md) ? fs.readFileSync(md, 'utf8') : `# Homey forum — Apps category ${cat} digests (auto, technical only)\n\n`;
  fs.writeFileSync(md, sd.assertClean(head + digests.map(sd.toMarkdown).join('\n')));
  const ssot = readJson(SSOT, { couples: {} }); ssot.couples = ssot.couples || {};
  for (const d of digests) for (const k of d.implications.couples) {
    const ref = `docs/knowledge/forum-apps/category-${cat}.md#${d.url}`;
    ssot.couples[k] = [...new Set([...(ssot.couples[k] || []), ref])];
  }
  fs.writeFileSync(SSOT, JSON.stringify(ssot, null, 1) + '\n');
  console.log(`[cat-scan] ${digests.length} digests`);
}
if (require.main === module) main().catch((e) => { console.log(`[cat-scan] soft-fail: ${e.message}`); });
module.exports = { selectTopics, shouldRun, digestTopic, RELEVANT, SKIP };
