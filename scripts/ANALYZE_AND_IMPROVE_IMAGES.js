#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REPORT_FILE = path.join(ROOT, 'IMAGE_IMPROVEMENT_REPORT.md');

// Sources d'images de référence
const IMAGE_SOURCES = {
  johan_bendz: {
    tuya: 'https://github.com/JohanBendz/com.tuya.zigbee',
    lidl: 'https://github.com/JohanBendz/com.lidl',
    ikea: 'https://github.com/JohanBendz/com.ikea.tradfri',
    philips: 'https://github.com/JohanBendz/com.philips.hue.zigbee'
  },
  official_apps: {
    smartlife: 'SmartLife/Tuya official apps',
    lidl_connect: 'Lidl Home/Smart Home app',
    moes: 'MOES Smart Home app'
  }
};

// Catégories de produits avec types d'images recommandées
const PRODUCT_IMAGE_TYPES = {
  motion_sensor: {
    icon_style: 'PIR sensor icon',
    recommended_color: 'White/Gray background',
    brands: ['Tuya', 'MOES', 'Silvercrest/Lidl', 'Xiaomi', 'Aqara']
  },
  contact_sensor: {
    icon_style: 'Door/Window sensor',
    recommended_color: 'White background',
    brands: ['Tuya', 'MOES', 'Silvercrest/Lidl', 'Xiaomi', 'Aqara']
  },
  smart_plug: {
    icon_style: 'Socket/Plug icon',
    recommended_color: 'White background with socket visible',
    brands: ['Tuya', 'MOES', 'NOUS', 'LSC']
  },
  smart_switch: {
    icon_style: 'Wall switch',
    recommended_color: 'White/Black background',
    brands: ['AVATTO', 'MOES', 'Tuya', 'ZemiSmart']
  },
  bulb: {
    icon_style: 'Light bulb',
    recommended_color: 'White/warm light glow',
    brands: ['Tuya', 'LSC', 'Philips', 'INNR', 'OSRAM']
  },
  led_strip: {
    icon_style: 'LED strip with colors',
    recommended_color: 'Multi-color or RGB',
    brands: ['Tuya', 'LSC', 'Philips', 'OSRAM']
  },
  curtain: {
    icon_style: 'Curtain motor/controller',
    recommended_color: 'White background',
    brands: ['Tuya', 'ZemiSmart']
  },
  wireless_switch: {
    icon_style: 'Remote control',
    recommended_color: 'White/Gray background',
    brands: ['Tuya', 'AVATTO', 'Xiaomi', 'Philips']
  },
  thermostat: {
    icon_style: 'Thermostat/Temperature control',
    recommended_color: 'White background',
    brands: ['Tuya', 'AVATTO', 'ZemiSmart']
  }
};

function detectCategory(driverName) {
  const n = driverName.toLowerCase();
  if (n.includes('motion') || n.includes('pir') || n.includes('radar')) return 'motion_sensor';
  if (n.includes('contact') || n.includes('door') || n.includes('window')) return 'contact_sensor';
  if (n.includes('plug') || n.includes('socket')) return 'smart_plug';
  if (n.includes('switch') && !n.includes('wireless')) return 'smart_switch';
  if (n.includes('bulb') || n.includes('lamp')) return 'bulb';
  if (n.includes('strip') || n.includes('led')) return 'led_strip';
  if (n.includes('curtain') || n.includes('blind') || n.includes('roller')) return 'curtain';
  if (n.includes('wireless') || n.includes('remote') || n.includes('button')) return 'wireless_switch';
  if (n.includes('thermostat') || n.includes('valve')) return 'thermostat';
  return 'other';
}

function detectBrand(driverName) {
  const n = driverName.toLowerCase();
  if (n.startsWith('avatto_')) return 'AVATTO';
  if (n.startsWith('moes_')) return 'MOES';
  if (n.startsWith('lsc_')) return 'LSC';
  if (n.startsWith('nous_')) return 'NOUS';
  if (n.startsWith('tuya_')) return 'Tuya';
  if (n.startsWith('zemismart_')) return 'ZemiSmart';
  if (n.startsWith('lonsonho_')) return 'Lonsonho';
  if (n.startsWith('philips_')) return 'Philips';
  if (n.startsWith('samsung_')) return 'Samsung';
  if (n.startsWith('sonoff_')) return 'Sonoff';
  return 'Generic';
}

