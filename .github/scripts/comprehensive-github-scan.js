#!/usr/bin/env node
'use strict';
// v5.12.0: Comprehensive GitHub scan  forks, PRs, issues from JohanBendz + dlnraja
// Uses GitHub API directly (no gh CLI needed). Works unauthenticated (60 req/h).
const fs = require('fs');
const path = require('path');

const DDIR = path.join(__dirname, '..', '..', 'drivers');
const STATE_DIR = path.join(__dirname, '..', 'state');
const { fetchWithRetry, sleep, setThrottle } = require('./retry-helper');
const UPSTREAM = 'JohanBendz/com.tuya.zigbee';
const OWN_REPO = 'dlnraja/com.tuya.zigbee';
const API = 'https://api.github.com';

// Build our current fingerprint index
function buildLocalIndex() {
  const mfrs = new Set();
  const pids = new Set();
  const driverMap = {}; // mfr -> [driver]
  const dirs = fs.readdirSync(DDIR).filter(d => {
    const fp = path.join(DDIR, d, 'driver.compose.json');
    return fs.existsSync(fp);
  });
  for (const d of dirs) {
    const f = JSON.parse(fs.readFileSync(path.join(DDIR, d, 'driver.compose.json'), 'utf8'));
    const z = f.zigbee;
    if (z) {
      for (const m of (z.manufacturerName || [])) { mfrs.add(m); driverMap[m] = d; }
      for (const p of (z.productId || [])) pids.add(p);
    }
  }
  return { mfrs, pids, driverMap, driverCount: dirs.length };
}

// GitHub API spacing: 300ms between requests (authenticated)
setThrottle('github', 300);

async function ghFetch(url) {
  const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'tuya-zigbee-scanner' };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GH_PAT;
  if (token) headers['Authorization'] = `token ${token}`;
  const r = await fetchWithRetry(url, { headers }, {
    retries: 3, label: 'gh', queue: 'github', maxDelay: 300000
  });
  if (!r || !r.ok) return null;
  return r.json();
}

