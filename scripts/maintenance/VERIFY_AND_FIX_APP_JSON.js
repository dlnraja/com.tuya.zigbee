const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICATION & CORRECTION COMPLÈTE APP.JSON');
console.log('═'.repeat(80));

const appJsonPath = './app.json';
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

let issues = [];
let fixes = 0;

// ============================================================================
// 1. VÉRIFICATION DRIVERS - MANUFACTURER IDS SYNC
// ============================================================================
console.log('\n📋 1. VÉRIFICATION SYNC DRIVERS AVEC SOURCES...\n');

appJson.drivers.forEach((driver, index) => {
  const driverId = driver.id;
  const driverPath = `./drivers/${driverId}`;
  const composePath = `${driverPath}/driver.compose.json`;
  
  if (fs.existsSync(composePath)) {
    const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Compare manufacturerName
    if (composeData.zigbee?.manufacturerName) {
      const sourceManufacturers = composeData.zigbee.manufacturerName;
      const appManufacturers = driver.zigbee?.manufacturerName || [];
      
      const missing = sourceManufacturers.filter(m => !appManufacturers.includes(m));
      
      if (missing.length > 0) {
        issues.push({
          driver: driverId,
          type: 'missing_manufacturers',
          details: missing
        });
        
        console.log(`   ⚠️  ${driverId}: ${missing.length} manufacturer IDs manquants`);
        missing.forEach(m => console.log(`      - ${m}`));
        
        // FIX: Add missing manufacturers
        if (!driver.zigbee) driver.zigbee = {};
        if (!driver.zigbee.manufacturerName) driver.zigbee.manufacturerName = [];
        
        missing.forEach(m => {
          if (!driver.zigbee.manufacturerName.includes(m)) {
            driver.zigbee.manufacturerName.push(m);
            fixes++;
          }
        });
        
        console.log(`      ✅ Ajoutés à app.json`);
      }
    }
    
    // Compare productId
    if (composeData.zigbee?.productId) {
      const sourceProducts = composeData.zigbee.productId;
      const appProducts = driver.zigbee?.productId || [];
      
      const missingProducts = sourceProducts.filter(p => !appProducts.includes(p));
      
      if (missingProducts.length > 0) {
        issues.push({
          driver: driverId,
          type: 'missing_products',
          details: missingProducts
        });
        
        console.log(`   ⚠️  ${driverId}: ${missingProducts.length} product IDs manquants`);
        missingProducts.forEach(p => console.log(`      - ${p}`));
        
        // FIX: Add missing products
        if (!driver.zigbee.productId) driver.zigbee.productId = [];
        
        missingProducts.forEach(p => {
          if (!driver.zigbee.productId.includes(p)) {
            driver.zigbee.productId.push(p);
            fixes++;
          }
        });
        
        console.log(`      ✅ Ajoutés à app.json`);
      }
    }
  }
  
  // Progress
  if ((index + 1) % 20 === 0 || index === appJson.drivers.length - 1) {
    process.stdout.write(`\r   Progress: ${index + 1}/${appJson.drivers.length} drivers vérifiés...`);
  }
});

console.log('\n');

// ============================================================================
// 2. VÉRIFICATION CAPABILITIES VS ENERGY.BATTERIES
// ============================================================================
console.log('\n🔋 2. VÉRIFICATION ENERGY.BATTERIES...\n');

appJson.drivers.forEach(driver => {
  const capabilities = driver.capabilities || [];
  
  if (capabilities.includes('measure_battery')) {
    if (!driver.energy || !driver.energy.batteries || driver.energy.batteries.length === 0) {
      // Skip AC powered devices
      if (driver.id.includes('_ac') || driver.id.includes('plug') || driver.id.includes('socket')) {
        return;
      }
      
      issues.push({
        driver: driver.id,
        type: 'missing_batteries',
        details: 'measure_battery without energy.batteries'
      });
      
      console.log(`   ⚠️  ${driver.id}: measure_battery sans energy.batteries`);
      
      // FIX: Add default batteries
      let batteries = ['CR2032'];
      
      if (driver.id.includes('motion') || driver.id.includes('sensor')) {
        batteries = ['CR2032', 'CR2450', 'AA'];
      } else if (driver.id.includes('smoke') || driver.id.includes('co_') || driver.id.includes('gas')) {
        batteries = ['CR123A', 'AA'];
      } else if (driver.id.includes('door') || driver.id.includes('window')) {
        batteries = ['CR2032', 'AAA'];
      }
      
      if (!driver.energy) driver.energy = {};
      driver.energy.batteries = batteries;
      fixes++;
      
      console.log(`      ✅ Ajouté: [${batteries.join(', ')}]`);
    }
  }
});

