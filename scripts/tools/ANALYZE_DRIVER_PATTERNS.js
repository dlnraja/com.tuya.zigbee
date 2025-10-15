#!/usr/bin/env node

/**
 * ANALYZE_DRIVER_PATTERNS.js
 * Analyse les patterns actuels des drivers pour identifier améliorations
 * Inspiré par athombv/com.tuya
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   📊 ANALYSE PATTERNS DRIVERS - Enrichissement        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const driversDir = 'drivers';
const patterns = {
  hasDeviceJs: 0,
  hasErrorHandling: 0,
  hasRetryLogic: 0,
  hasDebugLogging: 0,
  hasSettingsHandler: 0,
  hasBatteryReporting: 0,
  hasCapabilityListeners: 0,
  hasJSDoc: 0,
  totalDrivers: 0
};

const improvements = [];
const examples = {
  good: [],
  needsWork: []
};

// Patterns à détecter
const patternChecks = {
  errorHandling: /try\s*{\s*[\s\S]*?}\s*catch\s*\(/,
  retry: /retry|attempt|maxRetries/i,
  debug: /this\.debug|debugEnabled|DEBUG/,
  settings: /async\s+onSettings/,
  battery: /batteryPercentageRemaining|measure_battery/,
  listeners: /registerCapabilityListener/,
  jsdoc: /\/\*\*[\s\S]*?\*\//
};

console.log('1️⃣  ANALYSE DES DRIVERS\n');

// Lire tous les drivers
const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

patterns.totalDrivers = drivers.length;

drivers.forEach(driver => {
  const driverPath = path.join(driversDir, driver);
  const deviceJsPath = path.join(driverPath, 'device.js');
  
  if (!fs.existsSync(deviceJsPath)) {
    return;
  }
  
  patterns.hasDeviceJs++;
  
  const content = fs.readFileSync(deviceJsPath, 'utf8');
  
  // Check patterns
  let score = 0;
  const checks = {};
  
  if (patternChecks.errorHandling.test(content)) {
    patterns.hasErrorHandling++;
    checks.errorHandling = true;
    score++;
  }
  
  if (patternChecks.retry.test(content)) {
    patterns.hasRetryLogic++;
    checks.retry = true;
    score++;
  }
  
  if (patternChecks.debug.test(content)) {
    patterns.hasDebugLogging++;
    checks.debug = true;
    score++;
  }
  
  if (patternChecks.settings.test(content)) {
    patterns.hasSettingsHandler++;
    checks.settings = true;
    score++;
  }
  
  if (patternChecks.battery.test(content)) {
    patterns.hasBatteryReporting++;
    checks.battery = true;
    score++;
  }
  
  if (patternChecks.listeners.test(content)) {
    patterns.hasCapabilityListeners++;
    checks.listeners = true;
    score++;
  }
  
  if (patternChecks.jsdoc.test(content)) {
    patterns.hasJSDoc++;
    checks.jsdoc = true;
    score++;
  }
  
  // Catégoriser
  if (score >= 5) {
    examples.good.push({ driver, score, checks });
  } else if (score <= 2) {
    examples.needsWork.push({ driver, score, checks });
  }
});

console.log(`   Total drivers:          ${patterns.totalDrivers}`);
console.log(`   Avec device.js:         ${patterns.hasDeviceJs} (${Math.round(patterns.hasDeviceJs/patterns.totalDrivers*100)}%)`);
console.log('');

console.log('2️⃣  PATTERNS DÉTECTÉS\n');

console.log(`   ✅ Error handling:      ${patterns.hasErrorHandling} (${Math.round(patterns.hasErrorHandling/patterns.hasDeviceJs*100)}%)`);
console.log(`   🔄 Retry logic:         ${patterns.hasRetryLogic} (${Math.round(patterns.hasRetryLogic/patterns.hasDeviceJs*100)}%)`);
console.log(`   🐛 Debug logging:       ${patterns.hasDebugLogging} (${Math.round(patterns.hasDebugLogging/patterns.hasDeviceJs*100)}%)`);
console.log(`   ⚙️  Settings handler:    ${patterns.hasSettingsHandler} (${Math.round(patterns.hasSettingsHandler/patterns.hasDeviceJs*100)}%)`);
console.log(`   🔋 Battery reporting:   ${patterns.hasBatteryReporting} (${Math.round(patterns.hasBatteryReporting/patterns.hasDeviceJs*100)}%)`);
console.log(`   🎛️  Capability listeners: ${patterns.hasCapabilityListeners} (${Math.round(patterns.hasCapabilityListeners/patterns.hasDeviceJs*100)}%)`);
console.log(`   📝 JSDoc comments:      ${patterns.hasJSDoc} (${Math.round(patterns.hasJSDoc/patterns.hasDeviceJs*100)}%)`);
console.log('');

console.log('3️⃣  EXEMPLES BONS PATTERNS\n');

examples.good.slice(0, 5).forEach((ex, i) => {
  console.log(`   ${i+1}. ${ex.driver} (score: ${ex.score}/7)`);
  Object.entries(ex.checks).forEach(([key, val]) => {
    if (val) console.log(`      ✓ ${key}`);
  });
});
console.log('');

console.log('4️⃣  DRIVERS À AMÉLIORER\n');

examples.needsWork.slice(0, 5).forEach((ex, i) => {
  console.log(`   ${i+1}. ${ex.driver} (score: ${ex.score}/7)`);
  
  // Show what's missing
  const missing = [];
  if (!ex.checks.errorHandling) missing.push('error handling');
  if (!ex.checks.retry) missing.push('retry logic');
  if (!ex.checks.debug) missing.push('debug logging');
  if (!ex.checks.settings) missing.push('settings handler');
  if (!ex.checks.battery) missing.push('battery reporting');
  if (!ex.checks.listeners) missing.push('capability listeners');
  if (!ex.checks.jsdoc) missing.push('JSDoc');
  
  console.log(`      ❌ Manque: ${missing.join(', ')}`);
});
console.log('');

console.log('5️⃣  RECOMMANDATIONS PRIORITAIRES\n');

// Calculer priorités
const priorities = [];

if (patterns.hasErrorHandling / patterns.hasDeviceJs < 0.5) {
  priorities.push({
    priority: 'HIGH',
    issue: 'Error handling',
    current: `${patterns.hasErrorHandling}/${patterns.hasDeviceJs}`,
    recommendation: 'Ajouter try/catch partout'
  });
}

if (patterns.hasRetryLogic / patterns.hasDeviceJs < 0.2) {
  priorities.push({
    priority: 'MEDIUM',
    issue: 'Retry logic',
    current: `${patterns.hasRetryLogic}/${patterns.hasDeviceJs}`,
    recommendation: 'Implémenter retry avec backoff'
  });
}

if (patterns.hasDebugLogging / patterns.hasDeviceJs < 0.3) {
  priorities.push({
    priority: 'LOW',
    issue: 'Debug logging',
    current: `${patterns.hasDebugLogging}/${patterns.hasDeviceJs}`,
    recommendation: 'Ajouter debug configurable'
  });
}

if (patterns.hasJSDoc / patterns.hasDeviceJs < 0.1) {
  priorities.push({
    priority: 'LOW',
    issue: 'JSDoc comments',
    current: `${patterns.hasJSDoc}/${patterns.hasDeviceJs}`,
    recommendation: 'Documenter fonctions principales'
  });
}

priorities.sort((a, b) => {
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return order[a.priority] - order[b.priority];
});

priorities.forEach((p, i) => {
  console.log(`   ${i+1}. [${p.priority}] ${p.issue}`);
  console.log(`      Current: ${p.current}`);
  console.log(`      → ${p.recommendation}`);
  console.log('');
});

console.log('6️⃣  SOLUTION: BASE CLASS\n');

console.log('   📦 Créer: lib/TuyaZigbeeDevice.js\n');
console.log('   Avantages:');
console.log('   ✅ Error handling centralisé');
console.log('   ✅ Retry logic réutilisable');
console.log('   ✅ Debug logging uniforme');
console.log('   ✅ Settings management commun');
console.log('   ✅ Battery reporting standardisé');
console.log('   ✅ Moins de code dupliqué\n');

console.log('   Migration progressive:');
console.log('   1. Créer base class');
console.log('   2. Migrer 5 drivers pilotes');
console.log('   3. Valider fonctionnement');
console.log('   4. Migrer tous les drivers');
console.log('   5. Supprimer code dupliqué\n');

console.log('7️⃣  MÉTRIQUES QUALITÉ\n');

const qualityScore = (
  (patterns.hasErrorHandling / patterns.hasDeviceJs) * 20 +
  (patterns.hasRetryLogic / patterns.hasDeviceJs) * 15 +
  (patterns.hasDebugLogging / patterns.hasDeviceJs) * 15 +
  (patterns.hasSettingsHandler / patterns.hasDeviceJs) * 15 +
  (patterns.hasBatteryReporting / patterns.hasDeviceJs) * 15 +
  (patterns.hasCapabilityListeners / patterns.hasDeviceJs) * 10 +
  (patterns.hasJSDoc / patterns.hasDeviceJs) * 10
);

console.log(`   Score qualité actuel: ${qualityScore.toFixed(1)}/100\n`);

if (qualityScore < 40) {
  console.log('   Status: ⚠️  NEEDS IMPROVEMENT');
} else if (qualityScore < 70) {
  console.log('   Status: 📈 GOOD, can be better');
} else {
  console.log('   Status: ✅ EXCELLENT');
}

console.log('');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║                    RÉSUMÉ ANALYSE                      ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log(`   Drivers analysés:     ${patterns.hasDeviceJs}`);
console.log(`   Score qualité:        ${qualityScore.toFixed(1)}/100`);
console.log(`   Priorités:            ${priorities.length} identifiées`);
console.log(`   Solution:             Base class lib/TuyaZigbeeDevice.js`);
console.log('');

// Sauvegarder rapport
const report = {
  date: new Date().toISOString(),
  patterns,
  qualityScore: Math.round(qualityScore),
  priorities,
  examples: {
    good: examples.good.slice(0, 10),
    needsWork: examples.needsWork.slice(0, 10)
  }
};

fs.writeFileSync(
  'reports/DRIVER_PATTERNS_ANALYSIS.json',
  JSON.stringify(report, null, 2)
);

console.log('   📄 Rapport sauvegardé: reports/DRIVER_PATTERNS_ANALYSIS.json\n');
