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

const REPO = 'JohanBendz/com.tuya.zigbee';
const USERNAME = 'dlnraja';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

function call(path) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'Mavis-Public-API',
      'Accept': 'application/vnd.github+json',
    };
    if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
    https.get('https://api.github.com' + path, { headers }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, rate: parseInt(res.headers['x-ratelimit-remaining'] || '0', 10), body: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, body: body.substring(0, 200) }); }
      });
    }).on('error', reject);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
    console.log('  page=' + page + ' status=' + r.status + ' rate_remaining=' + r.rate + ' total=' + r.body.total_count);
    if (r.body.items) allIssues.push(...r.body.items);
    if (r.body.items.length < 100) break;
    page++;
    await sleep(1500); // rate limit
  }
  console.log('  Total issues with dlnraja comments: ' + allIssues.length);
  console.log('');

  // Step 2: For each issue, get all comments by dlnraja
  console.log('Step 2: Fetch comments per issue...');
  for (const issue of allIssues) {
    const issueNum = issue.number;
    const issueTitle = (issue.title || '').substring(0, 50);
    const allIssueComments = [];
    let cPage = 1;
    while (cPage <= 5) {
      const r = await call(`/repos/${REPO}/issues/${issueNum}/comments?per_page=100&page=${cPage}`);
      if (r.status !== 200) {
        console.log('  #' + issueNum + ' status=' + r.status);
        break;
      }
      if (!Array.isArray(r.body)) break;
      const dlnComments = r.body.filter(c => c.user.login === USERNAME);
      allIssueComments.push(...dlnComments);
      allComments.push(...dlnComments);
      if (r.body.length < 100) break;
      cPage++;
      await sleep(1000);
    }
    if (allIssueComments.length > 0) {
      issues.set(issueNum, { title: issueTitle, comments: allIssueComments });
      process.stdout.write('.');
    } else {
      process.stdout.write('x');
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
