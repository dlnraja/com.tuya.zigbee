#!/usr/bin/env node

/**
 * ULTIMATE_PROJECT_AUDIT.js
 * Audit ULTRA-COMPLET de tout le projet
 * - Chaque driver individuellement
 * - Extensions, types (hybrid, AC, DC, battery)
 * - Images (assets, icons, générateurs)
 * - app.json
 * - Tous répertoires supplémentaires
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 AUDIT ULTRA-COMPLET DU PROJET\n');
console.log('Vérification de TOUT: drivers, extensions, types, images, générateurs...\n');

const PROJECT_ROOT = path.join(__dirname, '..');

let audit = {
  drivers: { total: 0, ok: 0, issues: [] },
  extensions: { total: 0, ok: 0, issues: [] },
  types: { battery: 0, ac: 0, hybrid: 0, dc: 0, unknown: 0 },
  images: { total: 0, missing: 0, issues: [] },
  appJson: { ok: true, issues: [] },
  directories: { total: 0, issues: [] },
  generators: { found: [], issues: [] }
};

// ============================================
// 1. AUDIT APP.JSON
// ============================================
console.log('📄 AUDIT APP.JSON...\n');

const appJsonPath = path.join(PROJECT_ROOT, 'app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    // Vérifications essentielles
    if (!appJson.id) audit.appJson.issues.push('Missing app.id');
    if (!appJson.version) audit.appJson.issues.push('Missing version');
    if (!appJson.name) audit.appJson.issues.push('Missing name');
    if (!appJson.description) audit.appJson.issues.push('Missing description');
    if (!appJson.images) audit.appJson.issues.push('Missing images');
    if (!appJson.author) audit.appJson.issues.push('Missing author');
    
    // Vérifier images app
    if (appJson.images) {
      ['small', 'large', 'xlarge'].forEach(size => {
        if (appJson.images[size]) {
          const imgPath = path.join(PROJECT_ROOT, appJson.images[size]);
          if (!fs.existsSync(imgPath)) {
            audit.appJson.issues.push(`Missing app image: ${size}`);
          }
        }
      });
    }
    
    console.log(`✅ app.json version: ${appJson.version}`);
    console.log(`✅ app.json drivers count: ${Object.keys(appJson.drivers || []).length}`);
    
  } catch (error) {
    audit.appJson.ok = false;
    audit.appJson.issues.push(`Parse error: ${error.message}`);
  }
} else {
  audit.appJson.ok = false;
  audit.appJson.issues.push('app.json not found');
}

// ============================================
// 2. AUDIT IMAGES ASSETS
// ============================================
console.log('\n📸 AUDIT IMAGES ASSETS...\n');

const assetsDir = path.join(PROJECT_ROOT, 'assets');
if (fs.existsSync(assetsDir)) {
  const checkDir = (dir, prefix = '') => {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        checkDir(fullPath, prefix + item + '/');
      } else if (stat.isFile()) {
        audit.images.total++;
        const ext = path.extname(item).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.svg', '.gif'].includes(ext)) {
          // OK
        } else {
          audit.images.issues.push(`Unexpected file type: ${prefix}${item}`);
        }
      }
    });
  };
  
  checkDir(assetsDir);
  console.log(`✅ Total asset files found: ${audit.images.total}`);
}

// ============================================
// 3. AUDIT GÉNÉRATEURS D'IMAGES
// ============================================
console.log('\n🎨 AUDIT GÉNÉRATEURS D\'IMAGES...\n');

const scriptsDir = path.join(PROJECT_ROOT, 'scripts');
if (fs.existsSync(scriptsDir)) {
  const scripts = fs.readdirSync(scriptsDir);
  scripts.forEach(script => {
    const lowerScript = script.toLowerCase();
    if (lowerScript.includes('image') || lowerScript.includes('icon') || lowerScript.includes('generate')) {
      audit.generators.found.push(script);
      console.log(`✅ Générateur trouvé: ${script}`);
    }
  });
}

// ============================================
// 4. AUDIT RÉPERTOIRES SUPPLÉMENTAIRES
// ============================================
console.log('\n📁 AUDIT RÉPERTOIRES...\n');

const checkDirectory = (dirPath, name) => {
  if (fs.existsSync(dirPath)) {
    const stats = fs.statSync(dirPath);
    if (stats.isDirectory()) {
      const items = fs.readdirSync(dirPath);
      console.log(`✅ ${name}: ${items.length} items`);
      audit.directories.total++;
      return items.length;
    }
  }
  audit.directories.issues.push(`Missing or invalid: ${name}`);
  return 0;
};

checkDirectory(path.join(PROJECT_ROOT, 'drivers'), 'drivers/');
checkDirectory(path.join(PROJECT_ROOT, 'lib'), 'lib/');
checkDirectory(path.join(PROJECT_ROOT, 'locales'), 'locales/');
checkDirectory(path.join(PROJECT_ROOT, 'assets'), 'assets/');
checkDirectory(path.join(PROJECT_ROOT, 'docs'), 'docs/');
checkDirectory(path.join(PROJECT_ROOT, 'scripts'), 'scripts/');
checkDirectory(path.join(PROJECT_ROOT, '.github'), '.github/');

// ============================================
// 5. AUDIT CHAQUE DRIVER INDIVIDUELLEMENT
// ============================================
console.log('\n🚗 AUDIT DÉTAILLÉ CHAQUE DRIVER...\n');

const driversDir = path.join(PROJECT_ROOT, 'drivers');
if (fs.existsSync(driversDir)) {
  const drivers = fs.readdirSync(driversDir).filter(item => {
    return fs.statSync(path.join(driversDir, item)).isDirectory();
  });
  
  audit.drivers.total = drivers.length;
  
  drivers.forEach((driverFolder, idx) => {
    const driverPath = path.join(driversDir, driverFolder);
    const composeFile = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) {
      audit.drivers.issues.push(`${driverFolder}: Missing driver.compose.json`);
      return;
    }
    
    try {
      const driver = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      let driverIssues = [];
      
      // Type de power
      const folderLower = driverFolder.toLowerCase();
      if (folderLower.includes('battery') || folderLower.includes('cr2032')) {
        audit.types.battery++;
        
        // Vérifier energy.batteries
        if (!driver.energy?.batteries) {
          driverIssues.push('Has battery in name but no energy.batteries');
        }
        
        // Vérifier measure_battery capability
        if (!driver.capabilities?.includes('measure_battery')) {
          driverIssues.push('Battery device without measure_battery capability');
        }
      } else if (folderLower.includes('hybrid')) {
        audit.types.hybrid++;
      } else if (folderLower.includes('_ac')) {
        audit.types.ac++;
      } else if (folderLower.includes('_dc')) {
        audit.types.dc++;
      } else {
        audit.types.unknown++;
      }
      
      // Vérifier images driver
      const assetsPath = path.join(driverPath, 'assets');
      if (fs.existsSync(assetsPath)) {
        const requiredImages = ['icon.svg', 'small.png', 'large.png', 'xlarge.png'];
        requiredImages.forEach(img => {
          if (!fs.existsSync(path.join(assetsPath, img))) {
            if (img === 'icon.svg') {
              // icon.svg optionnel
            } else {
              driverIssues.push(`Missing asset: ${img}`);
              audit.images.missing++;
            }
          }
        });
      } else {
        driverIssues.push('Missing assets folder');
      }
      
      // Vérifier extensions fichiers essentiels
      const essentialFiles = ['device.js', 'driver.js'];
      essentialFiles.forEach(file => {
        if (!fs.existsSync(path.join(driverPath, file))) {
          driverIssues.push(`Missing ${file}`);
        }
      });
      
      // Vérifier images dans driver.compose.json
      if (!driver.images) {
        driverIssues.push('Missing images block in compose');
      } else {
        if (!driver.images.small || !driver.images.large) {
          driverIssues.push('Incomplete images in compose');
        }
      }
      
      // Vérifier learnmode image
      if (driver.zigbee?.learnmode?.image) {
        const expectedPath = `/drivers/${driverFolder}/assets/large.png`;
        if (driver.zigbee.learnmode.image !== expectedPath) {
          driverIssues.push(`Incorrect learnmode image path`);
        }
      }
      
      // Vérifier platforms & connectivity
      if (!driver.platforms?.includes('local')) {
        driverIssues.push('Missing platform: local');
      }
      if (!driver.connectivity?.includes('zigbee')) {
        driverIssues.push('Missing connectivity: zigbee');
      }
      
      // Vérifier class
      if (!driver.class) {
        driverIssues.push('Missing class');
      }
      
      if (driverIssues.length > 0) {
        audit.drivers.issues.push({
          driver: driverFolder,
          issues: driverIssues
        });
      } else {
        audit.drivers.ok++;
      }
      
      // Progress
      if (idx % 30 === 0 || driverIssues.length > 0) {
        const status = driverIssues.length > 0 ? '⚠️ ' : '✅';
        console.log(`${status} [${idx + 1}/${drivers.length}] ${driverFolder}`);
        if (driverIssues.length > 0) {
          driverIssues.forEach(issue => console.log(`   - ${issue}`));
        }
      }
      
    } catch (error) {
      audit.drivers.issues.push({
        driver: driverFolder,
        issues: [`Parse error: ${error.message}`]
      });
    }
  });
}

// ============================================
// RAPPORT FINAL
// ============================================
console.log('\n' + '='.repeat(70));
console.log('📊 RAPPORT FINAL ULTRA-COMPLET');
console.log('='.repeat(70));

console.log('\n📄 APP.JSON:');
console.log(`Status: ${audit.appJson.ok ? '✅ OK' : '❌ Issues'}`);
if (audit.appJson.issues.length > 0) {
  audit.appJson.issues.forEach(issue => console.log(`  - ${issue}`));
}

console.log('\n🚗 DRIVERS:');
console.log(`Total: ${audit.drivers.total}`);
console.log(`OK: ${audit.drivers.ok} (${Math.round(audit.drivers.ok/audit.drivers.total*100)}%)`);
console.log(`Issues: ${audit.drivers.issues.length}`);

console.log('\n⚡ TYPES DE POWER:');
console.log(`Battery: ${audit.types.battery}`);
console.log(`AC: ${audit.types.ac}`);
console.log(`Hybrid: ${audit.types.hybrid}`);
console.log(`DC: ${audit.types.dc}`);
console.log(`Unknown: ${audit.types.unknown}`);

console.log('\n📸 IMAGES:');
console.log(`Total assets: ${audit.images.total}`);
console.log(`Missing: ${audit.images.missing}`);

console.log('\n🎨 GÉNÉRATEURS:');
console.log(`Found: ${audit.generators.found.length}`);
audit.generators.found.forEach(gen => console.log(`  - ${gen}`));

console.log('\n📁 RÉPERTOIRES:');
console.log(`Checked: ${audit.directories.total}`);
if (audit.directories.issues.length > 0) {
  console.log('Issues:');
  audit.directories.issues.forEach(issue => console.log(`  - ${issue}`));
}

if (audit.drivers.issues.length > 0) {
  console.log('\n⚠️  DRIVERS AVEC ISSUES (Top 10):');
  audit.drivers.issues.slice(0, 10).forEach(item => {
    console.log(`\n${item.driver}:`);
    item.issues.forEach(issue => console.log(`  - ${issue}`));
  });
  if (audit.drivers.issues.length > 10) {
    console.log(`\n... et ${audit.drivers.issues.length - 10} autres drivers avec issues`);
  }
}

console.log('\n' + '='.repeat(70));

// Score final
const totalChecks = audit.drivers.total + 1; // +1 pour app.json
const successfulChecks = audit.drivers.ok + (audit.appJson.ok ? 1 : 0);
const score = Math.round(successfulChecks / totalChecks * 100);

console.log(`\n📊 SCORE QUALITÉ: ${score}%`);

if (score >= 95) {
  console.log('✅ EXCELLENT - Production ready!');
} else if (score >= 80) {
  console.log('✅ BON - Quelques améliorations possibles');
} else if (score >= 60) {
  console.log('⚠️  MOYEN - Corrections recommandées');
} else {
  console.log('❌ FAIBLE - Corrections nécessaires');
}

// Sauvegarder rapport JSON
const reportPath = path.join(PROJECT_ROOT, 'reports', 'ULTIMATE_AUDIT_REPORT.json');
const reportDir = path.dirname(reportPath);
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}
fs.writeFileSync(reportPath, JSON.stringify(audit, null, 2));
console.log(`\n💾 Rapport sauvegardé: ${reportPath}`);

process.exit(audit.drivers.issues.length > 50 ? 1 : 0);
