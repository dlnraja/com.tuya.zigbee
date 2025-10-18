const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 SYSTÈME D\'ENRICHISSEMENT COMPLET - BASÉ SUR SPECS HOMEY OFFICIELLES\n');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');

// ============================================================================
// PHASE 1: RÉFÉRENTIEL HOMEY SDK3 OFFICIEL
// ============================================================================

const HOMEY_SDK3_SPECS = {
  images: {
    app: {
      small: { width: 250, height: 175 },
      large: { width: 500, height: 500 },
      xlarge: { width: 1000, height: 700 }
    },
    driver: {
      small: { width: 75, height: 75 },
      large: { width: 500, height: 500 },
      xlarge: { width: 1000, height: 1000 }
    }
  },
  
  zigbee: {
    required_fields: [
      'manufacturerName',
      'productId',
      'endpoints',
      'learnmode'
    ],
    
    learnmode_template: {
      instruction: {
        en: "Press the pairing button on your device to start pairing.\n\nIf your device does not have a pairing button, check the device manual for pairing instructions."
      }
    }
  },
  
  flow_cards: {
    device_cards_require_device_token: true,
    unique_ids_required: true,
    titleFormatted_patterns: {
      action: "[[action]] [[device]] [[args]]",
      condition: "[[device]] [[condition]] [[args]]",
      trigger: "When [[device]] [[trigger]]"
    }
  },
  
  validation_levels: ['debug', 'verified', 'publish']
};

// ============================================================================
// PHASE 2: ANALYSE PROJET ACTUEL
// ============================================================================

function analyzeProject() {
  console.log('📊 PHASE 2: Analyse du projet...\n');
  
  const analysis = {
    drivers: [],
    issues: {
      missing_learnmode: [],
      duplicate_flow_ids: [],
      missing_device_tokens: [],
      invalid_images: [],
      missing_titleFormatted: []
    },
    stats: {
      total_drivers: 0,
      zigbee_drivers: 0,
      valid_drivers: 0
    }
  };
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );
  
  analysis.stats.total_drivers = drivers.length;
  
  for (const driverName of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const composeJsonPath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composeJsonPath)) continue;
    
    try {
      const driver = JSON.parse(fs.readFileSync(composeJsonPath, 'utf8'));
      
      const driverInfo = {
        name: driverName,
        path: driverPath,
        isZigbee: !!driver.zigbee,
        hasLearnmode: driver.zigbee?.learnmode ? true : false,
        hasImages: checkDriverImages(driverPath),
        flowCards: extractFlowCards(driverPath)
      };
      
      analysis.drivers.push(driverInfo);
      
      if (driverInfo.isZigbee) {
        analysis.stats.zigbee_drivers++;
        
        if (!driverInfo.hasLearnmode) {
          analysis.issues.missing_learnmode.push(driverName);
        }
      }
      
      if (!driverInfo.hasImages.valid) {
        analysis.issues.invalid_images.push({
          driver: driverName,
          issues: driverInfo.hasImages.issues
        });
      }
      
    } catch (err) {
      console.error(`⚠️  ${driverName}: ${err.message}`);
    }
  }
  
  return analysis;
}

function checkDriverImages(driverPath) {
  const imagesPath = path.join(driverPath, 'assets', 'images');
  const result = { valid: true, issues: [] };
  
  if (!fs.existsSync(imagesPath)) {
    result.valid = false;
    result.issues.push('No images directory');
    return result;
  }
  
  const requiredImages = ['small.png', 'large.png', 'xlarge.png'];
  
  for (const img of requiredImages) {
    const imgPath = path.join(imagesPath, img);
    if (!fs.existsSync(imgPath)) {
      result.valid = false;
      result.issues.push(`Missing ${img}`);
    }
  }
  
  return result;
}

function extractFlowCards(driverPath) {
  const flowComposePath = path.join(driverPath, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowComposePath)) {
    return { triggers: [], conditions: [], actions: [] };
  }
  
  try {
    const flow = JSON.parse(fs.readFileSync(flowComposePath, 'utf8'));
    return {
      triggers: flow.triggers || [],
      conditions: flow.conditions || [],
      actions: flow.actions || []
    };
  } catch (err) {
    return { triggers: [], conditions: [], actions: [] };
  }
}

// ============================================================================
// PHASE 3: ENRICHISSEMENT AUTOMATIQUE
// ============================================================================

function enrichAllDrivers(analysis) {
  console.log('\n🔧 PHASE 3: Enrichissement automatique...\n');
  
  let enriched = 0;
  let errors = 0;
  
  for (const driverInfo of analysis.drivers) {
    try {
      // 3.1: Ajouter learnmode si manquant
      if (driverInfo.isZigbee && !driverInfo.hasLearnmode) {
        addLearnmodeToDriver(driverInfo.name);
        console.log(`✅ ${driverInfo.name}: Learnmode ajouté`);
        enriched++;
      }
      
      // 3.2: Fixer flow cards
      fixDriverFlowCards(driverInfo);
      
      // 3.3: Vérifier/créer images
      ensureDriverImages(driverInfo);
      
    } catch (err) {
      console.error(`❌ ${driverInfo.name}: ${err.message}`);
      errors++;
    }
  }
  
  console.log(`\n📊 Enrichissement: ${enriched} drivers enrichis, ${errors} erreurs\n`);
}

