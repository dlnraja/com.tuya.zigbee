// !/usr/bin/env node

/**
 * Script de validation et de test des drivers générés
 * Basé sur les instructions du dossier fold
 * 
 * Objectifs :
 * - Valider la structure des drivers
 * - Tester la compatibilité Homey
 * - Corriger les erreurs JSON
 * - Générer un rapport de validation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DRIVERS_DIR = 'drivers';
const REPORTS_DIR = 'reports';
const BACKUP_DIR = '.backup';

// Fonction principale
async function validateAndTestDrivers() {
  console.log('🚀 Début de la validation et du test des drivers...');
  
  try {
    // 1. Créer les dossiers nécessaires
    await createDirectories();
    
    // 2. Valider la structure des drivers
    const structureReport = await validateDriverStructure();
    
    // 3. Corriger les erreurs JSON
    const jsonReport = await fixJSONErrors();
    
    // 4. Tester la compatibilité Homey
    const homeyReport = await testHomeyCompatibility();
    
    // 5. Générer le rapport final
    await generateFinalReport(structureReport, jsonReport, homeyReport);
    
    console.log('✅ Validation et test des drivers terminés!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error.message);
    throw error;
  }
}

// Créer les dossiers nécessaires
async function createDirectories() {
  const dirs = [REPORTS_DIR, BACKUP_DIR];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Dossier créé: ${dir}/`);
    }
  }
  
  // Créer le dossier de validation
  const validationDir = path.join(REPORTS_DIR, 'validation');
  if (!fs.existsSync(validationDir)) {
    fs.mkdirSync(validationDir, { recursive: true });
  }
}

// Valider la structure des drivers
async function validateDriverStructure() {
  console.log('🔍 Validation de la structure des drivers...');
  
  const report = {
    timestamp: new Date().toISOString(),
    totalDrivers: 0,
    validDrivers: 0,
    invalidDrivers: 0,
    issues: [],
    structure: {}
  };
  
  try {
    if (!fs.existsSync(DRIVERS_DIR)) {
      report.issues.push('Dossier drivers/ non trouvé');
      return report;
    }
    
    const domains = fs.readdirSync(DRIVERS_DIR).filter(item => 
      fs.statSync(path.join(DRIVERS_DIR, item)).isDirectory()
    );
    
    for (const domain of domains) {
      report.structure[domain] = {
        categories: {},
        total: 0,
        valid: 0,
        invalid: 0
      };
      
      const domainPath = path.join(DRIVERS_DIR, domain);
      const categories = fs.readdirSync(domainPath).filter(item => 
        fs.statSync(path.join(domainPath, item)).isDirectory()
      );
      
      for (const category of categories) {
        report.structure[domain].categories[category] = {
          vendors: {},
          total: 0,
          valid: 0,
          invalid: 0
        };
        
        const categoryPath = path.join(domainPath, category);
        const vendors = fs.readdirSync(categoryPath).filter(item => 
          fs.statSync(path.join(categoryPath, item)).isDirectory()
        );
        
        for (const vendor of vendors) {
          report.structure[domain].categories[category].vendors[vendor] = {
            models: [],
            total: 0,
            valid: 0,
            invalid: 0
          };
          
          const vendorPath = path.join(categoryPath, vendor);
          const models = fs.readdirSync(vendorPath).filter(item => 
            fs.statSync(path.join(vendorPath, item)).isDirectory()
          );
          
          for (const model of models) {
            const modelPath = path.join(vendorPath, model);
            const driverId = `${category}-${vendor}-${model}`;
            
            report.totalDrivers++;
            report.structure[domain].total++;
            report.structure[domain].categories[category].total++;
            report.structure[domain].categories[category].vendors[vendor].total++;
            
            // Vérifier la structure du driver
            const validation = validateDriver(modelPath, driverId);
            
            if (validation.isValid) {
              report.validDrivers++;
              report.structure[domain].valid++;
              report.structure[domain].categories[category].valid++;
              report.structure[domain].categories[category].vendors[vendor].valid++;
            } else {
              report.invalidDrivers++;
              report.structure[domain].invalid++;
              report.structure[domain].categories[category].invalid++;
              report.structure[domain].categories[category].vendors[vendor].invalid++;
              report.issues.push(...validation.issues);
            }
            
            report.structure[domain].categories[category].vendors[vendor].models.push({
              model,
              driverId,
              isValid: validation.isValid,
              issues: validation.issues
            });
          }
        }
      }
    }
    
    console.log(`📊 Structure validée: ${report.validDrivers}/${report.totalDrivers} drivers valides`);
    
  } catch (error) {
    report.issues.push(`Erreur lors de la validation: ${error.message}`);
    console.log('⚠️ Erreur lors de la validation de la structure:', error.message);
  }
  
  return report;
}

// Valider un driver spécifique
function validateDriver(driverPath, driverId) {
  const validation = {
    isValid: true,
    issues: []
  };
  
  // Vérifier les fichiers requis
  const requiredFiles = ['device.js', 'driver.compose.json'];
  
  for (const file of requiredFiles) {
    const filePath = path.join(driverPath, file);
    if (!fs.existsSync(filePath)) {
      validation.isValid = false;
      validation.issues.push(`Fichier manquant: ${file}`);
    }
  }
  
  // Vérifier le dossier assets
  const assetsPath = path.join(driverPath, 'assets');
  if (!fs.existsSync(assetsPath)) {
    validation.isValid = false;
    validation.issues.push('Dossier assets/ manquant');
  } else {
    // Vérifier les assets requis
    const iconPath = path.join(assetsPath, 'icon.svg');
    const smallPngPath = path.join(assetsPath, 'small.png');
    
    if (!fs.existsSync(iconPath)) {
      validation.issues.push('icon.svg manquant');
    }
    if (!fs.existsSync(smallPngPath)) {
      validation.issues.push('small.png manquant');
    }
  }
  
  // Vérifier driver.compose.json
  const composePath = path.join(driverPath, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      // Vérifier les champs requis
      if (!compose.id) {
        validation.issues.push('Champ id manquant dans driver.compose.json');
      }
      if (!compose.name) {
        validation.issues.push('Champ name manquant dans driver.compose.json');
      }
      if (!compose.capabilities) {
        validation.issues.push('Champ capabilities manquant dans driver.compose.json');
      }
      
    } catch (error) {
      validation.isValid = false;
      validation.issues.push(`Erreur JSON dans driver.compose.json: ${error.message}`);
    }
  }
  
  return validation;
}

// Corriger les erreurs JSON
async function fixJSONErrors() {
  console.log('🔧 Correction des erreurs JSON...');
  
  const report = {
    timestamp: new Date().toISOString(),
    filesScanned: 0,
    filesFixed: 0,
    errorsFound: 0,
    details: []
  };
  
  try {
    // Scanner tous les fichiers JSON dans drivers/
    const jsonFiles = findJSONFiles(DRIVERS_DIR);
    report.filesScanned = jsonFiles.length;
    
    for (const jsonFile of jsonFiles) {
      try {
        const content = fs.readFileSync(jsonFile, 'utf8');
        JSON.parse(content); // Test de validité
        
      } catch (error) {
        report.errorsFound++;
        console.log(`⚠️ Erreur JSON dans ${jsonFile}:`, error.message);
        
        try {
          // Essayer de corriger le fichier
          const fixed = await fixJSONFile(jsonFile);
          if (fixed) {
            report.filesFixed++;
            report.details.push({
              file: jsonFile,
              error: error.message,
              fixed: true
            });
          } else {
            report.details.push({
              file: jsonFile,
              error: error.message,
              fixed: false
            });
          }
        } catch (fixError) {
          report.details.push({
            file: jsonFile,
            error: error.message,
            fixed: false,
            fixError: fixError.message
          });
        }
      }
    }
    
    console.log(`📊 JSON corrigé: ${report.filesFixed}/${report.errorsFound} fichiers corrigés`);
    
  } catch (error) {
    report.details.push({
      error: `Erreur lors de la correction JSON: ${error.message}`
    });
    console.log('⚠️ Erreur lors de la correction JSON:', error.message);
  }
  
  return report;
}

// Trouver tous les fichiers JSON
function findJSONFiles(dir) {
  const jsonFiles = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        jsonFiles.push(...findJSONFiles(itemPath));
      } else if (item.endsWith('.json')) {
        jsonFiles.push(itemPath);
      }
    }
  } catch (error) {
    // Ignore les erreurs d'accès
  }
  
  return jsonFiles;
}

// Corriger un fichier JSON
async function fixJSONFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Sauvegarder le fichier original
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, content, 'utf8');
    
    // Essayer de corriger les erreurs communes
    let fixedContent = content;
    
    // Supprimer les BOM
    fixedContent = fixedContent.replace(/^\uFEFF/, '');
    
    // Supprimer les virgules trailing
    fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');
    
    // Corriger les guillemets mal fermés
    fixedContent = fixedContent.replace(/([^\\])"/g, '$1"');
    
    // Essayer de parser le contenu corrigé
    JSON.parse(fixedContent);
    
    // Si on arrive ici, le fichier est corrigé
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    return true;
    
  } catch (error) {
    return false;
  }
}

// Tester la compatibilité Homey
async function testHomeyCompatibility() {
  console.log('🏠 Test de la compatibilité Homey...');
  
  const report = {
    timestamp: new Date().toISOString(),
    homeyValidation: 'skipped',
    compatibility: 'unknown',
    issues: []
  };
  
  try {
    // Vérifier si homey est installé
    try {
      execSync('npx homey --version', { stdio: 'pipe' });
      report.homeyValidation = 'available';
      
      // Lancer la validation Homey
      try {
        execSync('npx homey app validate', { stdio: 'pipe' });
        report.compatibility = 'compatible';
      } catch (error) {
        report.compatibility = 'incompatible';
        report.issues.push(`Validation Homey échouée: ${error.message}`);
      }
      
    } catch (error) {
      report.homeyValidation = 'not_installed';
      report.issues.push('Homey CLI non installé');
    }
    
  } catch (error) {
    report.issues.push(`Erreur lors du test Homey: ${error.message}`);
  }
  
  return report;
}

// Générer le rapport final
async function generateFinalReport(structureReport, jsonReport, homeyReport) {
  console.log('📋 Génération du rapport final...');
  
  const finalReport = {
    generated: new Date().toISOString(),
    summary: {
      totalDrivers: structureReport.totalDrivers,
      validDrivers: structureReport.validDrivers,
      invalidDrivers: structureReport.invalidDrivers,
      jsonErrors: jsonReport.errorsFound,
      jsonFixed: jsonReport.filesFixed,
      homeyCompatible: homeyReport.compatibility === 'compatible'
    },
    structure: structureReport,
    json: jsonReport,
    homey: homeyReport,
    recommendations: []
  };
  
  // Générer des recommandations
  if (structureReport.invalidDrivers > 0) {
    finalReport.recommendations.push('Corriger la structure des drivers invalides');
  }
  
  if (jsonReport.errorsFound > 0) {
    finalReport.recommendations.push('Continuer la correction des erreurs JSON');
  }
  
  if (homeyReport.compatibility !== 'compatible') {
    finalReport.recommendations.push('Résoudre les problèmes de compatibilité Homey');
  }
  
  // Sauvegarder le rapport
  const reportPath = path.join(REPORTS_DIR, 'validation', 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2), 'utf8');
  
  // Générer le rapport HTML
  await generateHTMLReport(finalReport);
  
  console.log('📄 Rapport final généré');
}

// Générer le rapport HTML
async function generateHTMLReport(data) {
  const htmlPath = path.join(REPORTS_DIR, 'validation', 'validation-report.html');
  
  const html = `<!DOCTYPE html>
<html lang = "fr">
<head>
    <meta charset = "UTF-8">
    <meta name = "viewport" content = "width=device-width, initial-scale=1.0">
    <title>Rapport de Validation des Drivers - Tuya Zigbee</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: // f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: // 2c3e50; border-bottom: 3px solid // 3498db; padding-bottom: 10px; }
        h2 { color: // 34495e; margin-top: 30px; }
        .summary { background: // ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: // 3498db; color: white; border-radius: 5px; }
        .success { background: // 27ae60; }
        .warning { background: // f39c12; }
        .error { background: // e74c3c; }
        .timestamp { color: // 7f8c8d; font-style: italic; }
        .recommendations { background: // fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class = "container">
        <h1>🔍 Rapport de Validation des Drivers</h1>
        <p class = "timestamp">Généré le: ${new Date().toISOString().split('T')[0]}</p>
        
        <div class = "summary">
            <h2>📊 Résumé de la Validation</h2>
            <div class = "metric ${data.summary.validDrivers > 0 ? 'success' : 'error'}">Drivers valides: ${data.summary.validDrivers}</div>
            <div class = "metric ${data.summary.invalidDrivers > 0 ? 'warning' : 'success'}">Drivers invalides: ${data.summary.invalidDrivers}</div>
            <div class = "metric ${data.summary.jsonErrors > 0 ? 'warning' : 'success'}">Erreurs JSON: ${data.summary.jsonErrors}</div>
            <div class = "metric ${data.summary.jsonFixed > 0 ? 'success' : ''}">JSON corrigés: ${data.summary.jsonFixed}</div>
            <div class = "metric ${data.summary.homeyCompatible ? 'success' : 'warning'}">Homey: ${data.summary.homeyCompatible ? 'Compatible' : 'Incompatible'}</div>
        </div>
        
        <h2>🎯 Recommandations</h2>
        <div class = "recommendations">
            <ul>
                ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        
        <h2>📁 Structure des Drivers</h2>
        <pre>${JSON.stringify(data.structure.structure, null, 2)}</pre>
        
        <h2>🔧 Correction JSON</h2>
        <pre>${JSON.stringify(data.json.details, null, 2)}</pre>
        
        <h2>🏠 Compatibilité Homey</h2>
        <pre>${JSON.stringify(data.homey, null, 2)}</pre>
    </div>
</body>
</html>`;
  
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('🌐 Rapport HTML généré');
}

// Exécution si appelé directement
if (require.main === module) {
  validateAndTestDrivers().catch(console.error);
}

module.exports = { validateAndTestDrivers };
