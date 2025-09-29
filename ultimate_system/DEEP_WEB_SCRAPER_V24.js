#!/usr/bin/env node
/**
 * DEEP_WEB_SCRAPER_V24 - Scraping profond toutes sources
 * - Z2M, Blakadder, HA forums, deCONZ, openHAB, GitHub issues
 * - Johan Bendz repo + forks, Homey community forums
 * - Recherche intelligente par productId et manufacturerName
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const driversDir = path.join(root, 'drivers');

console.log('🌐 DEEP_WEB_SCRAPER_V24 - Scraping profond');

function fetchUrl(url, timeout = 15000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractManufacturers(html) {
  if (!html) return [];
  // Regex ultra-étendu pour capturer tous les préfixes Tuya/OEM
  const regex = /_(?:TZ\d{3,4}|TZE\d{3}|TYZB\d{2}|TYZC\d{2}|TYST\d{2}|TZ3040|TZ3500|TZ3600)_[A-Za-z0-9]+/g;
  const matches = new Set();
  let m;
  while ((m = regex.exec(html)) !== null) {
    matches.add(m[0]);
  }
  return Array.from(matches);
}

function extractProductIds(html) {
  if (!html) return [];
  const regex = /TS\d{3,4}[A-Z]?/g;
  const matches = new Set();
  let m;
  while ((m = regex.exec(html)) !== null) {
    matches.add(m[0]);
  }
  return Array.from(matches);
}

// Sources web complètes
const WEB_SOURCES = [
  // Zigbee2MQTT
  'https://www.zigbee2mqtt.io/supported-devices/',
  'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt/master/lib/data/supported-devices.js',
  
  // Blakadder
  'https://zigbee.blakadder.com/all.html',
  'https://zigbee.blakadder.com/by_manufacturer.html',
  
  // GitHub repos clés
  'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
  'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
  
  // Johan Bendz repos
  'https://api.github.com/repos/johan-bendz/com.tuya.zigbee/contents/drivers',
  'https://raw.githubusercontent.com/johan-bendz/com.tuya.zigbee/master/app.json'
];

function buildSearchUrls(productId) {
  return [
    // Forums principaux
    `https://community.home-assistant.io/search?q=${encodeURIComponent(productId + ' _TZ3000')}`,
    `https://community.openhab.org/search?q=${encodeURIComponent(productId + ' tuya')}`,
    `https://forum.phoscon.de/search?q=${encodeURIComponent(productId)}`,
    
    // GitHub issues/PRs
    `https://github.com/Koenkk/zigbee2mqtt/issues?q=${encodeURIComponent(productId)}`,
    `https://github.com/Koenkk/zigbee2mqtt/discussions?discussions_q=${encodeURIComponent(productId)}`,
    `https://github.com/zigpy/zha-device-handlers/search?q=${encodeURIComponent(productId)}`,
    `https://github.com/home-assistant/core/issues?q=${encodeURIComponent(productId + ' zigbee')}`,
    `https://github.com/dresden-elektronik/deconz-rest-plugin/issues?q=${encodeURIComponent(productId)}`,
    
    // Johan Bendz ecosystem
    `https://github.com/johan-bendz/com.tuya.zigbee/issues?q=${encodeURIComponent(productId)}`,
    `https://github.com/johan-bendz/com.tuya.zigbee/pulls?q=${encodeURIComponent(productId)}`,
    `https://github.com/search?q=${encodeURIComponent(productId + ' repo:johan-bendz/com.tuya.zigbee')}`,
    `https://github.com/search?q=${encodeURIComponent(productId + ' com.tuya.zigbee fork:true')}`,
    
    // Homey community forums
    `https://community.homey.app/search?q=${encodeURIComponent(productId + ' tuya')}`,
    `https://community.homey.app/search?q=${encodeURIComponent('johan-bendz ' + productId)}`,
    `https://community.homey.app/search?q=${encodeURIComponent('dlnraja ' + productId)}`
  ];
}

async function scrapeAllSources() {
  console.log('📡 Scraping sources principales...');
  
  const allManufacturers = new Set();
  const allProductIds = new Set();
  
  // Scrape sources statiques
  for (const url of WEB_SOURCES) {
    console.log(`🔍 ${url.substring(0, 50)}...`);
    const html = await fetchUrl(url);
    if (html) {
      extractManufacturers(html).forEach(m => allManufacturers.add(m));
      extractProductIds(html).forEach(p => allProductIds.add(p));
    }
    await delay(1000); // Politesse
  }
  
  console.log(`✅ Sources statiques: ${allManufacturers.size} manufacturers, ${allProductIds.size} productIds`);
  return { allManufacturers, allProductIds };
}

async function deepScrapeByProduct() {
  console.log('\n📡 Scraping par productId...');
  
  // ProductIds communs à chercher
  const commonProducts = [
    'TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0011', 'TS0012', 'TS0013', 'TS0014',
    'TS011F', 'TS0121', 'TS0202', 'TS0203', 'TS0601', 'TS130F', 'TS110E', 'TS110F'
  ];
  
  const foundManufacturers = new Set();
  
  for (const productId of commonProducts) {
    console.log(`🔍 Recherche ${productId}...`);
    const urls = buildSearchUrls(productId);
    
    for (const url of urls.slice(0, 5)) { // Limiter pour éviter rate limiting
      const html = await fetchUrl(url);
      if (html) {
        extractManufacturers(html).forEach(m => foundManufacturers.add(m));
      }
      await delay(500);
    }
    
    if (foundManufacturers.size > 0) {
      console.log(`✅ ${productId}: ${foundManufacturers.size} manufacturers trouvés`);
    }
    await delay(2000); // Pause entre produits
  }
  
  return foundManufacturers;
}

function safeJSON(p) { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return {}; } }
function safeWrite(p,d) { try { fs.writeFileSync(p,JSON.stringify(d,null,2)); return true; } catch { return false; } }

async function enrichDriversFromWeb() {
  console.log('\n📦 Enrichissement des drivers...');
  
  // Scraping global
  const { allManufacturers } = await scrapeAllSources();
  const deepManufacturers = await deepScrapeByProduct();
  
  // Fusion des résultats
  const webManufacturers = new Set([...allManufacturers, ...deepManufacturers]);
  console.log(`🌐 Total web manufacturers: ${webManufacturers.size}`);
  
  // Application aux drivers
  const drivers = fs.readdirSync(driversDir).filter(d => 
    fs.existsSync(path.join(driversDir, d, 'driver.compose.json'))
  );
  
  let enriched = 0;
  
  for (const driverName of drivers) {
    const composePath = path.join(driversDir, driverName, 'driver.compose.json');
    const data = safeJSON(composePath);
    
    if (!data.zigbee) data.zigbee = {};
    if (!Array.isArray(data.zigbee.manufacturerName)) {
      data.zigbee.manufacturerName = [];
    }
    
    const existing = new Set(data.zigbee.manufacturerName);
    const productIds = new Set((data.zigbee.productId || []).map(String));
    const newMfgs = new Set();
    
    // Enrichissement intelligent basé sur productId
    for (const webMfg of webManufacturers) {
      if (!existing.has(webMfg)) {
        // Logique d'association intelligente
        const folder = driverName.toLowerCase();
        let relevant = false;
        
        // Association par type de device
        if (folder.includes('switch') || folder.includes('wall_switch')) {
          relevant = webMfg.includes('_TZ3000_') || webMfg.includes('_TYZB01_');
        } else if (folder.includes('plug') || folder.includes('socket')) {
          relevant = productIds.has('TS011F') || productIds.has('TS0121');
        } else if (folder.includes('motion') || folder.includes('pir')) {
          relevant = productIds.has('TS0202') || webMfg.includes('_TZ3000_');
        } else if (folder.includes('climate') || folder.includes('temp')) {
          relevant = productIds.has('TS0601') || webMfg.includes('_TZE200_');
        } else {
          relevant = webMfg.includes('_TZ3000_'); // Générique
        }
        
        if (relevant) {
          newMfgs.add(webMfg);
        }
      }
    }
    
    // Application
    if (newMfgs.size > 0) {
      data.zigbee.manufacturerName = data.zigbee.manufacturerName.concat([...newMfgs].slice(0, 10)); // Limite pour éviter l'explosion
      
      if (safeWrite(composePath, data)) {
        enriched++;
        console.log(`✅ ${driverName}: +${newMfgs.size} web manufacturers`);
      }
    }
  }
  
  return { enriched, totalDrivers: drivers.length, webManufacturers: webManufacturers.size };
}

// Exécution principale
async function main() {
  try {
    const results = await enrichDriversFromWeb();
    
    console.log('\n🎉 DEEP_WEB_SCRAPER_V24 TERMINÉ');
    console.log(`✅ Drivers enrichis: ${results.enriched}/${results.totalDrivers}`);
    console.log(`✅ Manufacturers web: ${results.webManufacturers}`);
    
    // Sauvegarde rapport
    const report = {
      timestamp: new Date().toISOString(),
      version: 'DEEP_WEB_SCRAPER_V24',
      results,
      status: 'COMPLETED'
    };
    
    const reportsDir = path.join(__dirname, 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    safeWrite(path.join(reportsDir, 'deep_web_scraper_report.json'), report);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();
