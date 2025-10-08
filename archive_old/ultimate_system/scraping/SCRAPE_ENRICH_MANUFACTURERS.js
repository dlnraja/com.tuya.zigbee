const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🕸️ SCRAPE_ENRICH_MANUFACTURERS - Scraping forums & refs to enrich drivers');

const projectRoot = path.resolve(__dirname, '..', '..');
const driversDir = path.join(projectRoot, 'drivers');

// Sources to query per Zigbee ID
const zigbee2mqttUrl = (id) => `https://www.zigbee2mqtt.io/devices/${id}.html`;
const blakadderUrl = (id) => `https://zigbee.blakadder.com/Tuya_${id}.html`;
// deCONZ/Phoscon searches for broader community evidence
function deconzSearchUrls(id) {
  const q = encodeURIComponent(id);
  return [
    `https://forum.phoscon.de/search?q=${q}`,
    `https://github.com/dresden-elektronik/deconz-rest-plugin/issues?q=${q}`
  ];
}

// Forum-focused extra pages per ID (hand-picked high-signal threads)
const extraPages = {
  TS0001: [
    'https://community.home-assistant.io/search?q=TS0001%20_TZ3000',
    'https://community.openhab.org/search?q=TS0001%20TZ3000'
  ],
  TS0002: [
    'https://community.home-assistant.io/search?q=TS0002%20_TZ3000',
    'https://community.openhab.org/search?q=TS0002%20TZ3000'
  ],
  TS0003: [
    'https://community.home-assistant.io/search?q=TS0003%20_TZ3000',
    'https://community.openhab.org/search?q=TS0003%20TZ3000'
  ],
  TS0004: [
    'https://forum.phoscon.de/t/zigbee-4-channel-smart-relay-switch-tz3000-wkr3jqmr-only-switching-first-relay/3934',
    'https://community.home-assistant.io/search?q=TS0004%20_TZ3000',
    'https://community.openhab.org/search?q=TS0004%20TZ3000'
  ],
  TS0011: [
    'https://community.home-assistant.io/search?q=TS0011%20_TZ3000'
  ],
  TS0012: [
    'https://community.home-assistant.io/search?q=TS0012%20_TZ3000'
  ],
  TS0013: [
    'https://community.home-assistant.io/search?q=TS0013%20_TZ3000'
  ],
  TS0014: [
    'https://zigbee.blakadder.com/Tuya_TS0014.html',
    'https://community.home-assistant.io/search?q=TS0014%20_TZ3000',
    'https://community.openhab.org/search?q=TS0014%20TZ3000'
  ]
};

// Mapping gang -> suggested product IDs (TS000x neutral, TS001x no-neutral)
const gangProductMap = {
  1: ['TS0001', 'TS0011'],
  2: ['TS0002', 'TS0012'],
  3: ['TS0003', 'TS0013'],
  4: ['TS0004', 'TS0014'],
  5: ['TS0005'],
  6: ['TS0006']
};

// Fetch helper with timeout
function fetchUrl(url, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk.toString('utf8')));
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Polite delay to avoid hammering forums
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Extract manufacturer codes (forum-friendly, includes hyphens/underscores)
function extractManufacturers(html) {
  if (!html) return [];
  // Broader Tuya/OEM prefixes commonly seen
  const regex = /_(?:TZ\d{3,4}|TZE\d{3}|TYZB01|TYZB02|TYZC01|TYST11|TZ3040)_[A-Za-z0-9]+/g;
  const set = new Set();
  let m;
  while ((m = regex.exec(html)) !== null) {
    set.add(m[0]);
  }
  return Array.from(set);
}

// Ensure endpoints per gang with basic clusters
function ensureEndpoints(data, gangCount, hasDim) {
  data.zigbee = data.zigbee || {};
  data.zigbee.endpoints = data.zigbee.endpoints || {};
  // Add Identify cluster (3) and common groups/scenes/onoff and level for dimmers
  const clusters = [0, 3, 4, 5, 6].concat(hasDim ? [8] : []);
  const bindings = [6].concat(hasDim ? [8] : []);
  for (let ep = 1; ep <= gangCount; ep++) {
    data.zigbee.endpoints[String(ep)] = {
      clusters: clusters.slice(),
      bindings: bindings.slice()
    };
  }
}

// Ensure productId list includes suggested IDs
function ensureProductIds(data, gangCount) {
  data.zigbee = data.zigbee || {};
  const list = (data.zigbee.productId || []).slice();
  const suggest = gangProductMap[gangCount] || [];
  const merged = Array.from(new Set([...list, ...suggest]));
  data.zigbee.productId = merged;
}

// Merge manufacturerName list
function mergeManufacturerNames(data, names) {
  if (!names || names.length === 0) return;
  data.zigbee = data.zigbee || {};
  const list = (data.zigbee.manufacturerName || []).slice();
  const merged = Array.from(new Set([...list, ...names]));
  data.zigbee.manufacturerName = merged;
}

// Main
(async () => {
  const driverDirs = fs.readdirSync(driversDir).filter((d) => d.startsWith('wall_switch_'));
  console.log(`📦 Found ${driverDirs.length} wall_switch drivers`);

  let updated = 0;
  for (const d of driverDirs) {
    const composePath = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const json = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const caps = json.capabilities || [];
      const hasDim = caps.includes('dim');
      const gangMatch = d.match(/wall_switch_(\d)gang/i);
      const gangCount = gangMatch ? parseInt(gangMatch[1], 10) : 1;

      // Collect candidate IDs to query
      const candidates = new Set();
      const currentIds = (json.zigbee && json.zigbee.productId) || [];
      currentIds.forEach((id) => candidates.add(String(id)));
      const suggest = gangProductMap[gangCount] || [];
      suggest.forEach((id) => candidates.add(id));

      // Fetch pages for each candidate
      const foundNames = new Set();
      for (const id of candidates) {
        const pages = [
          zigbee2mqttUrl(id),
          blakadderUrl(id),
          ...deconzSearchUrls(id),
          `https://github.com/Koenkk/zigbee2mqtt/issues?q=${encodeURIComponent(id)}`,
          `https://github.com/Koenkk/zigbee2mqtt/discussions?discussions_q=${encodeURIComponent(id)}`,
          `https://github.com/zigpy/zha-device-handlers/search?q=${encodeURIComponent(id)}`,
          `https://github.com/home-assistant/core/issues?q=${encodeURIComponent(id + ' zigbee')}`
        ].concat(extraPages[id] || []);
        for (let idx = 0; idx < pages.length; idx++) {
          const url = pages[idx];
          const html = await fetchUrl(url);
          const names = extractManufacturers(html);
          names.forEach((n) => foundNames.add(n));
          // polite delay between pages to accommodate forums
          await delay(400);
        }
      }

      // Apply enrichments
      ensureEndpoints(json, gangCount, hasDim);
      ensureProductIds(json, gangCount);
      mergeManufacturerNames(json, Array.from(foundNames));

      fs.writeFileSync(composePath, JSON.stringify(json, null, 2));
      updated++;
      console.log(`✅ Enriched ${d}: +manufacturers=${foundNames.size}, gang=${gangCount}`);
    } catch (e) {
      console.log(`⚠️ ${d} skipped (${e.message})`);
    }
  }

  console.log(`\n🎉 ENRICHMENT COMPLETE: ${updated} drivers updated`);
})();
