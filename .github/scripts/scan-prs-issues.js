#!/usr/bin/env node
'use strict';
// v5.12.2: Scan ALL PRs + issues on JohanBendz + dlnraja repos
// Extracts new fingerprints, device requests, and code ideas
const fs = require('fs');
const path = require('path');

const DDIR = path.join(__dirname, '..', '..', 'drivers');
const STATE_DIR = path.join(__dirname, '..', 'state');
const { fetchWithRetry, sleep, setThrottle } = require('./retry-helper');
const API = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GH_PAT;

// Build local FP index
function buildIndex() {
  const mfrs = new Set();
  const dirs = fs.readdirSync(DDIR).filter(d => fs.existsSync(path.join(DDIR, d, 'driver.compose.json')));
  for (const d of dirs) {
    const f = JSON.parse(fs.readFileSync(path.join(DDIR, d, 'driver.compose.json'), 'utf8'));
    for (const m of (f.zigbee?.manufacturerName || [])) mfrs.add(m);
  }
  return { mfrs, driverCount: dirs.length };
}

setThrottle('github', 300);

async function ghFetch(url) {
  const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'tuya-zigbee-scanner' };
  if (TOKEN) headers['Authorization'] = `token ${TOKEN}`;
  const r = await fetchWithRetry(url, { headers }, {
    retries: 3, label: 'gh', queue: 'github', maxDelay: 300000
  });
  if (!r || !r.ok) return null;
  return r.json();
}

async function scanRepo(repo, local) {
  const results = { prs: [], issues: [], newFPs: [] };

  // PRs (all states)
  console.log(`\nScanning PRs on ${repo}...`);
  for (let page = 1; page <= 15; page++) {
    const prs = await ghFetch(`${API}/repos/${repo}/pulls?state=all&per_page=100&page=${page}`);
    if (!prs || prs.length === 0) break;
    for (const pr of prs) {
      const text = (pr.title || '') + ' ' + (pr.body || '');
      const fps = [...new Set((text.match(/_T[ZE][E234]\d{3}_[a-z0-9]+/gi) || []))];
      const pids = [...new Set((text.match(/TS\d{4}[A-Z]?/gi) || []))];
      const newFPs = fps.filter(fp => !local.mfrs.has(fp));
      results.prs.push({
        number: pr.number, title: pr.title, state: pr.state,
        user: pr.user?.login, merged: !!pr.merged_at,
        fps, pids, newFPs, url: pr.html_url
      });
      if (newFPs.length > 0) {
        for (const fp of newFPs) results.newFPs.push({ mfr: fp, source: `PR #${pr.number}`, title: pr.title });
      }
    }
    await sleep(200);
  }
  console.log(`  Found ${results.prs.length} PRs, ${results.prs.filter(p => p.newFPs.length > 0).length} with new FPs`);

  // Issues (all states)
  console.log(`Scanning issues on ${repo}...`);
  for (let page = 1; page <= 15; page++) {
    const issues = await ghFetch(`${API}/repos/${repo}/issues?state=all&per_page=100&page=${page}`);
    if (!issues || issues.length === 0) break;
    for (const issue of issues) {
      if (issue.pull_request) continue;
      const text = (issue.title || '') + ' ' + (issue.body || '');
      const fps = [...new Set((text.match(/_T[ZE][E234]\d{3}_[a-z0-9]+/gi) || []))];
      const pids = [...new Set((text.match(/TS\d{4}[A-Z]?/gi) || []))];
      const newFPs = fps.filter(fp => !local.mfrs.has(fp));
      results.issues.push({
        number: issue.number, title: issue.title, state: issue.state,
        user: issue.user?.login, labels: (issue.labels || []).map(l => l.name),
        fps, pids, newFPs, url: issue.html_url
      });
      if (newFPs.length > 0) {
        for (const fp of newFPs) results.newFPs.push({ mfr: fp, source: `Issue #${issue.number}`, title: issue.title });
      }
    }
    await sleep(200);
  }
  console.log(`  Found ${results.issues.length} issues, ${results.issues.filter(i => i.newFPs.length > 0).length} with new FPs`);

  return results;
}

async function main() {
  console.log('=== PR/Issue Scanner v5.12.2 ===');
  if (!TOKEN) console.log(' No GITHUB_TOKEN  using unauthenticated (60 req/h)');
  else console.log(' Using authenticated API (5000 req/h)');

  const local = buildIndex();
  console.log(`Local: ${local.driverCount} drivers, ${local.mfrs.size} FPs`);

  const repos = ['JohanBendz/com.tuya.zigbee', 'dlnraja/com.tuya.zigbee'];
  const allResults = {};

  for (const repo of repos) {
    allResults[repo] = await scanRepo(repo, local);
  }

  // Summary
  console.log('\n========== RESULTS ==========');
  let totalNewFPs = 0;
  for (const [repo, r] of Object.entries(allResults)) {
    console.log(`\n${repo}:`);
    console.log(`  PRs: ${r.prs.length} (${r.prs.filter(p => p.state === 'open').length} open, ${r.prs.filter(p => p.merged).length} merged)`);
    console.log(`  Issues: ${r.issues.length} (${r.issues.filter(i => i.state === 'open').length} open)`);
    console.log(`  New FPs: ${r.newFPs.length}`);
    totalNewFPs += r.newFPs.length;
    
    if (r.newFPs.length > 0) {
      console.log('  --- New FPs ---');
      const uniqueFPs = [...new Map(r.newFPs.map(f => [f.mfr, f])).values()];
      for (const fp of uniqueFPs.slice(0, 20)) {
        console.log(`    ${fp.mfr}  ${fp.source}: ${fp.title.substring(0, 80)}`);
      }
      if (uniqueFPs.length > 20) console.log(`    ... and ${uniqueFPs.length - 20} more`);
    }
  }

  console.log(`\nTotal new FPs found: ${totalNewFPs}`);

  // Save
  const report = {
    date: new Date().toISOString(),
    local: { drivers: local.driverCount, fps: local.mfrs.size },
    ...allResults
  };
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, 'pr-issue-scan.json'), JSON.stringify(report, null, 2));
  console.log(' Saved to .github/state/pr-issue-scan.json');
}

main().catch(e => { console.error(e); process.exit(1); });
