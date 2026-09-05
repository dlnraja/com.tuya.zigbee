#!/usr/bin/env node
'use strict';
/**
 * forum-full-analyze.js — Classifies every post of the full forum topic:
 * bug reports, device requests, diagnostics codes, questions, thanks,
 * maintainer answers. Extracts fingerprints, diag codes, images, links.
 * Cross-references fingerprints against drivers/app.json coverage.
 * Output: reports/forum-full-digest.md + .github/state/forum-full-analysis.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OWNER = 'dlnraja';

const FP_RX = /_T(?:ZE200|ZE204|ZE284|ZE210|Z3000|Z3210|Z3290|Z3040|ZB01|ZB210|YZB01|YST11)[A-Za-z0-9_]{4,20}/g;
const DIAG_RX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

function classify(p) {
  const t = (p.text || '').toLowerCase();
  if (p.user === OWNER) {return 'maintainer';}
  if (DIAG_RX.test(p.text)) {return 'diagnostic';}
  if (/not working|doesn'?t work|unknown|no data|crash|bug|fail|broken|missing|error|unknown zigbee/i.test(t)) {return 'bug';}
  if (/could you (please )?add|please add|device request|add this|support for|can you add/i.test(t)) {return 'device_request';}
  if (/thank|merci|thanks|great|awesome|appreciate/i.test(t)) {return 'thanks';}
  if (/\?/.test(p.text)) {return 'question';}
  return 'other';
}

function main() {
  const topic = JSON.parse(fs.readFileSync(path.join(ROOT, '.github', 'state', 'forum-full-topic.json'), 'utf8'));
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const covered = new Set();
  for (const d of app.drivers || []) {
    for (const m of d.zigbee?.manufacturerName || []) {covered.add(m.toLowerCase());}
  }

  const byClass = {};
  const fingerprints = new Map(); // fp -> { count, users:Set, covered }
  const diagCodes = new Set();
  const allImages = [];
  const allLinks = new Map(); // domain -> count
  const unanswered = [];

  for (const p of topic.posts) {
    const cls = classify(p);
    byClass[cls] = (byClass[cls] || 0) + 1;
    for (const fp of (p.text.match(FP_RX) || [])) {
      if (!fingerprints.has(fp)) {fingerprints.set(fp, { count: 0, users: new Set(), posts: [] });}
      const e = fingerprints.get(fp);
      e.count++;
      e.users.add(p.user);
      if (e.posts.length < 3) {e.posts.push(p.n);}
    }
    for (const dc of (p.text.match(DIAG_RX) || [])) {diagCodes.add(dc);}
    for (const img of p.images) {allImages.push({ post: p.n, user: p.user, url: img });}
    for (const l of p.links) {
      try {
        const host = new URL(l.startsWith('http') ? l : 'https://community.homey.app' + l).hostname;
        allLinks.set(host, (allLinks.get(host) || 0) + 1);
      } catch { /* ignore */ }
    }
    if (cls === 'bug' || cls === 'device_request' || cls === 'diagnostic') {
      // post du maintainer après ? (réponse dans les 5 posts suivants)
      const answer = topic.posts.find(q => q.user === OWNER && q.n > p.n && q.n <= p.n + 5);
      if (!answer) {unanswered.push({ n: p.n, user: p.user, cls, date: p.date, excerpt: p.text.slice(0, 160) });}
    }
  }

  const uncovered = [...fingerprints.entries()].filter(([fp]) => !covered.has(fp.toLowerCase()));

  const analysis = {
    generated: new Date().toISOString(),
    posts: topic.count,
    byClass,
    fingerprints: { total: fingerprints.size, uncovered: uncovered.length, uncoveredList: uncovered.map(([fp, e]) => ({ fp, count: e.count, users: [...e.users], posts: e.posts })) },
    diagCodes: diagCodes.size,
    images: allImages.length,
    topLinkHosts: [...allLinks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
    unansweredCount: unanswered.length,
  };
  fs.writeFileSync(path.join(ROOT, '.github', 'state', 'forum-full-analysis.json'), JSON.stringify({ ...analysis, unanswered }, null, 1));

  // Digest markdown
  const L = [];
  L.push(`# 🌍 Digest complet du topic forum (${topic.count} posts)`, '');
  L.push(`> Généré le ${analysis.generated.slice(0, 16).replace('T', ' ')} UTC depuis ${topic.url}`, '');
  L.push('## Répartition', '');
  for (const [cls, n] of Object.entries(byClass).sort((a, b) => b[1] - a[1])) {L.push(`- **${cls}** : ${n}`);}
  L.push('');
  L.push(`## Empreintes mentionnées : ${fingerprints.size} (non couvertes : ${uncovered.length})`, '');
  for (const { fp, count, users, posts } of analysis.fingerprints.uncoveredList.slice(0, 40)) {
    L.push(`- \`${fp}\` ×${count} (${users.join(', ')}) — posts ${posts.join(', ')}`);
  }
  L.push('');
  L.push(`## Diagnostics codes : ${diagCodes.size} · Images : ${allImages.length} · Posts sans réponse du maintainer : ${unanswered.length}`, '');
  L.push('## Hôtes de liens les plus partagés', '');
  for (const [host, n] of analysis.topLinkHosts) {L.push(`- ${host} : ${n}`);}
  L.push('');
  L.push('## Posts à traiter (bug/device/diag sans réponse maintainer ≤ 5 posts)', '');
  for (const u of unanswered.slice(0, 60)) {
    L.push(`- **#${u.n}** (${u.date}, ${u.user}, ${u.cls}) : ${u.excerpt.replace(/\s+/g, ' ')}`);
  }
  if (unanswered.length > 60) {L.push(`- … et ${unanswered.length - 60} de plus (voir forum-full-analysis.json)`);}
  L.push('');

  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'forum-full-digest.md'), L.join('\n'));
  console.log(JSON.stringify({ posts: analysis.posts, byClass, uncovered: uncovered.length, diagCodes: diagCodes.size, images: allImages.length, unanswered: unanswered.length }, null, 1));
}

main();
