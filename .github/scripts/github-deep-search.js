#!/usr/bin/env node
'use strict';

/**
 * github-deep-search.js — Multi-project GitHub Search Engine
 *
 * Searches 20+ relevant Zigbee/Tuya projects for:
 * - New fingerprints (code search)
 * - Device reports (issue/PR search)
 * - DP mappings, converters, quirks (code search)
 * - New relevant repositories (repo discovery)
 *
 * Sources searched:
 *  Z2M, ZHA, deCONZ, Hubitat, SmartThings, ioBroker, Tasmota,
 *  Homey community apps, Tuya IoT SDKs, Zigbee2Tasmota, OpenHAB,
 *  FHEM, Domoticz, node-red, ESPHome, Zigbee Alliance, Matter
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { fetchWithRetry } = require('./retry-helper');
const { callAI } = require('./ai-helper');
const{extractFP:_vFP,extractFPWithBrands:_vFPB,extractPID:_vPID,isValidTuyaFP}=require('./fp-validator');

const ROOT = path.join(__dirname, '..', '..');
const STATE = path.join(__dirname, '..', 'state');
const REPORT_F = path.join(STATE, 'github-deep-search-report.json');
const STATE_F = path.join(STATE, 'github-deep-search-state.json');
const DDIR = path.join(ROOT, 'drivers');
const TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const GH = 'https://api.github.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// FP_RE replaced by fp-validator
const PID_RE = /\bTS[0-9A-Fa-f]{3,5}[A-Z]?\b/gi;
const DP_RE = /(?:dp|DP|datapoint)[:\s=]*(\d{1,3})/gi;
let ghCalls = 0;
const MAX_GH = parseInt(process.env.MAX_GH_CALLS || '180');
const GH_DELAY = parseInt(process.env.GH_DELAY || '2200');

const hdrs = () => {
  const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'tuya-deep-search' };
  if (TOKEN) h.Authorization = 'Bearer ' + TOKEN;
  // Request text match fragments for code search
  h['Accept'] = 'application/vnd.github.text-match+json';
  return h;
};

async function ghFetch(url) {
  if (ghCalls >= MAX_GH) { console.log('  [LIMIT] Max GH calls reached'); return null; }
  ghCalls++;
  await sleep(GH_DELAY);
  try {
    const r = await fetchWithRetry(url, { headers: hdrs() }, { retries: 2, label: 'gh-search' });
    if (r.status === 403 || r.status === 429) { console.log('  [RATE] Rate limited, waiting 60s'); await sleep(60000); return null; }
    if (!r.ok) return null;
    return r.json();
  } catch (e) { console.log('  [ERR]', e.message); return null; }
}

// =============================================================================
// TARGET REPOSITORIES — Organized by category
// =============================================================================

const REPO_GROUPS = {
  // Core Zigbee ecosystems
  z2m: [
    'Koenkk/zigbee-herdsman-converters',
    'Koenkk/zigbee2mqtt',
    'Koenkk/zigbee-herdsman',
  ],
  zha: [
    'zigpy/zha-device-handlers',
    'zigpy/zigpy',
    'home-assistant/core',
  ],
  deconz: [
    'dresden-elektronik/deconz-rest-plugin',
  ],

  // Other Homey Zigbee apps
  homey: [
    'JohanBendz/com.tuya.zigbee',
    'TedTolboom/com.tuya.zigbee',
    'athombv/com.ikea.tradfri',
    'athombv/com.philips.hue.zigbee',
    'Koktansen/com.tuya.zigbee',
  ],

  // Smart home platforms with Zigbee
  iobroker: [
    'ioBroker/ioBroker.zigbee',
    'Koenkk/zigbee-shepherd-converters',
  ],
  tasmota: [
    'arendst/Tasmota',
  ],
  openhab: [
    'openhab/org.openhab.binding.zigbee',
    'zsmartsystems/com.zsmartsystems.zigbee',
  ],
  domoticz: [
    'zigbeefordomoticz/Domoticz-Zigbee',
    'zigbeefordomoticz/wiki',
  ],
  fhem: [
    'zigpy/bellows',
  ],

  // Tuya-specific
  tuya: [
    'tuya/tuya-home-assistant',
    'tuya/tuyaopen-platform-sdk',
    'codetheweb/tuyapi',
    'rospogrigio/localtuya',
  ],

  // Matter/Thread bridge
  matter: [
    'project-chip/connectedhomeip',
  ],

  // Community device databases
  community: [
    'blakadder/zigbee',
    'Koenkk/zigbee2mqtt.io',
  ],
};

// Flatten all repos
const ALL_REPOS = Object.values(REPO_GROUPS).flat();

// =============================================================================
// LOAD OUR FINGERPRINT INDEX
// =============================================================================

function loadOurFPs() {
  const fps = new Set();
  if (!fs.existsSync(DDIR)) return fps;
  for (const d of fs.readdirSync(DDIR)) {
    const cf = path.join(DDIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(cf, 'utf8'));
      for (const m of (j.zigbee?.manufacturerName || [])) fps.add(m);
    } catch {}
  }
  return fps;
}

function loadDriverIndex() {
  const idx = new Map();
  if (!fs.existsSync(DDIR)) return idx;
  for (const d of fs.readdirSync(DDIR)) {
    const cf = path.join(DDIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(cf, 'utf8'));
      for (const m of (j.zigbee?.manufacturerName || [])) idx.set(m, d);
    } catch {}
  }
  return idx;
}

// =============================================================================
// 1. CODE SEARCH — Find FPs in source code across all repos
// =============================================================================

async function searchCodeForFPs() {
  console.log('\n== Code Search: FPs across projects ==');
  const results = [];
  const queries = [
    '_TZE200_ language:typescript',
    '_TZE204_ language:typescript',
    '_TZE284_ language:typescript',
    '_TZ3000_ language:python path:tuya',
    '_TZE200_ language:python path:quirk',
    '_TZE200_ language:javascript NOT repo:dlnraja/com.tuya.zigbee',
    '_TZ3000_ language:groovy zigbee',
    '_TZE200_ language:java zigbee',
    'manufacturerName _TZE language:json',
    'tuya fingerprint _TZ language:yaml',
  ];

  for (const q of queries) {
    const data = await ghFetch(GH + '/search/code?q=' + encodeURIComponent(q) + '&per_page=30&sort=indexed&order=desc');
    if (!data?.items) continue;
    for (const item of data.items) {
      const fragments = (item.text_matches || []).map(m => m.fragment).join('\n');
      const allText = (item.name || '') + ' ' + fragments;
      const fps = _vFP(allText);
      const pids = [...new Set((allText.match(PID_RE) || []).map(p => p.toUpperCase()))];
      const dps = [...new Set((allText.match(DP_RE) || []).map(m => parseInt(m.match(/\d+/)?.[0])).filter(n => n > 0 && n < 256))];
      if (fps.length) {
        results.push({
          fps, pids, dps,
          repo: item.repository?.full_name,
          file: item.name,
          path: item.path,
          url: item.html_url,
          lang: item.repository?.language,
          snippet: fragments.slice(0, 500),
          source: 'code_search'
        });
      }
    }
    console.log('  Query "' + q.slice(0, 40) + '...": ' + (data.items?.length || 0) + ' results');
    await sleep(1000);
  }
  console.log('  Total code results:', results.length);
  return results;
}

// =============================================================================
// 2. ISSUE/PR SEARCH — Find device reports across all repos
// =============================================================================

async function searchIssuesForDevices() {
  console.log('\n== Issue Search: Device reports across projects ==');
  const results = [];

  // Build repo-specific queries
  const issueQueries = [];
  for (const [group, repos] of Object.entries(REPO_GROUPS)) {
    for (const repo of repos) {
      // Search for Tuya FPs in open issues
      issueQueries.push({ q: 'repo:' + repo + ' _TZE state:open', repo, group });
      if (group !== 'z2m') { // Z2M already well-covered
        issueQueries.push({ q: 'repo:' + repo + ' tuya zigbee state:open', repo, group });
      }
    }
  }

  // Also search globally for Tuya fingerprints
  issueQueries.push({ q: '_TZE200_ zigbee state:open -repo:dlnraja/com.tuya.zigbee', repo: 'global', group: 'global' });
  issueQueries.push({ q: '_TZE284_ zigbee state:open -repo:dlnraja/com.tuya.zigbee', repo: 'global', group: 'global' });
  issueQueries.push({ q: 'tuya TS0601 zigbee state:open -repo:dlnraja/com.tuya.zigbee', repo: 'global', group: 'global' });

  // Limit to top queries to stay within rate limits
  const topQueries = issueQueries.slice(0, 25);

  for (const { q, repo, group } of topQueries) {
    const data = await ghFetch(GH + '/search/issues?q=' + encodeURIComponent(q) + '&per_page=15&sort=created&order=desc');
    if (!data?.items) continue;
    for (const item of data.items) {
      const text = (item.title || '') + ' ' + (item.body || '').slice(0, 3000);
      const fps = _vFP(text);
      const pids = [...new Set((text.match(PID_RE) || []).map(p => p.toUpperCase()))];
      const dps = [...new Set((text.match(DP_RE) || []).map(m => parseInt(m.match(/\d+/)?.[0])).filter(n => n > 0 && n < 256))];
      if (fps.length) {
        const isBug = /bug|fix|wrong|incorrect|broken|not.work|invert/i.test(text);
        const isQuirk = /quirk|workaround|hack|special|override|custom/i.test(text);
        results.push({
          fps, pids, dps,
          repo: item.repository_url?.split('/').slice(-2).join('/') || repo,
          group,
          number: item.number,
          title: item.title?.slice(0, 100),
          url: item.html_url,
          isPR: !!item.pull_request,
          isBug, isQuirk,
          created: item.created_at,
          source: 'issue_search'
        });
      }
    }
    await sleep(800);
  }
  console.log('  Total issue results:', results.length);
  return results;
}

// =============================================================================
// 3. REPO DISCOVERY — Find new relevant Zigbee/Tuya repos
// =============================================================================

async function discoverRepos() {
  console.log('\n== Repo Discovery ==');
  const discovered = [];
  const queries = [
    'tuya zigbee driver language:javascript stars:>5',
    'tuya zigbee converter language:typescript stars:>3',
    'zigbee tuya homey language:javascript',
    'tuya zigbee cluster 0xEF00 language:python',
    'tuya zigbee datapoint language:javascript',
    '_TZE200_ zigbee language:python stars:>2',
    'zigbee herdsman tuya language:typescript',
    'tuya local zigbee language:python stars:>10',
  ];

  for (const q of queries) {
    const data = await ghFetch(GH + '/search/repositories?q=' + encodeURIComponent(q) + '&per_page=10&sort=updated&order=desc');
    if (!data?.items) continue;
    for (const repo of data.items) {
      if (ALL_REPOS.includes(repo.full_name)) continue; // Already known
      if (repo.full_name === 'dlnraja/com.tuya.zigbee') continue; // Our repo
      discovered.push({
        name: repo.full_name,
        description: repo.description?.slice(0, 200),
        stars: repo.stargazers_count,
        language: repo.language,
        updated: repo.updated_at,
        url: repo.html_url,
        topics: repo.topics || [],
      });
    }
    await sleep(1500);
  }

  // Deduplicate
  const seen = new Set();
  const unique = discovered.filter(r => {
    if (seen.has(r.name)) return false;
    seen.add(r.name);
    return true;
  }).sort((a, b) => b.stars - a.stars);

  console.log('  Discovered', unique.length, 'new repos');
  return unique;
}

// =============================================================================
// 4. TARGETED SEARCH — Search specific repos for specific FPs
// =============================================================================

async function searchTargetedFPs(unsupportedFPs) {
  console.log('\n== Targeted Search: Unsupported FPs ==');
  const results = [];
  const toSearch = unsupportedFPs.slice(0, 20);

  for (const fp of toSearch) {
    // Code search: find the FP in any repo
    const data = await ghFetch(GH + '/search/code?q=' + encodeURIComponent(fp) + '&per_page=10');
    if (data?.items) {
      for (const item of data.items) {
        const fragments = (item.text_matches || []).map(m => m.fragment).join('\n');
        const pids = [...new Set((fragments.match(PID_RE) || []).map(p => p.toUpperCase()))];
        const dps = [...new Set((fragments.match(DP_RE) || []).map(m => parseInt(m.match(/\d+/)?.[0])).filter(n => n > 0 && n < 256))];
        results.push({
          fp, pids, dps,
          repo: item.repository?.full_name,
          file: item.name,
          path: item.path,
          url: item.html_url,
          lang: item.repository?.language,
          snippet: fragments.slice(0, 600),
          source: 'targeted_search'
        });
      }
    }
    await sleep(2500);
  }
  console.log('  Found info for', new Set(results.map(r => r.fp)).size, '/', toSearch.length, 'FPs');
  return results;
}

// =============================================================================
// 5. CROSS-REFERENCE & ANALYSIS
// =============================================================================

function crossReferenceResults(codeResults, issueResults, targetedResults, ourFPs, driverIndex) {
  const byFP = new Map();

  const processEntry = (entry) => {
    for (const fp of (entry.fps || [entry.fp])) {
      if (!fp) continue;
      if (!byFP.has(fp)) {
        byFP.set(fp, {
          fp,
          pids: new Set(),
          dps: new Set(),
          repos: new Set(),
          issues: [],
          codeRefs: [],
          inApp: ourFPs.has(fp),
          driver: driverIndex.get(fp) || null,
          sources: new Set()
        });
      }
      const e = byFP.get(fp);
      for (const p of (entry.pids || [])) e.pids.add(p);
      for (const d of (entry.dps || [])) e.dps.add(d);
      if (entry.repo) e.repos.add(entry.repo);
      e.sources.add(entry.source);
      if (entry.source === 'issue_search') {
        e.issues.push({ repo: entry.repo, num: entry.number, title: entry.title, url: entry.url, isPR: entry.isPR, isBug: entry.isBug });
      }
      if (entry.source === 'code_search' || entry.source === 'targeted_search') {
        e.codeRefs.push({ repo: entry.repo, file: entry.file, path: entry.path, url: entry.url, lang: entry.lang, snippet: entry.snippet?.slice(0, 300) });
      }
    }
  };

  codeResults.forEach(processEntry);
  issueResults.forEach(processEntry);
  targetedResults.forEach(processEntry);

  // Convert sets and sort
  const results = [...byFP.values()].map(e => ({
    ...e,
    pids: [...e.pids],
    dps: [...e.dps].sort((a, b) => a - b),
    repos: [...e.repos],
    sources: [...e.sources],
    repoCount: e.repos.size,
    confidence: e.repos.size * 15 + e.dps.size * 8 + e.pids.size * 10 + e.issues.length * 5 + e.codeRefs.length * 5
  })).sort((a, b) => b.confidence - a.confidence);

  return results;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('=== GitHub Deep Search Engine ===');
  console.log('Token:', TOKEN ? 'present' : 'MISSING', '| Max calls:', MAX_GH);
  const start = Date.now();

  const ourFPs = loadOurFPs();
  const driverIndex = loadDriverIndex();
  console.log('Our FPs:', ourFPs.size, '| Drivers:', driverIndex.size);

  // 1. Code search across projects
  const codeResults = await searchCodeForFPs();

  // 2. Issue/PR search
  const issueResults = await searchIssuesForDevices();

  // 3. Repo discovery
  const newRepos = await discoverRepos();

  // 4. Find unsupported FPs from results for targeted search
  const allFoundFPs = new Set();
  for (const r of [...codeResults, ...issueResults]) {
    for (const fp of (r.fps || [])) {
      if (!ourFPs.has(fp)) allFoundFPs.add(fp);
    }
  }
  const targetedResults = await searchTargetedFPs([...allFoundFPs].slice(0, 20));

  // 5. Cross-reference
  const crossRef = crossReferenceResults(codeResults, issueResults, targetedResults, ourFPs, driverIndex);
  const supported = crossRef.filter(e => e.inApp);
  const unsupported = crossRef.filter(e => !e.inApp);
  const withDPs = unsupported.filter(e => e.dps.length > 0);
  const withIssues = unsupported.filter(e => e.issues.length > 0);

  console.log('\n== Cross-Reference Summary ==');
  console.log('Total unique FPs found:', crossRef.length);
  console.log('Already supported:', supported.length);
  console.log('New/unsupported:', unsupported.length);
  console.log('  With DPs:', withDPs.length);
  console.log('  With issues:', withIssues.length);
  console.log('New repos discovered:', newRepos.length);
  console.log('GitHub API calls:', ghCalls);

  // 6. AI analysis of top findings
  let aiPlan = null;
  if (unsupported.length > 0) {
    console.log('\n== AI Analysis ==');
    const top = unsupported.slice(0, 15).map(e => ({
      fp: e.fp, pids: e.pids, dps: e.dps, repos: e.repos.slice(0, 3),
      issues: e.issues.length, codeRefs: e.codeRefs.length, confidence: e.confidence
    }));
    aiPlan = await callAI(
      JSON.stringify({ unsupported: top, newRepos: newRepos.slice(0, 5).map(r => ({ name: r.name, stars: r.stars, desc: r.description })) }),
      'Tuya Zigbee expert. For each unsupported FP: suggest driver, DP→capability map. For new repos: assess value for integration. Markdown table. Max 500 words.',
      { maxTokens: 1200 }
    );
  }

  // 7. Save report
  const report = {
    timestamp: new Date().toISOString(),
    stats: {
      ghCalls,
      codeResults: codeResults.length,
      issueResults: issueResults.length,
      targetedResults: targetedResults.length,
      newRepos: newRepos.length,
      totalFPs: crossRef.length,
      supported: supported.length,
      unsupported: unsupported.length,
      withDPs: withDPs.length,
      withIssues: withIssues.length,
      duration: Math.round((Date.now() - start) / 1000)
    },
    topUnsupported: unsupported.slice(0, 50).map(e => ({
      fp: e.fp, pids: e.pids, dps: e.dps,
      repos: e.repos.slice(0, 5), sources: e.sources,
      issueCount: e.issues.length, codeRefCount: e.codeRefs.length,
      confidence: e.confidence,
      topIssue: e.issues[0]?.url || null,
      topCode: e.codeRefs[0]?.url || null
    })),
    bugsInSupported: supported.filter(e => e.issues.some(i => i.isBug)).slice(0, 20).map(e => ({
      fp: e.fp, driver: e.driver, bugs: e.issues.filter(i => i.isBug)
    })),
    newRepos: newRepos.slice(0, 30),
    aiPlan: aiPlan?.text || null
  };
  fs.mkdirSync(STATE, { recursive: true });
  fs.writeFileSync(REPORT_F, JSON.stringify(report, null, 2) + '\n');

  // State
  const state = loadState();
  state.lastRun = new Date().toISOString();
  state.runs = (state.runs || 0) + 1;
  state.lastStats = report.stats;
  saveState(state);

  // GitHub Step Summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    let md = '## GitHub Deep Search\n';
    md += '| Metric | Count |\n|---|---|\n';
    md += '| Code results | ' + codeResults.length + ' |\n';
    md += '| Issue results | ' + issueResults.length + ' |\n';
    md += '| Targeted results | ' + targetedResults.length + ' |\n';
    md += '| Total unique FPs | ' + crossRef.length + ' |\n';
    md += '| Already supported | ' + supported.length + ' |\n';
    md += '| **New/unsupported** | **' + unsupported.length + '** |\n';
    md += '| With DPs | ' + withDPs.length + ' |\n';
    md += '| With issues | ' + withIssues.length + ' |\n';
    md += '| New repos | ' + newRepos.length + ' |\n';
    md += '| GH API calls | ' + ghCalls + ' |\n';
    md += '| Duration | ' + report.stats.duration + 's |\n';
    if (unsupported.length > 0) {
      md += '\n### Top Unsupported FPs\n| FP | PIDs | DPs | Repos | Confidence |\n|---|---|---|---|---|\n';
      for (const e of unsupported.slice(0, 15)) {
        md += '| `' + e.fp + '` | ' + e.pids.join(',') + ' | ' + e.dps.join(',') + ' | ' + e.repos.slice(0, 2).join(', ') + ' | ' + e.confidence + ' |\n';
      }
    }
    if (newRepos.length > 0) {
      md += '\n### Discovered Repos\n| Repo | Stars | Language |\n|---|---|---|\n';
      for (const r of newRepos.slice(0, 10)) {
        md += '| [' + r.name + '](' + r.url + ') | ' + r.stars + ' | ' + (r.language || '?') + ' |\n';
      }
    }
    if (aiPlan) md += '\n### AI Analysis\n' + aiPlan + '\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }

  console.log('\n=== Done (' + report.stats.duration + 's, ' + ghCalls + ' API calls) ===');
}

function loadState() { try { return JSON.parse(fs.readFileSync(STATE_F, 'utf8')); } catch { return {}; } }
function saveState(s) { fs.mkdirSync(path.dirname(STATE_F), { recursive: true }); fs.writeFileSync(STATE_F, JSON.stringify(s, null, 2) + '\n'); }

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
