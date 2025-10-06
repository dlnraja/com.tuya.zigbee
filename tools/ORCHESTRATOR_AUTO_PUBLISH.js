#!/usr/bin/env node
// ============================================================================
// ORCHESTRATOR AUTO PUBLISH - Orchestrateur avec Publication Automatique
// ============================================================================

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const driversPath = path.join(rootPath, 'drivers');

console.log('🎯 ORCHESTRATOR AUTO PUBLISH - Publication Autonome Complète');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}\n`);

const report = {
  timestamp: new Date().toISOString(),
  phases: {},
  version: null,
  published: false
};

// ============================================================================
// PHASE 1: VALIDATION PRÉ-PUBLICATION
// ============================================================================
async function phase1_validation() {
  console.log('📋 PHASE 1: VALIDATION PRÉ-PUBLICATION\n');
  
  try {
    // Valider app
    console.log('  🔍 Validation Homey...');
    execSync('homey app validate --level=publish', {
      cwd: rootPath,
      stdio: 'pipe'
    });
    console.log('  ✅ Validation PASS\n');
    
    // Compter drivers
    const drivers = fs.readdirSync(driversPath)
      .filter(d => fs.statSync(path.join(driversPath, d)).isDirectory());
    console.log(`  📦 Drivers: ${drivers.length}\n`);
    
    report.phases.validation = {
      status: 'success',
      drivers: drivers.length
    };
    
    return true;
  } catch (e) {
    console.log('  ❌ Validation échouée\n');
    report.phases.validation = { status: 'error', error: e.message };
    return false;
  }
}

// ============================================================================
// PHASE 2: VÉRIFICATION COHÉRENCE
// ============================================================================
async function phase2_coherence() {
  console.log('🔍 PHASE 2: VÉRIFICATION COHÉRENCE\n');
  
  let emptyDrivers = 0;
  let validDrivers = 0;
  
  const drivers = fs.readdirSync(driversPath)
    .filter(d => fs.statSync(path.join(driversPath, d)).isDirectory());
  
  for (const driverName of drivers) {
    const composeFile = path.join(driversPath, driverName, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) continue;
    
    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      
      if (!compose.zigbee || !compose.zigbee.manufacturerName || 
          compose.zigbee.manufacturerName.length === 0) {
        emptyDrivers++;
      } else {
        validDrivers++;
      }
    } catch (e) {}
  }
  
  console.log(`  ✅ Drivers valides: ${validDrivers}`);
  console.log(`  ${emptyDrivers > 0 ? '⚠️' : '✅'} Drivers vides: ${emptyDrivers}\n`);
  
  report.phases.coherence = {
    status: emptyDrivers === 0 ? 'success' : 'warning',
    valid: validDrivers,
    empty: emptyDrivers
  };
  
  return emptyDrivers === 0;
}

// ============================================================================
// PHASE 3: LECTURE VERSION
// ============================================================================
async function phase3_version() {
  console.log('📊 PHASE 3: LECTURE VERSION\n');
  
  try {
    const appJson = JSON.parse(fs.readFileSync(path.join(rootPath, 'app.json'), 'utf8'));
    const version = appJson.version;
    
    console.log(`  📦 Version actuelle: ${version}\n`);
    
    report.version = version;
    report.phases.version = { status: 'success', version };
    
    return version;
  } catch (e) {
    console.log('  ❌ Erreur lecture version\n');
    report.phases.version = { status: 'error', error: e.message };
    return null;
  }
}

// ============================================================================
// PHASE 4: PUBLICATION AUTOMATIQUE
// ============================================================================
async function phase4_publish() {
  console.log('🚀 PHASE 4: PUBLICATION AUTOMATIQUE\n');
  
  return new Promise((resolve, reject) => {
    console.log('  🤖 Lancement AUTO_PUBLISH_COMPLETE.js...\n');
    
    const publish = spawn('node', ['tools/AUTO_PUBLISH_COMPLETE.js'], {
      cwd: rootPath,
      stdio: 'inherit'
    });
    
    publish.on('close', (code) => {
      if (code === 0) {
        console.log('\n  ✅ Publication réussie !\n');
        report.phases.publish = { status: 'success' };
        report.published = true;
        resolve(true);
      } else {
        console.log('\n  ❌ Publication échouée\n');
        report.phases.publish = { status: 'error', code };
        resolve(false);
      }
    });
    
    publish.on('error', (err) => {
      console.log('\n  ❌ Erreur publication:', err.message, '\n');
      report.phases.publish = { status: 'error', error: err.message };
      resolve(false);
    });
  });
}

// ============================================================================
// PHASE 5: VÉRIFICATION POST-PUBLICATION
// ============================================================================
async function phase5_verification() {
  console.log('✅ PHASE 5: VÉRIFICATION POST-PUBLICATION\n');
  
  try {
    // Lire nouvelle version
    const appJson = JSON.parse(fs.readFileSync(path.join(rootPath, 'app.json'), 'utf8'));
    const newVersion = appJson.version;
    
    console.log(`  📦 Version publiée: ${newVersion}`);
    console.log(`  🔗 Dashboard: https://tools.developer.homey.app/apps`);
    console.log(`  🔗 App Store: https://homey.app/\n`);
    
    report.phases.verification = {
      status: 'success',
      publishedVersion: newVersion
    };
    
    return true;
  } catch (e) {
    console.log('  ⚠️ Vérification partielle\n');
    report.phases.verification = { status: 'warning' };
    return true;
  }
}

