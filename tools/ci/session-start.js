#!/usr/bin/env node
/**
 * P30.6 — Session-Start Activity Fetcher
 *
 * Quick lightweight fetch of all recent activities to display
 * at the start of each session/prompt. Optimized for speed.
 *
 * Usage: node tools/ci/session-start.js [--quick]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const repoRoot = path.resolve(__dirname, '..', '..');
const cacheFile = path.join(repoRoot, '.github', 'state', 'activity-cache.json');
const ghToken = process.env.GH_TOKEN;
const repo = 'dlnraja/com.tuya.zigbee';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function log(...args) { console.log('[P30 session]', ...args); }

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        } else { reject(new Error(`HTTP ${res.statusCode}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function quickGH() {
  if (!ghToken) return null;
  try {
    const [issues, comments] = await Promise.all([
      httpsGet(`https://api.github.com/repos/${repo}/issues?state=open&per_page=10`, {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'P30-session-start',
      }),
      httpsGet(`https://api.github.com/repos/${repo}/issues/comments?per_page=10&sort=created&direction=desc`, {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'P30-session-start',
      }),
    ]);
    return {
      openIssues: issues.filter(i => !i.pull_request).map(i => ({
        n: i.number, t: i.title, u: i.user?.login, l: (i.labels || []).map(l => l.name).slice(0,3),
      })),
      recentComments: comments.slice(0, 10).map(c => ({
        n: c.issue_url?.split('/').pop(), u: c.user?.login, b: (c.body || '').substring(0, 200),
      })),
    };
  } catch (e) { return null; }
}

async function quickForum() {
  try {
    const r = await httpsGet(
      'https://community.homey.app/search.json?q=tuya+zigbee+dlnraja&order=latest',
      { 'User-Agent': 'Mozilla/5.0 (P30-session-start)' }
    );
    if (!r || !r.posts) return null;
    const topicIds = [...new Set(r.posts.map(p => p.topic_id).filter(Boolean))].slice(0, 5);
    return r.posts.slice(0, 8).map(p => ({
      topicId: p.topic_id,
      title: (p.topic_title || '').substring(0, 80),
      username: p.username,
      createdAt: p.created_at,
      excerpt: (p.cooked || '').replace(/<[^>]+>/g, '').substring(0, 200),
    }));
  } catch (e) { return null; }
}

function loadLocalCrashes() {
  const diagDir = path.join(repoRoot, '.github', 'state');
  if (!fs.existsSync(diagDir)) return null;
  const files = fs.readdirSync(diagDir).filter(f => f.includes('crash') || f.includes('diagnostic') || f.includes('email'));
  if (files.length === 0) return null;
  return files.map(f => {
    const stat = fs.statSync(path.join(diagDir, f));
    return { name: f, sizeKB: Math.round(stat.size / 1024), modified: stat.mtime };
  });
}

async function main() {
  const isQuick = process.argv.includes('--quick');
  log('═'.repeat(60));
  log(`SESSION START ${isQuick ? '(QUICK)' : '(FULL)'} — ${new Date().toISOString()}`);
  log('═'.repeat(60));

  // Try cache first
  if (fs.existsSync(cacheFile)) {
    try {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (Date.now() - cache.timestamp < CACHE_TTL_MS) {
        log('Using cache (age:', Math.round((Date.now() - cache.timestamp) / 1000), 's)');
        return cache.data;
      }
    } catch { /* ignore */ }
  }

  log('Fetching GH + forum + local crashes...');
  const [gh, forum, crashes] = await Promise.all([
    quickGH(),
    quickForum(),
    Promise.resolve(loadLocalCrashes()),
  ]);

  const data = { gh, forum, crashes };
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify({ timestamp: Date.now(), data }, null, 2));

  // Print compact summary
  log('');
  if (gh) {
    log(`📋 OPEN ISSUES (${gh.openIssues.length}):`);
    for (const i of gh.openIssues.slice(0, 5)) {
      log(`   #${i.n} [${i.l.join(',')}] ${i.t.substring(0, 70)} (by ${i.u})`);
    }
  }
  if (gh) {
    log(`💬 RECENT COMMENTS (${gh.recentComments.length}):`);
    for (const c of gh.recentComments.slice(0, 3)) {
      log(`   #${c.n} by ${c.u}: ${c.b.substring(0, 100).replace(/\n/g, ' ')}`);
    }
  }
  if (forum) {
    log(`🌐 FORUM (${forum.length} posts):`);
    for (const p of forum.slice(0, 3)) {
      log(`   topic#${p.topicId} "${p.title}" by ${p.username}`);
    }
  }
  if (crashes) {
    log(`📁 LOCAL CRASH/DIAG FILES (${crashes.length}):`);
    for (const c of crashes.slice(0, 5)) {
      log(`   ${c.name} (${c.sizeKB}KB, ${c.modified.toISOString().substring(0, 10)})`);
    }
  }
  log('');
  log('Cache written to:', cacheFile);
  return data;
}

if (require.main === module) {
  main().catch(err => {
    console.error('[P30 session] FATAL:', err.message);
    process.exit(1);
  });
}

module.exports = { main, quickGH, quickForum, loadLocalCrashes };
