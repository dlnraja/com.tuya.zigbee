#!/usr/bin/env node
/**
 * SCAN_ALL.js - Audit complet projet
 * Partie du Script Ultime V25
 */

const fs = require('fs');

console.log('📊 SCAN_ALL - Audit complet projet');

const drivers = fs.readdirSync('drivers').filter(f => 
  fs.statSync(`drivers/${f}`).isDirectory()
);

const allManufacturers = new Set();
const driverDetails = {};
const categories = new Set();

drivers.forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      
      const category = driver.split('_').slice(0, 2).join('_');
      categories.add(category);
      
      driverDetails[driver] = {
        category,
        class: data.class,
        capabilities: data.capabilities || [],
        manufacturerCount: data.zigbee?.manufacturerName?.length || 0
      };
      
      if (data.zigbee?.manufacturerName) {
        data.zigbee.manufacturerName.forEach(m => allManufacturers.add(m));
      }
    } catch (e) {
      driverDetails[driver] = { error: e.message };
    }
  }
});

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalDrivers: drivers.length,
    totalManufacturers: allManufacturers.size,
    totalCategories: categories.size
  },
  manufacturers: Array.from(allManufacturers).sort(),
  categories: Array.from(categories).sort(),
  drivers: driverDetails
};

if (!fs.existsSync('references')) fs.mkdirSync('references', { recursive: true });
fs.writeFileSync('references/project_scan.json', JSON.stringify(report, null, 2));

console.log(`✅ ${drivers.length} drivers`);
console.log(`✅ ${allManufacturers.size} manufacturers uniques`);
console.log(`✅ ${categories.size} catégories`);
console.log('📁 Résultats: references/project_scan.json');
