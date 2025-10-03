#!/usr/bin/env node
/*
 * deep_web_scraper_mini.js
 * --------------------------------------------------------------
 * Lightweight deep web scraper that fetches a few key Zigbee sources
 * (Zigbee2MQTT, Blakadder) and aggregates Tuya-like manufacturers and
 * product IDs for later enrichment. Safe and time-bounded.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(ROOT, 'ultimate_system', 'data_sources');
const OUT_FILE = path.join(OUT_DIR, 'web_data_mini.json');

const SOURCES = [
  // Zigbee2MQTT supported devices (site index)
  'https://www.zigbee2mqtt.io/supported-devices/',
  // Blakadder all devices list
  'https://zigbee.blakadder.com/all.html'
];

function fetchUrl(url, timeout = 15000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function extractManufacturers(html) {
  if (!html) return [];
  const regex = /_(?:TZ\d{3,4}|TZE\d{3}|TZ3040|TZ3500|TZ3600)_[A-Za-z0-9_\-]+/g;
  const set = new Set();
  let m;
  while ((m = regex.exec(html)) !== null) set.add(m[0]);
  return Array.from(set);
}

function extractProductIds(html) {
  if (!html) return [];
  const regex = /TS\d{3,4}[A-Z]?/g;
  const set = new Set();
  let m;
  while ((m = regex.exec(html)) !== null) set.add(m[0].toUpperCase());
  return Array.from(set);
}

async function main() {
  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const manufacturers = new Set();
    const productIds = new Set();
    const sources = [];

    for (const url of SOURCES) {
      const html = await fetchUrl(url);
      if (html) {
        extractManufacturers(html).forEach((v) => manufacturers.add(v));
        extractProductIds(html).forEach((v) => productIds.add(v));
        sources.push(url);
      }
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      type: 'web_aggregate_mini',
      sources,
      manufacturers: Array.from(manufacturers).sort(),
      productIds: Array.from(productIds).sort(),
    };
    fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`✅ deep_web_scraper_mini: ${payload.manufacturers.length} manufacturers, ${payload.productIds.length} productIds → ${path.relative(ROOT, OUT_FILE)}`);
  } catch (e) {
    console.error('❌ deep_web_scraper_mini failed:', e.message);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { main };
