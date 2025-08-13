#!/usr/bin/env node

/**
 * Script de vérification de la cohérence des drivers
 * Vérifie la structure, les métadonnées et la cohérence des drivers
 */

const fs = require('fs');
const path = require('path');

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function verifyDriverStructure(driverPath) {
  const issues = [];
  
  try {
    // Vérifier la structure des dossiers
    const expectedFiles = [
      'driver.compose.json',
      'device.js',
      'assets/icon.svg',
      'assets/small.png'
    ];
    
    for (const file of expectedFiles) {
      const filePath = path.join(driverPath, file);
      if (!fs.existsSync(filePath)) {
        issues.push(`Fichier manquant: ${file}`);
      }
    }
    
    // Vérifier driver.compose.json
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Vérifications de base
        if (!compose.id) {
          issues.push('ID manquant dans driver.compose.json');
        }
        
        if (!compose.name) {
          issues.push('Nom manquant dans driver.compose.json');
        }
        
        if (!compose.capabilities || !Array.isArray(compose.capabilities)) {
          issues.push('Capacités manquantes ou invalides dans driver.compose.json');
        }
        
        if (!compose.zigbee) {
          issues.push('Section Zigbee manquante dans driver.compose.json');
        } else {
          if (!compose.zigbee.manufacturerName) {
            issues.push('manufacturerName manquant dans la section Zigbee');
          }
          if (!compose.zigbee.modelId) {
            issues.push('modelId manquant dans la section Zigbee');
          }
        }
        
      } catch (error) {
        issues.push(`Erreur parsing driver.compose.json: ${error.message}`);
      }
    }
    
    // Vérifier device.js
    const devicePath = path.join(driverPath, 'device.js');
    if (fs.existsSync(devicePath)) {
      const deviceContent = fs.readFileSync(devicePath, 'utf8');
      
      if (!deviceContent.includes('require(\'homey-zigbeedriver\')')) {
        issues.push('device.js doit utiliser homey-zigbeedriver');
      }
      
      if (!deviceContent.includes('class') || !deviceContent.includes('extends')) {
        issues.push('device.js doit définir une classe étendant ZigBeeDevice');
      }
    }
    
  } catch (error) {
    issues.push(`Erreur vérification structure: ${error.message}`);
  }
  
  return issues;
}

function verifyCoherence() {
  log('🔍 Vérification de la cohérence des drivers...');
  
  const driversDir = 'drivers';
  const allIssues = [];
  const driversChecked = [];
  
  try {
    if (!fs.existsSync(driversDir)) {
      log('❌ Dossier drivers non trouvé');
      return { success: false, error: 'Drivers directory not found' };
    }
    
    // Parcourir tous les drivers
    for (const domain of fs.readdirSync(driversDir)) {
      const domainPath = path.join(driversDir, domain);
      
      if (!fs.statSync(domainPath).isDirectory()) continue;
      
      for (const category of fs.readdirSync(domainPath)) {
        const categoryPath = path.join(domainPath, category);
        
        if (!fs.statSync(categoryPath).isDirectory()) continue;
        
        for (const vendor of fs.readdirSync(categoryPath)) {
          const vendorPath = path.join(categoryPath, vendor);
          
          if (!fs.statSync(vendorPath).isDirectory()) continue;
          
          for (const model of fs.readdirSync(vendorPath)) {
            const modelPath = path.join(vendorPath, model);
            
            if (!fs.statSync(modelPath).isDirectory()) continue;
            
            const driverId = `${domain}-${category}-${vendor}-${model}`;
            log(`🔍 Vérification: ${driverId}`);
            
            const issues = verifyDriverStructure(modelPath);
            if (issues.length > 0) {
              allIssues.push({
                driver: driverId,
                path: modelPath,
                issues: issues
              });
            }
            
            driversChecked.push({
              driver: driverId,
              path: modelPath,
              issues: issues.length
            });
          }
        }
      }
    }
    
    // Générer le rapport
    const report = {
      timestamp: new Date().toISOString(),
      action: 'verify-coherence',
      totalDrivers: driversChecked.length,
      driversWithIssues: allIssues.length,
      totalIssues: allIssues.reduce((sum, d) => sum + d.issues.length, 0),
      driversChecked: driversChecked,
      issues: allIssues,
      success: allIssues.length === 0
    };
    
    // Sauvegarder le rapport
    const reportPath = 'reports/verify-coherence-report.json';
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📊 Rapport généré: ${reportPath}`);
    log(`✅ Vérification terminée: ${driversChecked.length} drivers vérifiés`);
    
    if (allIssues.length > 0) {
      log(`⚠️  ${allIssues.length} drivers avec des problèmes détectés`);
      log(`📋 Total des problèmes: ${report.totalIssues}`);
    } else {
      log('🎉 Tous les drivers sont cohérents !');
    }
    
    return {
      success: true,
      driversChecked: driversChecked.length,
      driversWithIssues: allIssues.length,
      totalIssues: report.totalIssues
    };
    
  } catch (error) {
    log(`💥 Erreur fatale: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function main() {
  log('🚀 Début de la vérification de cohérence...');
  
  const result = verifyCoherence();
  
  if (result.success) {
    if (result.driversWithIssues === 0) {
      log('🎉 Vérification de cohérence terminée avec succès !');
      process.exit(0);
    } else {
      log(`⚠️  Vérification terminée avec ${result.driversWithIssues} drivers problématiques`);
      process.exit(1);
    }
  } else {
    log(`❌ Échec de la vérification: ${result.error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  verifyCoherence,
  verifyDriverStructure,
  main
};
