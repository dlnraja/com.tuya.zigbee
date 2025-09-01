const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  driversDir: path.join(__dirname, '..', 'drivers'),
  backupDir: path.join(__dirname, '..', 'backup'),
  reportFile: path.join(__dirname, '..', 'reports', 'fix-report.md')
};

// Créer les dossiers nécessaires
[CONFIG.backupDir, path.dirname(CONFIG.reportFile)].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Journal des modifications
const changes = [];

// Fonction pour sauvegarder un fichier
function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  
  const backupPath = path.join(
    CONFIG.backupDir, 
    'before-fix',
    path.relative(CONFIG.rootDir, filePath)
  );
  
  // Créer le répertoire de sauvegarde si nécessaire
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  
  // Copier le fichier
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

// Fonction pour corriger un driver
function fixDriver(driverPath, driverName) {
  const driverChanges = [];
  const configPath = path.join(driverPath, 'driver.compose.json');
  const assetsDir = path.join(driverPath, 'assets');
  
  // 1. Vérifier et corriger le fichier de configuration
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      let configChanged = false;
      
      // Sauvegarder l'ancienne configuration
      backupFile(configPath);
      
      // Vérifier et corriger l'ID
      if (!config.id) {
        config.id = `tuya_${driverName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        configChanged = true;
        driverChanges.push("Ajout d'un ID manquant");
      }
      
      // Vérifier et corriger la classe
      if (!config.class) {
        // Essayer de déduire la classe du nom du dossier
        const classMap = {
          'plug': 'socket',
          'light': 'light',
          'sensor': 'sensor',
          'switch': 'switch',
          'cover': 'windowcoverings',
          'climate': 'thermostat'
        };
        
        for (const [key, value] of Object.entries(classMap)) {
          if (driverName.toLowerCase().includes(key)) {
            config.class = value;
            configChanged = true;
            driverChanges.push(`Classe définie sur '${value}' basée sur le nom du dossier`);
            break;
          }
        }
      }
      
      // Vérifier et corriger les images
      if (!config.images) {
        config.images = {};
        configChanged = true;
      }
      
      // Vérifier et corriger les chemins d'icônes
      ['small', 'large'].forEach(size => {
        const iconPath = `assets/${size}.png`;
        const fullPath = path.join(driverPath, iconPath);
        
        if (!config.images[size] || !fs.existsSync(path.join(driverPath, config.images[size]))) {
          // Si le fichier n'existe pas, créer un fichier d'icône par défaut
          if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            
            // Créer une icône par défaut (carré de couleur avec le texte)
            const canvas = require('canvas');
            const { createCanvas } = canvas;
            
            const canvasSize = size === 'small' ? 100 : 500;
            const canvasObj = createCanvas(canvasSize, canvasSize);
            const ctx = canvasObj.getContext('2d');
            
            // Fond
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(0, 0, canvasSize, canvasSize);
            
            // Texte
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const fontSize = size === 'small' ? 20 : 40;
            ctx.font = `bold ${fontSize}px Arial`;
            
            // Afficher le nom du driver (tronqué si nécessaire)
            const displayName = driverName.length > 10 ? 
              driverName.substring(0, 8) + '...' : driverName;
              
            ctx.fillText(displayName, canvasSize / 2, canvasSize / 2);
            
            // Enregistrer l'image
            const buffer = canvasObj.toBuffer('image/png');
            fs.writeFileSync(fullPath, buffer);
            
            driverChanges.push(`Icône ${size} créée: ${iconPath}`);
          }
          
          config.images[size] = iconPath;
          configChanged = true;
        }
      });
      
      // Enregistrer les modifications de la configuration
      if (configChanged) {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        driverChanges.push("Configuration mise à jour");
      }
      
    } catch (error) {
      driverChanges.push(`Erreur lors de la correction: ${error.message}`);
    }
  } else {
    // Créer une configuration par défaut si elle n'existe pas
    const defaultConfig = {
      id: `tuya_${driverName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      class: 'other',
      name: {
        en: driverName,
        fr: driverName
      },
      capabilities: [],
      images: {
        small: 'assets/small.png',
        large: 'assets/large.png'
      }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    driverChanges.push("Fichier de configuration créé avec des valeurs par défaut");
    
    // Créer les icônes par défaut
    fixDriver(driverPath, driverName);
  }
  
  // 2. Vérifier et corriger la structure des dossiers
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    driverChanges.push("Dossier assets créé");
  }
  
  return driverChanges;
}

// Fonction pour générer le rapport
function generateReport() {
  let markdown = `# Rapport de Correction des Drivers

**Date de génération:** ${new Date().toISOString()}
**Total des drivers traités:** ${changes.length}

## Résumé des Modifications

`;

  // Compter les modifications par type
  const summary = {};
  changes.forEach(change => {
    change.changes.forEach(c => {
      const type = c.split(':')[0];
      summary[type] = (summary[type] || 0) + 1;
    });
  });
  
  // Ajouter le résumé
  markdown += Object.entries(summary)
    .map(([type, count]) => `- **${type}:** ${count} fois`)
    .join('\n');
  
  // Ajouter les détails par driver
  markdown += '\n\n## Détails par Driver\n\n';
  
  changes.forEach(change => {
    if (change.changes.length > 0) {
      markdown += `### ${change.name}\n`;
      markdown += change.changes.map(c => `- ${c}`).join('\n');
      markdown += '\n\n';
    }
  });
  
  // Ajouter les étapes suivantes
  markdown += `## Prochaines Étapes

1. **Vérifier les modifications** apportées aux drivers
2. **Tester les fonctionnalités** des drivers modifiés
3. **Mettre à jour la documentation** si nécessaire
4. **Valider les icônes** générées automatiquement

---
*Rapport généré automatiquement par le script de correction*`;
  
  return markdown;
}

// Fonction principale
function main() {
  console.log('🚀 Démarrage de la correction des drivers...');
  
  // Vérifier si le dossier des drivers existe
  if (!fs.existsSync(CONFIG.driversDir)) {
    console.error(`❌ Le dossier des drivers est introuvable: ${CONFIG.driversDir}`);
    process.exit(1);
  }
  
  // Lire les dossiers de drivers
  const driverDirs = fs.readdirSync(CONFIG.driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => ({
      name: dirent.name,
      path: path.join(CONFIG.driversDir, dirent.name)
    }));
  
  console.log(`🔧 Correction de ${driverDirs.length} drivers...`);
  
  // Traiter chaque driver
  driverDirs.forEach(({ name, path: driverPath }) => {
    process.stdout.write(`\r🔧 Traitement de ${name}...`);
    const driverChanges = fixDriver(driverPath, name);
    
    if (driverChanges.length > 0) {
      changes.push({
        name,
        path: driverPath,
        changes: driverChanges
      });
    }
  });
  
  console.log('\n✅ Correction terminée. Génération du rapport...');
  
  // Générer le rapport
  const reportContent = generateReport();
  fs.writeFileSync(CONFIG.reportFile, reportContent, 'utf8');
  
  // Afficher un résumé
  console.log('\n📊 Résumé des modifications:');
  console.log(`- Drivers modifiés: ${changes.length}/${driverDirs.length}`);
  
  const totalChanges = changes.reduce((sum, change) => sum + change.changes.length, 0);
  console.log(`- Nombre total de modifications: ${totalChanges}`);
  
  console.log(`\n📄 Rapport complet enregistré: ${CONFIG.reportFile}`);
  console.log('\n✅ Tâche terminée avec succès !');
}

// Démarrer la correction
main();