function checkImageExists(driverPath) {
  const assetsPath = path.join(driverPath, 'assets');
  const imagesPath = path.join(assetsPath, 'images');
  
  const result = {
    hasAssets: fs.existsSync(assetsPath),
    hasImages: fs.existsSync(imagesPath),
    hasSmall: false,
    hasLarge: false,
    smallSize: null,
    largeSize: null
  };
  
  if (result.hasImages) {
    const smallPath = path.join(imagesPath, 'small.png');
    const largePath = path.join(imagesPath, 'large.png');
    
    if (fs.existsSync(smallPath)) {
      result.hasSmall = true;
      const stats = fs.statSync(smallPath);
      result.smallSize = stats.size;
    }
    
    if (fs.existsSync(largePath)) {
      result.hasLarge = true;
      const stats = fs.statSync(largePath);
      result.largeSize = stats.size;
    }
  }
  
  return result;
}

function analyzeDrivers() {
  console.log('🔍 Analyse des images des drivers...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  const analysis = {
    total: drivers.length,
    withImages: 0,
    withoutImages: 0,
    missingSmall: 0,
    missingLarge: 0,
    byCategory: {},
    byBrand: {},
    needsImprovement: []
  };
  
  for (const driver of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driver);
    const category = detectCategory(driver);
    const brand = detectBrand(driver);
    const images = checkImageExists(driverPath);
    
    // Stats par catégorie
    if (!analysis.byCategory[category]) {
      analysis.byCategory[category] = { total: 0, withImages: 0, withoutImages: 0 };
    }
    analysis.byCategory[category].total++;
    
    // Stats par marque
    if (!analysis.byBrand[brand]) {
      analysis.byBrand[brand] = { total: 0, withImages: 0, withoutImages: 0 };
    }
    analysis.byBrand[brand].total++;
    
    if (images.hasImages && images.hasSmall && images.hasLarge) {
      analysis.withImages++;
      analysis.byCategory[category].withImages++;
      analysis.byBrand[brand].withImages++;
      
      // Vérifier la taille des images (trop petites = mauvaise qualité)
      if (images.smallSize < 1000 || images.largeSize < 5000) {
        analysis.needsImprovement.push({
          driver,
          category,
          brand,
          reason: 'Image file size too small (low quality)',
          smallSize: images.smallSize,
          largeSize: images.largeSize
        });
      }
    } else {
      analysis.withoutImages++;
      analysis.byCategory[category].withoutImages++;
      analysis.byBrand[brand].withoutImages++;
      
      if (!images.hasSmall) analysis.missingSmall++;
      if (!images.hasLarge) analysis.missingLarge++;
      
      analysis.needsImprovement.push({
        driver,
        category,
        brand,
        reason: `Missing: ${!images.hasSmall ? 'small.png ' : ''}${!images.hasLarge ? 'large.png' : ''}`.trim(),
        hasSmall: images.hasSmall,
        hasLarge: images.hasLarge
      });
    }
  }
  
  return analysis;
}

