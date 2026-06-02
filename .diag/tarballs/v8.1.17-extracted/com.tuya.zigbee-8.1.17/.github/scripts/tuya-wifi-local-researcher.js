#!/usr/bin/env node
'use strict';
/**
 * tuya-wifi-local-researcher.js
 * Scans community projects (ZHA, LocalTuya, tuyapi) to discover optimal Tuya WiFi integration methods
 * without relying heavily on the cloud. Learns protocol rules to generate scaffolding.
 */
const fs = require('fs');
const path = require('path');
const { fetchWithRetry } = require('./retry-helper');
const { callAI } = require('./ai-helper');

const REPORT_FILE = path.join(__dirname, '..', 'state', 'tuya-wifi-local-report.json');
const TARGET_REPOS = [
  'rospogrigio/localtuya',
  'codetheweb/tuyapi',
  'jasonacox/tinytuya',
  'tuya/tuya-homeassistant'
];

async function fetchRepoReadmes(repo) {
  const url = `https://api.github.com/repos/${repo}/readme`;
  const token = process.env.GH_PAT || process.env.GITHUB_TOKEN;
  const hdrs = { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'tuya-bot' };
  if (token) hdrs.Authorization = `Bearer ${token}`;
  
  try {
    const res = await fetchWithRetry(url, { headers: hdrs }, { retries: 2, label: 'ghReadmes' });
    if (!res.ok) return '';
    const body = await res.json();
    return Buffer.from(body.content, 'base64').toString('utf8');
  } catch (e) {
    return '';
  }
}

async function main() {
  console.log('=== Tuya WiFi / Local Deep Researcher ===');
  
  let combinedKnowledge = '';
  for (const repo of TARGET_REPOS) {
    console.log(`Scanning ${repo}...`);
    const content = await fetchRepoReadmes(repo);
    combinedKnowledge += `\n\n--- ${repo} ---\n` + content.substring(0, 15000);
  }

  const sysPrompt = `You are a Smart Home Network Architect working on a Homey Pro app.
We want to support Tuya WiFi devices locally, without relying constantly on the Tuya Cloud, similar to LocalTuya.
Based on the provided READMES from existing Tuya local projects, summarize:
1. The exact AES encoding/decoding mechanism and how device local keys are retrieved via the Tuya Cloud once.
2. The network protocol used (TCP port 6668/6669? MQTT?).
3. The format of a Tuya local DP payload.
4. Recommendations on how to implement this natively in Node.js for Homey SDK 3.

Format as a detailed JSON array of objects representing "rules_and_insights".`;

  let analysis = null;
  try {
    const aiRes = await callAI(combinedKnowledge.substring(0, 40000), sysPrompt, { maxTokens: 2000 });
    const jsonMatch = aiRes.text.match(/\[[\s\S]*\]/);
    if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.log('AI processing failed. Falling back to generic rules.');
    analysis = [{ "info": "Extract local key via Cloud API (email/password pairing), connect TCP 6668 (v3.1) or TCP 6669 (v3.3/v3.4) sending AES-128-ECB payloads." }];
  }

  console.log('Extracted Tuya Local WiFi knowledge:', analysis ? analysis.length + ' points' : 'failed');

  const report = {
    lastScan: new Date().toISOString(),
    localIntegrationPlan: analysis
  };

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`Saved insights to ${REPORT_FILE}`);
}

main().catch(err => { console.error(err); process.exit(1); });
