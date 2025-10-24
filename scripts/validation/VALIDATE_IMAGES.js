#!/usr/bin/env node
/**
 * VALIDATE IMAGES
 * Vérifie la cohérence et qualité des images des drivers
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🖼️  VALIDATION DES IMAGES\n');

const issues = [];
const stats = {
  total: 0,
  withImages: 0,
  missingSmall: 0,
  missingLarge: 0,
  missingXlarge: 0,
  wrongFormat: 0,
  tooSmall: 0,
  tooBig: 0
};

// Tailles requises par Homey SDK3
const SIZES = {
  small: { width: 75, height: 75, maxSize: 50 * 1024 }, // 50KB
  large: { width: 500, height: 500, maxSize: 500 * 1024 }, // 500KB
  xlarge: { width: 1000, height: 1000, maxSize: 1000 * 1024 } // 1MB
};

function checkDriver(driverName, driverPath) {
  stats.total++;
  
  const assetsDir = path.join(driverPath, 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    issues.push({
      driver: driverName,
      type: 'missing_assets',
      severity: 'high',
      message: 'Dossier assets manquant'
    });
    return;
  }
  
  const files = fs.readdirSync(assetsDir);
  
  // Vérifier présence des fichiers requis
  const hasSmall = files.some(f => f.match(/^small\.(png|svg)$/));
  const hasLarge = files.some(f => f.match(/^large\.(png|svg)$/));
  const hasXlarge = files.some(f => f.match(/^xlarge\.(png|svg)$/));
  
  if (!hasSmall) {
    stats.missingSmall++;
    issues.push({
      driver: driverName,
      type: 'missing_image',
      severity: 'high',
      message: 'small.png ou small.svg manquant',
      file: 'small.png'
    });
  }
  
  if (!hasLarge) {
    stats.missingLarge++;
    issues.push({
      driver: driverName,
      type: 'missing_image',
      severity: 'high',
      message: 'large.png ou large.svg manquant',
      file: 'large.png'
    });
  }
  
  if (!hasXlarge) {
    stats.missingXlarge++;
    issues.push({
      driver: driverName,
      type: 'missing_image',
      severity: 'high',
      message: 'xlarge.png ou xlarge.svg manquant',
      file: 'xlarge.png'
    });
  }
  
  if (hasSmall && hasLarge && hasXlarge) {
    stats.withImages++;
  }
  
  // Vérifier fichiers non-standard
  const standardFiles = [
    'small.png', 'small.svg',
    'large.png', 'large.svg',
    'xlarge.png', 'xlarge.svg',
    'image-info.json', 'image-source.json',
    'product-original.jpg'
  ];
  
  for (const file of files) {
    if (!standardFiles.includes(file)) {
      issues.push({
        driver: driverName,
        type: 'unexpected_file',
        severity: 'low',
        message: `Fichier non-standard: ${file}`,
        file
      });
    }
  }
  
  // Vérifier tailles des PNG
  for (const size of ['small', 'large', 'xlarge']) {
    const pngPath = path.join(assetsDir, `${size}.png`);
    
    if (fs.existsSync(pngPath)) {
      const stat = fs.statSync(pngPath);
      const maxSize = SIZES[size].maxSize;
      
      if (stat.size > maxSize) {
        stats.tooBig++;
        issues.push({
          driver: driverName,
          type: 'size_too_big',
          severity: 'medium',
          message: `${size}.png trop gros (${(stat.size / 1024).toFixed(1)}KB > ${(maxSize / 1024).toFixed(0)}KB)`,
          file: `${size}.png`,
          actual: stat.size,
          max: maxSize
        });
      }
      
      if (stat.size < 1024) {
        stats.tooSmall++;
        issues.push({
          driver: driverName,
          type: 'size_too_small',
          severity: 'medium',
          message: `${size}.png suspect (${stat.size} bytes)`,
          file: `${size}.png`,
          actual: stat.size
        });
      }
    }
  }
}

// Scanner tous les drivers
const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(name => {
    const driverPath = path.join(DRIVERS_DIR, name);
    return fs.statSync(driverPath).isDirectory() && !name.startsWith('.');
  });

console.log(`📂 Scan de ${drivers.length} drivers...\n`);

for (const driver of drivers) {
  const driverPath = path.join(DRIVERS_DIR, driver);
  checkDriver(driver, driverPath);
}

// Rapport
console.log('📊 STATISTIQUES\n');
console.log(`  Total drivers:     ${stats.total}`);
console.log(`  Avec images:       ${stats.withImages} (${((stats.withImages / stats.total) * 100).toFixed(1)}%)`);
console.log(`  Sans small:        ${stats.missingSmall}`);
console.log(`  Sans large:        ${stats.missingLarge}`);
console.log(`  Sans xlarge:       ${stats.missingXlarge}`);
console.log(`  Trop gros:         ${stats.tooBig}`);
console.log(`  Trop petits:       ${stats.tooSmall}\n`);

// Issues par sévérité
const bySeverity = {
  high: issues.filter(i => i.severity === 'high'),
  medium: issues.filter(i => i.severity === 'medium'),
  low: issues.filter(i => i.severity === 'low')
};

console.log('🚨 PROBLÈMES DÉTECTÉS\n');
console.log(`  HIGH:    ${bySeverity.high.length}`);
console.log(`  MEDIUM:  ${bySeverity.medium.length}`);
console.log(`  LOW:     ${bySeverity.low.length}\n`);

// Afficher les problèmes HIGH
if (bySeverity.high.length > 0) {
  console.log('🔴 PROBLÈMES CRITIQUES (HIGH):\n');
  
  // Grouper par type
  const byType = {};
  for (const issue of bySeverity.high) {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
  }
  
  for (const [type, items] of Object.entries(byType)) {
    console.log(`  ${type}: ${items.length} drivers`);
    if (items.length <= 10) {
      items.forEach(i => console.log(`    - ${i.driver}: ${i.message}`));
    } else {
      items.slice(0, 5).forEach(i => console.log(`    - ${i.driver}: ${i.message}`));
      console.log(`    ... et ${items.length - 5} autres`);
    }
    console.log();
  }
}

// Générer rapport JSON
const report = {
  date: new Date().toISOString(),
  stats,
  issues,
  summary: {
    total: issues.length,
    high: bySeverity.high.length,
    medium: bySeverity.medium.length,
    low: bySeverity.low.length
  }
};

const reportPath = path.join(ROOT, 'reports', 'IMAGE_VALIDATION_REPORT.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`📄 Rapport: ${reportPath}\n`);

// Exit code selon sévérité
if (bySeverity.high.length > 0) {
  console.log('❌ Validation FAILED - Problèmes critiques détectés');
  process.exit(1);
} else if (bySeverity.medium.length > 0) {
  console.log('⚠️  Validation WARNING - Problèmes mineurs détectés');
  process.exit(0);
} else {
  console.log('✅ Validation SUCCESS - Toutes les images sont OK');
  process.exit(0);
}
