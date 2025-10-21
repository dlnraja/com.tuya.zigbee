#!/usr/bin/env node

/**
 * UPDATE CONFIG NEW BRANDS v34.0.0
 * Met à jour la configuration avec les nouvelles marques
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔄 UPDATE CONFIG NEW BRANDS v34.0.0\n');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'CONFIG_v34_ARCHITECTURE.json');
const driversDir = path.join(rootDir, 'drivers');

// Lire config actuelle
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Compter les drivers par marque
const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

console.log(`Total drivers trouvés: ${drivers.length}\n`);

// Ajouter nouvelles marques
const newBrands = {
  samsung: {
    name: 'Samsung SmartThings',
    count: 0,
    percentage: 0,
    prefix: 'samsung_',
    patterns: ['SmartThings', 'Samsung Electronics', 'CentraLite', '_TZ3000_msl2w2kk', '_TZ3000_4fjiwweb']
  },
  sonoff: {
    name: 'Sonoff',
    count: 0,
    percentage: 0,
    prefix: 'sonoff_',
    patterns: ['SONOFF', 'eWeLink', 'BASICZBR3', 'ZBMINI', '_TZ3000_odygigth']
  },
  philips: {
    name: 'Philips Hue',
    count: 0,
    percentage: 0,
    prefix: 'philips_',
    patterns: ['Philips', 'Signify Netherlands B.V.', 'LWA001', 'LWB010']
  },
  xiaomi: {
    name: 'Xiaomi Mi',
    count: 0,
    percentage: 0,
    prefix: 'xiaomi_',
    patterns: ['LUMI', 'lumi.', 'Xiaomi', 'lumi.sensor_motion']
  },
  osram: {
    name: 'OSRAM Ledvance',
    count: 0,
    percentage: 0,
    prefix: 'osram_',
    patterns: ['OSRAM', 'LEDVANCE', 'LIGHTIFY']
  },
  innr: {
    name: 'Innr Lighting',
    count: 0,
    percentage: 0,
    prefix: 'innr_',
    patterns: ['innr', 'Innr', 'RB 185 C']
  }
};

// Compter drivers par marque
for (const [key, brand] of Object.entries(newBrands)) {
  const count = drivers.filter(d => d.startsWith(brand.prefix)).length;
  newBrands[key].count = count;
  newBrands[key].percentage = parseFloat(((count / drivers.length) * 100).toFixed(1));
  console.log(`${brand.name}: ${count} drivers (${newBrands[key].percentage}%)`);
}

// Mettre à jour les marques existantes
for (const [key, brand] of Object.entries(config.brands)) {
  const count = drivers.filter(d => d.startsWith(brand.prefix)).length;
  config.brands[key].count = count;
  config.brands[key].percentage = parseFloat(((count / drivers.length) * 100).toFixed(1));
  console.log(`${brand.name}: ${count} drivers (${config.brands[key].percentage}%)`);
}

// Ajouter nouvelles marques à la config
config.brands = { ...config.brands, ...newBrands };
config.totalDrivers = drivers.length;

// Sauvegarder
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log(`\n✅ Configuration mise à jour!`);
console.log(`   Total marques: ${Object.keys(config.brands).length}`);
console.log(`   Total drivers: ${config.totalDrivers}`);
