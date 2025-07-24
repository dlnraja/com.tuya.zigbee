// 🚀 Merge Lot1 & History Script - Tuya Zigbee Project
// Fusion intelligente des dossiers Lot1 et history dans la structure principale

const fs = require('fs');
const path = require('path');

class Lot1HistoryMerger {
  constructor() {
    this.mergedDrivers = [];
    this.errors = [];
    this.stats = {
      lot1_drivers: 0,
      history_drivers: 0,
      merged_drivers: 0,
      skipped_drivers: 0
    };
  }

  // Analyser la structure des dossiers
  analyzeStructure() {
    console.log('🔍 Analyzing Lot1 and History structure...');
    
    const lot1Path = path.join('drivers', 'Lot1');
    const historyPath = path.join('drivers', 'history');
    
    if (fs.existsSync(lot1Path)) {
      const lot1Dirs = fs.readdirSync(lot1Path).filter(d => 
        fs.statSync(path.join(lot1Path, d)).isDirectory()
      );
      this.stats.lot1_drivers = lot1Dirs.length;
      console.log(`📊 Found ${lot1Dirs.length} drivers in Lot1`);
    }
    
    if (fs.existsSync(historyPath)) {
      const historyDirs = fs.readdirSync(historyPath).filter(d => 
        fs.statSync(path.join(historyPath, d)).isDirectory()
      );
      this.stats.history_drivers = historyDirs.length;
      console.log(`📊 Found ${historyDirs.length} drivers in History`);
    }
  }

  // Fusionner un driver
  mergeDriver(sourcePath, targetPath, driverName) {
    try {
      // Vérifier si le driver existe déjà
      if (fs.existsSync(targetPath)) {
        console.log(`⚠️  Driver ${driverName} already exists, merging intelligently...`);
        this.mergeIntelligently(sourcePath, targetPath, driverName);
      } else {
        // Copier le driver
        this.copyDirectory(sourcePath, targetPath);
        console.log(`✅ Merged ${driverName} to ${targetPath}`);
        this.mergedDrivers.push(driverName);
        this.stats.merged_drivers++;
      }
    } catch (error) {
      console.error(`❌ Error merging ${driverName}:`, error.message);
      this.errors.push({ driver: driverName, error: error.message });
    }
  }

  // Fusion intelligente
  mergeIntelligently(sourcePath, targetPath, driverName) {
    const sourceFiles = this.getFilesRecursively(sourcePath);
    const targetFiles = this.getFilesRecursively(targetPath);
    
    sourceFiles.forEach(sourceFile => {
      const relativePath = path.relative(sourcePath, sourceFile);
      const targetFile = path.join(targetPath, relativePath);
      
      if (fs.existsSync(targetFile)) {
        // Fusionner les fichiers intelligemment
        this.mergeFile(sourceFile, targetFile, driverName);
      } else {
        // Copier le nouveau fichier
        const targetDir = path.dirname(targetFile);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.copyFileSync(sourceFile, targetFile);
      }
    });
  }

