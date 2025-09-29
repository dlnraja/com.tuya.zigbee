const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🔍 COMPARE_ENRICH_ALL_DRIVERS - Compare with internet lists and enrich');

const projectRoot = path.resolve(__dirname, '..', '..');
const driversDir = path.join(projectRoot, 'drivers');

// URL builders
const zigbee2mqttUrl = (id) => `https://www.zigbee2mqtt.io/devices/${id}.html`;
const blakadderUrl = (id) => `https://zigbee.blakadder.com/Tuya_${id}.html`;

// Forum searches (broad queries - we fetch landing HTML and mine codes)
function forumSearchUrls(id) {
  return [
    `https://community.home-assistant.io/search?q=${encodeURIComponent(id + ' _TZ3000')}`,
    `https://community.openhab.org/search?q=${encodeURIComponent(id + ' TZ3000')}`,
    `https://github.com/search?q=${encodeURIComponent(id + ' _TZ3000')}`,
    // deCONZ/Phoscon community and issue tracker
    `https://forum.phoscon.de/search?q=${encodeURIComponent(id)}`,
    `https://github.com/dresden-elektronik/deconz-rest-plugin/issues?q=${encodeURIComponent(id)}`,
    // Z2M and ZHA issue trackers for more manufacturer evidence
    `https://github.com/Koenkk/zigbee2mqtt/issues?q=${encodeURIComponent(id)}`,
    `https://github.com/Koenkk/zigbee2mqtt/discussions?discussions_q=${encodeURIComponent(id)}`,
    `https://github.com/zigpy/zha-device-handlers/search?q=${encodeURIComponent(id)}`,
    `https://github.com/home-assistant/core/issues?q=${encodeURIComponent(id + ' zigbee')}`,
    // Johan Bendz upstream app repo + forks
    `https://github.com/johan-bendz/com.tuya.zigbee/issues?q=${encodeURIComponent(id)}`,
    `https://github.com/johan-bendz/com.tuya.zigbee/pulls?q=${encodeURIComponent(id)}`,
    `https://github.com/search?q=${encodeURIComponent(id + ' repo:johan-bendz/com.tuya.zigbee')}`,
    `https://github.com/search?q=${encodeURIComponent(id + ' com.tuya.zigbee fork:true')}`
  ];
}

// Heuristics: infer candidate product IDs by folder/class patterns
const folderHeuristics = [
  { test: /wall_switch_(\d)gang/i, map: (m) => {
      const n = parseInt(m[1], 10);
      const base = [`TS000${Math.min(n, 6)}`];
      if (n >= 1 && n <= 4) base.push(`TS001${n}`);
      return base; }
  },
  { test: /smart_plug|plug|socket/i, ids: ['TS011F'] },
  { test: /curtain|window|cover/i, ids: ['TS130F'] },
  { test: /contact|door|window_sensor/i, ids: ['TS0203'] },
  { test: /motion|pir/i, ids: ['TS0202'] },
  // Dimmer families commonly seen in Tuya ecosystem
  { test: /dimmer|dimmer_switch|touch_dimmer/i, ids: ['TS110E','TS110F','TS0601'] },
  { test: /temp|climate|humidity|thermo/i, ids: ['TS0201','TS0601'] }
];

function inferCandidatesFromFolder(folder, json) {
  const ids = new Set();
  (json?.zigbee?.productId || []).forEach(v => typeof v === 'string' && ids.add(v));
  for (const rule of folderHeuristics) {
    const m = folder.match(rule.test);
    if (m) {
      const add = rule.map ? rule.map(m) : rule.ids;
      add.forEach(x => ids.add(x));
    }
  }
  return Array.from(ids);
}

function fetchUrl(url, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      let data = '';
      res.on('data', c => data += c.toString('utf8'));
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve(null); });
  });
}
const delay = (ms) => new Promise(r => setTimeout(r, ms));

function extractManufacturers(html) {
  if (!html) return [];
  // Broader Tuya/OEM prefixes commonly seen in the wild
  // Examples: _TZ3000_xxx, _TZ3210_xxx, _TZ3400_xxx, _TZE200_xxx, _TZE204_xxx, _TZE284_xxx, _TYZB01_xxx, _TYZB02_xxx, _TYZC01_xxx, _TYST11_xxx, _TZ3040_xxx
  const regex = /_(?:TZ\d{3,4}|TZE\d{3}|TYZB01|TYZB02|TYZC01|TYST11|TZ3040)_[A-Za-z0-9]+/g;
  const set = new Set();
  let m; while ((m = regex.exec(html)) !== null) set.add(m[0]);
  return Array.from(set);
}

function ensureMultiGangEndpoints(folder, json) {
  const m = folder.match(/wall_switch_(\d)gang/i);
  if (!m) return;
  const n = parseInt(m[1], 10);
  const hasDim = (json.capabilities || []).includes('dim');
  json.zigbee = json.zigbee || {};
  json.zigbee.endpoints = json.zigbee.endpoints || {};
  // Add Identify cluster (3) along with Groups (4), Scenes (5), On/Off (6), and Level (8) for dimmers
  const clusters = [0,3,4,5,6].concat(hasDim ? [8] : []);
  const bindings = [6].concat(hasDim ? [8] : []);
  for (let ep = 1; ep <= n; ep++) {
    json.zigbee.endpoints[String(ep)] = { clusters, bindings };
  }
}

function mergeArrayUnique(arr, add) {
  const set = new Set([...(arr || []), ...add]);
  return Array.from(set);
}

(async () => {
  const dirs = fs.readdirSync(driversDir).filter(d => fs.existsSync(path.join(driversDir, d, 'driver.compose.json')));
  console.log(`📦 Drivers found: ${dirs.length}`);

  let updated = 0;
  for (const d of dirs) {
    const compose = path.join(driversDir, d, 'driver.compose.json');
    let json;
    try { json = JSON.parse(fs.readFileSync(compose, 'utf8')); } catch { continue; }

    // Build candidate product IDs
    const candidates = inferCandidatesFromFolder(d, json);
    if (candidates.length === 0) continue;

    // Fetch pages and extract manufacturers
    const foundNames = new Set();
    for (const id of candidates) {
      const pages = [zigbee2mqttUrl(id), blakadderUrl(id), ...forumSearchUrls(id)];
      for (const url of pages) {
        const html = await fetchUrl(url);
        extractManufacturers(html).forEach(x => foundNames.add(x));
        await delay(300);
      }
    }

    // Merge into JSON
    json.zigbee = json.zigbee || {};
    json.zigbee.productId = mergeArrayUnique(json.zigbee.productId || [], candidates);
    if (foundNames.size > 0) json.zigbee.manufacturerName = mergeArrayUnique(json.zigbee.manufacturerName || [], Array.from(foundNames));

    // Ensure multi-gang endpoints for wall_switch_* only
    ensureMultiGangEndpoints(d, json);

    fs.writeFileSync(compose, JSON.stringify(json, null, 2));
    updated++;
    console.log(`✅ ${d}: +productId=${candidates.length}, +mfg=${foundNames.size}`);
  }

  console.log(`\n🎉 COMPARE+ENRICH COMPLETE: ${updated} drivers updated`);
})();
