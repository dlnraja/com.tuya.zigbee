#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const TEMP_DIR = path.join(ROOT, '.temp-repos');
const LOG_FILE = path.join(ROOT, 'docs', 'enrichment', 'reports', 'IMAGE_IMPROVEMENT_LOG.md');

// Repos de Johan Bendz à cloner
const JOHAN_REPOS = [
  {
    name: 'com.tuya.zigbee',
    url: 'https://github.com/JohanBendz/com.tuya.zigbee.git',
    priority: 'HIGH'
  },
  {
    name: 'com.lidl',
    url: 'https://github.com/JohanBendz/com.lidl.git',
    priority: 'HIGH'
  }
];

// Mappings de drivers similaires
const DRIVER_MAPPINGS = {
  // Motion Sensors
  'motion_sensor': ['pir', 'motion', 'presence', 'radar'],
  'pir_sensor': ['pir', 'motion', 'presence'],
  
  // Contact Sensors
  'contact_sensor': ['contact', 'door', 'window', 'magnet'],
  'door_sensor': ['contact', 'door', 'window'],
  
  // Smart Plugs
  'smart_plug': ['plug', 'socket', 'outlet'],
  'plug': ['plug', 'socket', 'outlet'],
  'socket': ['plug', 'socket', 'outlet'],
  
  // Smart Switches
  'smart_switch': ['switch', 'gang', 'wall'],
  'switch': ['switch', 'gang'],
  
  // Bulbs
  'bulb': ['bulb', 'lamp', 'light'],
  'smart_bulb': ['bulb', 'lamp'],
  
  // LED Strips
  'led_strip': ['strip', 'led'],
  
  // Wireless Switches
  'wireless_switch': ['wireless', 'remote', 'button'],
  'remote': ['wireless', 'remote'],
  
  // Curtains
  'curtain': ['curtain', 'blind', 'roller', 'shutter'],
  'blind': ['curtain', 'blind', 'roller']
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function cloneRepos() {
  console.log('📥 Clonage des repos de Johan Bendz...\n');
  
  ensureDir(TEMP_DIR);
  
  for (const repo of JOHAN_REPOS) {
    const repoPath = path.join(TEMP_DIR, repo.name);
    
    if (fs.existsSync(repoPath)) {
      console.log(`ℹ️  ${repo.name} existe déjà, mise à jour...`);
      try {
        execSync('git pull', { cwd: repoPath, stdio: 'ignore' });
        console.log(`✅ ${repo.name} mis à jour\n`);
      } catch (err) {
        console.log(`⚠️  Erreur lors de la mise à jour de ${repo.name}\n`);
      }
    } else {
      console.log(`📦 Clonage de ${repo.name}...`);
      try {
        execSync(`git clone --depth 1 ${repo.url} "${repoPath}"`, { 
          stdio: 'ignore'
        });
        console.log(`✅ ${repo.name} cloné\n`);
      } catch (err) {
        console.log(`❌ Échec du clonage de ${repo.name}\n`);
      }
    }
  }
}

function findSimilarDriver(driverName, repoPath) {
  const driversPath = path.join(repoPath, 'drivers');
  if (!fs.existsSync(driversPath)) return null;
  
  const driverLower = driverName.toLowerCase();
  const repoDrivers = fs.readdirSync(driversPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  // Recherche exacte
  for (const repoDriver of repoDrivers) {
    if (repoDriver.toLowerCase() === driverLower) {
      return repoDriver;
    }
  }
  
  // Recherche par mots-clés
  for (const [category, keywords] of Object.entries(DRIVER_MAPPINGS)) {
    if (driverLower.includes(category)) {
      for (const repoDriver of repoDrivers) {
        const repoLower = repoDriver.toLowerCase();
        if (keywords.some(kw => repoLower.includes(kw))) {
          return repoDriver;
        }
      }
    }
  }
  
  // Recherche par sous-chaînes communes
  for (const repoDriver of repoDrivers) {
    const repoLower = repoDriver.toLowerCase();
    const commonWords = driverLower.split('_').filter(word => 
      word.length > 4 && repoLower.includes(word)
    );
    if (commonWords.length >= 2) {
      return repoDriver;
    }
  }
  
  return null;
}

function copyImages(sourceDir, destDir) {
  const sourceImages = path.join(sourceDir, 'assets', 'images');
  const destImages = path.join(destDir, 'assets', 'images');
  
  if (!fs.existsSync(sourceImages)) return false;
  
  ensureDir(destImages);
  
  let copied = false;
  
  // Copier small.png
  const sourceSmall = path.join(sourceImages, 'small.png');
  const destSmall = path.join(destImages, 'small.png');
  if (fs.existsSync(sourceSmall)) {
    const sourceSize = fs.statSync(sourceSmall).size;
    if (sourceSize > 2000) { // > 2KB
      fs.copyFileSync(sourceSmall, destSmall);
      copied = true;
    }
  }
  
  // Copier large.png
  const sourceLarge = path.join(sourceImages, 'large.png');
  const destLarge = path.join(destImages, 'large.png');
  if (fs.existsSync(sourceLarge)) {
    const sourceSize = fs.statSync(sourceLarge).size;
    if (sourceSize > 15000) { // > 15KB
      fs.copyFileSync(sourceLarge, destLarge);
      copied = true;
    }
  }
  
  return copied;
}

function improveDriverImages() {
  console.log('\n🎨 Amélioration des images des drivers...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  const results = {
    total: drivers.length,
    improved: 0,
    notFound: 0,
    errors: 0,
    details: []
  };
  
  for (const driver of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driver);
    const currentImages = path.join(driverPath, 'assets', 'images');
    
    // Vérifier si les images existent et leur qualité
    let needsImprovement = false;
    if (fs.existsSync(currentImages)) {
      const smallPath = path.join(currentImages, 'small.png');
      const largePath = path.join(currentImages, 'large.png');
      
      if (fs.existsSync(smallPath)) {
        const size = fs.statSync(smallPath).size;
        if (size < 2000) needsImprovement = true;
      }
      
      if (fs.existsSync(largePath)) {
        const size = fs.statSync(largePath).size;
        if (size < 15000) needsImprovement = true;
      }
    } else {
      needsImprovement = true;
    }
    
    if (!needsImprovement) {
      console.log(`✓ ${driver}: Images OK`);
      continue;
    }
    
    // Chercher dans les repos de Johan
    let found = false;
    for (const repo of JOHAN_REPOS) {
      const repoPath = path.join(TEMP_DIR, repo.name);
      if (!fs.existsSync(repoPath)) continue;
      
      const similarDriver = findSimilarDriver(driver, repoPath);
      if (similarDriver) {
        const sourceDir = path.join(repoPath, 'drivers', similarDriver);
        if (copyImages(sourceDir, driverPath)) {
          console.log(`✅ ${driver}: Images améliorées depuis ${repo.name}/${similarDriver}`);
          results.improved++;
          results.details.push({
            driver,
            source: `${repo.name}/${similarDriver}`,
            status: 'improved'
          });
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      console.log(`⚠️  ${driver}: Aucune image de meilleure qualité trouvée`);
      results.notFound++;
      results.details.push({
        driver,
        status: 'not_found'
      });
    }
  }
  
  return results;
}

function generateReport(results) {
  console.log('\n📝 Génération du rapport...\n');
  
  let report = `# 📊 RAPPORT D'AMÉLIORATION DES IMAGES\n\n`;
  report += `Date: ${new Date().toLocaleString()}\n\n`;
  report += `---\n\n`;
  
  report += `## Statistiques\n\n`;
  report += `- **Total drivers**: ${results.total}\n`;
  report += `- **Images améliorées**: ${results.improved}\n`;
  report += `- **Non trouvées**: ${results.notFound}\n`;
  report += `- **Erreurs**: ${results.errors}\n`;
  report += `- **Taux de réussite**: ${Math.round((results.improved / results.total) * 100)}%\n\n`;
  
  if (results.improved > 0) {
    report += `## ✅ Drivers Améliorés\n\n`;
    report += `| Driver | Source |\n`;
    report += `|--------|--------|\n`;
    
    results.details
      .filter(d => d.status === 'improved')
      .forEach(d => {
        report += `| ${d.driver} | ${d.source} |\n`;
      });
    report += `\n`;
  }
  
  if (results.notFound > 0) {
    report += `## ⚠️ Images Non Trouvées\n\n`;
    report += `Les drivers suivants n'ont pas pu être améliorés automatiquement:\n\n`;
    
    results.details
      .filter(d => d.status === 'not_found')
      .forEach(d => {
        report += `- ${d.driver}\n`;
      });
    report += `\n`;
  }
  
  report += `## 🔗 Sources Utilisées\n\n`;
  JOHAN_REPOS.forEach(repo => {
    report += `- **${repo.name}**: ${repo.url}\n`;
  });
  
  ensureDir(path.dirname(LOG_FILE));
  fs.writeFileSync(LOG_FILE, report);
  console.log(`✅ Rapport généré: ${LOG_FILE}\n`);
}

async function main() {
  console.log('🎨 AMÉLIORATION AUTOMATIQUE DES IMAGES\n');
  console.log('═'.repeat(70) + '\n');
  
  try {
    // Étape 1: Cloner les repos
    cloneRepos();
    
    // Étape 2: Améliorer les images
    const results = improveDriverImages();
    
    // Étape 3: Générer le rapport
    generateReport(results);
    
    console.log('═'.repeat(70));
    console.log('\n✅ AMÉLIORATION TERMINÉE!\n');
    console.log(`📊 Résumé:`);
    console.log(`   - Drivers améliorés: ${results.improved}/${results.total}`);
    console.log(`   - Taux de réussite: ${Math.round((results.improved / results.total) * 100)}%\n`);
    
    if (results.improved > 0) {
      console.log('💡 Prochaines étapes:');
      console.log('   1. Vérifier les images améliorées');
      console.log('   2. Valider l\'application: homey app validate');
      console.log('   3. Commit les changements: git add -A && git commit');
      console.log('   4. Push vers GitHub: git push\n');
    }
  } catch (err) {
    console.error('❌ ERREUR:', err.message);
    process.exit(1);
  }
}

main();
