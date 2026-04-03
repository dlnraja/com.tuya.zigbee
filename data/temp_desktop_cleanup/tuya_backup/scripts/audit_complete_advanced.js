#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔍 AUDIT COMPLET AVANCÉ SDK3 - ANALYSE INTELLIGENTE\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

const report = {
  timestamp: new Date().toISOString(),
  version: null,
  stats: {
    totalDrivers: 0,
    totalFiles: 0,
    criticalIssues: 0,
    warningIssues: 0,
    infoIssues: 0
  },
  issues: {
    flowCards: [],
    capabilities: [],
    setCapabilityValue: [],
    manufacturerIds: [],
    iasZone: [],
    eventListeners: [],
    replaceUsages: [],
    endpoints: [],
    images: [],
    energyConfig: [],
    hybridDevices: [],
    customCapabilities: []
  },
  recommendations: []
};

// Lire app.json pour version
try {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  report.version = appJson.version;
} catch (e) {
  report.version = 'unknown';
}

/**
 * Scanner récursivement
 */
function scanDirectory(dir, callback) {
  if (!fs.existsSync(dir)) return;

  const items = fs.readdirSync(dir);
  items.forEach(item => {
    if (item.startsWith('.')) return;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath, callback);
    } else if (item.endsWith('.js') || item.endsWith('.json')) {
      callback(fullPath);
    }
  });
}

/**
 * Analyser fichier
 */
function analyzeFile(filePath) {
  report.stats.totalFiles++;
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(ROOT, filePath);

  // 1. FLOW CARDS - Détection usages invalides
  if (content.includes('getActionCard') || content.includes('getTriggerCard') || content.includes('getConditionCard')) {
    const matches = content.match(/get(Action|Trigger|Condition)Card\s*\(\s*['"]([^'"]+)['"]/g);
    if (matches) {
      matches.forEach(match => {
        const cardId = match.match(/['"]([^'"]+)['"]/)[1];
        report.issues.flowCards.push({
          severity: 'INFO',
          file: relativePath,
          cardId,
          message: `Flow card référencée: ${cardId}`
        });
      });
    }
  }

  // 2. SETCAPABILITYVALUE - Type safety
  if (content.includes('setCapabilityValue')) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('setCapabilityValue') && line.includes('measure_')) {
        // Vérifier si parseFloat/parseInt/Number est utilisé
        if (!line.includes('parseFloat') && !line.includes('parseInt') && !line.includes('Number(')) {
          report.issues.setCapabilityValue.push({
            severity: 'WARNING',
            file: relativePath,
            line: idx + 1,
            code: line.trim(),
            message: 'setCapabilityValue sans conversion type explicite'
          });
          report.stats.warningIssues++;
        }
      }
    });
  }

  // 3. REPLACE USAGES - IAS Zone et autres
  const replaceMatches = content.matchAll(/([a-zA-Z0-9_.[\]]+)\.replace\s*\(/g);
  for (const match of replaceMatches) {
    const varName = match[1];
    // Vérifier si String() est utilisé
    const beforeMatch = content.substring(Math.max(0, match.index - 10), match.index);
    if (!beforeMatch.includes('String(') && varName.includes('.')) {
      report.issues.replaceUsages.push({
        severity: 'WARNING',
        file: relativePath,
        varName,
        message: `Usage de .replace() sans String() wrapper sur: ${varName}`
      });
      report.stats.warningIssues++;
    }
  }

  // 4. IAS ZONE - Conversions critiques
  if (content.includes('ieeeAddress') && content.includes('replace')) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('ieeeAddress') && line.includes('.replace(')) {
        if (!line.includes('String(')) {
          report.issues.iasZone.push({
            severity: 'CRITICAL',
            file: relativePath,
            line: idx + 1,
            code: line.trim(),
            message: 'IEEE address .replace() sans conversion String explicite'
          });
          report.stats.criticalIssues++;
        }
      }
    });
  }

  // 5. EVENT LISTENERS - Memory leaks
  if (content.includes('.on(')) {
    const onMatches = content.matchAll(/\.on\s*\(\s*['"]([^'"]+)['"]/g);
    const hasRemove = content.includes('removeListener') || content.includes('removeAllListeners') || content.includes('.off(');

    for (const match of onMatches) {
      if (!hasRemove && (match[1] === 'report' || match[1] === 'message')) {
        report.issues.eventListeners.push({
          severity: 'WARNING',
          file: relativePath,
          event: match[1],
          message: `Event listener '${match[1]}' sans removeListener`
        });
        report.stats.warningIssues++;
      }
    }
  }

  // 6. MANUFACTURER IDs - Analyse driver.compose.json
  if (filePath.includes('driver.compose.json') || filePath.includes('driver.json')) {
    try {
      const driverConfig = JSON.parse(content);
      report.stats.totalDrivers++;

      // Vérifier manufacturer IDs
      const manufacturerNames = driverConfig.zigbee?.manufacturerName || [];
      const productIds = driverConfig.zigbee?.productId || [];

      if (manufacturerNames.length > 20) {
        report.issues.manufacturerIds.push({
          severity: 'WARNING',
          file: relativePath,
          count: manufacturerNames.length,
          message: `Trop de manufacturer IDs (${manufacturerNames.length}) - possibles duplicates`
        });
        report.stats.warningIssues++;
      }

      // Vérifier capabilities
      const capabilities = driverConfig.capabilities || [];
      if (capabilities.length === 0 && driverConfig.class !== 'other') {
        report.issues.capabilities.push({
          severity: 'WARNING',
          file: relativePath,
          message: 'Driver sans capabilities défini'
        });
        report.stats.warningIssues++;
      }

      // Vérifier endpoints
      const endpoints = driverConfig.zigbee?.endpoints || {};
      if (Object.keys(endpoints).length > 1) {
        report.issues.endpoints.push({
          severity: 'INFO',
          file: relativePath,
          count: Object.keys(endpoints).length,
          message: `Multi-endpoint device (${Object.keys(endpoints).length} endpoints)`
        });
        report.stats.infoIssues++;
      }

      // Vérifier energy config
      const energy = driverConfig.energy || {};
      const hasEnergy = capabilities.some(c => c.startsWith('measure_power') || c.startsWith('meter_'));
      const hasBattery = capabilities.some(c => c.includes('battery'));

      if (hasBattery && !energy.batteries) {
        report.issues.energyConfig.push({
          severity: 'WARNING',
          file: relativePath,
          message: 'Capabilities battery sans energy.batteries configuré'
        });
        report.stats.warningIssues++;
      }

      // Détecter devices hybrides
      const hasOnOff = capabilities.includes('onoff');
      const hasSensor = capabilities.some(c => c.startsWith('measure_') || c.startsWith('alarm_'));
      if (hasOnOff && hasSensor) {
        report.issues.hybridDevices.push({
          severity: 'INFO',
          file: relativePath,
          capabilities,
          message: 'Device hybride détecté (actuator + sensor)'
        });
        report.stats.infoIssues++;
      }

      // Détecter custom capabilities
      const customCaps = capabilities.filter(c => !c.match(/^(onoff|dim|light_|measure_|meter_|alarm_|button\.|windowcoverings_)/));
      if (customCaps.length > 0) {
        report.issues.customCapabilities.push({
          severity: 'INFO',
          file: relativePath,
          capabilities: customCaps,
          message: `Capabilities custom/propriétaires: ${customCaps.join(', ')}`
        });
        report.stats.infoIssues++;
      }

      // Vérifier images
      const images = driverConfig.images || {};
      if (!images.small || !images.large) {
        report.issues.images.push({
          severity: 'INFO',
          file: relativePath,
          message: 'Images driver incomplètes'
        });
        report.stats.infoIssues++;
      }

    } catch (e) {
      // JSON invalide
    }
  }
}

