#!/usr/bin/env node
/**
 * 🏷️ REMOVE ALL BRAND NAMES FROM DRIVER CLASSES
 * 
 * Nettoie les noms de marques des classes dans driver.js
 * Ex: "ZemismartMotionSensorDriver" → "MotionSensorDriver"
 * Ex: "AvattoSmartPlugDriver" → "SmartPlugDriver"
 * Ex: "SonoffButtonDriver" → "ButtonDriver"
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🏷️ REMOVE ALL BRAND NAMES FROM DRIVER CLASSES\n');

// Liste complète des marques à supprimer
const BRANDS = [
  'Zemismart',
  'Avatto',
  'Nous',
  'Philips',
  'Osram',
  'Samsung',
  'Innr',
  'Sonoff',
  'Lsc',
  'Gledopto',
  'Lidl',
  'Moes',
  'Girier',
  'Woox',
  'Neo',
  'Aqara',
  'Xiaomi',
  'Ikea'
];

// Fonction pour obtenir tous les drivers actifs (non-archived)
function getActiveDrivers() {
  return fs.readdirSync(DRIVERS_DIR).filter(name => {
    const fullPath = path.join(DRIVERS_DIR, name);
    return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
  });
}

// Fonction pour nettoyer le nom de classe
function cleanClassName(className) {
  let cleaned = className;
  
  // Supprimer toutes les marques
  for (const brand of BRANDS) {
    const regex = new RegExp(brand, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Nettoyer les doubles majuscules consécutives
  // Ex: "PlugDriver" reste "PlugDriver"
  // Ex: "SmartPlugDriver" reste "SmartPlugDriver"
  
  return cleaned;
}

let fixed = 0;
const drivers = getActiveDrivers();

for (const driver of drivers) {
  const driverPath = path.join(DRIVERS_DIR, driver, 'driver.js');
  
  if (!fs.existsSync(driverPath)) continue;
  
  let content = fs.readFileSync(driverPath, 'utf8');
  let modified = false;
  
  // Trouver toutes les déclarations de classe
  const classRegex = /class\s+(\w+)\s+extends/g;
  const matches = [...content.matchAll(classRegex)];
  
  for (const match of matches) {
    const originalName = match[1];
    const cleanedName = cleanClassName(originalName);
    
    if (cleanedName !== originalName) {
      // Remplacer toutes les occurrences du nom de classe
      const replaceRegex = new RegExp(`\\b${originalName}\\b`, 'g');
      content = content.replace(replaceRegex, cleanedName);
      modified = true;
      console.log(`  ✅ ${driver}: ${originalName} → ${cleanedName}`);
    }
  }
  
  if (modified) {
    fs.writeFileSync(driverPath, content, 'utf8');
    fixed++;
  }
}

console.log(`\n✅ ${fixed} drivers fixed\n`);
