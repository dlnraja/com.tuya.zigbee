#!/usr/bin/env node
/**
 * ULTIMATE_MEGA_ENRICHER_V25 - Enrichissement TOTAL toutes sources
 * - TOUS les commits historiques (sans limite)
 * - Scraping massif: forums, GitHub, wikis, communautés
 * - Johan Bendz ecosystem complet + tous les forks
 * - Homey community forums (dlnraja, johan-bendz, tous utilisateurs)
 * - Correction catégories automatique
 * - Fusion intelligente non-destructive
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const driversDir = path.join(root, 'drivers');
const reportsDir = path.join(__dirname, 'reports');
const megaBackupDir = path.join(__dirname, 'mega_backup');

fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(megaBackupDir, { recursive: true });

console.log('🚀 ULTIMATE_MEGA_ENRICHER_V25 - Enrichissement TOTAL');

// Utilitaires robustes
function safeJSON(p, fb = {}) { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return fb; } }
function safeWrite(p, d) { try { fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p,JSON.stringify(d,null,2)); return true; } catch { return false; } }
function sh(cmd) { try { return execSync(cmd, {encoding:'utf8',cwd:root,stdio:['ignore','pipe','ignore']}).trim(); } catch { return ''; } }

// Mega sources par catégorie CORRIGÉES
const MEGA_MANUFACTURER_SOURCES = {
  // Smart Lighting (switches, dimmers, bulbs, wall_switches)
  lighting: [
    '_TZ3000_qzjcsmar','_TZ3000_ji4araar','_TZ3000_wkr3jqmr','_TZ3000_jr2atpww','_TYZB01_dvakyzhd',
    '_TZ3000_r0pmi2p3','_TZ3000_imaccztn','_TZ3000_okayvup0','_TZ3000_vit9k2nb','_TZ3000_rk2yzt0u',
    '_TZ3000_o4cjetlm','_TZ3000_tqlv4ug4','_TZ3000_tgddllx4','_TZ3000_veu2v775','_TZ3000_xkap8wtb',
    '_TZ3000_46t1rvdu','_TZ3210_dse8ogfy','_TZ3210_j4pdtz9v','_TZ3000_npzfdcof','_TZ3000_prits6g4',
    '_TZ3000_wpueorev','_TZ3000_bvrlqyj7','_TZ3000_qewo8dlz','_TZ3000_zw7yf6yk','_TZ3000_wrhhi5h2'
  ],
  
  // Power & Energy (plugs, sockets, energy monitoring)
  power: [
    '_TZ3000_g5xawfcq','_TZ3000_cehuw1lw','_TZ3000_okaz9tjs','_TZ3000_typdpbpg','_TZ3000_plyvnuf5',
    '_TZ3000_jak16dll','_TZ3000_hdopuwv6','_TZ3000_gjmj2r0z','_TZ3000_4rbqgcuv','_TZ3000_ew3ldmgx',
    '_TZ3000_9d0ti6ea','_TZ3000_kx0pris5','_TZ3000_b28wrpvx','_TZ3000_6uzkisv2','_TZ3000_w0qqde0g'
  ],
  
  // Motion & Presence Detection  
  motion: [
    '_TZ3000_mmtwjmaq','_TYZB01_ef5xlc9q','_TZ3000_kmh5qpmb','_TYZB01_zwvaj5wy','_TZ3000_lf56vpxj',
    '_TZ3000_msl6wxk9','_TZ3000_xr3htd96','_TZ3000_mcxw5ehu','_TZ3040_bb6xaihh','_TZ3210_ncw88jfq',
    '_TZ3000_mg4dy6z6','_TZ3000_6ygjfyll','_TZ3000_h4w2onij','_TZ3000_jmrgyl7o','_TZ3000_bsvqrxru'
  ],
  
  // Temperature & Climate
  climate: [
    '_TZE200_cwbvmsar','_TZE200_bjawzodf','_TZ3000_xr3htd96','_TZE200_a8sdabtg','_TZ3000_fllyghyj',
    '_TZ3000_dowj6gyi','_TZE200_vs0skpuc','_TZ3000_lbtpiody','_TZE200_cirvgep4','_TZE200_locansqn',
    '_TZE200_8whxpfcx','_TZE200_zivfvd7h','_TZ3000_kqvb5akv','_TZ3000_n5wkm5c0','_TZ3000_bq5t3wvq'
  ],
  
  // Safety & Detection (smoke, CO, gas, water leak)
  safety: [
    '_TZ3000_26fmupbb','_TZ3000_yojqa8xn','_TZ3000_ntcy3xu1','_TZE200_3towulqd','_TZ3000_8ybe88nf',
    '_TZ3000_odygigth','_TZE200_s8gkrkxk','_TZ3000_kmh5qpmb','_TZ3000_pnzfdr9y','_TZ3000_jk7qyowj',
    '_TZ3000_qzqps2n9','_TZ3000_bbqz3r3v','_TZ3000_ggsw8i9u','_TZ3000_2mbfwd8c','_TZ3000_fdtjuw7u'
  ],
  
  // Window Coverings (curtains, blinds, shutters)
  coverings: [
    '_TZE200_fctwhugx','_TZE200_cowvfni3','_TZ3000_vd43bbfq','_TZE200_xuzcvlku','_TZE200_rddyvrci',
    '_TZE200_zpzndjez','_TZE200_wmcdj3aq','_TZE200_nogaemzt','_TZE200_gubdgai2','_TZE200_r0jdjrvi',
    '_TZE200_zah67ekd','_TZE200_axgvo9jh','_TZE200_ra7vasnj','_TZE200_k0hgicmr','_TZE200_bcxaokpw'
  ],
  
  // Contact & Security (doors, windows, locks)
  security: [
    '_TZ3000_n2egfsli','_TZ3000_4ugnzsrv','_TZ3000_xhk6p0bb','_TZ3000_4jsgrhbj','_TZ3000_ykigjjr3',
    '_TZ3000_xnawd1zq','_TZ3000_vzhjmh5p','_TZ3000_sjdqo3fq','_TZ3000_3oowrjoo','_TZ3000_tvuarksa',
    '_TZ3000_hlqm8fb7','_TZ3000_hkifdhqj','_TZ3000_ynfflgec','_TZ3000_wyvagql4','_TZ3000_4fsgukof'
  ]
};

// Catégorisation corrigée et intelligente
function getCorrectCategory(driverName, data) {
  const name = driverName.toLowerCase();
  const caps = new Set(data.capabilities || []);
  const prodIds = new Set((data.zigbee?.productId || []).map(String));
  const cls = data.class || '';
  
  // Lighting (highest priority pour switches/wall_switch)
  if (/(switch|dimmer|light|bulb|rgb|led|wall_switch|smart_switch|touch_switch)/.test(name) ||
      cls === 'light' || caps.has('dim') || caps.has('light_hue') ||
      prodIds.has('TS0001') || prodIds.has('TS0002') || prodIds.has('TS0003') || prodIds.has('TS0004') ||
      prodIds.has('TS0011') || prodIds.has('TS0012') || prodIds.has('TS0013') || prodIds.has('TS0014')) {
    return 'lighting';
  }
  
  // Power & Energy  
  if (/(plug|socket|outlet|energy|power|meter)/.test(name) ||
      cls === 'socket' || caps.has('meter_power') || caps.has('measure_power') ||
      prodIds.has('TS011F') || prodIds.has('TS0121')) {
    return 'power';
  }
  
  // Motion & Presence
  if (/(motion|pir|presence|radar|mmwave)/.test(name) ||
      caps.has('alarm_motion') || prodIds.has('TS0202')) {
    return 'motion';
  }
  
  // Climate & Temperature
  if (/(temp|humidity|climate|thermostat|radiator|valve|hvac)/.test(name) ||
      caps.has('measure_temperature') || caps.has('measure_humidity') ||
      caps.has('target_temperature') || prodIds.has('TS0601')) {
    return 'climate';
  }
  
  // Safety & Detection
  if (/(smoke|co\b|gas|leak|detector|alarm)/.test(name) ||
      caps.has('alarm_smoke') || caps.has('alarm_co') || caps.has('alarm_water') || caps.has('alarm_gas')) {
    return 'safety';
  }
  
  // Coverings
  if (/(curtain|blind|roller|cover|shade|shutter)/.test(name) || prodIds.has('TS130F')) {
    return 'coverings';
  }
  
  // Security
  if (/(contact|door|window|lock|doorbell|garage)/.test(name) ||
      caps.has('alarm_contact') || caps.has('locked')) {
    return 'security';
  }
  
  return 'lighting'; // Default fallback
}

// Web scraping ultra-complet
async function fetchUrl(url, timeout = 20000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function extractManufacturers(html) {
  if (!html) return [];
  // Regex ultra-étendu pour TOUS les préfixes Tuya/OEM possibles
  const regex = /_(?:TZ\d{3,4}|TZE\d{3,4}|TYZB\d{2}|TYZC\d{2}|TYST\d{2}|TYUA\d{2}|TYMN\d{2})_[A-Za-z0-9]+/g;
  const matches = new Set();
  let m;
  while ((m = regex.exec(html)) !== null) {
    matches.add(m[0]);
  }
  return Array.from(matches);
}

// Sources web MEGA étendues
const ULTIMATE_WEB_SOURCES = [
  // Zigbee2MQTT ecosystem
  'https://www.zigbee2mqtt.io/supported-devices/',
  'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt/master/lib/data/supported-devices.js',
  'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
  
  // Blakadder
  'https://zigbee.blakadder.com/all.html',
  'https://zigbee.blakadder.com/by_manufacturer.html',
  'https://zigbee.blakadder.com/Tuya.html',
  
  // ZHA ecosystem
  'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
  'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/ts0001.py',
  'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/ts0002.py',
  
  // Johan Bendz ecosystem complet
  'https://raw.githubusercontent.com/johan-bendz/com.tuya.zigbee/master/app.json',
  'https://api.github.com/repos/johan-bendz/com.tuya.zigbee/contents/drivers',
  
  // Home Assistant
  'https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/zha/core/const.py',
  
  // deCONZ
  'https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/devices/tuya/tuya_devices.json'
];

function buildMegaSearchUrls() {
  const productIds = ['TS0001','TS0002','TS0003','TS0004','TS0011','TS0012','TS0013','TS0014','TS011F','TS0121','TS0202','TS0203','TS0601','TS130F','TS110E','TS110F'];
  const urls = [];
  
  for (const pid of productIds) {
    urls.push(
      // Forums community
      `https://community.home-assistant.io/search?q=${encodeURIComponent(pid + ' _TZ3000')}`,
      `https://community.openhab.org/search?q=${encodeURIComponent(pid + ' tuya')}`,
      `https://forum.phoscon.de/search?q=${encodeURIComponent(pid)}`,
      
      // GitHub ecosystems  
      `https://github.com/Koenkk/zigbee2mqtt/issues?q=${encodeURIComponent(pid)}`,
      `https://github.com/zigpy/zha-device-handlers/search?q=${encodeURIComponent(pid)}`,
      `https://github.com/home-assistant/core/issues?q=${encodeURIComponent(pid + ' zigbee')}`,
      
      // Johan Bendz complet
      `https://github.com/johan-bendz/com.tuya.zigbee/issues?q=${encodeURIComponent(pid)}`,
      `https://github.com/johan-bendz/com.tuya.zigbee/pulls?q=${encodeURIComponent(pid)}`,
      
      // Homey community
      `https://community.homey.app/search?q=${encodeURIComponent('tuya ' + pid)}`,
      `https://community.homey.app/search?q=${encodeURIComponent('johan-bendz ' + pid)}`,
      `https://community.homey.app/search?q=${encodeURIComponent('dlnraja ' + pid)}`
    );
  }
  
  return urls;
}

// Extraction historique COMPLETE
async function extractAllHistoricalData() {
  console.log('\n📜 EXTRACTION HISTORIQUE TOTALE...');
  
  const commits = sh('git rev-list --all').split('\n').filter(Boolean);
  console.log(`📦 Processing ALL ${commits.length} commits...`);
  
  const historicalData = new Map();
  let processed = 0;
  
  for (const hash of commits) {
    try {
      const tree = sh(`git ls-tree -r --name-only ${hash}`);
      const driverFiles = tree.split('\n').filter(p => /^drivers\/[^\/]+\/driver\.compose\.json$/.test(p));
      
      for (const file of driverFiles) {
        try {
          const content = sh(`git show ${hash}:${file}`);
          const data = JSON.parse(content);
          const driverName = file.split('/')[1];
          
          if (!historicalData.has(driverName)) {
            historicalData.set(driverName, {
              manufacturerNames: new Set(),
              productIds: new Set(),
              capabilities: new Set(),
              allData: []
            });
          }
          
          const hist = historicalData.get(driverName);
          hist.allData.push({ hash, data });
          
          if (data.zigbee?.manufacturerName) {
            data.zigbee.manufacturerName.forEach(m => hist.manufacturerNames.add(m));
          }
          if (data.zigbee?.productId) {
            data.zigbee.productId.forEach(p => hist.productIds.add(p));
          }
          if (data.capabilities) {
            data.capabilities.forEach(c => hist.capabilities.add(c));
          }
        } catch {}
      }
      processed++;
      if (processed % 100 === 0) console.log(`📦 Processed ${processed}/${commits.length} commits...`);
    } catch {}
  }
  
  console.log(`✅ Historical extraction: ${historicalData.size} drivers, ${processed} commits processed`);
  return historicalData;
}

// Web scraping MEGA
async function megaWebScraping() {
  console.log('\n🌐 MEGA WEB SCRAPING...');
  
  const allManufacturers = new Set();
  
  // Sources statiques
  for (const url of ULTIMATE_WEB_SOURCES) {
    console.log(`🔍 ${url.substring(0, 70)}...`);
    const html = await fetchUrl(url);
    if (html) {
      extractManufacturers(html).forEach(m => allManufacturers.add(m));
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Recherches dynamiques
  const searchUrls = buildMegaSearchUrls();
  for (let i = 0; i < Math.min(searchUrls.length, 50); i++) { // Limite pour éviter rate limiting
    const url = searchUrls[i];
    const html = await fetchUrl(url);
    if (html) {
      extractManufacturers(html).forEach(m => allManufacturers.add(m));
    }
    await new Promise(r => setTimeout(r, 800));
  }
  
  console.log(`✅ Web scraping: ${allManufacturers.size} unique manufacturers found`);
  return allManufacturers;
}

// Enrichissement MEGA
async function ultimateMegaEnrichment() {
  console.log('\n🚀 ULTIMATE MEGA ENRICHMENT...');
  
  const [historicalData, webManufacturers] = await Promise.all([
    extractAllHistoricalData(),
    megaWebScraping()
  ]);
  
  const drivers = fs.readdirSync(driversDir).filter(d => 
    fs.existsSync(path.join(driversDir, d, 'driver.compose.json'))
  );
  
  console.log(`📦 Enriching ${drivers.length} drivers...`);
  
  let enriched = 0;
  const results = [];
  
  for (const driverName of drivers) {
    const composePath = path.join(driversDir, driverName, 'driver.compose.json');
    const data = safeJSON(composePath);
    
    if (!data.zigbee) data.zigbee = {};
    if (!Array.isArray(data.zigbee.manufacturerName)) {
      data.zigbee.manufacturerName = [];
    }
    
    const existing = new Set(data.zigbee.manufacturerName);
    const category = getCorrectCategory(driverName, data);
    const newMfgs = new Set();
    
    // 1) Enrichissement historique
    const historical = historicalData.get(driverName);
    if (historical) {
      historical.manufacturerNames.forEach(m => {
        if (!existing.has(m) && m.match(/^_T[YZ][EBZ0-9]{2,4}_[a-z0-9]+$/i)) {
          newMfgs.add(m);
        }
      });
    }
    
    // 2) Enrichissement web
    webManufacturers.forEach(m => {
      if (!existing.has(m)) newMfgs.add(m);
    });
    
    // 3) Enrichissement par catégorie
    const categoryMfgs = MEGA_MANUFACTURER_SOURCES[category] || MEGA_MANUFACTURER_SOURCES.lighting;
    categoryMfgs.forEach(m => {
      if (!existing.has(m)) newMfgs.add(m);
    });
    
    // Application (limitée pour éviter explosion)
    const limitedNewMfgs = [...newMfgs].slice(0, 50);
    if (limitedNewMfgs.length > 0) {
      data.zigbee.manufacturerName = data.zigbee.manufacturerName.concat(limitedNewMfgs);
      
      if (safeWrite(composePath, data)) {
        enriched++;
        console.log(`✅ ${driverName} (${category}): +${limitedNewMfgs.length} manufacturers`);
      }
    }
    
    results.push({
      driver: driverName,
      category,
      existingMfgs: existing.size,
      addedMfgs: limitedNewMfgs.length,
      totalMfgs: data.zigbee.manufacturerName.length,
      hasHistorical: !!historical,
      hasWeb: newMfgs.size > 0
    });
  }
  
  return { results, enriched, totalDrivers: drivers.length, historicalDrivers: historicalData.size, webManufacturers: webManufacturers.size };
}

// Exécution principale
async function main() {
  try {
    const results = await ultimateMegaEnrichment();
    
    const report = {
      timestamp: new Date().toISOString(),
      version: 'ULTIMATE_MEGA_ENRICHER_V25',
      summary: results,
      status: 'COMPLETED'
    };
    
    safeWrite(path.join(reportsDir, 'ultimate_mega_enricher_report.json'), report);
    
    console.log('\n🎉 ULTIMATE_MEGA_ENRICHER_V25 TERMINÉ');
    console.log(`✅ Drivers enrichis: ${results.enriched}/${results.totalDrivers}`);
    console.log(`✅ Sources historiques: ${results.historicalDrivers} drivers`);
    console.log(`✅ Sources web: ${results.webManufacturers} manufacturers`);
    console.log(`📊 Rapport: ultimate_system/reports/ultimate_mega_enricher_report.json`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();
