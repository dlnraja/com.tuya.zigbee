const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rootDir: __dirname,
  outputDir: path.join(__dirname, 'reports'),
  driversDir: path.join(__dirname, 'drivers'),
  reportFile: 'tuya-integration-report.md',
  maxDriversToAnalyze: 10 // Limite pour l'analyse détaillée
};

// Créer le dossier de sortie s'il n'existe pas
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Fonction pour analyser un driver
function analyzeDriver(driverPath) {
  const configPath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(configPath)) {
    return {
      name: path.basename(driverPath),
      valid: false,
      error: 'Fichier de configuration manquant'
    };
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const assetsDir = path.join(driverPath, 'assets');
    const assetsExist = fs.existsSync(assetsDir);
    
    // Vérifier les icônes
    let hasIcons = false;
    let iconStatus = {};
    
    if (config.images) {
      hasIcons = true;
      
      ['small', 'large'].forEach(size => {
        const iconPath = path.join(driverPath, config.images[size]);
        const exists = fs.existsSync(iconPath);
        iconStatus[size] = {
          path: config.images[size],
          exists: exists,
          size: exists ? fs.statSync(iconPath).size : 0
        };
        
        if (!exists) hasIcons = false;
      });
    }
    
    return {
      name: path.basename(driverPath),
      valid: true,
      config: {
        id: config.id,
        class: config.class,
        name: config.name,
        capabilities: config.capabilities || [],
        zigbee: config.zigbee ? {
          manufacturer: config.zigbee.manufacturerName?.[0],
          productId: config.zigbee.productId?.[0],
          endpoints: config.zigbee.endpoints ? Object.keys(config.zigbee.endpoints).length : 0
        } : null
      },
      assets: {
        hasAssetsDir: assetsExist,
        hasIcons: hasIcons,
        icons: iconStatus
      },
      translations: config.name ? Object.keys(config.name).length : 0
    };
    
  } catch (error) {
    return {
      name: path.basename(driverPath),
      valid: false,
      error: `Erreur de lecture: ${error.message}`
    };
  }
}

// Générer le rapport Markdown
function generateReport(drivers, stats) {
  let report = `# Rapport d'Intégration Tuya Zigbee

**Date de génération:** ${new Date().toISOString()}
**Nombre total de drivers analysés:** ${drivers.length}

## 📊 Statistiques

- **Drivers valides:** ${stats.valid} (${Math.round((stats.valid / drivers.length) * 100)}%)
- **Avec icônes:** ${stats.withIcons} (${Math.round((stats.withIcons / drivers.length) * 100)}%)
- **Moyenne de traductions par driver:** ${(stats.totalTranslations / drivers.length).toFixed(1)}
- **Capacités les plus courantes:** ${Object.entries(stats.capabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cap, count]) => `${cap} (${count})`)
    .join(', ')}

## 🔍 Analyse des Drivers

### Drivers avec problèmes (${stats.invalidDrivers.length})

${stats.invalidDrivers.length > 0 ? 
  stats.invalidDrivers.map(d => `- **${d.name}**: ${d.error}`).join('\n') : 
  'Aucun problème détecté.'}

### Exemples de Drivers Valides (${stats.validDrivers.length} au total)

${stats.validDrivers.slice(0, 5).map(driver => {
  return `#### ${driver.name}
- **ID:** ${driver.config.id}
- **Classe:** ${driver.config.class}
- **Traductions:** ${driver.translations} langues
- **Capacités:** ${driver.config.capabilities.join(', ')}
- **Zigbee:** ${driver.config.zigbee ? `${driver.config.zigbee.manufacturer} (${driver.config.zigbee.productId})` : 'Non configuré'}
- **Assets:** ${driver.assets.hasIcons ? '✅ Icônes présentes' : '❌ Icônes manquantes'}`;
}).join('\n\n')}

## 🔧 Recommandations

1. **Gestion des icônes:**
   - ${stats.missingIcons > 0 ? `**${stats.missingIcons} drivers** ont des icônes manquantes.` : 'Tous les drivers ont leurs icônes.'}
   - Vérifier que les chemins dans `driver.compose.json` sont corrects.
   - Convertir les SVG en PNG pour une meilleure compatibilité.

2. **Traductions:**
   - La moyenne de ${(stats.totalTranslations / drivers.length).toFixed(1)} langues par driver peut être améliorée.
   - Ajouter des traductions manquantes pour une meilleure internationalisation.

3. **Validation des drivers:**
   - ${stats.invalidDrivers.length} drivers présentent des erreurs de configuration.
   - Vérifier les fichiers de configuration et corriger les erreurs signalées.

## 📈 Métriques

- **Taux de complétion des drivers:** ${Math.round((stats.valid / drivers.length) * 100)}%
- **Taux de couverture des icônes:** ${Math.round((stats.withIcons / drivers.length) * 100)}%
- **Moyenne de capacités par driver:** ${(stats.totalCapabilities / drivers.length).toFixed(1)}

---

*Rapport généré automatiquement - Tuya Zigbee Integration*`;

  return report;
}

// Fonction principale
function main() {
  try {
    console.log('🔍 Analyse des drivers...');
    
    // Lire les dossiers de drivers
    const driverDirs = fs.readdirSync(CONFIG.driversDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(CONFIG.driversDir, dirent.name));
    
    // Analyser chaque driver
    const drivers = driverDirs.map(driverPath => analyzeDriver(driverPath));
    
    // Calculer les statistiques
    const stats = {
      valid: 0,
      withIcons: 0,
      missingIcons: 0,
      totalTranslations: 0,
      totalCapabilities: 0,
      capabilities: {},
      validDrivers: [],
      invalidDrivers: []
    };
    
    drivers.forEach(driver => {
      if (driver.valid) {
        stats.valid++;
        stats.validDrivers.push(driver);
        
        if (driver.assets.hasIcons) {
          stats.withIcons++;
        } else {
          stats.missingIcons++;
        }
        
        stats.totalTranslations += driver.translations;
        stats.totalCapabilities += driver.config.capabilities.length;
        
        // Compter les capacités
        driver.config.capabilities.forEach(cap => {
          stats.capabilities[cap] = (stats.capabilities[cap] || 0) + 1;
        });
      } else {
        stats.invalidDrivers.push(driver);
      }
    });
    
    // Trier les drivers valides par nom
    stats.validDrivers.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('📊 Génération du rapport...');
    const report = generateReport(drivers, stats);
    
    // Enregistrer le rapport
    const reportPath = path.join(CONFIG.outputDir, CONFIG.reportFile);
    fs.writeFileSync(reportPath, report);
    
    console.log(`✅ Rapport généré avec succès: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération du rapport:', error);
    process.exit(1);
  }
}

// Démarrer l'analyse
main();
