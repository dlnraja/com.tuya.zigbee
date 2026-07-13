#!/usr/bin/env node
'use strict';

/**
 * Download ZHA quirks from zha-device-handlers repo and extract (manufacturer, model) pairs.
 * Output: zha-pairs.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUT_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';
const OUT_FILE = path.join(OUT_DIR, 'zha-pairs.json');

const REPO = 'zigpy/zha-device-handlers';
const BRANCH = 'master';
// Focus on Tuya (huge category) + all standard vendors
const FOLDERS = ['tuya', 'xiaomi', 'ikea', 'philips', 'osram', 'inovelli', 'legrand',
  'schneider_electric', 'hive', 'centralite', 'ge', 'sengled', 'ledvance', 'smartthings',
  'third_reality', 'develco', 'lumi', 'opple', 'heiman', 'sonoff', 'konke', 'owon',
  'tuye', 'wirenboard', 'dresden_elektronik', 'frostdale', 'sinope', 'zen', 'icasa',
  'gira', 'kmp', 'aqara', 'atlantics', 'yandex', 'gmc', 'owon', 'easydom', 'niko',
  'salus_controls', 'silabs', 'hzc', 'moen', 'ubisys', 'danfoss', 'sigma_automation',
  'linkind', 'nodon', 'namron', 'saswell', 'viessmann', 'hornbach', 'eaton', 'shelly',
  'lixee', 'sengled', 'danalock', 'govee', 'elko', 'jethome', 'icasa', 'robb',
  'insta', 'livolo', 'icasa', 'sunricher', 'dresden_elektronik', 'innr', 'iluminize'];

function ghApi(path) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}&per_page=100`;
    https.get(url, { headers: { 'User-Agent': 'mavis-ci' }}, (res) => {
      if (res.statusCode !== 200) {
        return resolve({ status: res.statusCode, data: null });
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: 200, data: JSON.parse(data) }); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function downloadFile(rawUrl) {
  return new Promise((resolve, reject) => {
    https.get(rawUrl, { headers: { 'User-Agent': 'mavis-ci' }}, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Parse a Python quirk file to extract (manufacturer, model) from signature blocks.
 */
function extractPairs(content) {
  const pairs = [];
  // Find all signature blocks: signature = { ... }
  // Each contains "manufacturer": "_TZE200_xxx" and "model": "TS0601"
  const sigRegex = /signature\s*=\s*\{[\s\S]*?\}/g;
  const manRegex = /["']manufacturer["']\s*:\s*["']([^"']+)["']/;
  const modelRegex = /["']model["']\s*:\s*["']([^"']+)["']/;

  let m;
  while ((m = sigRegex.exec(content)) !== null) {
    const block = m[0];
    const manMatch = manRegex.exec(block);
    const modelMatch = modelRegex.exec(block);
    if (manMatch && modelMatch) {
      pairs.push({ manufacturer: manMatch[1], model: modelMatch[1] });
    }
  }

  // Also try replace_signature (for replacement quirks)
  const repRegex = /replace_signature\s*=\s*\{[\s\S]*?\}/g;
  while ((m = repRegex.exec(content)) !== null) {
    const block = m[0];
    const manMatch = manRegex.exec(block);
    const modelMatch = modelRegex.exec(block);
    if (manMatch && modelMatch) {
      pairs.push({ manufacturer: manMatch[1], model: modelMatch[1] });
    }
  }

  return pairs;
}

async function main() {
  console.log('Fetching ZHA quirks from', FOLDERS.length, 'folders...');
  const allPairs = [];
  const seen = new Set();
  let fileCount = 0;

  for (const folder of FOLDERS) {
    process.stdout.write(`[${folder}] `);
    const { status, data } = await ghApi(`zhaquirks/${folder}`);
    if (status !== 200 || !data) {
      console.log('skip');
      continue;
    }
    if (!Array.isArray(data)) {
      console.log('not array');
      continue;
    }
    const pyFiles = data.filter(f => f.name.endsWith('.py') && f.download_url);
    console.log(pyFiles.length, 'files');

    for (const file of pyFiles) {
      const content = await downloadFile(file.download_url);
      if (content) {
        const pairs = extractPairs(content);
        for (const p of pairs) {
          const key = `${p.manufacturer}|${p.model}`;
          if (!seen.has(key)) {
            seen.add(key);
            allPairs.push(p);
          }
        }
        fileCount++;
      }
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(allPairs, null, 2));
  console.log(`\nTotal: ${allPairs.length} unique (manufacturer, model) pairs from ${fileCount} files`);
  console.log(`Output: ${OUT_FILE}`);

  // Sample
  console.log('\nSample:');
  console.log(JSON.stringify(allPairs.slice(0, 5), null, 2));
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
