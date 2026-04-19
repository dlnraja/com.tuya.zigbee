#!/usr/bin/env node
'use strict';
/**
 * sync-sdk3-docs.js
 * Runs monthly to fetch the latest Homey SDK 3 and Homey Zigbee Reference guides,
 * parse changes, and integrate them into the local knowledge base.
 */
const fs = require('fs');
const path = require('path');
const { fetchWithRetry } = require('./retry-helper');
const { callAI } = require('./ai-helper');

const DOCS_URL = 'https://apps.developer.homey.app/the-basics/devices/';
const ZIGBEE_DOCS_URL = 'https://apps.developer.homey.app/wireless/zigbee';
const OUTPUT_FILE = path.join(__dirname, '..', 'state', 'sdk3-reference.json');

async function scrapeDocs(url) {
  try {
    const res = await fetchWithRetry(url, {}, { retries: 2, label: 'SDKDocs' });
    if (!res.ok) return '';
    const text = await res.text();
    // Rough script removal
    const bodyText = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                         .replace(/<[^>]+>/g, ' ');
    return bodyText.split(/\s+/).join(' ');
  } catch (e) {
    return '';
  }
}

async function main() {
  console.log('=== Monthly Homey SDK 3 Documentation Sync ===');
  const basics = await scrapeDocs(DOCS_URL);
  const zigbee = await scrapeDocs(ZIGBEE_DOCS_URL);
  
  const fullContent = (basics.substring(0, 5000) + '\\n' + zigbee.substring(0, 5000));
  
  // Use AI to extract clear rules and deprecations (like getDeviceConditionCard -> getConditionCard)
  const sysPrompt = `You are a Smart Home Platform Engineer parsing the latest Homey SDK v3 Documentation.
Summarize the key methods, Zigbee requirements, removed/deprecated features, and new methods.
Format strictly as JSON with keys: "deprecated_methods", "new_methods", "zigbee_rules", "summary"`;

  let analysis = {};
  try {
    const aiRes = await callAI(fullContent, sysPrompt, { maxTokens: 1500 });
    const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.log('Failed to parse AI response for SDK sync');
  }

  const result = {
    syncedAt: new Date().toISOString(),
    analysis: analysis || {}
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(' SDK 3 Docs synchronized to', OUTPUT_FILE);
  
  // Also append core SDK rules back into gather-intelligence.js or .windsurfrules context
  if (analysis && analysis.deprecated_methods) {
      console.log('Deprecated methods detected:', analysis.deprecated_methods);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
