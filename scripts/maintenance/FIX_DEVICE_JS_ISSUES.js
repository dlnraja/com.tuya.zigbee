#!/usr/bin/env node

/**
 * FIX_DEVICE_JS_ISSUES.js
 * Vérifie et corrige les problèmes dans les device.js
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   🔧 VÉRIFICATION ET CORRECTION DEVICE.JS              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const issues = {
  missingDeviceJs: [],
  oldSDKImports: [],
  missingOnNodeInit: [],
  wrongThisNode: [],
  missingErrorHandling: [],
  deprecatedMethods: []
};

let totalFixed = 0;

function checkAndFixDeviceJs(driverPath, driverName) {
  const deviceJsPath = path.join(driverPath, 'device.js');
  
  if (!fs.existsSync(deviceJsPath)) {
    issues.missingDeviceJs.push(driverName);
    
    // Créer device.js basique
    const composePath = path.join(driverPath, 'driver.compose.json');
    let isLight = false;
    
    if (fs.existsSync(composePath)) {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      isLight = compose.class === 'light';
    }
    
    const template = isLight ? 
      `'use strict';

const { ZigBeeLightDevice } = require('homey-zigbeedriver');

class MyDevice extends ZigBeeLightDevice {
  
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    this.printNode();
  }
}

module.exports = MyDevice;
` : 
      `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MyDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = MyDevice;
`;
    
    fs.writeFileSync(deviceJsPath, template);
    totalFixed++;
    return { fixed: true, created: true };
  }
  
  // Lire et vérifier device.js existant
  let content = fs.readFileSync(deviceJsPath, 'utf8');
  let modified = false;
  
  // 1. Vérifier imports SDK v2
  if (content.includes('homey-meshdriver')) {
    issues.oldSDKImports.push(driverName);
    content = String(content).replace(
      /require\(['"]homey-meshdriver['"]\)/g,
      `require('homey-zigbeedriver')`
    );
    content = String(content).replace(/MeshDevice/g, 'ZigBeeDevice');
    modified = true;
  }
  
  // 2. Vérifier onMeshInit deprecated
  if (content.includes('onMeshInit')) {
    issues.deprecatedMethods.push(driverName);
    content = String(content).replace(
      /async onMeshInit\(\s*\)/g,
      'async onNodeInit({ zclNode })'
    );
    modified = true;
  }
  
  // 3. Vérifier this.node au lieu de this.zclNode
  if (content.includes('this.node') && !content.includes('this.zclNode')) {
    issues.wrongThisNode.push(driverName);
    content = String(content).replace(/this\.node\b/g, 'this.zclNode');
    modified = true;
  }
  
  // 4. Ajouter try/catch si manquant dans onNodeInit
  if (content.includes('onNodeInit') && !content.includes('try {')) {
    issues.missingErrorHandling.push(driverName);
    // Simple warning, pas de modification auto
  }
  
  if (modified) {
    fs.writeFileSync(deviceJsPath, content);
    totalFixed++;
    return { fixed: true };
  }
  
  return { fixed: false };
}

// Main
const driversDir = 'drivers';
const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

console.log(`📦 ${drivers.length} drivers à vérifier\n`);
console.log('🔍 Analyse device.js...\n');

drivers.forEach(driver => {
  const driverPath = path.join(driversDir, driver);
  const result = checkAndFixDeviceJs(driverPath, driver);
  
  if (result.fixed) {
    if (result.created) {
      console.log(`   ✅ ${driver} (device.js créé)`);
    } else {
      console.log(`   ✅ ${driver} (corrigé)`);
    }
  }
});

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                  RÉSUMÉ DEVICE.JS                      ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log(`   Total drivers:           ${drivers.length}`);
console.log(`   ✅ Corrections:          ${totalFixed}`);
console.log('');

if (issues.missingDeviceJs.length > 0) {
  console.log(`   📝 device.js créés: ${issues.missingDeviceJs.length}`);
}

if (issues.oldSDKImports.length > 0) {
  console.log(`   🔄 SDK v2 → v3: ${issues.oldSDKImports.length}`);
}

if (issues.deprecatedMethods.length > 0) {
  console.log(`   ⚙️  onMeshInit → onNodeInit: ${issues.deprecatedMethods.length}`);
}

if (issues.wrongThisNode.length > 0) {
  console.log(`   🔧 this.node → this.zclNode: ${issues.wrongThisNode.length}`);
}

if (issues.missingErrorHandling.length > 0) {
  console.log(`   ⚠️  Error handling manquant: ${issues.missingErrorHandling.length}`);
  console.log(`      → Ajouter try/catch manuellement`);
}

console.log('');

// Sauvegarder rapport
const report = {
  date: new Date().toISOString(),
  totalDrivers: drivers.length,
  totalFixed: totalFixed,
  issues: issues
};

fs.writeFileSync(
  'reports/DEVICE_JS_FIX_REPORT.json',
  JSON.stringify(report, null, 2)
);

console.log('💾 Rapport: reports/DEVICE_JS_FIX_REPORT.json\n');

if (totalFixed > 0) {
  console.log('✅ Corrections device.js appliquées!\n');
}