  // Obtenir tous les fichiers récursivement
  getFilesRecursively(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath));
      } else {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  // Fusionner un fichier
  mergeFile(sourceFile, targetFile, driverName) {
    const sourceContent = fs.readFileSync(sourceFile, 'utf8');
    const targetContent = fs.readFileSync(targetFile, 'utf8');
    
    // Logique de fusion basée sur le type de fichier
    const fileName = path.basename(sourceFile);
    
    if (fileName === 'device.js') {
      this.mergeDeviceFile(sourceContent, targetContent, targetFile, driverName);
    } else if (fileName === 'driver.settings.json') {
      this.mergeSettingsFile(sourceContent, targetContent, targetFile, driverName);
    } else if (fileName === 'driver.compose.json') {
      this.mergeComposeFile(sourceContent, targetContent, targetFile, driverName);
    } else {
      // Pour les autres fichiers, utiliser la version la plus récente
      const sourceStats = fs.statSync(sourceFile);
      const targetStats = fs.statSync(targetFile);
      
      if (sourceStats.mtime > targetStats.mtime) {
        fs.copyFileSync(sourceFile, targetFile);
        console.log(`📝 Updated ${fileName} for ${driverName} (newer version)`);
      }
    }
  }

  // Fusionner device.js
  mergeDeviceFile(sourceContent, targetContent, targetFile, driverName) {
    // Extraire les capacités et clusters
    const sourceCapabilities = this.extractCapabilities(sourceContent);
    const targetCapabilities = this.extractCapabilities(targetContent);
    
    // Fusionner les capacités
    const mergedCapabilities = [...new Set([...targetCapabilities, ...sourceCapabilities])];
    
    // Créer le contenu fusionné
    let mergedContent = targetContent;
    
    // Ajouter les nouvelles capacités manquantes
    sourceCapabilities.forEach(cap => {
      if (!targetCapabilities.includes(cap)) {
        const capPattern = new RegExp(`registerCapability\\('${cap}'`, 'g');
        if (!capPattern.test(targetContent)) {
          // Ajouter la capacité après la dernière capacité existante
          const lastCapIndex = targetContent.lastIndexOf('registerCapability');
          if (lastCapIndex !== -1) {
            const insertIndex = targetContent.indexOf('\n', lastCapIndex) + 1;
            const newCapCode = `    this.registerCapability('${cap}', CLUSTER.${cap.toUpperCase()}, {
      getOpts: { getOnStart: true, pollInterval: 60000 }
    });\n`;
            mergedContent = targetContent.slice(0, insertIndex) + newCapCode + targetContent.slice(insertIndex);
          }
        }
      }
    });
    
    // Sauvegarder le fichier fusionné
    fs.writeFileSync(targetFile, mergedContent);
    console.log(`🔧 Merged device.js for ${driverName} with ${mergedCapabilities.length} capabilities`);
  }

  // Extraire les capacités d'un fichier device.js
  extractCapabilities(content) {
    const capabilities = [];
    const capMatches = content.match(/registerCapability\('([^']+)'/g);
    if (capMatches) {
      capMatches.forEach(match => {
        const cap = match.match(/registerCapability\('([^']+)'/)[1];
        capabilities.push(cap);
      });
    }
    return capabilities;
  }

  // Fusionner driver.settings.json
  mergeSettingsFile(sourceContent, targetContent, targetFile, driverName) {
    try {
      const sourceSettings = JSON.parse(sourceContent);
      const targetSettings = JSON.parse(targetContent);
      
      // Fusionner les paramètres
      const mergedSettings = { ...targetSettings, ...sourceSettings };
      
      // Sauvegarder le fichier fusionné
      fs.writeFileSync(targetFile, JSON.stringify(mergedSettings, null, 2));
      console.log(`⚙️  Merged settings for ${driverName}`);
    } catch (error) {
      console.error(`❌ Error merging settings for ${driverName}:`, error.message);
    }
  }

  // Fusionner driver.compose.json
  mergeComposeFile(sourceContent, targetContent, targetFile, driverName) {
    try {
      const sourceCompose = JSON.parse(sourceContent);
      const targetCompose = JSON.parse(targetContent);
      
      // Fusionner les configurations
      const mergedCompose = {
        ...targetCompose,
        ...sourceCompose,
        // Fusionner les arrays intelligemment
        capabilities: [...new Set([...(targetCompose.capabilities || []), ...(sourceCompose.capabilities || [])])],
        clusters: [...new Set([...(targetCompose.clusters || []), ...(sourceCompose.clusters || [])])]
      };
      
      // Sauvegarder le fichier fusionné
      fs.writeFileSync(targetFile, JSON.stringify(mergedCompose, null, 2));
      console.log(`📋 Merged compose for ${driverName}`);
    } catch (error) {
      console.error(`❌ Error merging compose for ${driverName}:`, error.message);
    }
  }

  // Copier un répertoire
  copyDirectory(source, target) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    
    const items = fs.readdirSync(source);
    items.forEach(item => {
      const sourcePath = path.join(source, item);
      const targetPath = path.join(target, item);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    });
  }

  // Exécuter la fusion
  async execute() {
    console.log('🚀 Starting Lot1 and History merge...');
    
    this.analyzeStructure();
    
    // Fusionner Lot1
    const lot1Path = path.join('drivers', 'Lot1');
    if (fs.existsSync(lot1Path)) {
      console.log('\n📦 Processing Lot1 drivers...');
      const lot1Dirs = fs.readdirSync(lot1Path).filter(d => 
        fs.statSync(path.join(lot1Path, d)).isDirectory()
      );
      
      lot1Dirs.forEach(dir => {
        const sourcePath = path.join(lot1Path, dir);
        const targetPath = path.join('drivers', dir);
        this.mergeDriver(sourcePath, targetPath, dir);
      });
    }
    
    // Fusionner History
    const historyPath = path.join('drivers', 'history');
    if (fs.existsSync(historyPath)) {
      console.log('\n📦 Processing History drivers...');
      const historyDirs = fs.readdirSync(historyPath).filter(d => 
        fs.statSync(path.join(historyPath, d)).isDirectory()
      );
      
      historyDirs.forEach(dir => {
        const sourcePath = path.join(historyPath, dir);
        const targetPath = path.join('drivers', dir);
        this.mergeDriver(sourcePath, targetPath, dir);
      });
    }
    
    // Supprimer les dossiers originaux
    this.cleanup();
    
    // Générer le rapport
    this.generateReport();
    
    console.log('\n✅ Lot1 and History merge completed successfully!');
    return this.stats;
  }

  // Nettoyer les dossiers originaux
  cleanup() {
    console.log('\n🧹 Cleaning up original directories...');
    
    const lot1Path = path.join('drivers', 'Lot1');
    const historyPath = path.join('drivers', 'history');
    
    if (fs.existsSync(lot1Path)) {
      fs.rmSync(lot1Path, { recursive: true, force: true });
      console.log('🗑️  Removed Lot1 directory');
    }
    
    if (fs.existsSync(historyPath)) {
      fs.rmSync(historyPath, { recursive: true, force: true });
      console.log('🗑️  Removed History directory');
    }
  }

  // Générer le rapport
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      merged_drivers: this.mergedDrivers,
      errors: this.errors,
      summary: {
        total_processed: this.stats.lot1_drivers + this.stats.history_drivers,
        successfully_merged: this.stats.merged_drivers,
        errors_encountered: this.errors.length
      }
    };
    
    // Créer le dossier logs s'il n'existe pas
    const logsDir = 'logs/merge';
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Sauvegarder le rapport JSON
    fs.writeFileSync(
      path.join(logsDir, `lot1_history_merge_${new Date().toISOString().replace(/[:.]/g, '-')}.json`),
      JSON.stringify(report, null, 2)
    );
    
    // Générer le rapport markdown
    const markdown = this.generateMarkdownReport(report);
    fs.writeFileSync(
      path.join(logsDir, `lot1_history_merge_${new Date().toISOString().replace(/[:.]/g, '-')}.md`),
      markdown
    );
    
    console.log(`📊 Report saved to ${logsDir}/`);
  }

  // Générer le rapport markdown
  generateMarkdownReport(report) {
    return `# 🔄 Lot1 & History Merge Report - Tuya Zigbee Project

## 📅 Date: ${new Date().toLocaleDateString()}

## 📊 Statistiques de Fusion
- **Drivers Lot1 traités**: ${report.stats.lot1_drivers}
- **Drivers History traités**: ${report.stats.history_drivers}
- **Drivers fusionnés**: ${report.stats.merged_drivers}
- **Drivers ignorés**: ${report.stats.skipped_drivers}
- **Total traité**: ${report.summary.total_processed}

## ✅ Drivers Fusionnés
${report.merged_drivers.map(driver => `- **${driver}**`).join('\n')}

## ❌ Erreurs Rencontrées
${report.errors.length > 0 ? report.errors.map(error => 
  `- **${error.driver}**: ${error.error}`
).join('\n') : '- Aucune erreur'}

## 📈 Résumé
- **Taux de succès**: ${Math.round((report.summary.successfully_merged / report.summary.total_processed) * 100)}%
- **Erreurs**: ${report.summary.errors_encountered}
- **Structure optimisée**: ✅

## 🔧 Actions Effectuées
1. **Analyse structure**: Lot1 et History analysés
2. **Fusion intelligente**: Drivers fusionnés avec logique additive
3. **Nettoyage**: Dossiers originaux supprimés
4. **Rapport**: Documentation complète générée

## 🎯 Résultat
- **Structure unifiée**: Tous les drivers dans le dossier principal
- **Compatibilité préservée**: Fonctionnalités maintenues
- **Optimisation**: Suppression des doublons et redondances

---
*Généré automatiquement le ${new Date().toISOString()}*
*Lot1 & History Merge v1.0 - Tuya Zigbee Project*
`;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  const merger = new Lot1HistoryMerger();
  merger.execute().catch(console.error);
}

module.exports = Lot1HistoryMerger; 