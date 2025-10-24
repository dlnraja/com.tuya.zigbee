#!/usr/bin/env node
/**
 * DOWNLOAD PRODUCT IMAGES
 * Télécharge de vraies images de produits depuis internet
 * basé sur les search terms intelligents
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Sources d'images de produits Zigbee
const IMAGE_SOURCES = [
  {
    name: 'Zigbee2MQTT',
    baseUrl: 'https://www.zigbee2mqtt.io/images/devices/',
    priority: 1
  },
  {
    name: 'Blakadder',
    baseUrl: 'https://templates.blakadder.com/assets/device_images/',
    priority: 2
  }
];

// Mapping produits -> images connues
const KNOWN_PRODUCT_IMAGES = {
  // SOS Buttons
  'TS0215A': 'https://www.zigbee2mqtt.io/images/devices/TS0215A.jpg',
  '_TZ3000_p6ju8myv': 'https://www.zigbee2mqtt.io/images/devices/TS0215A.jpg',
  
  // Smart Plugs
  'TS011F': 'https://www.zigbee2mqtt.io/images/devices/TS011F_plug_1.jpg',
  '_TZ3000_g5xawfcq': 'https://www.zigbee2mqtt.io/images/devices/TS011F_plug_1.jpg',
  
  // Wireless Buttons
  'TS0044': 'https://www.zigbee2mqtt.io/images/devices/TS0044.jpg',
  'TS0043': 'https://www.zigbee2mqtt.io/images/devices/TS0043.jpg',
  'TS0042': 'https://www.zigbee2mqtt.io/images/devices/TS0042.jpg',
  'TS0041': 'https://www.zigbee2mqtt.io/images/devices/TS0041.jpg',
  
  // Sensors
  'TS0203': 'https://www.zigbee2mqtt.io/images/devices/TS0203.jpg',
  'TS0202': 'https://www.zigbee2mqtt.io/images/devices/TS0202.jpg',
  'TS0201': 'https://www.zigbee2mqtt.io/images/devices/TS0201.jpg',
  'TS0207': 'https://www.zigbee2mqtt.io/images/devices/TS0207.jpg',
  
  // Switches
  'TS0001': 'https://www.zigbee2mqtt.io/images/devices/TS0001.jpg',
  'TS0002': 'https://www.zigbee2mqtt.io/images/devices/TS0002.jpg',
  'TS0003': 'https://www.zigbee2mqtt.io/images/devices/TS0003.jpg',
  'TS0004': 'https://www.zigbee2mqtt.io/images/devices/TS0004.jpg',
  
  // Bulbs
  'TS0505B': 'https://www.zigbee2mqtt.io/images/devices/TS0505B.jpg',
  'TS0502B': 'https://www.zigbee2mqtt.io/images/devices/TS0502B.jpg',
  'TS0505A': 'https://www.zigbee2mqtt.io/images/devices/TS0505A.jpg',
  
  // Curtains
  'TS130F': 'https://www.zigbee2mqtt.io/images/devices/TS130F.jpg',
  
  // Locks
  'YNCJSJDJ/03': 'https://www.zigbee2mqtt.io/images/devices/YNCJSJDJ-03.jpg',
  
  // Sirens
  'TS0601_siren': 'https://www.zigbee2mqtt.io/images/devices/TS0601_siren.jpg',
  
  // Thermostats
  'TS0601_thermostat': 'https://www.zigbee2mqtt.io/images/devices/TS0601_thermostat.jpg'
};

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const file = fs.createWriteStream(destPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Redirect
        file.close();
        fs.unlinkSync(destPath);
        downloadImage(response.headers.location, destPath).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

async function findProductImage(driverName, driverPath) {
  console.log(`\n🔍 Searching images for: ${driverName}`);
  
  // Lire le driver.compose.json pour obtenir les IDs
  const composeFile = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) {
    console.log(`  ⚠️  driver.compose.json not found`);
    return null;
  }
  
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  const productIds = [];
  const manufacturerIds = [];
  
  if (compose.zigbee) {
    if (compose.zigbee.productId) {
      const pids = Array.isArray(compose.zigbee.productId) ? compose.zigbee.productId : [compose.zigbee.productId];
      productIds.push(...pids);
    }
    if (compose.zigbee.manufacturerName) {
      const mids = Array.isArray(compose.zigbee.manufacturerName) ? compose.zigbee.manufacturerName : [compose.zigbee.manufacturerName];
      manufacturerIds.push(...mids);
    }
  }
  
  console.log(`  Product IDs: ${productIds.join(', ')}`);
  console.log(`  Manufacturer IDs: ${manufacturerIds.slice(0, 3).join(', ')}${manufacturerIds.length > 3 ? '...' : ''}`);
  
  // Chercher dans les images connues
  for (const id of [...productIds, ...manufacturerIds]) {
    if (KNOWN_PRODUCT_IMAGES[id]) {
      console.log(`  ✅ Found known image for ${id}`);
      return KNOWN_PRODUCT_IMAGES[id];
    }
  }
  
  // Construire des URLs possibles basées sur les IDs
  const possibleUrls = [];
  
  for (const pid of productIds) {
    possibleUrls.push(`https://www.zigbee2mqtt.io/images/devices/${pid}.jpg`);
    possibleUrls.push(`https://www.zigbee2mqtt.io/images/devices/${pid}.png`);
    possibleUrls.push(`https://www.zigbee2mqtt.io/images/devices/${pid}_1.jpg`);
  }
  
  for (const mid of manufacturerIds.slice(0, 3)) {
    possibleUrls.push(`https://www.zigbee2mqtt.io/images/devices/${mid}.jpg`);
  }
  
  return possibleUrls[0] || null;
}

async function downloadProductImagesForDriver(driverName, driverPath) {
  const imageUrl = await findProductImage(driverName, driverPath);
  
  if (!imageUrl) {
    console.log(`  ℹ️  No online image found, using generated SVG`);
    return false;
  }
  
  const assetsDir = path.join(driverPath, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  
  // Télécharger l'image
  const tempPath = path.join(assetsDir, 'product-original.jpg');
  
  try {
    console.log(`  ⬇️  Downloading: ${imageUrl}`);
    await downloadImage(imageUrl, tempPath);
    console.log(`  ✅ Downloaded: product-original.jpg`);
    
    // Sauvegarder l'URL source
    const metaPath = path.join(assetsDir, 'image-source.json');
    fs.writeFileSync(metaPath, JSON.stringify({
      url: imageUrl,
      downloadedAt: new Date().toISOString(),
      driverName: driverName
    }, null, 2), 'utf8');
    
    return true;
  } catch (err) {
    console.log(`  ❌ Download failed: ${err.message}`);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return false;
  }
}

async function main() {
  console.log('🌐 DOWNLOAD PRODUCT IMAGES FROM INTERNET\n');
  console.log('Searching and downloading real product images...\n');
  
  if (!fs.existsSync(DRIVERS_DIR)) {
    console.error('❌ Drivers directory not found');
    process.exit(1);
  }
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(name => {
      const fullPath = path.join(DRIVERS_DIR, name);
      return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
    });
  
  let downloadedCount = 0;
  let failedCount = 0;
  const results = [];
  
  for (const driverName of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    
    const success = await downloadProductImagesForDriver(driverName, driverPath);
    
    if (success) {
      downloadedCount++;
      results.push({ driver: driverName, status: 'downloaded' });
    } else {
      failedCount++;
      results.push({ driver: driverName, status: 'failed' });
    }
    
    // Pause pour éviter rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Rapport final
  const report = {
    date: new Date().toISOString(),
    totalDrivers: drivers.length,
    downloaded: downloadedCount,
    failed: failedCount,
    sources: IMAGE_SOURCES,
    knownImages: Object.keys(KNOWN_PRODUCT_IMAGES).length,
    results: results
  };
  
  const reportPath = path.join(ROOT, 'reports', 'IMAGE_DOWNLOAD_REPORT.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`\n✅ Image download complete!`);
  console.log(`   Downloaded: ${downloadedCount} images`);
  console.log(`   Failed: ${failedCount} images`);
  console.log(`   Report: ${reportPath}`);
  
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review downloaded images in drivers/*/assets/product-original.jpg`);
  console.log(`   2. Use image editor to create 75x75, 500x500, 1000x1000 versions`);
  console.log(`   3. Or run: node scripts/images/RESIZE_PRODUCT_IMAGES.js`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