// ============================================================================
// RAPPORT FINAL
// ============================================================================
function generateReport() {
  console.log('='.repeat(80));
  console.log('📊 RAPPORT FINAL');
  console.log('='.repeat(80));
  
  console.log('\n✅ PHASES:');
  Object.entries(report.phases).forEach(([phase, data]) => {
    const icon = data.status === 'success' ? '✅' : 
                 data.status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${icon} ${phase}: ${data.status.toUpperCase()}`);
  });
  
  if (report.published) {
    console.log('\n🎉 PUBLICATION RÉUSSIE !');
    console.log(`📦 Version: ${report.version} → ${report.phases.verification?.publishedVersion || 'unknown'}`);
  } else {
    console.log('\n⚠️ Publication non effectuée ou échouée');
  }
  
  // Sauvegarder rapport
  const reportPath = path.join(rootPath, 'references', 'reports', 
    `ORCHESTRATOR_AUTO_${Date.now()}.json`);
  
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📝 Rapport sauvegardé: ${path.basename(reportPath)}`);
  } catch (e) {}
  
  console.log('\n' + '='.repeat(80));
  console.log(report.published ? '🎉 ORCHESTRATION COMPLÈTE RÉUSSIE !' : '⚠️ ORCHESTRATION PARTIELLE');
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// EXÉCUTION PRINCIPALE
// ============================================================================
(async () => {
  try {
    console.log('🎬 DÉMARRAGE ORCHESTRATION COMPLÈTE\n');
    
    // Phase 1: Validation
    const validationOk = await phase1_validation();
    if (!validationOk) {
      console.log('❌ Validation échouée - Arrêt\n');
      generateReport();
      process.exit(1);
    }
    
    // Phase 2: Cohérence
    const coherenceOk = await phase2_coherence();
    if (!coherenceOk) {
      console.log('⚠️ Drivers vides détectés - Continuer quand même ? (y/n)\n');
      // Pour auto, on continue
    }
    
    // Phase 3: Version
    const version = await phase3_version();
    if (!version) {
      console.log('❌ Version introuvable - Arrêt\n');
      generateReport();
      process.exit(1);
    }
    
    // Phase 4: Publication Automatique
    const publishOk = await phase4_publish();
    
    // Phase 5: Vérification
    if (publishOk) {
      await phase5_verification();
    }
    
    // Rapport final
    generateReport();
    
    process.exit(publishOk ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    generateReport();
    process.exit(1);
  }
})();
