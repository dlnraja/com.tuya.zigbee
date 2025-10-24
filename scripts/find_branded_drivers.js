#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const BRAND_PREFIXES = [
  'avatto_',
  'zemismart_',
  'lsc_',
  'philips_',
  'innr_',
  'osram_',
  'samsung_',
  'sonoff_',
  'moes_',
  'nous_',
  'lonsonho_',
  'tuya_'
];

console.log('🔍 RECHERCHE DES DRIVERS ENCORE AVEC MARQUES...\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir);

const brandedDrivers = drivers.filter(driver => {
  return BRAND_PREFIXES.some(prefix => driver.startsWith(prefix));
});

if (brandedDrivers.length === 0) {
  console.log('✅ Aucun driver avec nom de marque trouvé!');
} else {
  console.log(`❌ ${brandedDrivers.length} drivers avec noms de marque:\n`);
  
  const byBrand = {};
  BRAND_PREFIXES.forEach(prefix => {
    byBrand[prefix] = brandedDrivers.filter(d => d.startsWith(prefix));
  });
  
  Object.keys(byBrand).forEach(brand => {
    if (byBrand[brand].length > 0) {
      console.log(`\n📦 ${String(brand).replace('_', '').toUpperCase()} (${byBrand[brand].length}):`);
      byBrand[brand].forEach(d => console.log(`   - ${d}`));
    }
  });
  
  console.log(`\n📊 TOTAL: ${brandedDrivers.length} drivers à renommer`);
}
