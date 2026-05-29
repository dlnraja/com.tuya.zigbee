#!/usr/bin/env node
// gh-diagnostics.js — Fetch runs, PRs, issues, Johan repo data
// Usage: node .github/scripts/gh-diagnostics.js <TOKEN>

'use strict';
const https = require('https');
const TOKEN = process.argv[2] || process.env.GH_PAT || process.env.GITHUB_TOKEN;
if (!TOKEN) { console.error('Usage: node gh-diagnostics.js <TOKEN>'); process.exit(1); }

const MAIN_REPO = 'dlnraja/com.tuya.zigbee';
const JOHAN_REPO = 'Homey-Community/com.tuya.cloud'; // adjust if known

function ghGet(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      headers: {
        Authorization: 'Bearer ' + TOKEN,
        'User-Agent': 'tuya-diag/1.0',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };
    let data = '';
    https.get(opts, r => {
      r.on('data', d => data += d);
      r.on('end', () => {
        try { resolve({ status: r.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: r.statusCode, body: data }); }
      });
    }).on('error', reject);
  });
}

function icon(conclusion) {
  return conclusion === 'failure' ? '❌' : conclusion === 'success' ? '✅' : conclusion === 'cancelled' ? '⛔' : '🟡';
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║           TUYA ZIGBEE — GH DIAGNOSTICS              ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // 1. Recent workflow runs
  const runsR = await ghGet('/repos/' + MAIN_REPO + '/actions/runs?per_page=15');
  if (runsR.status !== 200) {
    console.log('RUNS ERROR:', runsR.status, JSON.stringify(runsR.body).substring(0, 200));
  } else {
    const runs = runsR.body.workflow_runs || [];
    console.log('=== WORKFLOW RUNS (last 15) ===');
    runs.forEach(r => {
      const ts = r.created_at ? r.created_at.substring(0, 16) : '';
      const name = (r.name || r.workflow_id || '?').substring(0, 45).padEnd(45);
      console.log(icon(r.conclusion), name, (r.conclusion || r.status || '?').padEnd(12), ts, r.html_url ? '#' + r.id : '');
    });

    // Find the failed run and get its logs URL
    const lastFail = runs.find(r => r.conclusion === 'failure');
    if (lastFail) {
      console.log('\n→ Last failed run:', lastFail.name, lastFail.html_url);
      // Get failed jobs
      const jobsR = await ghGet('/repos/' + MAIN_REPO + '/actions/runs/' + lastFail.id + '/jobs');
      if (jobsR.status === 200) {
        const failedJobs = (jobsR.body.jobs || []).filter(j => j.conclusion === 'failure');
        console.log('  Failed jobs:');
        failedJobs.forEach(j => {
          console.log('  ❌', j.name);
          const failedSteps = (j.steps || []).filter(s => s.conclusion === 'failure');
          failedSteps.forEach(s => console.log('      step:', s.name));
        });
      }
    }
  }

  // 2. PRs (all)
  const prsR = await ghGet('/repos/' + MAIN_REPO + '/pulls?state=all&per_page=30');
  if (prsR.status !== 200) {
    console.log('\nPRs ERROR:', prsR.status);
  } else {
    const prs = prsR.body || [];
    console.log('\n=== PULL REQUESTS (' + prs.length + ' total) ===');
    prs.forEach(p => {
      const merged = p.merged_at ? '[MERGED]' : '[' + p.state.toUpperCase() + ']';
      console.log('#' + String(p.number).padStart(4), merged.padEnd(10), (p.title || '').substring(0, 55).padEnd(55), 'by', (p.user?.login || '?'), '| 💬', p.comments);
    });

    // Get comments on PRs with activity
    const activePRs = prs.filter(p => p.comments > 0).slice(0, 5);
    for (const pr of activePRs) {
      const commentsR = await ghGet('/repos/' + MAIN_REPO + '/issues/' + pr.number + '/comments?per_page=10');
      if (commentsR.status === 200) {
        console.log('\n  PR #' + pr.number + ' — ' + pr.title.substring(0, 50));
        (commentsR.body || []).slice(-3).forEach(c => {
          console.log('    [' + (c.user?.login || '?') + '] ' + (c.body || '').substring(0, 120).replace(/\n/g, ' '));
        });
      }
    }
  }

  // 3. Issues (all)
  const issuesR = await ghGet('/repos/' + MAIN_REPO + '/issues?state=all&per_page=30');
  if (issuesR.status !== 200) {
    console.log('\nISSUES ERROR:', issuesR.status);
  } else {
    const issues = (issuesR.body || []).filter(i => !i.pull_request);
    console.log('\n=== ISSUES (' + issues.length + ' total) ===');
    issues.forEach(i => {
      console.log('#' + String(i.number).padStart(4), ('[' + i.state.toUpperCase() + ']').padEnd(9), (i.title || '').substring(0, 55).padEnd(55), 'by', (i.user?.login || '?'), '| 💬', i.comments);
    });

    // Show recent comments on open issues
    const openWithComments = issues.filter(i => i.state === 'open' && i.comments > 0).slice(0, 3);
    for (const issue of openWithComments) {
      const commentsR = await ghGet('/repos/' + MAIN_REPO + '/issues/' + issue.number + '/comments?per_page=5');
      if (commentsR.status === 200) {
        console.log('\n  Issue #' + issue.number + ' — ' + issue.title.substring(0, 50));
        (commentsR.body || []).slice(-2).forEach(c => {
          console.log('    [' + (c.user?.login || '?') + '] ' + (c.body || '').substring(0, 150).replace(/\n/g, ' '));
        });
      }
    }
  }

  // 4. Check app.json current state
  const { execSync } = require('child_process');
  try {
    const fs = require('fs');
    const raw = fs.readFileSync('app.json', 'utf8');
    const app = JSON.parse(raw);
    const sizeMB = (Buffer.byteLength(raw, 'utf8') / 1024 / 1024).toFixed(2);
    const compactMB = (Buffer.byteLength(JSON.stringify(app), 'utf8') / 1024 / 1024).toFixed(2);
    console.log('\n=== APP.JSON STATE ===');
    console.log('Version:', app.version);
    console.log('SDK:', app.sdk);
    console.log('Drivers:', (app.drivers || []).length);
    console.log('Current size:', sizeMB + 'MB', sizeMB > 4 ? '⚠️' : '✅');
    console.log('Compact size:', compactMB + 'MB', compactMB > 5 ? '❌ OVER LIMIT' : '✅ OK');
    console.log('api field:', app.api ? 'PRESENT ✅' : 'ABSENT ⚠️');
    console.log('permissions:', JSON.stringify(app.permissions || []));
  } catch (e) {
    console.log('app.json read error:', e.message);
  }

  // 5. Check Homey CLI status
  console.log('\n=== HOMEY CLI STATUS ===');
  try {
    const result = execSync('npx homey whoami 2>&1', { timeout: 10000, encoding: 'utf8', cwd: process.cwd() });
    console.log(result.trim().substring(0, 300));
  } catch (e) {
    console.log('homey whoami:', (e.stdout || e.message || '').substring(0, 200));
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
