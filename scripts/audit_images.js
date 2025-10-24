const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  imageFormats: ['.png', '.jpg', '.jpeg', '.svg', '.webp'],
  requiredImages: ['icon.svg'],
  maxFileSize: 500 * 1024, // 500KB
  recommendedSizes: {
    small: { width: 75, height: 75 },
    large: { width: 500, height: 500 }
  }
};

// Statistiques globales
const stats = {
  totalDrivers: 0,
  driversWithImages: 0,
  driversWithoutImages: 0,
  totalImages: 0,
  oversizedImages: [],
  missingImages: [],
  invalidFormats: [],
  recommendations: []
};

// Résultats détaillés par pilote
const driverDetails = [];

/**
 * Analyser un fichier image
 */
function analyzeImage(imagePath, driverName) {
  try {
    const stats = fs.statSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const fileName = path.basename(imagePath);
    
    const imageInfo = {
      driver: driverName,
      path: path.relative(CONFIG.rootDir, imagePath),
      name: fileName,
      size: stats.size,
      sizeKB: (stats.size / 1024).toFixed(2),
      format: ext,
      oversized: stats.size > CONFIG.maxFileSize,
      exists: true
    };
    
    // Vérifier si le fichier est trop grand
    if (imageInfo.oversized) {
      stats.oversizedImages.push(imageInfo);
    }
    
    // Vérifier le format
    if (!CONFIG.imageFormats.includes(ext)) {
      stats.invalidFormats.push(imageInfo);
    }
    
    return imageInfo;
  } catch (err) {
    return {
      driver: driverName,
      path: imagePath,
      error: err.message,
      exists: false
    };
  }
}

/**
 * Analyser un dossier de pilote
 */
function analyzeDriver(driverPath) {
  const driverName = path.basename(driverPath);
  const assetsPath = path.join(driverPath, 'assets');
  
  const driverInfo = {
    name: driverName,
    hasAssets: fs.existsSync(assetsPath),
    images: [],
    issues: []
  };
  
  stats.totalDrivers++;
  
  if (!driverInfo.hasAssets) {
    driverInfo.issues.push('Aucun dossier assets');
    stats.driversWithoutImages++;
    stats.missingImages.push({
      driver: driverName,
      missing: 'assets folder'
    });
    return driverInfo;
  }
  
  // Scanner les fichiers dans le dossier assets
  try {
    const files = fs.readdirSync(assetsPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return CONFIG.imageFormats.includes(ext);
    });
    
    if (imageFiles.length === 0) {
      driverInfo.issues.push('Aucune image trouvée dans assets');
      stats.driversWithoutImages++;
      stats.missingImages.push({
        driver: driverName,
        missing: 'images in assets folder'
      });
    } else {
      stats.driversWithImages++;
      
      // Analyser chaque image
      imageFiles.forEach(imageFile => {
        const imagePath = path.join(assetsPath, imageFile);
        const imageInfo = analyzeImage(imagePath, driverName);
        driverInfo.images.push(imageInfo);
        stats.totalImages++;
      });
    }
    
    // Vérifier si icon.svg existe
    const hasIconSvg = imageFiles.includes('icon.svg');
    if (!hasIconSvg) {
      driverInfo.issues.push('Fichier icon.svg manquant');
      stats.missingImages.push({
        driver: driverName,
        missing: 'icon.svg'
      });
    }
    
  } catch (err) {
    driverInfo.issues.push(`Erreur lors de la lecture: ${err.message}`);
  }
  
  return driverInfo;
}

/**
 * Analyser tous les pilotes
 */
function analyzeAllDrivers() {
  console.log('🔍 Début de l\'audit des images...\n');
  console.log('='.repeat(80));
  
  const driversPath = path.join(CONFIG.rootDir, 'drivers');
  
  if (!fs.existsSync(driversPath)) {
    console.error('❌ Le dossier drivers n\'existe pas:', driversPath);
    return;
  }
  
  const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(driversPath, dirent.name));
  
  console.log(`📁 ${drivers.length} pilotes trouvés\n`);
  
  // Analyser chaque pilote
  drivers.forEach((driverPath, index) => {
    const driverName = path.basename(driverPath);
    process.stdout.write(`\r[${index + 1}/${drivers.length}] Analyse: ${driverName}...`);
    
    const driverInfo = analyzeDriver(driverPath);
    driverDetails.push(driverInfo);
  });
  
  console.log('\n');
  console.log('='.repeat(80));
}

/**
 * Générer le rapport d'audit
 */
