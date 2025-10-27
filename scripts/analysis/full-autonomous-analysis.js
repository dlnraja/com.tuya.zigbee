#!/usr/bin/env node
// full-autonomous-analysis.js
// SYSTÈME AUTONOME COMPLET: Update PowerShell + Download sources + Analyze
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

console.log('🚀 SYSTÈME AUTONOME COMPLET - DÉMARRAGE\n');

// ============================================================
// PHASE 1: UPDATE POWERSHELL SILENCIEUSEMENT
// ============================================================
async function updatePowerShell() {
  console.log('⚡ PHASE 1: Mise à jour PowerShell...\n');
  
  try {
    console.log('   Vérification winget...');
    execSync('winget --version', { stdio: 'pipe' });
    console.log('   ✅ winget disponible\n');
    
    console.log('   Installation PowerShell dernière version (silencieux)...');
    // --silent --accept-source-agreements --accept-package-agreements = mode autonome
    execSync('winget install --id Microsoft.PowerShell --silent --accept-source-agreements --accept-package-agreements', {
      stdio: 'inherit'
    });
    console.log('   ✅ PowerShell mis à jour!\n');
    
  } catch (err) {
    console.log('   ⚠️ PowerShell déjà à jour ou erreur:', err.message);
  }
}

// ============================================================
// PHASE 2: TÉLÉCHARGER SOURCES HOMEY (via BrowserMCP)
// ============================================================
async function downloadHomeySources() {
  console.log('📦 PHASE 2: Téléchargement sources Homey...\n');
  
  console.log('   ℹ️ Pour télécharger les sources:');
  console.log('   1. Le serveur BrowserMCP doit être lancé');
  console.log('   2. Utilisez le script MCP:');
  console.log('      scripts/automation/download_homey_versions.mcp.json');
  console.log('   3. Ou manuellement:');
  console.log('      https://developer.homey.app/apps/com.dlnraja.tuya.zigbee/versions\n');
  
  // Attendre que l'utilisateur ait téléchargé
  const downloadPath = 'D:\\Download';
  console.log('   📂 Vérification D:\\Download\\...');
  
  const zips = fs.readdirSync(downloadPath).filter(f => 
    f.includes('com.dlnraja.tuya.zigbee') && f.endsWith('.zip')
  );
  
  if (zips.length === 0) {
    console.log('   ⚠️ Aucun ZIP trouvé dans D:\\Download\\');
    console.log('   ℹ️ Téléchargez d\'abord les sources depuis Homey Developer Dashboard\n');
    return false;
  }
  
  console.log(`   ✅ Trouvé ${zips.length} ZIP(s)!\n`);
  return true;
}

// ============================================================
// PHASE 3: EXTRAIRE ET ANALYSER
// ============================================================
async function extractAndAnalyze() {
  console.log('🔍 PHASE 3: Extraction et analyse...\n');
  
  const downloadPath = 'D:\\Download';
  const extractPath = path.join(downloadPath, 'extracted');
  
  // Créer dossier extraction
  if (!fs.existsSync(extractPath)) {
    fs.mkdirSync(extractPath, { recursive: true });
  }
  
  const zips = fs.readdirSync(downloadPath).filter(f => 
    f.includes('com.dlnraja.tuya.zigbee') && f.endsWith('.zip')
  );
  
  const results = [];
  
  for (const zipFile of zips) {
    console.log(`   📦 Extraction: ${zipFile}...`);
    
    const zipPath = path.join(downloadPath, zipFile);
    const outDir = path.join(extractPath, path.basename(zipFile, '.zip'));
    
    if (!fs.existsSync(outDir)) {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(outDir, true);
    }
    
    // Analyser app.json
    const appJsonPath = path.join(outDir, 'app.json');
    if (fs.existsSync(appJsonPath)) {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      
      // Compter drivers
      const driversPath = path.join(outDir, 'drivers');
      let driverCount = 0;
      if (fs.existsSync(driversPath)) {
        driverCount = fs.readdirSync(driversPath).filter(f => 
          fs.statSync(path.join(driversPath, f)).isDirectory()
        ).length;
      }
      
      // Chercher configureReporting dans lib/
      const libPath = path.join(outDir, 'lib');
      let hasReporting = false;
      if (fs.existsSync(libPath)) {
        const libFiles = fs.readdirSync(libPath).filter(f => f.endsWith('.js'));
        for (const file of libFiles) {
          const content = fs.readFileSync(path.join(libPath, file), 'utf8');
          if (content.includes('configureReporting')) {
            hasReporting = true;
            break;
          }
        }
      }
      
      results.push({
        version: appJson.version,
        sdk: appJson.sdk,
        drivers: driverCount,
        hasReporting,
        path: outDir
      });
      
      console.log(`      Version: ${appJson.version}`);
      console.log(`      SDK: ${appJson.sdk}`);
      console.log(`      Drivers: ${driverCount}`);
      console.log(`      Reporting: ${hasReporting ? '✅' : '❌'}`);
    }
    console.log('');
  }
  
  return results;
}

