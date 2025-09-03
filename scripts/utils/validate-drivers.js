const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  driversDir: path.join(__dirname, '..', 'drivers'),
  requiredFiles: ['driver.compose.json'],
  requiredAssets: ['small.png', 'large.png'],
  reportFile: path.join(__dirname, '..', 'reports', 'driver-validation-report.md')
};

// Créer le dossier de rapports si nécessaire
if (!fs.existsSync(path.dirname(CONFIG.reportFile))) {
  fs.mkdirSync(path.dirname(CONFIG.reportFile), { recursive: true });
}

// Initialiser le rapport
let report = [];

// Fonction pour valider un driver
function validateDriver(driverPath, driverName) {
  const issues = [];
  const configPath = path.join(driverPath, 'driver.compose.json');
  
  // Vérifier les fichiers requis
  for (const file of CONFIG.requiredFiles) {
    if (!fs.existsSync(path.join(driverPath, file))) {
      issues.push(`Fichier manquant: ${file}`);
    }
  }
  
  // Vérifier la configuration
  let config = null;
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Vérifier les champs obligatoires
      const requiredFields = ['id', 'class', 'name', 'capabilities'];
      for (const field of requiredFields) {
        if (!config[field]) {
          issues.push(`Champ manquant dans la configuration: ${field}`);
        }
      }
      
      // Vérifier les icônes
      if (config.images) {
        for (const [size, imagePath] of Object.entries(config.images)) {
          const fullPath = path.join(driverPath, imagePath);
          if (!fs.existsSync(fullPath)) {
            issues.push(`Icône manquante: ${imagePath} (${size})`);
          } else if (!imagePath.toLowerCase().endsWith('.png')) {
            issues.push(`Format d'icône non standard: ${imagePath} (utiliser .png)`);
          }
        }
      } else {
        issues.push('Section images manquante dans la configuration');
      }
      
    } catch (error) {
      issues.push(`Erreur de lecture du fichier de configuration: ${error.message}`);
    }
  }
  
  // Vérifier le dossier assets
  const assetsDir = path.join(driverPath, 'assets');
  if (!fs.existsSync(assetsDir)) {
    issues.push('Dossier assets manquant');
  } else {
    for (const asset of CONFIG.requiredAssets) {
      if (!fs.existsSync(path.join(assetsDir, asset))) {
        issues.push(`Asset manquant: assets/${asset}`);
      }
    }
  }
  
  return {
    name: driverName,
    valid: issues.length === 0,
    issues,
    config
  };
}

// Fonction pour générer le rapport
function generateReport(validationResults) {
  const validCount = validationResults.filter(r => r.valid).length;
  const totalCount = validationResults.length;
  const percentage = Math.round((validCount / totalCount) * 100);
  
  let markdown = `# Rapport de Validation des Drivers

**Date de génération:** ${new Date().toISOString()}
**Total des drivers analysés:** ${totalCount}
**Drivers valides:** ${validCount} (${percentage}%)

## Résumé

- ✅ **Valides:** ${validCount}
- ⚠️ **Avec avertissements:** ${validationResults.filter(r => !r.valid && r.issues.length < 3).length}
- ❌ **Invalides:** ${validationResults.filter(r => !r.valid && r.issues.length >= 3).length}

## Détails par Driver
`;

  // Grouper les drivers par statut
  const validDrivers = validationResults.filter(r => r.valid);
  const warningDrivers = validationResults.filter(r => !r.valid && r.issues.length < 3);
  const invalidDrivers = validationResults.filter(r => !r.valid && r.issues.length >= 3);
  
  // Ajouter la section des drivers invalides
  if (invalidDrivers.length > 0) {
    markdown += '\n### ❌ Drivers Invalides (nécessitent une attention immédiate)\n\n';
    invalidDrivers.forEach(driver => {
      markdown += `#### ${driver.name}\n`;
      markdown += driver.issues.map(issue => `- ${issue}`).join('\n');
      markdown += '\n\n';
    });
  }
  
  // Ajouter la section des drivers avec avertissements
  if (warningDrivers.length > 0) {
    markdown += '\n### ⚠️ Drivers avec Avertissements\n\n';
    warningDrivers.forEach(driver => {
      markdown += `#### ${driver.name}\n`;
      markdown += driver.issues.map(issue => `- ${issue}`).join('\n');
      markdown += '\n\n';
    });
  }
  
  // Ajouter la section des drivers valides
  if (validDrivers.length > 0) {
    markdown += '\n### ✅ Drivers Valides\n\n';
    markdown += validDrivers.map(d => `- ${d.name}`).join('\n');
    markdown += '\n\n';
  }
  
  // Ajouter les recommandations
  markdown += `## Recommandations

1. **Corriger les problèmes critiques** en priorité (section "Drivers Invalides")
2. **Mettre à jour les configurations** pour les drivers avec avertissements
3. **Standardiser les icônes** au format PNG
4. **Vérifier les traductions** pour tous les drivers
5. **Mettre à jour la documentation** pour refléter les changements

---
*Rapport généré automatiquement par le script de validation*`;
  
  return markdown;
}

// Fonction principale
function main() {
  console.log('🚀 Démarrage de la validation des drivers...');
  
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
  
  console.log(`🔍 Analyse de ${driverDirs.length} drivers...`);
  
  // Valider chaque driver
  const validationResults = [];
  for (const { name, path: driverPath } of driverDirs) {
    process.stdout.write(`\r🔍 Vérification de ${name}...`);
    validationResults.push(validateDriver(driverPath, name));
  }
  
  console.log('\n✅ Analyse terminée. Génération du rapport...');
  
  // Générer le rapport
  const reportContent = generateReport(validationResults);
  fs.writeFileSync(CONFIG.reportFile, reportContent, 'utf8');
  
  // Afficher un résumé
  const validCount = validationResults.filter(r => r.valid).length;
  const warningCount = validationResults.filter(r => !r.valid && r.issues.length < 3).length;
  const invalidCount = validationResults.filter(r => !r.valid && r.issues.length >= 3).length;
  
  console.log('\n📊 Résumé de la validation:');
  console.log(`✅ ${validCount} drivers valides`);
  console.log(`⚠️  ${warningCount} drivers avec avertissements`);
  console.log(`❌ ${invalidCount} drivers invalides`);  
  console.log(`\n📄 Rapport complet enregistré: ${CONFIG.reportFile}`);
  
  // Si des problèmes critiques sont détectés, sortir avec un code d'erreur
  if (invalidCount > 0) {
    console.error('\n❌ Des problèmes critiques ont été détectés. Veuillez les corriger avant de continuer.');
    process.exit(1);
  }
}

// Démarrer la validation
main();
