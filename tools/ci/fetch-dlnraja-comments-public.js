#!/usr/bin/env node
/**
 * fetch-dlnraja-comments-public.js
 *
 * Uses PUBLIC GitHub API (no auth) to fetch all dlnraja comments on
 * JohanBendz/com.tuya.zigbee. Updates the local JSON with verified IDs.
 *
 * Rate limit: 60 req/h (no auth), 5000 req/h (with auth)
 *
 * Usage:
 *   node tools/ci/fetch-dlnraja-comments-public.js
 *   GH_TOKEN=ghp_xxx node tools/ci/fetch-dlnraja-comments-public.js  # higher rate
 */

'use strict';

const https = require('https');
const path = require('path');
const { SmartFetcher } = require(path.resolve(__dirname, '..', '..', 'lib', 'scraper', 'smart-fetch'));

const REPO = 'JohanBendz/com.tuya.zigbee';
const USERNAME = 'dlnraja';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

// P55 — use smart-fetch (cache + retry + adaptive rate limit)
// GH_TOKEN gives 5000 req/hr (1.4 req/sec). Without token, only 60 req/hr.
const ghFetcher = new SmartFetcher({
  source: 'github',
  userAgent: 'Mavis-Public-API',
  maxRetries: 3,
  baseBackoffMs: 2000,  // 429s from GitHub usually need 1-5s backoff
  concurrency: TOKEN ? 10 : 2,  // Be gentle without auth
  defaultDelay: TOKEN ? 100 : 2000,  // Sleep between requests when no token
  headers: {
    'Accept': 'application/vnd.github+json',
    ...(TOKEN ? { 'Authorization': 'Bearer ' + TOKEN } : {}),
  },
});

async function call(apiPath) {
  const r = await ghFetcher.fetch('https://api.github.com' + apiPath, {
    headers: TOKEN ? { 'Authorization': 'Bearer ' + TOKEN } : {},
  });
  const body = JSON.parse(r.body.toString('utf8'));
  return { status: 200, body, rate: 0 };  // rate header info not preserved, but OK
}

async function main() {
  console.log('Fetch dlnraja comments on ' + REPO);
  console.log('Token:', TOKEN ? 'YES' : 'NO (public, 60 req/h)');
  console.log('');

  const allComments = [];
  const issues = new Map(); // issueNumber → { title, comments: [] }

  // Step 1: Get all issues/PRs where dlnraja commented
  console.log('Step 1: Search issues where dlnraja commented...');
  let page = 1;
  const allIssues = [];
  while (page <= 10) {
    const r = await call(`/search/issues?q=author:${USERNAME}+repo:${REPO}+type:issue&per_page=100&page=${page}`);
    if (r.status !== 200) {
      console.log('  status=' + r.status + ' body=' + JSON.stringify(r.body).substring(0, 200));
      break;
    }
    console.log('  page=' + page + ' status=' + r.status + ' total=' + r.body.total_count);
    if (r.body.items) allIssues.push(...r.body.items);
    if (r.body.items.length < 100) break;
    page++;
  }
  console.log('  Total issues with dlnraja comments: ' + allIssues.length);
  console.log('');

  // Step 2: For each issue, get all comments by dlnraja (P55 — bounded parallel)
  console.log('Step 2: Fetch comments per issue (parallel, concurrency=' + ghFetcher.concurrency + ')...');
  // Build list of comment-page URLs for all issues
  const commentUrls = [];
  for (const issue of allIssues) {
    for (let cp = 1; cp <= 5; cp++) {
      commentUrls.push({ issue: issue, page: cp, url: `/repos/${REPO}/issues/${issue.number}/comments?per_page=100&page=${cp}` });
    }
  }
  // Fetch in parallel (smartFetcher handles cache + retry + adaptive rate)
  const t2 = Date.now();
  const r2 = await ghFetcher.fetchAll(commentUrls.map(c => 'https://api.github.com' + c.url), {
    concurrency: ghFetcher.concurrency,
    onProgress: (d, t) => process.stdout.write(`\r  [Step 2] ${d}/${t}    `),
  });
  console.log(`\r  [Step 2] Done in ${Date.now() - t2}ms`);
  for (let i = 0; i < commentUrls.length; i++) {
    const { issue, page } = commentUrls[i];
    const r = r2[i];
    if (r.error || !r.body) continue;
    let body;
    try { body = JSON.parse(r.body.toString('utf8')); } catch { continue; }
    if (!Array.isArray(body)) continue;
    const dlnComments = body.filter(c => c.user?.login === USERNAME);
    if (dlnComments.length > 0) {
      if (!issues.has(issue.number)) {
        issues.set(issue.number, { title: (issue.title || '').substring(0, 50), comments: [] });
      }
      issues.get(issue.number).comments.push(...dlnComments);
      allComments.push(...dlnComments);
    }
  }
  console.log('\n  Total dlnraja comments found: ' + allComments.length);
  console.log('  Issues with dlnraja comments: ' + issues.size);
  console.log('');

  // Step 3: Save report
  const report = {
    timestamp: new Date().toISOString(),
    source: 'public-api-no-auth',
    repo: REPO,
    username: USERNAME,
    summary: {
      totalComments: allComments.length,
      issuesTouched: issues.size,
      rateLimitRemaining: '?',
    },
    comments: allComments.map(c => ({
      commentId: c.id,
      issueNumber: parseInt(c.issue_url.match(/issues\/(\d+)/)?.[1] || '0', 10),
      author: c.user.login,
      createdAt: c.created_at,
      url: c.html_url,
      excerpt: c.body.substring(0, 100),
    })),
  };
  const fs = require('fs');
  const path = require('path');
  fs.writeFileSync('.github/state/johan-comments-public-api.json', JSON.stringify(report, null, 2));
  console.log('✓ Report: .github/state/johan-comments-public-api.json');

  // Save CSV
  const csvLines = ['commentId,issueNumber,author,createdAt,url,excerpt'];
  for (const c of report.comments) {
    const esc = (s) => '"' + (s || '').toString().replace(/"/g, '""') + '"';
    csvLines.push([c.commentId, c.issueNumber, esc(c.author), c.createdAt, c.url, esc(c.excerpt)].join(','));
  }
  fs.writeFileSync('.github/state/johan-comments-public-api.csv', csvLines.join('\n'));
  console.log('✓ CSV: .github/state/johan-comments-public-api.csv');

  // Summary
  console.log('');
  console.log('=== SUMMARY ===');
  console.log('Comments verified:', report.comments.length);
  console.log('Issues touched:', report.summary.issuesTouched);
  console.log('Note: this is a SUBSET (public API has limitations).');
  console.log('Full list of 1171 still in: .github/state/johan-comments-to-delete.json');
  console.log('');
  console.log('To delete these, you need GH_TOKEN. Run:');
  console.log('  $env:GH_TOKEN = "ghp_xxx"');
  console.log('  node tools/ci/delete-johan-all.js');
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