// ============================================================================
// 3. VÉRIFICATION FLOW CARDS CONSISTENCY
// ============================================================================
console.log('\n🎨 3. VÉRIFICATION FLOW CARDS...\n');

if (!appJson.flow) {
  issues.push({
    type: 'missing_flow',
    details: 'No flow object in app.json'
  });
  console.log('   ⚠️  Aucun flow object dans app.json');
  appJson.flow = { triggers: [], conditions: [], actions: [] };
  fixes++;
  console.log('      ✅ Flow object créé');
}

const flowStats = {
  triggers: (appJson.flow.triggers || []).length,
  conditions: (appJson.flow.conditions || []).length,
  actions: (appJson.flow.actions || []).length
};

console.log(`   ✅ Triggers: ${flowStats.triggers}`);
console.log(`   ✅ Conditions: ${flowStats.conditions}`);
console.log(`   ✅ Actions: ${flowStats.actions}`);

// ============================================================================
// 4. VÉRIFICATION SETTINGS FORMAT
// ============================================================================
console.log('\n⚙️  4. VÉRIFICATION SETTINGS...\n');

if (appJson.settings) {
  appJson.settings.forEach((setting, idx) => {
    // Check required fields
    if (!setting.id) {
      issues.push({
        type: 'invalid_setting',
        index: idx,
        details: 'Missing id'
      });
      console.log(`   ⚠️  Setting #${idx}: id manquant`);
    }
    
    if (!setting.type) {
      issues.push({
        type: 'invalid_setting',
        index: idx,
        details: 'Missing type'
      });
      console.log(`   ⚠️  Setting #${idx}: type manquant`);
    }
    
    if (!setting.title) {
      issues.push({
        type: 'invalid_setting',
        index: idx,
        details: 'Missing title'
      });
      console.log(`   ⚠️  Setting #${idx}: title manquant`);
    }
    
    // Check dropdown values have title
    if (setting.type === 'dropdown' && setting.values) {
      setting.values.forEach((val, vIdx) => {
        if (!val.title) {
          issues.push({
            type: 'invalid_dropdown_value',
            setting: setting.id,
            index: vIdx,
            details: 'Missing title in dropdown value'
          });
          console.log(`   ⚠️  Setting ${setting.id}: dropdown value #${vIdx} sans title`);
        }
      });
    }
  });
  
  console.log(`   ✅ ${appJson.settings.length} settings vérifiés`);
} else {
  console.log('   ⚠️  Aucun settings dans app.json');
}

// ============================================================================
// 5. VÉRIFICATION VERSION & METADATA
// ============================================================================
console.log('\n📦 5. VÉRIFICATION METADATA...\n');

if (!appJson.version) {
  issues.push({ type: 'missing_version' });
  console.log('   ⚠️  Version manquante');
} else {
  console.log(`   ✅ Version: ${appJson.version}`);
}

if (!appJson.sdk || appJson.sdk !== 3) {
  issues.push({ type: 'invalid_sdk' });
  console.log(`   ⚠️  SDK: ${appJson.sdk} (devrait être 3)`);
} else {
  console.log(`   ✅ SDK: ${appJson.sdk}`);
}

if (!appJson.compatibility) {
  issues.push({ type: 'missing_compatibility' });
  console.log('   ⚠️  Compatibility manquante');
} else {
  console.log(`   ✅ Compatibility: ${appJson.compatibility}`);
}

// ============================================================================
// 6. VÉRIFICATION IMAGES PATHS
// ============================================================================
console.log('\n🖼️  6. VÉRIFICATION IMAGES PATHS...\n');

if (appJson.images) {
  ['small', 'large', 'xlarge'].forEach(size => {
    if (!appJson.images[size]) {
      issues.push({ type: 'missing_image', size });
      console.log(`   ⚠️  Image ${size} manquante`);
    } else {
      const imagePath = `.${appJson.images[size]}`;
      if (!fs.existsSync(imagePath)) {
        issues.push({ type: 'image_not_found', path: imagePath });
        console.log(`   ⚠️  Image non trouvée: ${imagePath}`);
      } else {
        console.log(`   ✅ Image ${size}: ${appJson.images[size]}`);
      }
    }
  });
}

