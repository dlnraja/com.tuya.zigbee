#!/usr/bin/env node
/*
 * forum_scraper_v2.js
 * --------------------------------------------------------------
 * Scrape multiple Homey Community Forum pages for Tuya/Zigbee
 * manufacturers (e.g. _TZ*, _TZE*) and product IDs (TS****),
 * then write a normalized dataset for Data_Enricher.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(ROOT, 'ultimate_system', 'data_sources');
const OUT_FILE = path.join(OUT_DIR, 'forum_data_v2.json');

const FORUM_URLS = [
  'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352',
  'https://community.homey.app/t/app-pro-tuya-zigbee-app/26439',
  // A few paginated pages to broaden coverage without being heavy
  'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352?page=2',
  'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352?page=5'
];

function fetchUrl(url, timeout = 15000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
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
  // Capture _TZxxxx_..., _TZExxx_..., etc.
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

    for (const url of FORUM_URLS) {
      const html = await fetchUrl(url);
      if (html) {
        extractManufacturers(html).forEach((v) => manufacturers.add(v));
        extractProductIds(html).forEach((v) => productIds.add(v));
        sources.push(url);
      }
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      type: 'homey_forum',
      sources,
      manufacturers: Array.from(manufacturers).sort(),
      productIds: Array.from(productIds).sort(),
    };
    fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`✅ forum_scraper_v2: ${payload.manufacturers.length} manufacturers, ${payload.productIds.length} productIds → ${path.relative(ROOT, OUT_FILE)}`);
  } catch (e) {
    console.error('❌ forum_scraper_v2 failed:', e.message);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { main };