function addLearnmodeToDriver(driverName) {
  const composeJsonPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  const driver = JSON.parse(fs.readFileSync(composeJsonPath, 'utf8'));
  
  if (!driver.zigbee) return;
  
  driver.zigbee.learnmode = HOMEY_SDK3_SPECS.zigbee.learnmode_template;
  
  fs.writeFileSync(composeJsonPath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
}

function fixDriverFlowCards(driverInfo) {
  const flowComposePath = path.join(driverInfo.path, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowComposePath)) return;
  
  try {
    const flow = JSON.parse(fs.readFileSync(flowComposePath, 'utf8'));
    let modified = false;
    
    // Fixer IDs dupliqués
    ['triggers', 'conditions', 'actions'].forEach(cardType => {
      if (!flow[cardType]) return;
      
      flow[cardType].forEach(card => {
        // Rendre IDs uniques
        if (card.id && !card.id.startsWith(driverInfo.name + '_')) {
          card.id = `${driverInfo.name}_${card.id}`;
          modified = true;
        }
        
        // Ajouter [[device]] token
        if (card.titleFormatted && card.args?.some(a => a.type === 'device')) {
          Object.keys(card.titleFormatted).forEach(lang => {
            if (!card.titleFormatted[lang].includes('[[device]]')) {
              card.titleFormatted[lang] = `[[device]] ${card.titleFormatted[lang]}`;
              modified = true;
            }
          });
        }
      });
    });
    
    if (modified) {
      fs.writeFileSync(flowComposePath, JSON.stringify(flow, null, 2) + '\n', 'utf8');
    }
    
  } catch (err) {
    // Skip invalid JSON
  }
}

function ensureDriverImages(driverInfo) {
  const imagesPath = path.join(driverInfo.path, 'assets', 'images');
  
  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }
  
  // Copier depuis assets/templates si existant
  const templatePath = path.join(PROJECT_ROOT, 'assets', 'templates', 'driver-template', 'assets', 'images');
  
  if (fs.existsSync(templatePath)) {
    const images = ['small.png', 'large.png', 'xlarge.png'];
    
    for (const img of images) {
      const targetPath = path.join(imagesPath, img);
      if (!fs.existsSync(targetPath)) {
        const sourcePath = path.join(templatePath, img);
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
        }
      }
    }
  }
}

// ============================================================================
// PHASE 4: VALIDATION COMPLÈTE
// ============================================================================

function validateComplete() {
  console.log('\n🔍 PHASE 4: Validation complète...\n');
  
  // Nettoyer cache
  console.log('🧹 Nettoyage cache...');
  try {
    execSync('Remove-Item -Recurse -Force .homeybuild,.homeycompose -ErrorAction SilentlyContinue', {
      cwd: PROJECT_ROOT,
      shell: 'powershell.exe',
      stdio: 'inherit'
    });
  } catch (err) {
    // Ignorable
  }
  
  // Build
  console.log('\n🔨 Build app...');
  try {
    execSync('homey app build', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });
  } catch (err) {
    console.error('Build failed:', err.message);
    return false;
  }
  
  // Validation publish
  console.log('\n✅ Validation publish level...');
  try {
    execSync('homey app validate --level publish', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });
    console.log('\n🎉 VALIDATION PASSED!');
    return true;
  } catch (err) {
    console.log('\n⚠️  Validation has issues (see above)');
    return false;
  }
}

// ============================================================================
// PHASE 5: GÉNÉRATION RAPPORT
// ============================================================================

function generateReport(analysis) {
  console.log('\n📄 PHASE 5: Génération rapport...\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    project: {
      total_drivers: analysis.stats.total_drivers,
      zigbee_drivers: analysis.stats.zigbee_drivers,
      valid_drivers: analysis.stats.valid_drivers
    },
    issues_found: {
      missing_learnmode: analysis.issues.missing_learnmode.length,
      duplicate_flow_ids: analysis.issues.duplicate_flow_ids.length,
      invalid_images: analysis.issues.invalid_images.length,
      missing_titleFormatted: analysis.issues.missing_titleFormatted.length
    },
    issues_details: analysis.issues,
    homey_sdk3_compliance: {
      spec_version: '3.0',
      validation_level: 'publish',
      image_specs: HOMEY_SDK3_SPECS.images,
      zigbee_requirements: HOMEY_SDK3_SPECS.zigbee.required_fields
    }
  };
  
  const reportPath = path.join(PROJECT_ROOT, 'reports', 'COMPLETE_ENRICHMENT_REPORT.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`✅ Rapport sauvegardé: ${reportPath}\n`);
  
  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('                    📊 RÉSUMÉ FINAL');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total drivers:        ${report.project.total_drivers}`);
  console.log(`Zigbee drivers:       ${report.project.zigbee_drivers}`);
  console.log(`Missing learnmode:    ${report.issues_found.missing_learnmode}`);
  console.log(`Invalid images:       ${report.issues_found.invalid_images}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  return report;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🚀 SYSTÈME D\'ENRICHISSEMENT COMPLET - HOMEY SDK3');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Phase 1: Référentiel (déjà défini)
    console.log('✅ PHASE 1: Référentiel Homey SDK3 chargé\n');
    
    // Phase 2: Analyse
    const analysis = analyzeProject();
    
    // Phase 3: Enrichissement
    enrichAllDrivers(analysis);
    
    // Phase 4: Validation
    const validationPassed = validateComplete();
    
    // Phase 5: Rapport
    const report = generateReport(analysis);
    
    // Final status
    if (validationPassed) {
      console.log('🎉 ═════════════════════════════════════════════════════');
      console.log('   ✅ ENRICHISSEMENT COMPLET - VALIDATION PASSED!');
      console.log('   ═════════════════════════════════════════════════════\n');
    } else {
      console.log('⚠️  ═════════════════════════════════════════════════════');
      console.log('   ENRICHISSEMENT COMPLET - VALIDATION ISSUES FOUND');
      console.log('   Consultez le rapport pour détails');
      console.log('   ═════════════════════════════════════════════════════\n');
    }
    
  } catch (err) {
    console.error('\n❌ ERREUR FATALE:', err);
    process.exit(1);
  }
}

// RUN
main();
