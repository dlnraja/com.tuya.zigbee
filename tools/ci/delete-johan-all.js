#!/usr/bin/env node
/**
 * delete-johan-all.js — ONE-SHOT full execution
 *
 * CARTE BLANCHE mode (P11) — No confirmations.
 * Just need GH_TOKEN env var.
 *
 * Usage:
 *   $env:GH_TOKEN = "ghp_***your_token***"
 *   node tools/ci/delete-johan-all.js
 *
 * What it does:
 *   1. Loads list of 1171 dlnraja comments on JohanBendz/com.tuya.zigbee
 *   2. Deletes them via GitHub API (one at a time, 250ms between)
 *   3. Saves a report to .github/state/johan-comments-deletion-report.json
 *   4. Continues even on errors (logs them)
 *
 * Rate limit: 250ms = 4 req/s. 1171 comments = ~5 minutes.
 *
 * @author Mavis P11
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const JSON_FILE = path.join(ROOT, '.github', 'state', 'johan-comments-to-delete.json');
const REPORT = path.join(ROOT, '.github', 'state', 'johan-comments-deletion-report.json');
const REPO = 'JohanBendz/com.tuya.zigbee';

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  console.error('ERROR: GH_TOKEN or GITHUB_TOKEN must be set');
  console.error('');
  console.error('Usage:');
  console.error('  PowerShell: $env:GH_TOKEN = "ghp_***"; node tools/ci/delete-johan-all.js');
  console.error('  Bash:       GH_TOKEN=ghp_*** node tools/ci/delete-johan-all.js');
  process.exit(1);
}

if (!fs.existsSync(JSON_FILE)) {
  console.error('ERROR: ' + JSON_FILE + ' not found');
  console.error('Run first: node tools/ci/collect-johan-comments-to-delete.js');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
const comments = data.comments;
console.log('🟢 CARTE BLANCHE — Deleting ' + comments.length + ' dlnraja comments from ' + REPO);
console.log('Token: ' + token.substring(0, 7) + '***');
console.log('');

const stats = { deleted: 0, failed: 0, skipped: 0, processed: 0, startTime: Date.now() };
const report = {
  timestamp: new Date().toISOString(),
  target: REPO,
  mode: 'one-shot-full',
  policy: 'carte-blanche-p11',
  totalToProcess: comments.length,
  hasToken: true,
  results: [],
};

async function deleteComment(token, commentId) {
  const url = `https://api.github.com/repos/${REPO}/issues/comments/${commentId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Mavis-OneShot/1.0',
    },
  });
  return { status: res.status, ok: res.status === 204 };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  for (let i = 0; i < comments.length; i++) {
    const c = comments[i];
    stats.processed++;
    try {
      const { status, ok } = await deleteComment(token, c.commentId);
      if (ok) {
        stats.deleted++;
        report.results.push({ ...c, status: 'deleted' });
        if (i % 25 === 0 || i === comments.length - 1) {
          const pct = ((i + 1) / comments.length * 100).toFixed(1);
          const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(0);
          const rate = (stats.deleted / (elapsed / 60)).toFixed(0);
          console.log(`  [${i + 1}/${comments.length}] (${pct}%) Deleted #${c.issueNumber} id=${c.commentId} | ${stats.deleted} deleted, ${stats.failed} failed, ${stats.skipped} skipped | ${elapsed}s | ${rate}/min`);
        }
      } else if (status === 404) {
        stats.skipped++;
        report.results.push({ ...c, status: 'not-found' });
      } else if (status === 401 || status === 403) {
        console.log(`  ✗ [#${c.issueNumber} id=${c.commentId}] HTTP ${status} (not author?)`);
        stats.failed++;
        report.results.push({ ...c, status: 'forbidden', httpStatus: status });
      } else {
        console.log(`  ✗ [#${c.issueNumber} id=${c.commentId}] HTTP ${status}`);
        stats.failed++;
        report.results.push({ ...c, status: 'failed', httpStatus: status });
      }
    } catch (e) {
      console.log(`  ✗ [#${c.issueNumber} id=${c.commentId}] ${e.message}`);
      stats.failed++;
      report.results.push({ ...c, status: 'error', error: e.message });
    }
    await sleep(250);
  }

  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(0);
  report.endTime = new Date().toISOString();
  report.elapsedSeconds = parseInt(elapsed, 10);
  report.stats = stats;

  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log('');
  console.log('=== DONE ===');
  console.log('Processed: ' + stats.processed);
  console.log('Deleted  : ' + stats.deleted);
  console.log('Failed   : ' + stats.failed);
  console.log('Skipped  : ' + stats.skipped + ' (404)');
  console.log('Elapsed  : ' + elapsed + 's');
  console.log('Report   : ' + REPORT);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