function generateReport(analysis) {
  console.log('📝 Génération du rapport d\'amélioration...\n');
  
  let report = `# 🎨 RAPPORT D'AMÉLIORATION DES IMAGES\n\n`;
  report += `Généré le: ${new Date().toLocaleString()}\n\n`;
  report += `---\n\n`;
  
  // Statistiques générales
  report += `## 📊 Statistiques Générales\n\n`;
  report += `- **Total drivers**: ${analysis.total}\n`;
  report += `- **Avec images complètes**: ${analysis.withImages} (${Math.round(analysis.withImages/analysis.total*100)}%)\n`;
  report += `- **Sans images ou incomplètes**: ${analysis.withoutImages} (${Math.round(analysis.withoutImages/analysis.total*100)}%)\n`;
  report += `- **Images small.png manquantes**: ${analysis.missingSmall}\n`;
  report += `- **Images large.png manquantes**: ${analysis.missingLarge}\n`;
  report += `- **Images à améliorer**: ${analysis.needsImprovement.length}\n\n`;
  
  // Par catégorie
  report += `## 📂 Statistiques par Catégorie\n\n`;
  report += `| Catégorie | Total | Avec Images | Sans Images | % Complété |\n`;
  report += `|-----------|-------|-------------|-------------|------------|\n`;
  
  for (const [category, stats] of Object.entries(analysis.byCategory)) {
    const pct = Math.round(stats.withImages/stats.total*100);
    report += `| ${category} | ${stats.total} | ${stats.withImages} | ${stats.withoutImages} | ${pct}% |\n`;
  }
  report += `\n`;
  
  // Par marque
  report += `## 🏷️ Statistiques par Marque\n\n`;
  report += `| Marque | Total | Avec Images | Sans Images | % Complété |\n`;
  report += `|--------|-------|-------------|-------------|------------|\n`;
  
  for (const [brand, stats] of Object.entries(analysis.byBrand)) {
    const pct = Math.round(stats.withImages/stats.total*100);
    report += `| ${brand} | ${stats.total} | ${stats.withImages} | ${stats.withoutImages} | ${pct}% |\n`;
  }
  report += `\n`;
  
  // Drivers nécessitant des améliorations
  report += `## 🔧 Drivers Nécessitant des Améliorations\n\n`;
  report += `Total: ${analysis.needsImprovement.length} drivers\n\n`;
  
  // Grouper par catégorie
  const byCategory = {};
  for (const item of analysis.needsImprovement) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }
  
  for (const [category, items] of Object.entries(byCategory)) {
    report += `### ${category} (${items.length} drivers)\n\n`;
    for (const item of items) {
      report += `- **${item.driver}** (${item.brand})\n`;
      report += `  - Raison: ${item.reason}\n`;
      if (item.smallSize !== undefined) {
        report += `  - Taille small: ${Math.round(item.smallSize/1024)}KB\n`;
      }
      if (item.largeSize !== undefined) {
        report += `  - Taille large: ${Math.round(item.largeSize/1024)}KB\n`;
      }
      report += `\n`;
    }
  }
  
  // Sources recommandées
  report += `## 🔗 Sources d'Images Recommandées\n\n`;
  report += `### Repos GitHub de Johan Bendz\n\n`;
  for (const [name, url] of Object.entries(IMAGE_SOURCES.johan_bendz)) {
    report += `- **${name}**: ${url}\n`;
  }
  report += `\n### Applications Officielles\n\n`;
  for (const [name, desc] of Object.entries(IMAGE_SOURCES.official_apps)) {
    report += `- **${name}**: ${desc}\n`;
  }
  report += `\n`;
  
  // Recommandations par type de produit
  report += `## 💡 Recommandations par Type de Produit\n\n`;
  for (const [type, info] of Object.entries(PRODUCT_IMAGE_TYPES)) {
    report += `### ${type}\n\n`;
    report += `- **Style d'icône**: ${info.icon_style}\n`;
    report += `- **Couleur recommandée**: ${info.recommended_color}\n`;
    report += `- **Marques de référence**: ${info.brands.join(', ')}\n\n`;
  }
  
  // Plan d'action
  report += `## 📋 Plan d'Action\n\n`;
  report += `1. **Phase 1**: Créer les images manquantes (${analysis.missingSmall + analysis.missingLarge} fichiers)\n`;
  report += `2. **Phase 2**: Améliorer les images de basse qualité\n`;
  report += `3. **Phase 3**: Standardiser le style visuel par catégorie\n`;
  report += `4. **Phase 4**: Vérifier la cohérence avec les marques officielles\n\n`;
  
  report += `## 🎯 Objectifs de Qualité\n\n`;
  report += `- **small.png**: 75x75px, minimum 2KB, PNG transparent si possible\n`;
  report += `- **large.png**: 500x500px, minimum 10KB, haute qualité\n`;
  report += `- **Style**: Cohérent avec la catégorie de produit\n`;
  report += `- **Background**: Préférence pour fond blanc/transparent\n\n`;
  
  return report;
}

async function main() {
  console.log('🎨 ANALYSE ET AMÉLIORATION DES IMAGES\n');
  console.log('═'.repeat(70) + '\n');
  
  const analysis = analyzeDrivers();
  const report = generateReport(analysis);
  
  fs.writeFileSync(REPORT_FILE, report);
  
  console.log('✅ Analyse terminée!\n');
  console.log(`📄 Rapport généré: ${REPORT_FILE}\n`);
  console.log('📊 Résumé:');
  console.log(`   - Drivers avec images: ${analysis.withImages}/${analysis.total}`);
  console.log(`   - Drivers à améliorer: ${analysis.needsImprovement.length}`);
  console.log(`   - Images manquantes: ${analysis.missingSmall + analysis.missingLarge}\n`);
}

main().catch(err => {
  console.error('❌ ERREUR:', err);
  process.exit(1);
});