// ============================================================
// PHASE 4: GÉNÉRER RAPPORT
// ============================================================
async function generateReport(results) {
  console.log('📊 PHASE 4: Génération rapport...\n');
  
  // Trier par version
  results.sort((a, b) => {
    const vA = a.version.split('.').map(Number);
    const vB = b.version.split('.').map(Number);
    for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
      if ((vA[i] || 0) !== (vB[i] || 0)) {
        return (vB[i] || 0) - (vA[i] || 0);
      }
    }
    return 0;
  });
  
  let report = '# 📊 RAPPORT ANALYSE VERSIONS HOMEY\n\n';
  report += `**Généré:** ${new Date().toISOString()}\n\n`;
  report += '---\n\n';
  
  report += '## 📈 Résumé\n\n';
  report += `- **Versions analysées:** ${results.length}\n`;
  report += `- **Avec reporting:** ${results.filter(r => r.hasReporting).length}\n`;
  report += `- **Sans reporting:** ${results.filter(r => !r.hasReporting).length}\n\n`;
  
  report += '---\n\n';
  report += '## 🔍 Détails par Version\n\n';
  
  for (const r of results) {
    report += `### ${r.version}\n`;
    report += `- **SDK:** ${r.sdk}\n`;
    report += `- **Drivers:** ${r.drivers}\n`;
    report += `- **Reporting:** ${r.hasReporting ? '✅ OUI' : '❌ NON'}\n`;
    report += `- **Path:** \`${r.path}\`\n\n`;
  }
  
  report += '---\n\n';
  report += '## 📋 Comparaison\n\n';
  report += '| Version | SDK | Drivers | Reporting |\n';
  report += '|---------|-----|---------|----------|\n';
  
  for (const r of results) {
    report += `| ${r.version} | ${r.sdk} | ${r.drivers} | ${r.hasReporting ? '✅' : '❌'} |\n`;
  }
  
  const reportPath = './analysis_report_autonomous.md';
  fs.writeFileSync(reportPath, report);
  
  console.log(`   ✅ Rapport généré: ${path.resolve(reportPath)}\n`);
  
  // Identifier première version avec reporting
  const firstWithReporting = results.reverse().find(r => r.hasReporting);
  if (firstWithReporting) {
    console.log('   🎯 PREMIÈRE VERSION AVEC REPORTING:');
    console.log(`      ${firstWithReporting.version}`);
    console.log(`      → À comparer avec v4.9.67!\n`);
  }
}

// ============================================================
// PHASE 5: SUGGESTIONS
// ============================================================
function showSuggestions() {
  console.log('💡 PHASE 5: Suggestions...\n');
  
  console.log('   📌 Prochaines étapes:');
  console.log('   1. Lire analysis_report_autonomous.md');
  console.log('   2. Identifier version qui marchait (avec reporting)');
  console.log('   3. Comparer lib/ entre version qui marche et v4.9.67');
  console.log('   4. Porter le code de reporting vers v4.9.68\n');
  
  console.log('   🔧 Commandes utiles:');
  console.log('   - Voir différences: git diff <version-ok> <version-ko> -- lib/');
  console.log('   - Extraire fichier: git show <version>:lib/file.js\n');
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  try {
    // Phase 1: Update PowerShell
    await updatePowerShell();
    
    // Phase 2: Download sources (info seulement)
    const hasZips = await downloadHomeySources();
    
    if (!hasZips) {
      console.log('\n❌ Arrêt: Téléchargez d\'abord les sources!\n');
      console.log('📋 TODO:');
      console.log('   1. Ouvre https://developer.homey.app/apps/com.dlnraja.tuya.zigbee/versions');
      console.log('   2. Clique "Download source" pour v4.1.9, v3.0.61, v4.9.67');
      console.log('   3. Sauvegarde dans D:\\Download\\');
      console.log('   4. Re-lance ce script\n');
      process.exit(0);
    }
    
    // Phase 3: Extract and analyze
    const results = await extractAndAnalyze();
    
    // Phase 4: Generate report
    await generateReport(results);
    
    // Phase 5: Suggestions
    showSuggestions();
    
    console.log('✅ SYSTÈME AUTONOME TERMINÉ!\n');
    
  } catch (err) {
    console.error('\n❌ ERREUR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Lancer si exécuté directement
if (require.main === module) {
  main();
}

module.exports = { main };
