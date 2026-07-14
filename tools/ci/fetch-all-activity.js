#!/usr/bin/env node
/**
 * P30.2-P30.4 — Unified Activity Fetcher
 *
 * Fetches in one pass:
 * - All open/recent GH issues
 * - All recent GH comments (with issue link)
 * - All recent GH events
 * - All recent PRs
 * - All recent forum topics with full discussion threads
 * - All recent emails (gmail-diagnostics output)
 * - All recent crash logs
 *
 * Output: .github/state/activity-snapshot.json
 * Usage: node tools/ci/fetch-all-activity.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { SmartFetcher } = require(path.resolve(__dirname, '..', '..', 'lib', 'scraper', 'smart-fetch'));

const repoRoot = path.resolve(__dirname, '..', '..');
const outputFile = path.join(repoRoot, '.github', 'state', 'activity-snapshot.json');
const ghToken = process.env.GH_TOKEN;
const repo = 'dlnraja/com.tuya.zigbee';

function log(...args) { console.log('[P30 activity]', ...args); }

// P55 — smart fetchers (cache + retry + adaptive rate limit)
const ghFetcher = new SmartFetcher({
  source: 'github',
  userAgent: 'P30-activity-fetcher',
  concurrency: 8,
  maxRetries: 3,
  baseBackoffMs: 2000,
  headers: {
    'Accept': 'application/vnd.github+json',
    ...(ghToken ? { 'Authorization': 'token ' + ghToken } : {}),
  },
});
const forumFetcher = new SmartFetcher({
  source: 'forum-topic',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  concurrency: 4,
  maxRetries: 2,
  baseBackoffMs: 3000,
  defaultDelay: 250,
  headers: { 'Accept': 'application/json, text/plain, */*', 'Referer': 'https://community.homey.app/' },
});

async function httpsGet(url, headers = {}) {
  // Use the appropriate fetcher based on URL host
  const fetcher = url.includes('api.github.com') ? ghFetcher : forumFetcher;
  try {
    const r = await fetcher.fetch(url, { headers });
    if (r.statusCode >= 200 && r.statusCode < 300) {
      try { return JSON.parse(r.body.toString('utf8')); } catch (e) { throw new Error('Parse: ' + e.message); }
    }
    if (r.statusCode === 404) return null;
    throw new Error('HTTP ' + r.statusCode + ': ' + r.body.toString('utf8').substring(0, 200));
  } catch (e) {
    if (e.message?.includes('Parse')) throw e;
    throw e;
  }
}

async function fetchGHIssues(state) {
  if (!ghToken) return [];
  try {
    // P55 — parallel batch
    const urls = [
      `https://api.github.com/repos/${repo}/issues?state=open&per_page=50`,
      `https://api.github.com/repos/${repo}/issues?state=all&per_page=30&since=${state.lastGHFetch || '2026-07-01T00:00:00Z'}`,
    ];
    const results = await ghFetcher.fetchAll(urls, { concurrency: 2 });
    return { open: results[0].error ? [] : JSON.parse(results[0].body.toString('utf8')), recent: results[1].error ? [] : JSON.parse(results[1].body.toString('utf8')) };
  } catch (err) {
    log('❌ GH issues error:', err.message);
    return { open: [], recent: [] };
  }
}

