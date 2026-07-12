#!/usr/bin/env node
/**
 * johan-dump.js — READ-ONLY regular fetch of JohanBendz/com.tuya.zigbee
 *
 * NO writes. NO auto-replies. NO comments. Just observe + dump.
 *
 * Fetches:
 *   - Issues (open + closed since last dump)
 *   - Comments per issue
 *   - PRs
 *   - Labels
 *   - Devices mentioned (mfrs from comments)
 *
 * Stores:
 *   - .github/state/johan-dump/issues.json
 *   - .github/state/johan-dump/comments.json
 *   - .github/state/johan-dump/devices.json (extracted mfrs + PIDs)
 *   - .github/state/johan-dump/state.json (last fetch timestamps)
 *
 * Usage:
 *   node tools/ci/johan-dump.js                  # full dump
 *   node tools/ci/johan-dump.js --since=24h      # only recent
 *   node tools/ci/johan-dump.js --incremental    # only new since last run
 *
 * Rate limit (with auth): 5000 req/h
 * Rate limit (no auth): 60 req/h (use --no-auth)
 *
 * @author Mavis P12 — read-only mode
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DUMP_DIR = path.join(ROOT, '.github', 'state', 'johan-dump');
const STATE_FILE = path.join(DUMP_DIR, 'state.json');
const REPO = 'JohanBendz/com.tuya.zigbee';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

const args = process.argv.slice(2);
const SINCE = (() => {
  const a = args.find(x => x.startsWith('--since='));
  return a ? a.split('=')[1] : null;
})();
const INCREMENTAL = args.includes('--incremental');
const NO_AUTH = args.includes('--no-auth');

const headers = { 'User-Agent': 'Mavis-Dump', 'Accept': 'application/vnd.github+json' };
if (TOKEN && !NO_AUTH) headers['Authorization'] = 'Bearer ' + TOKEN;

const MFR_REGEX = /_T[YZ](?:E200|E2[E2]8[0-9]|ZB\d{2}|Z3000|Z3210)[_-][A-Za-z0-9]+/g;
const PID_REGEX = /TS\d{4}[A-Z]?/g;

function api(path) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const req = https.get('https://api.github.com' + path, { headers }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve({ status: res.statusCode, body: JSON.parse(body), rate: parseInt(res.headers['x-ratelimit-remaining'] || '0', 10) }); }
          catch (e) { resolve({ status: res.statusCode, body: body, rate: 0 }); }
        } else {
          resolve({ status: res.statusCode, body: body.substring(0, 200), rate: 0 });
        }
      });
    });
    req.on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return { lastRun: null, lastIssue: 0, lastPR: 0, totalIssues: 0, totalComments: 0 };
}

function saveState(state) {
  fs.mkdirSync(DUMP_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function isRecent(date, since) {
  if (!since) return true;
  const d = new Date(date);
  const now = new Date();
  const ms = now - d;
  if (since.endsWith('h')) return ms < parseInt(since) * 3600000;
  if (since.endsWith('d')) return ms < parseInt(since) * 86400000;
  return ms < 24 * 3600000; // default 24h
}

function extractDevices(text) {
  const mfrs = [...new Set((text.match(MFR_REGEX) || []).map(m => m.toUpperCase()))];
  const pids = [...new Set((text.match(PID_REGEX) || []))];
  return { mfrs, pids };
}

async function fetchIssues(state) {
  console.log('\n=== ISSUES ===');
  const all = [];
  const states = ['open', 'closed'];
  for (const st of states) {
    for (let page = 1; page <= 10; page++) {
      const params = new URLSearchParams({ state: st, per_page: '100', page: String(page), sort: 'updated', direction: 'desc' });
      const r = await api(`/repos/${REPO}/issues?${params}`);
      if (r.status !== 200) { console.log('  status=' + r.status + ' for ' + st + ' page ' + page); break; }
      const issues = r.body.filter(i => !i.pull_request);
      if (INCREMENTAL && state.lastIssue && issues.length) {
        const lastNum = state.lastIssue;
        const newOnes = issues.filter(i => i.number > lastNum);
        if (newOnes.length < issues.length) { all.push(...newOnes); break; }
      }
      all.push(...issues);
      if (issues.length < 100) break;
      await sleep(800);
    }
  }
  console.log('  Fetched: ' + all.length + ' issues');
  return all;
}

async function fetchComments(issueNumbers) {
  console.log('\n=== COMMENTS ===');
  const all = [];
  for (const num of issueNumbers) {
    for (let page = 1; page <= 5; page++) {
      const r = await api(`/repos/${REPO}/issues/${num}/comments?per_page=100&page=${page}`);
      if (r.status !== 200) break;
      if (!Array.isArray(r.body)) break;
      all.push(...r.body.map(c => ({ ...c, issue_number: num })));
      if (r.body.length < 100) break;
      await sleep(500);
    }
  }
  console.log('  Fetched: ' + all.length + ' comments');
  return all;
}

async function fetchPRs(state) {
  console.log('\n=== PRS ===');
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const params = new URLSearchParams({ state: 'all', per_page: '100', page: String(page), sort: 'updated', direction: 'desc' });
    const r = await api(`/repos/${REPO}/pulls?${params}`);
    if (r.status !== 200) break;
    if (INCREMENTAL && state.lastPR && r.body.length) {
      const lastNum = state.lastPR;
      const newOnes = r.body.filter(p => p.number > lastNum);
      if (newOnes.length < r.body.length) { all.push(...newOnes); break; }
    }
    all.push(...r.body);
    if (r.body.length < 100) break;
    await sleep(800);
  }
  console.log('  Fetched: ' + all.length + ' PRs');
  return all;
}

async function main() {
  fs.mkdirSync(DUMP_DIR, { recursive: true });
  const state = loadState();
  console.log('Johan READ-ONLY dump');
  console.log('  Token:', TOKEN ? 'YES' : 'NO (60 req/h limit)');
  console.log('  Mode:', INCREMENTAL ? 'INCREMENTAL' : (SINCE ? `since ${SINCE}` : 'FULL'));
  console.log('  Last run:', state.lastRun || 'never');
  console.log('');

  // Fetch
  const issues = await fetchIssues(state);
  await sleep(2000);
  const issueNumbers = issues.map(i => i.number);
  const comments = await fetchComments(issueNumbers);
  await sleep(2000);
  const prs = await fetchPRs(state);

  // Extract devices
  console.log('\n=== EXTRACT DEVICES ===');
  const devices = new Map();
  for (const i of issues) {
    const text = (i.title || '') + ' ' + (i.body || '');
    const d = extractDevices(text);
    if (d.mfrs.length || d.pids.length) {
      devices.set(i.number, { issue: i.number, title: i.title.substring(0, 80), state: i.state, ...d });
    }
  }
  for (const c of comments) {
    const text = c.body || '';
    const d = extractDevices(text);
    if (d.mfrs.length || d.pids.length) {
      const existing = devices.get(c.issue_number) || { issue: c.issue_number, mfrs: [], pids: [] };
      existing.mfrs = [...new Set([...existing.mfrs, ...d.mfrs])];
      existing.pids = [...new Set([...existing.pids, ...d.pids])];
      devices.set(c.issue_number, existing);
    }
  }
  const devicesArr = [...devices.values()];
  console.log('  Devices found: ' + devicesArr.length + ' (across issues)');

  // Save
  fs.writeFileSync(path.join(DUMP_DIR, 'issues.json'), JSON.stringify(issues, null, 2));
  fs.writeFileSync(path.join(DUMP_DIR, 'comments.json'), JSON.stringify(comments, null, 2));
  fs.writeFileSync(path.join(DUMP_DIR, 'prs.json'), JSON.stringify(prs, null, 2));
  fs.writeFileSync(path.join(DUMP_DIR, 'devices.json'), JSON.stringify(devicesArr, null, 2));

  // Update state
  const newState = {
    lastRun: new Date().toISOString(),
    lastIssue: Math.max(state.lastIssue || 0, ...issues.map(i => i.number)),
    lastPR: Math.max(state.lastPR || 0, ...prs.map(p => p.number)),
    totalIssues: issues.length,
    totalComments: comments.length,
    totalPRs: prs.length,
    totalDevices: devicesArr.length,
  };
  saveState(newState);

  console.log('\n=== SUMMARY ===');
  console.log('Issues: ' + issues.length);
  console.log('Comments: ' + comments.length);
  console.log('PRs: ' + prs.length);
  console.log('Devices (mfrs+pids): ' + devicesArr.length);
  console.log('Dump: ' + DUMP_DIR);
  console.log('');
  console.log('Next: run johan-enrichment.js to cross-reference with our drivers/mfs_db');
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
