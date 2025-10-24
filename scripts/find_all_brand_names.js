#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔍 RECHERCHE DE TOUTES LES MARQUES DANS LES NOMS DE DRIVERS\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(d => 
  fs.statSync(path.join(driversDir, d)).isDirectory() && 
  !d.startsWith('.')
);

// TOUTES LES MARQUES CONNUES
const BRANDS = [
  'lsc', 'philips', 'innr', 'osram', 'samsung', 'sonoff',
  'avatto', 'zemismart', 'tuya', 'moes', 'nous',
  'lonsonho', 'lidl', 'ikea', 'xiaomi', 'aqara'
];

const driversWithBrands = [];

drivers.forEach(driverName => {
  BRANDS.forEach(brand => {
    if (driverName.includes('_' + brand) || driverName.includes(brand + '_')) {
      driversWithBrands.push({
        driver: driverName,
        brand: brand
      });
    }
  });
});

console.log(`❌ ${driversWithBrands.length} DRIVERS AVEC NOM DE MARQUE:\n`);

// Grouper par marque
const byBrand = {};
driversWithBrands.forEach(d => {
  if (!byBrand[d.brand]) byBrand[d.brand] = [];
  byBrand[d.brand].push(d.driver);
});

Object.entries(byBrand).forEach(([brand, drivers]) => {
  console.log(`\n📍 "${brand.toUpperCase()}" (${drivers.length} drivers):`);
  drivers.forEach(d => console.log(`   - ${d}`));
});

// Sauvegarder
const reportPath = path.join(__dirname, '..', 'BRAND_NAMES_IN_DRIVERS.json');
fs.writeFileSync(reportPath, JSON.stringify({
  totalDriversWithBrands: driversWithBrands.length,
  byBrand,
  drivers: driversWithBrands
}, null, 2), 'utf8');

console.log(`\n💾 Rapport sauvegardé: BRAND_NAMES_IN_DRIVERS.json`);
