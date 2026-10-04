#!/usr/bin/env node
'use strict';
/**
 * Free weekday self-check for Daily digest tracking issue (#557 / label bot-digest).
 * Reports: sweep checkpoint progress, continuous-flow dry-run policy, gate-duplication note.
 * Never commits. Posts a comment only when FORCE=true or the fingerprint of the report changed
 * vs the last <!-- self-check:BEGIN --> block in the issue body.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '../..');
const OWNER = 'dlnraja';
const REPO = 'com.tuya.zigbee';
const FORCE = String(process.env.FORCE || '') === 'true';

function gh(method, apiPath, body) {
  const token = process.env.GITHUB_TOKEN || '';
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        'User-Agent': 'dlnraja-self-check',
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let b = '';
      res.on('data', (c) => { b += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`${method} ${apiPath} -> ${res.statusCode} ${b.slice(0, 200)}`));
        try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }

function buildReport() {
  const sweep = load(path.join(ROOT, 'data/leads/sweep-checkpoint.json'), {});
  const deep = load(path.join(ROOT, 'data/leads/deep-read-checkpoint.json'), {});
  const nextJ = (sweep.github && sweep.github.johan && sweep.github.johan.next) || (deep.next && deep.next.JohanBendz) || '?';
  const items = Array.isArray(sweep.items) ? sweep.items : [];
  const by = items.reduce((a, it) => { a[it.status] = (a[it.status] || 0) + 1; return a; }, {});
  const lines = [
    '### Free self-check (P2802)',
    '',
    `- History sweep: Johan next **#${nextJ}**; items ${JSON.stringify(by)}; forum 140352 lastPost **${(sweep.threads && sweep.threads['140352'] && sweep.threads['140352'].lastPost) || '?'}**.`,
    '- Continuous-flow: **schedule stays always dry-run** (push trigger removed P2797c). Apply only via workflow_dispatch `mode=apply`. Same gates already run on push in syntax-check / code-quality / unified-ci.',
    '- Gate duplication: sacred-couple / anti-bot / P214 / fingerprint-sync / flow-title appear in ~5 workflows (safe-auto-commit, pr-gate, auto-fix-and-publish, unified-ci, fleet). Defer consolidation; keep shared gate scripts as SSOT.',
    `- Sweep updated: ${sweep.updated || 'n/a'}.`,
    '',
    '_No driver changes. No publish._',
  ];
  return lines.join('\n');
}

(async () => {
  const report = buildReport();
  const fp = crypto.createHash('sha1').update(report).digest('hex').slice(0, 12);
  const issues = await gh('GET', `/repos/${OWNER}/${REPO}/issues?labels=bot-digest&state=open&per_page=5`);
  const issue = Array.isArray(issues) ? issues.find((i) => /Daily digest/i.test(i.title)) || issues[0] : null;
  if (!issue) { console.log('no bot-digest issue'); return; }
  const marker = `<!-- self-check:${fp} -->`;
  if (!FORCE && issue.body && issue.body.includes(`<!-- self-check:${fp} -->`)) {
    console.log('unchanged', fp);
    return;
  }
  // Also skip if last comment already has same fingerprint
  const comments = await gh('GET', `/repos/${OWNER}/${REPO}/issues/${issue.number}/comments?per_page=5`);
  const last = Array.isArray(comments) ? comments.slice(-3) : [];
  if (!FORCE && last.some((c) => c.body && c.body.includes(marker))) {
    console.log('recent comment unchanged', fp);
    return;
  }
  const body = `${marker}\n${report}\n`;
  await gh('POST', `/repos/${OWNER}/${REPO}/issues/${issue.number}/comments`, { body });
  console.log('posted self-check to', issue.number, fp);
})().catch((e) => { console.error(e.message || e); process.exit(0); }); // best-effort