function generateReport() {
  console.log('\n📊 RAPPORT D\'AUDIT DES IMAGES');
  console.log('='.repeat(80));
  
  // Statistiques générales
  console.log('\n📈 STATISTIQUES GÉNÉRALES:');
  console.log('-'.repeat(80));
  console.log(`Total de pilotes analysés:        ${stats.totalDrivers}`);
  console.log(`Pilotes avec images:               ${stats.driversWithImages}`);
  console.log(`Pilotes sans images:               ${stats.driversWithoutImages}`);
  console.log(`Total d'images trouvées:           ${stats.totalImages}`);
  console.log(`Images surdimensionnées (>500KB):  ${stats.oversizedImages.length}`);
  console.log(`Images avec format invalide:       ${stats.invalidFormats.length}`);
  console.log(`Pilotes avec images manquantes:    ${stats.missingImages.length}`);
  
  // Images surdimensionnées
  if (stats.oversizedImages.length > 0) {
    console.log('\n⚠️  IMAGES SURDIMENSIONNÉES (>500KB):');
    console.log('-'.repeat(80));
    stats.oversizedImages.forEach(img => {
      console.log(`  • ${img.driver}`);
      console.log(`    Fichier: ${img.name} (${img.sizeKB}KB)`);
      console.log(`    Chemin: ${img.path}`);
    });
  }
  
  // Images manquantes
  if (stats.missingImages.length > 0) {
    console.log('\n❌ IMAGES MANQUANTES:');
    console.log('-'.repeat(80));
    const grouped = {};
    stats.missingImages.forEach(item => {
      if (!grouped[item.missing]) {
        grouped[item.missing] = [];
      }
      grouped[item.missing].push(item.driver);
    });
    
    Object.keys(grouped).forEach(missing => {
      console.log(`\n  Type: ${missing}`);
      console.log(`  Nombre de pilotes affectés: ${grouped[missing].length}`);
      if (grouped[missing].length <= 10) {
        grouped[missing].forEach(driver => {
          console.log(`    - ${driver}`);
        });
      } else {
        console.log(`    (Liste trop longue - ${grouped[missing].length} pilotes)`);
      }
    });
  }
  
  // Formats invalides
  if (stats.invalidFormats.length > 0) {
    console.log('\n🚫 FORMATS INVALIDES:');
    console.log('-'.repeat(80));
    stats.invalidFormats.forEach(img => {
      console.log(`  • ${img.driver}: ${img.name} (${img.format})`);
    });
  }
  
  // Recommandations
  console.log('\n💡 RECOMMANDATIONS:');
  console.log('-'.repeat(80));
  
  if (stats.oversizedImages.length > 0) {
    console.log(`  1. Optimiser ${stats.oversizedImages.length} images surdimensionnées`);
    console.log('     → Utiliser le script optimize_images.js');
  }
  
  if (stats.missingImages.length > 0) {
    console.log(`  2. Ajouter des images pour ${stats.missingImages.length} éléments manquants`);
    console.log('     → Créer les fichiers icon.svg manquants');
  }
  
  if (stats.invalidFormats.length > 0) {
    console.log(`  3. Convertir ${stats.invalidFormats.length} images avec des formats invalides`);
    console.log('     → Utiliser PNG ou SVG de préférence');
  }
  
  const coverage = ((stats.driversWithImages / stats.totalDrivers) * 100).toFixed(2);
  console.log(`\n  Couverture des images: ${coverage}%`);
  
  if (coverage < 100) {
    console.log(`  → ${stats.driversWithoutImages} pilotes nécessitent des images`);
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Sauvegarder le rapport détaillé en JSON
  const reportPath = path.join(CONFIG.rootDir, 'image-audit-report.json');
  const fullReport = {
    summary: stats,
    drivers: driverDetails,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
  console.log(`\n📄 Rapport détaillé sauvegardé: ${path.relative(CONFIG.rootDir, reportPath)}`);
  
  // Générer un fichier CSV pour analyse facile
  const csvPath = path.join(CONFIG.rootDir, 'image-audit-report.csv');
  const csvLines = ['Driver,Has Assets,Image Count,Issues'];
  
  driverDetails.forEach(driver => {
    const line = [
      driver.name,
      driver.hasAssets ? 'Yes' : 'No',
      driver.images.length,
      driver.issues.join('; ')
    ].join(',');
    csvLines.push(line);
  });
  
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log(`📊 Rapport CSV sauvegardé: ${path.relative(CONFIG.rootDir, csvPath)}`);
}

// Point d'entrée
async function main() {
  try {
    analyzeAllDrivers();
    generateReport();
    
    console.log('\n✅ Audit terminé avec succès!\n');
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'audit:', error);
    process.exit(1);
  }
}

main();