async function fetchGHComments(state) {
  if (!ghToken) return [];
  try {
    return await httpsGet(
      `https://api.github.com/repos/${repo}/issues/comments?per_page=40&sort=created&direction=desc`,
      { 'Authorization': `token ${ghToken}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'P30-activity-fetcher' }
    );
  } catch (err) {
    log('❌ GH comments error:', err.message);
    return [];
  }
}

async function fetchGHEvents() {
  if (!ghToken) return [];
  try {
    return await httpsGet(
      `https://api.github.com/repos/${repo}/events?per_page=40`,
      { 'Authorization': `token ${ghToken}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'P30-activity-fetcher' }
    );
  } catch (err) {
    log('❌ GH events error:', err.message);
    return [];
  }
}



async function fetchGHWorkflowRuns(state) {
  if (!ghToken) return [];
  try {
    const runs = await httpsGet(
      `https://api.github.com/repos/${repo}/actions/runs?per_page=20`,
      { 'Authorization': `token ${ghToken}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'P30-activity-fetcher' }
    );
    if (Array.isArray(runs && runs.workflow_runs)) {
      return runs.workflow_runs.map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        conclusion: r.conclusion,
        branch: r.head_branch,
        createdAt: r.created_at,
        event: r.event,
      }));
    }
    return [];
  } catch (err) {
    log('❌ GH workflow runs error:', err.message);
    return [];
  }
}
async function fetchGHPRs() {
  if (!ghToken) return [];
  try {
    return await httpsGet(
      `https://api.github.com/repos/${repo}/pulls?state=all&per_page=30&sort=updated&direction=desc`,
      { 'Authorization': `token ${ghToken}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'P30-activity-fetcher' }
    );
  } catch (err) {
    log('❌ GH PRs error:', err.message);
    return [];
  }
}

async function fetchForumTopics() {
  // Discourse public API for the Homey community forum
  const forumBase = 'https://community.homey.app';
  const topicDetails = [];
  let searchResults = [];

  try {
    // Search for our app name
    const search = await httpsGet(
      `${forumBase}/search.json?q=tuya+zigbee+dlnraja&order=latest`,
      { 'User-Agent': 'Mozilla/5.0 (P30-activity-fetcher)' }
    );
    if (search && Array.isArray(search.posts)) {
      // Extract unique topic IDs
      const topicIds = [...new Set(search.posts.map(p => p.topic_id).filter(Boolean))].slice(0, 15);
      searchResults = topicIds;

      // P55 — parallel fetch all topic details (smartFetcher handles cache + retry + 429)
      const tTopic = Date.now();
      const detailResults = await forumFetcher.fetchAll(topicIds.map(tid => `${forumBase}/t/${tid}.json`), {
        concurrency: forumFetcher.concurrency,
        onProgress: (d, t) => process.stdout.write(`\r  [Forum] ${d}/${t}    `),
      });
      console.log(`\r  [Forum] Done in ${Date.now() - tTopic}ms`);
      for (let i = 0; i < topicIds.length; i++) {
        const tid = topicIds[i];
        const r = detailResults[i];
        if (r.error || !r.body) continue;
        try {
          const detail = JSON.parse(r.body.toString('utf8'));
          const posts = (detail.post_stream?.posts || []).map(p => ({
            id: p.id,
            username: p.username,
            createdAt: p.created_at,
            cooked: (p.cooked || '').replace(/<[^>]+>/g, '').substring(0, 1000),
          }));
          topicDetails.push({
            id: tid,
            title: detail.title,
            slug: detail.slug,
            createdAt: detail.created_at,
            lastPostedAt: detail.last_posted_at,
            postsCount: detail.posts_count,
            views: detail.views,
            likeCount: detail.like_count,
            posts,
            url: `${forumBase}/t/${detail.slug}/${tid}`,
          });
        } catch (e) { /* skip topic */ }
      }
    }
  } catch (err) {
    log('❌ Forum error:', err.message);
  }
  return { topics: searchResults.map(id => ({ id })), details: topicDetails };
}

function loadLocalEmails() {
  const emails = {};
  const gmailDir = path.join(repoRoot, '.github', 'state');
  if (!fs.existsSync(gmailDir)) return emails;

  // Look for gmail-* directories
  for (const d of fs.readdirSync(gmailDir)) {
    if (!d.startsWith('gmail')) continue;
    const fullPath = path.join(gmailDir, d);
    if (!fs.statSync(fullPath).isDirectory()) continue;
    const manifestPath = path.join(fullPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        emails[d] = m;
      } catch { /* ignore */ }
    }
  }

  // Check emails-aggregate.json
  const aggPath = path.join(gmailDir, 'emails-aggregate.json');
  if (fs.existsSync(aggPath)) {
    try {
      const agg = JSON.parse(fs.readFileSync(aggPath, 'utf8'));
      emails._aggregate = {
        totalEmails: Array.isArray(agg) ? agg.length : (agg.totalEmails || 0),
        crashReports: agg.crashReports?.length || agg.crashes?.length || 0,
        bugReports: agg.bugReports?.length || agg.bugs?.length || 0,
        deviceIssues: agg.deviceIssues?.length || agg.devices?.length || 0,
        lastEmail: agg.lastEmail || agg.lastFetched,
      };
    } catch { /* ignore */ }
  }

  return emails;
}

function loadCrashLogs() {
  const crashFiles = [];
  const diagnosticsDir = path.join(repoRoot, '.github', 'state');
  if (!fs.existsSync(diagnosticsDir)) return crashFiles;

  for (const f of fs.readdirSync(diagnosticsDir)) {
    if (f.includes('crash') || f.includes('diagnostic')) {
      try {
        const stat = fs.statSync(path.join(diagnosticsDir, f));
        crashFiles.push({ name: f, sizeKB: Math.round(stat.size / 1024), modified: stat.mtime });
      } catch { /* ignore */ }
    }
  }
  return crashFiles;
}

async function main() {
  log('═'.repeat(70));
  log('UNIFIED ACTIVITY FETCHER v1.0 — started at', new Date().toISOString());
  log('═'.repeat(70));

  const state = {
    lastGHFetch: '2026-07-13T00:00:00Z',
    lastForumFetch: '2026-07-13T00:00:00Z',
  };
  if (fs.existsSync(outputFile)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      state.lastGHFetch = prev.lastGHFetch || state.lastGHFetch;
    } catch { /* ignore */ }
  }

  log('Fetching GH data...');
  const [ghIssues, ghComments, ghEvents, ghPRs] = await Promise.all([
    fetchGHIssues(state),
    fetchGHComments(state),
    fetchGHEvents(),
    fetchGHPRs(),
  ]);
  log(`  Open issues: ${ghIssues.open?.length || 0}, recent: ${ghIssues.recent?.length || 0}`);
  log(`  Comments: ${ghComments.length}`);
  log(`  Events: ${ghEvents.length}`);
  log(`  PRs: ${ghPRs.length}`);

  log('Fetching forum...');
  const forum = await fetchForumTopics();
  log(`  Topics: ${forum.topics.length}, details: ${forum.details.length}`);

  log('Loading local data...');
  const emails = loadLocalEmails();
  const crashLogs = loadCrashLogs();
  log(`  Email sources: ${Object.keys(emails).length}`);
  log(`  Crash log files: ${crashLogs.length}`);

  // Save
  const snapshot = {
    fetchedAt: new Date().toISOString(),
    github: {
      openIssues: (ghIssues.open || []).map(i => ({
        number: i.number,
        title: i.title,
        state: i.state,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        user: i.user?.login,
        labels: (i.labels || []).map(l => l.name),
        commentsCount: i.comments,
        body: (i.body || '').substring(0, 2000),
        url: i.html_url,
      })),
      recentIssues: (ghIssues.recent || []).map(i => ({
        number: i.number,
        title: i.title,
        state: i.state,
        createdAt: i.created_at,
        user: i.user?.login,
        labels: (i.labels || []).map(l => l.name),
        body: (i.body || '').substring(0, 1000),
      })),
      recentComments: ghComments.slice(0, 30).map(c => ({
        id: c.id,
        user: c.user?.login,
        createdAt: c.created_at,
        body: (c.body || '').substring(0, 500),
        issueUrl: c.issue_url,
        issueNumber: (c.issue_url || '').split('/').pop(),
      })),
      events: ghEvents.slice(0, 30).map(e => {
        const a = e.payload || {};
        let desc = e.type;
        if (e.type === 'IssueCommentEvent') desc = `commented on #${a.issue?.number || 0}: ${(a.issue?.title || '').substring(0, 50)}`;
        else if (e.type === 'IssuesEvent') desc = `${a.action || ''} issue #${a.issue?.number || 0}: ${(a.issue?.title || '').substring(0, 50)}`;
        else if (e.type === 'PushEvent') desc = `pushed ${(a.ref || '').replace('refs/heads/', '')} (${(a.commits || []).length} commits)`;
        else if (e.type === 'PullRequestEvent') desc = `${a.action || ''} PR #${a.pull_request?.number || 0}: ${(a.pull_request?.title || '').substring(0, 50)}`;
        return {
          createdAt: e.created_at,
          actor: e.actor?.login,
          type: e.type,
          description: desc,
        };
      }),
      recentPRs: ghPRs.slice(0, 20).map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        user: pr.user?.login,
        createdAt: pr.created_at,
        mergedAt: pr.merged_at,
        body: (pr.body || '').substring(0, 1000),
        labels: (pr.labels || []).map(l => l.name),
      })),
    },
    forum: {
      topics: forum.topics.map(t => ({
        id: t.id,
        title: t.title,
        slug: t.slug,
        createdAt: t.created_at,
        lastPostedAt: t.last_posted_at,
        postsCount: t.posts_count,
        views: t.views,
        likeCount: t.like_count,
        url: `https://community.homey.app/t/${t.slug}/${t.id}`,
      })),
      details: forum.details,
    },
    emails,
    crashLogs,
    state,
  };

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(snapshot, null, 2));

  log('─'.repeat(70));
  log('SUMMARY');
  log('  GH open issues:', snapshot.github.openIssues.length);
  log('  GH recent comments:', snapshot.github.recentComments.length);
  log('  GH events:', snapshot.github.events.length);
  log('  GH PRs:', snapshot.github.recentPRs.length);
  log('  Forum topics:', snapshot.forum.topics.length);
  log('  Forum with full posts:', snapshot.forum.details.length);
  log('  Email sources:', Object.keys(emails).length);
  log('  Crash log files:', crashLogs.length);
  log('  Report saved to:', outputFile);
  log('  Size:', Math.round(fs.statSync(outputFile).size / 1024), 'KB');
}

main().catch(err => {
  console.error('[P30] FATAL:', err);
  process.exit(1);
});