// Scan all forks recursively
async function scanForks(repo, depth = 0, maxDepth = 2, visited = new Set()) {
  if (depth > maxDepth || visited.has(repo)) return [];
  visited.add(repo);
  const results = [];
  
  console.log(`${'  '.repeat(depth)}Scanning forks of ${repo} (depth ${depth})...`);
  const forks = await ghFetch(`${API}/repos/${repo}/forks?per_page=100&sort=newest`);
  if (!forks || !Array.isArray(forks)) return results;
  
  console.log(`${'  '.repeat(depth)}  Found ${forks.length} forks`);
  
  for (const fork of forks) {
    const forkName = fork.full_name;
    if (visited.has(forkName)) continue;
    
    // Get all branches
    const branches = await ghFetch(`${API}/repos/${forkName}/branches?per_page=100`);
    if (!branches) continue;
    await sleep(500);
    
    for (const branch of branches) {
      // Try to get driver.compose.json files by scanning the tree
      const tree = await ghFetch(`${API}/repos/${forkName}/git/trees/${branch.name}?recursive=1`);
      if (!tree || !tree.tree) continue;
      await sleep(300);
      
      const driverFiles = tree.tree.filter(f => 
        f.path.match(/^drivers\/[^/]+\/driver\.compose\.json$/) && f.type === 'blob'
      );
      
      // Also look for new driver directories we don't have
      const driverDirs = new Set(tree.tree
        .filter(f => f.path.match(/^drivers\/[^/]+\//) && f.type === 'blob')
        .map(f => f.path.split('/')[1])
      );
      
      for (const df of driverFiles) {
        const driverName = df.path.split('/')[1];
        try {
          const content = await ghFetch(`${API}/repos/${forkName}/contents/${df.path}?ref=${branch.name}`);
          if (!content || !content.content) continue;
          const json = JSON.parse(Buffer.from(content.content, 'base64').toString('utf8'));
          const z = json.zigbee;
          if (z && z.manufacturerName) {
            results.push({
              fork: forkName,
              branch: branch.name,
              driver: driverName,
              mfrs: z.manufacturerName,
              pids: z.productId || [],
              depth
            });
          }
          await sleep(300);
        } catch (e) { /* skip */ }
      }
      
      // Check for new device.js files (code improvements)
      const deviceFiles = tree.tree.filter(f => 
        f.path.match(/^drivers\/[^/]+\/device\.js$/) && f.type === 'blob'
      );
      // We'll analyze these later
    }
    
    // Recurse into sub-forks
    const subResults = await scanForks(forkName, depth + 1, maxDepth, visited);
    results.push(...subResults);
  }
  
  return results;
}

// Scan PRs and issues
async function scanPRsAndIssues(repo, state = 'all') {
  const results = { prs: [], issues: [] };
  
  // PRs
  console.log(`Scanning PRs on ${repo} (${state})...`);
  for (let page = 1; page <= 10; page++) {
    const prs = await ghFetch(`${API}/repos/${repo}/pulls?state=${state}&per_page=100&page=${page}`);
    if (!prs || !Array.isArray(prs) || prs.length === 0) break;
    for (const pr of prs) {
      // Extract fingerprints from PR body and title
      const text = (pr.title || '') + ' ' + (pr.body || '');
      const fpMatches = text.match(/_T[ZE][E234]\d{3}_[a-z0-9]+/gi) || [];
      const pidMatches = text.match(/TS\d{4}/gi) || [];
      if (fpMatches.length > 0 || pidMatches.length > 0) {
        results.prs.push({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          user: pr.user?.login,
          fps: [...new Set(fpMatches)],
          pids: [...new Set(pidMatches)],
          url: pr.html_url,
          merged: pr.merged_at ? true : false,
          files_url: pr.url + '/files'
        });
      }
    }
    await sleep(500);
  }
  
  // Issues
  console.log(`Scanning issues on ${repo} (${state})...`);
  for (let page = 1; page <= 10; page++) {
    const issues = await ghFetch(`${API}/repos/${repo}/issues?state=${state}&per_page=100&page=${page}`);
    if (!issues || !Array.isArray(issues) || issues.length === 0) break;
    for (const issue of issues) {
      if (issue.pull_request) continue; // skip PRs (listed as issues too)
      const text = (issue.title || '') + ' ' + (issue.body || '');
      const fpMatches = text.match(/_T[ZE][E234]\d{3}_[a-z0-9]+/gi) || [];
      const pidMatches = text.match(/TS\d{4}/gi) || [];
      if (fpMatches.length > 0 || pidMatches.length > 0) {
        results.issues.push({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          user: issue.user?.login,
          fps: [...new Set(fpMatches)],
          pids: [...new Set(pidMatches)],
          url: issue.html_url,
          labels: (issue.labels || []).map(l => l.name)
        });
      }
    }
    await sleep(500);
  }
  
  return results;
}

// Scan PR files for actual code changes (driver.compose.json diffs)
async function scanPRFiles(repo, prNumber) {
  const files = await ghFetch(`${API}/repos/${repo}/pulls/${prNumber}/files?per_page=100`);
  if (!files) return [];
  return files.filter(f => f.filename.match(/driver\.compose\.json/)).map(f => ({
    filename: f.filename,
    status: f.status,
    patch: f.patch?.substring(0, 2000) // truncate
  }));
}

async function main() {
  console.log('=== Comprehensive GitHub Scan v5.12.0 ===');
  const local = buildLocalIndex();
  console.log(`Local: ${local.driverCount} drivers, ${local.mfrs.size} FPs\n`);
  
  // 1. Scan forks
  console.log('--- Phase 1: FORK SCAN ---');
  const forkResults = await scanForks(UPSTREAM, 0, 0);
  
  // Find new FPs not in our codebase
  const newFPs = [];
  for (const r of forkResults) {
    for (const mfr of r.mfrs) {
      if (!local.mfrs.has(mfr) && !mfr.includes('xxxxxxxx')) {
        newFPs.push({ mfr, driver: r.driver, fork: r.fork, branch: r.branch });
      }
    }
  }
  console.log(`\nNew FPs from forks: ${newFPs.length}`);
  
  // 2. Scan PRs/Issues on upstream
  console.log('\n--- Phase 2: UPSTREAM PRs/Issues ---');
  const upstream = await scanPRsAndIssues(UPSTREAM, 'all');
  
  // 3. Scan PRs/Issues on own repo
  console.log('\n--- Phase 3: OWN REPO PRs/Issues ---');
  const own = await scanPRsAndIssues(OWN_REPO, 'all');
  
  // 4. Cross-reference: find FPs from PRs/issues not in our codebase
  const prNewFPs = [];
  for (const pr of [...upstream.prs, ...own.prs]) {
    for (const fp of pr.fps) {
      if (!local.mfrs.has(fp)) {
        prNewFPs.push({ mfr: fp, source: `PR #${pr.number}`, title: pr.title, url: pr.url, merged: pr.merged });
      }
    }
  }
  const issueNewFPs = [];
  for (const issue of [...upstream.issues, ...own.issues]) {
    for (const fp of issue.fps) {
      if (!local.mfrs.has(fp)) {
        issueNewFPs.push({ mfr: fp, source: `Issue #${issue.number}`, title: issue.title, url: issue.url });
      }
    }
  }
  
  // 5. Summary
  console.log('\n\n========== SCAN RESULTS ==========');
  console.log(`Forks scanned: ${forkResults.length} driver files`);
  console.log(`New FPs from forks: ${newFPs.length}`);
  console.log(`Upstream PRs with FPs: ${upstream.prs.length}`);
  console.log(`Upstream issues with FPs: ${upstream.issues.length}`);
  console.log(`Own PRs with FPs: ${own.prs.length}`);
  console.log(`Own issues with FPs: ${own.issues.length}`);
  console.log(`New FPs from PRs: ${prNewFPs.length}`);
  console.log(`New FPs from issues: ${issueNewFPs.length}`);
  
  if (newFPs.length > 0) {
    console.log('\n--- NEW FPs FROM FORKS (not in our codebase) ---');
    const byDriver = {};
    for (const fp of newFPs) {
      const k = fp.driver;
      if (!byDriver[k]) byDriver[k] = [];
      byDriver[k].push(fp);
    }
    for (const [driver, fps] of Object.entries(byDriver)) {
      console.log(`  ${driver}: ${fps.map(f => f.mfr).join(', ')}`);
    }
  }
  
  if (prNewFPs.length > 0) {
    console.log('\n--- NEW FPs FROM PRs ---');
    for (const fp of prNewFPs.slice(0, 30)) {
      console.log(`  ${fp.mfr}  ${fp.source}: ${fp.title}`);
    }
    if (prNewFPs.length > 30) console.log(`  ... and ${prNewFPs.length - 30} more`);
  }
  
  if (issueNewFPs.length > 0) {
    console.log('\n--- NEW FPs FROM ISSUES ---');
    for (const fp of issueNewFPs.slice(0, 30)) {
      console.log(`  ${fp.mfr}  ${fp.source}: ${fp.title}`);
    }
    if (issueNewFPs.length > 30) console.log(`  ... and ${issueNewFPs.length - 30} more`);
  }
  
  // 6. Save results
  const report = {
    date: new Date().toISOString(),
    local: { drivers: local.driverCount, fps: local.mfrs.size },
    forkScan: { filesScanned: forkResults.length, newFPs: newFPs.length },
    upstream: { prs: upstream.prs.length, issues: upstream.issues.length },
    own: { prs: own.prs.length, issues: own.issues.length },
    newFPsFromForks: newFPs,
    newFPsFromPRs: prNewFPs,
    newFPsFromIssues: issueNewFPs,
    allUpstreamPRs: upstream.prs,
    allUpstreamIssues: upstream.issues,
    allOwnPRs: own.prs,
    allOwnIssues: own.issues,
  };
  
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, 'comprehensive-scan.json'), JSON.stringify(report, null, 2));
  console.log('\n Results saved to .github/state/comprehensive-scan.json');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
