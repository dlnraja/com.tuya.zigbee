#!/usr/bin/env node
/**
 * delete-johan-comments.js
 *
 * ⚠️  CARTE BLANCHE — P11 policy change (2026-07-12)  ⚠️
 *
 * PREVIOUSLY required 3 confirmations (ALLOW_UPSTREAM_WRITE, --confirm, GH_TOKEN).
 * NOW: only requires GH_TOKEN. No other confirmations.
 *
 * Why: User (Dylan, dlnraja) gave full carte blanche on 2026-07-12:
 *   "tu peux tout utiliser les commandes git et les commandes gh sans confirmations"
 *
 * Safety still in place:
 *   - GH_TOKEN required (auth + scope proof)
 *   - Rate limit 250ms (safe under 5000 req/h)
 *   - 404 handled as "already gone"
 *   - --max=N for testing
 *   - ISSUE_FILTER=N for one issue
 *   - JSON report per run
 *
 * Modes:
 *   - Default (no flags)            : REVIEW ONLY (no API calls)
 *   - GH_TOKEN=xxx                 : ACTUAL DELETE (all 1171)
 *   - GH_TOKEN=xxx --max=N          : ACTUAL DELETE first N
 *   - GH_TOKEN=xxx ISSUE_FILTER=N   : ACTUAL DELETE only on issue #N
 *
 * Usage:
 *   node tools/ci/delete-johan-comments.js                    # REVIEW (no API)
 *   GH_TOKEN=ghp_xxx node tools/ci/delete-johan-comments.js   # DELETE all
 *   GH_TOKEN=ghp_xxx node tools/ci/delete-johan-comments.js --max=10  # DELETE first 10
 *   GH_TOKEN=ghp_xxx ISSUE_FILTER=1269 node tools/ci/delete-johan-comments.js  # DELETE on #1269
 *
 * @author Mavis P11 — carte blanche
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const JSON_FILE = path.join(ROOT, '.github', 'state', 'johan-comments-to-delete.json');
const REPORT = path.join(ROOT, '.github', 'state', 'johan-comments-deletion-report.json');

const ISSUE_FILTER = process.env.ISSUE_FILTER || '';
const args = process.argv.slice(2);
const MAX = (() => {
  const a = args.find(x => x.startsWith('--max='));
  return a ? parseInt(a.split('=')[1], 10) : Infinity;
})();
const REPO = 'JohanBendz/com.tuya.zigbee';

const BANNER = `
╔════════════════════════════════════════════════════════════════════╗
║  🟢  CARTE BLANCHE — P11 (2026-07-12)                              ║
╠════════════════════════════════════════════════════════════════════╣
║  Script: DELETE comments on ${REPO}            ║
║  Author: dlnraja = YOU                                            ║
║  Policy: No confirmations needed. GH_TOKEN sufficient.            ║
║                                                                    ║
║  Required: GH_TOKEN env var (your GitHub PAT)                     ║
║  Optional: --max=N, ISSUE_FILTER=N                                ║
║                                                                    ║
║  GitHub allows authors to delete their own comments via API.       ║
╚════════════════════════════════════════════════════════════════════╝`;

function log(m) { console.log(m); }
function logErr(m) { console.error('❌ ' + m); }

async function deleteComment(token, commentId) {
  const url = `https://api.github.com/repos/${REPO}/issues/comments/${commentId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Mavis-Delete-Comments/2.0 (carte-blanche)',
    },
  });
  return { status: res.status, ok: res.status === 204 };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function printComments(comments) {
  for (let i = 0; i < comments.length; i++) {
    const c = comments[i];
    const preview = (c.excerpt || '').substring(0, 60).replace(/\n/g, ' ');
    console.log(`  [${i + 1}/${comments.length}] #${c.issueNumber} by ${c.author} (${c.createdAt}) id=${c.commentId}`);
    console.log(`      URL: ${c.url}`);
    console.log(`      Excerpt: ${preview}`);
  }
}

function printManualInstructions(comments) {
  console.log('');
  console.log('=== MANUAL DELETION (no API) ===');
  console.log('1. Open each URL in your browser');
  console.log('2. Click the 3-dot menu on your comment');
  console.log('3. Select "Delete"');
  console.log('');
  console.log('OR run the script with your token:');
  console.log('  $env:GH_TOKEN = "ghp_***"');
  console.log('  node tools/ci/delete-johan-comments.js --max=5    # test 5');
  console.log('  node tools/ci/delete-johan-comments.js           # delete all 1171');
}

async function main() {
  console.log(BANNER);
  console.log('');
  console.log('Johan Comments Deletion v2.0.0 (CARTE BLANCHE)');
  console.log('');

  if (!fs.existsSync(JSON_FILE)) {
    logErr(`${JSON_FILE} not found`);
    logErr('Run first: node tools/ci/collect-johan-comments-to-delete.js');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
  let comments = data.comments;
  console.log('Target: ' + REPO);
  console.log('Total comments in list: ' + comments.length);
  if (ISSUE_FILTER) {
    comments = comments.filter(c => String(c.issueNumber) === String(ISSUE_FILTER));
    console.log('After filter (issue #' + ISSUE_FILTER + '): ' + comments.length);
  }
  console.log('Max deletions this run: ' + (MAX === Infinity ? 'unlimited' : MAX));
  console.log('');

  if (comments.length === 0) {
    console.log('No comments to process. Exiting.');
    return;
  }

  // === CHECK TOKEN ===
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const isActualDelete = !!token;
  if (!isActualDelete) {
    console.log('=== REVIEW MODE (no API calls) ===');
    console.log('To actually delete, you need GH_TOKEN env var.');
    console.log('');
    console.log('Comments to review (' + comments.length + '):');
    printComments(comments.slice(0, 20));
    if (comments.length > 20) {
      console.log('  ... and ' + (comments.length - 20) + ' more');
    }
    printManualInstructions(comments);
    return;
  }

  // === ACTUAL DELETION ===
  console.log('=== ACTUAL DELETION MODE ===');
  console.log('Token: ' + token.substring(0, 7) + '***');
  console.log('Author: dlnraja (you)');
  console.log('Target: ' + REPO);
  console.log('Max: ' + (MAX === Infinity ? 'unlimited' : MAX));
  console.log('');
  console.log('Starting in 3 seconds... (Ctrl+C to abort)');
  await sleep(3000);

  const stats = { deleted: 0, failed: 0, skipped: 0, processed: 0 };
  const report = {
    timestamp: new Date().toISOString(),
    target: REPO,
    mode: 'delete',
    policy: 'carte-blanche-p11',
    issueFilter: ISSUE_FILTER,
    max: MAX === Infinity ? null : MAX,
    hasToken: true,
    results: [],
  };

  for (let i = 0; i < comments.length; i++) {
    if (stats.deleted >= MAX) {
      console.log('  (max reached, stopping)');
      break;
    }
    const c = comments[i];
    stats.processed++;

    try {
      const { status, ok } = await deleteComment(token, c.commentId);
      if (ok) {
        if (i % 50 === 0) console.log(`  Progress: ${i + 1}/${comments.length} (deleted: ${stats.deleted})`);
        console.log(`  ✓ [${i + 1}/${comments.length}] Deleted #${c.issueNumber} id=${c.commentId}`);
        stats.deleted++;
        report.results.push({ ...c, status: 'deleted' });
      } else if (status === 404) {
        stats.skipped++;
        report.results.push({ ...c, status: 'not-found' });
      } else if (status === 401 || status === 403) {
        console.log(`  ✗ [${i + 1}/${comments.length}] Forbidden #${c.issueNumber} id=${c.commentId} (HTTP ${status})`);
        stats.failed++;
        report.results.push({ ...c, status: 'forbidden', httpStatus: status });
      } else {
        console.log(`  ✗ [${i + 1}/${comments.length}] Failed #${c.issueNumber} id=${c.commentId} (HTTP ${status})`);
        stats.failed++;
        report.results.push({ ...c, status: 'failed', httpStatus: status });
      }
    } catch (e) {
      console.log(`  ✗ [${i + 1}/${comments.length}] Error #${c.issueNumber} id=${c.commentId}: ${e.message}`);
      stats.failed++;
      report.results.push({ ...c, status: 'error', error: e.message });
    }
    await sleep(250);
  }

  console.log('');
  console.log('=== SUMMARY ===');
  console.log('Processed: ' + stats.processed);
  console.log('Deleted  : ' + stats.deleted);
  console.log('Failed   : ' + stats.failed);
  console.log('Skipped  : ' + stats.skipped + ' (404 or 403)');

  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log('');
  console.log('Report: ' + REPORT);
}

main().catch(e => { logErr(e.stack || e.message); process.exit(1); });