// EXÉCUTION
console.log('📂 Scanning drivers/...\n');
scanDirectory(DRIVERS_DIR, analyzeFile);

console.log('📂 Scanning lib/...\n');
scanDirectory(LIB_DIR, analyzeFile);

// ANALYSE DUPLICATES MANUFACTURER IDs
console.log('🔍 Analysing manufacturer ID duplicates...\n');
const manufacturerMap = {};
scanDirectory(DRIVERS_DIR, (filePath) => {
  if (filePath.includes('driver.compose.json')) {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const manufacturers = content.zigbee?.manufacturerName || [];
      const products = content.zigbee?.productId || [];

      manufacturers.forEach(m => {
        manufacturerMap[m] = manufacturerMap[m] || [];
        manufacturerMap[m].push(path.relative(ROOT, filePath));
      });

      products.forEach(p => {
        const key = `PRODUCT:${p}`;
        manufacturerMap[key] = manufacturerMap[key] || [];
        manufacturerMap[key].push(path.relative(ROOT, filePath));
      });
    } catch (e) {}
  }
});

Object.entries(manufacturerMap).forEach(([id, files]) => {
  if (files.length > 1) {
    report.issues.manufacturerIds.push({
      severity: 'CRITICAL',
      manufacturerId: id,
      drivers: files,
      count: files.length,
      message: `ID partagé par ${files.length} drivers`
    });
    report.stats.criticalIssues++;
  }
});

// RECOMMENDATIONS
if (report.stats.criticalIssues > 0) {
  report.recommendations.push({
    priority: 'HIGH',
    action: 'Corriger immédiatement les issues critiques (IAS Zone, manufacturer ID duplicates)'
  });
}

if (report.issues.setCapabilityValue.length > 5) {
  report.recommendations.push({
    priority: 'MEDIUM',
    action: `Ajouter parseFloat() aux ${report.issues.setCapabilityValue.length} setCapabilityValue suspects`
  });
}

if (report.issues.hybridDevices.length > 0) {
  report.recommendations.push({
    priority: 'LOW',
    action: `Enrichir ${report.issues.hybridDevices.length} devices hybrides avec settings power_source`
  });
}

// SAUVEGARDER RAPPORT
const reportPath = path.join(ROOT, 'AUDIT_ADVANCED_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

// AFFICHAGE RÉSUMÉ
console.log('\n📊 RÉSUMÉ AUDIT:\n');
console.log(`   Version: ${report.version}`);
console.log(`   Drivers: ${report.stats.totalDrivers}`);
console.log(`   Fichiers: ${report.stats.totalFiles}`);
console.log(`   Issues critiques: ${report.stats.criticalIssues}`);
console.log(`   Warnings: ${report.stats.warningIssues}`);
console.log(`   Info: ${report.stats.infoIssues}\n`);

console.log('📋 TOP ISSUES:\n');
if (report.stats.criticalIssues > 0) {
  console.log(`   🔴 ${report.stats.criticalIssues} CRITIQUES à corriger immédiatement`);
}
if (report.stats.warningIssues > 0) {
  console.log(`   ⚠️  ${report.stats.warningIssues} warnings à examiner`);
}
if (report.stats.infoIssues > 0) {
  console.log(`   ℹ️  ${report.stats.infoIssues} infos (enrichissement possible)`);
}

console.log(`\n✅ Rapport sauvegardé: ${reportPath}\n`);

process.exit(report.stats.criticalIssues > 0 ? 1 : 0);