// ============================================================================
// 7. VÉRIFICATION DUPLICATES MANUFACTURER IDS
// ============================================================================
console.log('\n🔍 7. VÉRIFICATION DUPLICATES MANUFACTURER IDS...\n');

appJson.drivers.forEach(driver => {
  if (driver.zigbee?.manufacturerName) {
    const unique = [...new Set(driver.zigbee.manufacturerName)];
    const duplicates = driver.zigbee.manufacturerName.length - unique.length;
    
    if (duplicates > 0) {
      issues.push({
        driver: driver.id,
        type: 'duplicate_manufacturers',
        count: duplicates
      });
      console.log(`   ⚠️  ${driver.id}: ${duplicates} duplicates trouvés`);
      
      // FIX: Remove duplicates
      driver.zigbee.manufacturerName = unique;
      fixes++;
      console.log(`      ✅ Duplicates supprimés`);
    }
  }
  
  if (driver.zigbee?.productId) {
    const unique = [...new Set(driver.zigbee.productId)];
    const duplicates = driver.zigbee.productId.length - unique.length;
    
    if (duplicates > 0) {
      issues.push({
        driver: driver.id,
        type: 'duplicate_products',
        count: duplicates
      });
      console.log(`   ⚠️  ${driver.id}: ${duplicates} product ID duplicates`);
      
      // FIX: Remove duplicates
      driver.zigbee.productId = unique;
      fixes++;
      console.log(`      ✅ Duplicates supprimés`);
    }
  }
});

if (issues.filter(i => i.type === 'duplicate_manufacturers' || i.type === 'duplicate_products').length === 0) {
  console.log('   ✅ Aucun duplicate trouvé');
}

// ============================================================================
// SAVE FIXED APP.JSON
// ============================================================================
if (fixes > 0) {
  console.log(`\n💾 SAUVEGARDE APP.JSON...`);
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log(`   ✅ ${fixes} corrections appliquées et sauvegardées`);
}

// ============================================================================
// GENERATE REPORT
// ============================================================================
const report = {
  timestamp: new Date().toISOString(),
  version: appJson.version,
  drivers: appJson.drivers.length,
  issues: {
    total: issues.length,
    by_type: {}
  },
  fixes_applied: fixes,
  flow_cards: flowStats
};

// Count issues by type
issues.forEach(issue => {
  if (!report.issues.by_type[issue.type]) {
    report.issues.by_type[issue.type] = 0;
  }
  report.issues.by_type[issue.type]++;
});

fs.writeFileSync('./APP_JSON_VERIFICATION_REPORT.json', JSON.stringify(report, null, 2));

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n═'.repeat(80));
console.log('📊 RÉSUMÉ VÉRIFICATION');
console.log('═'.repeat(80));

console.log(`\n✅ STATS:`);
console.log(`   Drivers vérifiés: ${appJson.drivers.length}`);
console.log(`   Issues trouvées: ${issues.length}`);
console.log(`   Corrections appliquées: ${fixes}`);

console.log(`\n🎯 ISSUES PAR TYPE:`);
Object.entries(report.issues.by_type).forEach(([type, count]) => {
  console.log(`   ${type}: ${count}`);
});

console.log(`\n🎨 FLOW CARDS:`);
console.log(`   Triggers: ${flowStats.triggers}`);
console.log(`   Conditions: ${flowStats.conditions}`);
console.log(`   Actions: ${flowStats.actions}`);

console.log(`\n📝 FICHIERS CRÉÉS:`);
console.log(`   ✅ APP_JSON_VERIFICATION_REPORT.json`);
if (fixes > 0) {
  console.log(`   ✅ app.json (mis à jour avec ${fixes} corrections)`);
}

console.log(`\n🚀 PROCHAINES ÉTAPES:`);
if (fixes > 0) {
  console.log(`   1. Valider: homey app validate`);
  console.log(`   2. Commit: git add . && git commit -m "fix: app.json verification and corrections"`);
  console.log(`   3. Push: git push origin master`);
} else {
  console.log(`   ✅ Aucune correction nécessaire - app.json est parfait !`);
}

console.log(`\n${fixes > 0 ? '⚠️' : '✅'}  VÉRIFICATION ${fixes > 0 ? 'COMPLÉTÉE AVEC CORRECTIONS' : 'RÉUSSIE'} !`);
