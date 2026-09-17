#!/usr/bin/env node
'use strict';
/**
 * sync-sdk3-docs.js (P2547)
 * Fetch Homey SDK 3 / Zigbee reference guides (prefer .md), parse with local
 * heuristics first, optional AI only when AI_ALLOW_REMOTE=true.
 *
 * SSOT: config/architecture/external-app-sdk3-inspiration-ssot.json
 */
const fs = require('fs');
const path = require('path');
const { fetchWithRetry } = require('./retry-helper');

const DOCS_MD = 'https://apps.developer.homey.app/the-basics/devices/capabilities.md';
const DOCS_HTML = 'https://apps.developer.homey.app/the-basics/devices/capabilities';
const ZIGBEE_MD = 'https://apps.developer.homey.app/wireless/zigbee.md';
const ZIGBEE_HTML = 'https://apps.developer.homey.app/wireless/zigbee';
const UPGRADE_MD = 'https://apps.developer.homey.app/upgrade-guides/upgrading-to-sdk-v3/upgrading-zigbee.md';
const OUTPUT_FILE = path.join(__dirname, '..', 'state', 'sdk3-reference.json');
const SSOT_FILE = path.join(__dirname, '..', '..', 'config', 'architecture', 'external-app-sdk3-inspiration-ssot.json');

async function scrapeDocs(url) {
  try {
    const res = await fetchWithRetry(url, {}, { retries: 2, label: 'SDKDocs' });
    if (!res.ok) return '';
    const text = await res.text();
    if (url.endsWith('.md')) {
      return text.replace(/\s+/g, ' ').trim();
    }
    const bodyText = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ');
    return bodyText.split(/\s+/).join(' ');
  } catch (e) {
    return '';
  }
}

function localHeuristicAnalysis(blob) {
  const lower = String(blob || '').toLowerCase();
  const deprecated_methods = [];
  const new_methods = [];
  const zigbee_rules = [];

  if (/onmeshinit/.test(lower)) deprecated_methods.push('onMeshInit → onNodeInit');
  if (/registerattrreportlistener/.test(lower)) {
    deprecated_methods.push('registerAttrReportListener → configureAttributeReporting');
  }
  if (/registerreportlistener/.test(lower)) {
    deprecated_methods.push('registerReportListener → boundCluster');
  }
  if (/homey-meshdriver/.test(lower)) deprecated_methods.push('homey-meshdriver → homey-zigbeedriver');

  if (/onnodeinit/.test(lower)) new_methods.push('onNodeInit');
  if (/onenddeviceannounce/.test(lower)) new_methods.push('onEndDeviceAnnounce');
  if (/isfirstinit/.test(lower)) new_methods.push('isFirstInit');
  if (/configureattributereporting/.test(lower)) new_methods.push('configureAttributeReporting');
  if (/boundcluster/.test(lower)) new_methods.push('boundCluster');

  if (/avoid initiating communication/.test(lower) || /onnodeinit/.test(lower)) {
    zigbee_rules.push('Avoid initiating node communication in onInit/onNodeInit; always catch ZCL promises');
  }
  if (/manufacturername/.test(lower) && /productid/.test(lower)) {
    zigbee_rules.push('Compose identity uses manufacturerName + productId only');
  }
  if (/group id 0/.test(lower) || /getgroups/.test(lower)) {
    zigbee_rules.push('Homey Pro 2023+ listens group 0 + Touchlink getGroups');
  }
  if (/setcapabilityvalue/.test(lower) && /catch/.test(lower)) {
    zigbee_rules.push('setCapabilityValue(...).catch(this.error) — prefer safeSetCapabilityValue');
  }

  // Merge locked SSOT rules when present
  try {
    const ssot = JSON.parse(fs.readFileSync(SSOT_FILE, 'utf8'));
    for (const r of ssot.officialSdk3?.rules || []) {
      if (r.text && !zigbee_rules.includes(r.text)) zigbee_rules.push(r.text);
    }
  } catch (_e) { /* optional */ }

  return {
    deprecated_methods,
    new_methods,
    zigbee_rules,
    summary: 'P2547 local heuristic sync (AI optional). Prefer .md Athom docs.',
    source: 'local-heuristic',
  };
}

async function main() {
  console.log('=== Homey SDK 3 Documentation Sync (P2547) ===');
  let zigbee = await scrapeDocs(ZIGBEE_MD);
  if (!zigbee) zigbee = await scrapeDocs(ZIGBEE_HTML);
  let basics = await scrapeDocs(DOCS_MD);
  if (!basics) basics = await scrapeDocs(DOCS_HTML);
  const upgrade = await scrapeDocs(UPGRADE_MD);

  const fullContent = [basics, zigbee, upgrade].map((s) => String(s || '').substring(0, 6000)).join('\n');
  let analysis = localHeuristicAnalysis(fullContent);

  const allowRemote = String(process.env.AI_ALLOW_REMOTE || '').toLowerCase() === 'true'
    && String(process.env.AI_FORCE_LOCAL || 'true').toLowerCase() !== 'true';

  if (allowRemote && fullContent.length > 200) {
    try {
      const { callAI } = require('./ai-helper');
      const sysPrompt = `You are a Smart Home Platform Engineer parsing Homey SDK v3 docs.
Summarize key methods, Zigbee requirements, deprecated/new methods.
JSON keys only: deprecated_methods, new_methods, zigbee_rules, summary`;
      const aiRes = await callAI(fullContent.substring(0, 10000), sysPrompt, { maxTokens: 1500 });
      const jsonMatch = aiRes.text && aiRes.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const ai = JSON.parse(jsonMatch[0]);
        analysis = {
          deprecated_methods: [...new Set([...(analysis.deprecated_methods || []), ...(ai.deprecated_methods || [])])],
          new_methods: [...new Set([...(analysis.new_methods || []), ...(ai.new_methods || [])])],
          zigbee_rules: [...new Set([...(analysis.zigbee_rules || []), ...(ai.zigbee_rules || [])])],
          summary: ai.summary || analysis.summary,
          source: 'local+ai',
        };
      }
    } catch (err) {
      console.log('AI SDK sync skipped/failed — keeping local heuristic');
    }
  } else {
    console.log('AI skipped (forfait local) — local heuristic only');
  }

  const result = {
    syncedAt: new Date().toISOString(),
    patch: 'P2547',
    urls: { zigbeeMd: ZIGBEE_MD, capabilitiesMd: DOCS_MD, upgradeMd: UPGRADE_MD },
    analysis: analysis || {},
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log('SDK 3 Docs synchronized to', OUTPUT_FILE);
  if (analysis.deprecated_methods?.length) {
    console.log('Deprecated methods:', analysis.deprecated_methods);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
