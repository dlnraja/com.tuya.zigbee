// !/usr/bin/env node

/**
 * Script de génération des assets manquants
 * Génère les icônes et images manquantes pour les drivers
 */

const fs = require('fs');
const path = require('path');

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function generateMissingAssets() {
  log('🎨 Génération des assets manquants...');
  
  const driversDir = 'drivers';
  const assetsGenerated = [];
  const errors = [];
  
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
            
            const assetsPath = path.join(modelPath, 'assets');
            const iconPath = path.join(assetsPath, 'icon.svg');
            const smallPngPath = path.join(assetsPath, 'small.png');
            
            // Créer le dossier assets s'il n'existe pas
            if (!fs.existsSync(assetsPath)) {
              fs.mkdirSync(assetsPath, { recursive: true });
              log(`📁 Dossier assets créé: ${assetsPath}`);
            }
            
            // Générer icon.svg s'il manque
            if (!fs.existsSync(iconPath)) {
              try {
                const svgContent = generateDefaultIcon(model, category);
                fs.writeFileSync(iconPath, svgContent);
                assetsGenerated.push(`${modelPath}/assets/icon.svg`);
                log(`🎨 Icône SVG générée: ${iconPath}`);
              } catch (error) {
                errors.push(`Erreur génération icon.svg pour ${modelPath}: ${error.message}`);
              }
            }
            
            // Générer small.png s'il manque
            if (!fs.existsSync(smallPngPath)) {
              try {
                const pngContent = generateDefaultSmallPng();
                fs.writeFileSync(smallPngPath, pngContent);
                assetsGenerated.push(`${modelPath}/assets/small.png`);
                log(`🖼️  Small PNG généré: ${smallPngPath}`);
              } catch (error) {
                errors.push(`Erreur génération small.png pour ${modelPath}: ${error.message}`);
              }
            }
          }
        }
      }
    }
    
    // Générer le rapport
    const report = {
      timestamp: new Date().toISOString(),
      action: 'generate-assets',
      assetsGenerated: assetsGenerated.length,
      errors: errors.length,
      generatedAssets: assetsGenerated,
      errorDetails: errors,
      success: errors.length === 0
    };
    
    // Sauvegarder le rapport
    const reportPath = 'reports/generate-assets-report.json';
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📊 Rapport généré: ${reportPath}`);
    log(`✅ Génération terminée: ${assetsGenerated.length} assets générés`);
    
    if (errors.length > 0) {
      log(`⚠️  ${errors.length} erreurs rencontrées`);
    }
    
    return {
      success: true,
      assetsGenerated: assetsGenerated.length,
      errors: errors.length
    };
    
  } catch (error) {
    log(`💥 Erreur fatale: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function generateDefaultIcon(model, category) {
  const colors = {
    switch: '// FF6B6B',
    dimmer: '// 4ECDC4',
    light: '// 45B7D1',
    plug: '// 96CEB4',
    sensor: '// FFEAA7',
    climate: '// DDA0DD',
    cover: '// 98D8C8',
    siren: '// F7DC6F'
  };
  
  const color = colors[category] || '// 95A5A6';
  
  return `<svg xmlns = "http://www.w3.org/2000/svg" viewBox = "0 0 24 24" width = "24" height = "24">
  <rect width = "24" height = "24" fill = "${color}" rx = "2"/>
  <text x = "12" y = "16" font-family = "Arial" font-size = "8" fill = "white" text-anchor = "middle">${model}</text>
</svg>`;
}

function generateDefaultSmallPng() {
  // Base64 d'une image PNG 250x175 par défaut (gris)
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAPoAAACvCAYAAAD8YdLqAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3Njape.org5vuPBoAAA==', 'base64');
}

function main() {
  log('🚀 Début de la génération des assets...');
  
  const result = generateMissingAssets();
  
  if (result.success) {
    log('🎉 Génération des assets terminée avec succès !');
    process.exit(0);
  } else {
    log(`❌ Échec de la génération: ${result.error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateMissingAssets,
  generateDefaultIcon,
  generateDefaultSmallPng,
  main
};
