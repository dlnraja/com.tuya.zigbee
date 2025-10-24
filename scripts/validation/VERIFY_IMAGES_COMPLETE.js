#!/usr/bin/env node

/**
 * 🖼️ VERIFY IMAGES COMPLETE
 * 
 * Vérifie que toutes les images sont présentes et conformes
 * pour tous les drivers
 * 
 * @version 2.1.46
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Tailles requises (Homey SDK3)
const REQUIRED_SIZES = {
  'small.png': { width: 75, height: 75 },
  'large.png': { width: 500, height: 500 },
  'xlarge.png': { width: 1000, height: 1000 } // Optionnel mais recommandé
};

/**
 * Obtient les dimensions d'une image PNG
 */
function getImageDimensions(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Vérifier PNG signature
    if (!buffer.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      return { error: 'Not a valid PNG file' };
    }
    
    // Lire IHDR chunk (offset 16)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    
    return { width, height };
    
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Vérifie les images d'un driver
 */
function verifyDriverImages(driverName) {
  const assetsPath = path.join(DRIVERS_DIR, driverName, 'assets');
  
  if (!fs.existsSync(assetsPath)) {
    return {
      driver: driverName,
      error: 'No assets directory'
    };
  }
  
  const result = {
    driver: driverName,
    images: {},
    missing: [],
    wrongSize: [],
    errors: []
  };
  
  // Vérifier chaque image requise
  Object.entries(REQUIRED_SIZES).forEach(([filename, expectedSize]) => {
    const imagePath = path.join(assetsPath, filename);
    
    if (!fs.existsSync(imagePath)) {
      result.missing.push(filename);
      return;
    }
    
    const dimensions = getImageDimensions(imagePath);
    
    if (dimensions.error) {
      result.errors.push({ file: filename, error: dimensions.error });
      return;
    }
    
    const sizeMatch = 
      dimensions.width === expectedSize.width && 
      dimensions.height === expectedSize.height;
    
    result.images[filename] = {
      exists: true,
      width: dimensions.width,
      height: dimensions.height,
      expected: expectedSize,
      valid: sizeMatch
    };
    
    if (!sizeMatch) {
      result.wrongSize.push({
        file: filename,
        actual: `${dimensions.width}x${dimensions.height}`,
        expected: `${expectedSize.width}x${expectedSize.height}`
      });
    }
  });
  
  // Statistiques du fichier
  Object.keys(result.images).forEach(filename => {
    const imagePath = path.join(assetsPath, filename);
    const stats = fs.statSync(imagePath);
    result.images[filename].size = stats.size;
    result.images[filename].sizeKB = (stats.size / 1024).toFixed(2);
  });
  
  return result;
}

/**
 * Analyse globale
 */
function analyzeAll(results) {
  console.log('\n📊 ANALYSE GLOBALE\n');
  console.log('='.repeat(70) + '\n');
  
  const stats = {
    total: results.length,
    withErrors: results.filter(r => r.error || r.errors.length > 0).length,
    withMissing: results.filter(r => r.missing.length > 0).length,
    withWrongSize: results.filter(r => r.wrongSize.length > 0).length,
    perfect: 0,
    totalImages: 0,
    totalSizeKB: 0,
    avgSizeKB: 0
  };
  
  results.forEach(r => {
    const imageCount = Object.keys(r.images || {}).length;
    stats.totalImages += imageCount;
    
    if (r.images) {
      Object.values(r.images).forEach(img => {
        stats.totalSizeKB += parseFloat(img.sizeKB);
      });
    }
    
    // Driver parfait = toutes images présentes, bonnes tailles, pas d'erreurs
    if (!r.error && r.missing.length === 0 && r.wrongSize.length === 0 && r.errors.length === 0) {
      stats.perfect++;
    }
  });
  
  stats.avgSizeKB = stats.totalImages > 0 ? 
    (stats.totalSizeKB / stats.totalImages).toFixed(2) : 0;
  
  const perfectPercentage = ((stats.perfect / stats.total) * 100).toFixed(1);
  
  console.log(`📁 Drivers analysés: ${stats.total}`);
  console.log(`✅ Drivers parfaits: ${stats.perfect} (${perfectPercentage}%)`);
  console.log(`❌ Avec erreurs: ${stats.withErrors}`);
  console.log(`📭 Avec images manquantes: ${stats.withMissing}`);
  console.log(`📏 Avec mauvaises tailles: ${stats.withWrongSize}`);
  console.log(`🖼️  Total images: ${stats.totalImages}`);
  console.log(`💾 Taille moyenne: ${stats.avgSizeKB} KB`);
  console.log(`💾 Taille totale: ${(stats.totalSizeKB / 1024).toFixed(2)} MB`);
  
  return stats;
}

/**
 * Génère rapport détaillé
 */
function generateDetailedReport(results) {
  console.log('\n📝 RAPPORT DÉTAILLÉ\n');
  console.log('='.repeat(70) + '\n');
  
  // Erreurs critiques
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.log('❌ ERREURS CRITIQUES:\n');
    errors.forEach(r => {
      console.log(`  ${r.driver}: ${r.error}`);
    });
    console.log('');
  }
  
  // Images manquantes
  const missing = results.filter(r => r.missing && r.missing.length > 0);
  if (missing.length > 0) {
    console.log('📭 IMAGES MANQUANTES:\n');
    missing.forEach(r => {
      console.log(`  ${r.driver}:`);
      r.missing.forEach(img => console.log(`    - ${img}`));
    });
    console.log('');
  }
  
  // Mauvaises tailles
  const wrongSize = results.filter(r => r.wrongSize && r.wrongSize.length > 0);
  if (wrongSize.length > 0) {
    console.log('📏 MAUVAISES TAILLES:\n');
    wrongSize.forEach(r => {
      console.log(`  ${r.driver}:`);
      r.wrongSize.forEach(img => {
        console.log(`    - ${img.file}: ${img.actual} (attendu: ${img.expected})`);
      });
    });
    console.log('');
  }
  
  // Erreurs de parsing
  const parseErrors = results.filter(r => r.errors && r.errors.length > 0);
  if (parseErrors.length > 0) {
    console.log('🔧 ERREURS DE PARSING:\n');
    parseErrors.forEach(r => {
      console.log(`  ${r.driver}:`);
      r.errors.forEach(e => console.log(`    - ${e.file}: ${e.error}`));
    });
    console.log('');
  }
  
  // Images les plus lourdes
  const allImages = [];
  results.forEach(r => {
    if (r.images) {
      Object.entries(r.images).forEach(([name, data]) => {
        allImages.push({
          driver: r.driver,
          file: name,
          sizeKB: parseFloat(data.sizeKB)
        });
      });
    }
  });
  
  const heaviest = allImages.sort((a, b) => b.sizeKB - a.sizeKB).slice(0, 10);
  if (heaviest.length > 0) {
    console.log('💾 TOP 10 IMAGES LES PLUS LOURDES:\n');
    heaviest.forEach((img, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${img.driver}/${img.file}: ${img.sizeKB} KB`);
    });
    console.log('');
  }
}

async function main() {
  console.log('\n🖼️  VERIFY IMAGES COMPLETE\n');
  console.log('='.repeat(70) + '\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  
  console.log(`📁 ${drivers.length} drivers à vérifier\n`);
  
  const results = drivers.map(verifyDriverImages);
  
  // Analyser
  const stats = analyzeAll(results);
  
  // Rapport détaillé
  generateDetailedReport(results);
  
  // Sauvegarder
  const outputFile = path.join(ROOT, 'reports', 'images_verification.json');
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify({ results, stats }, null, 2));
  console.log(`\n💾 Rapport sauvegardé: ${outputFile}`);
  
  // Status final
  if (stats.withErrors === 0 && stats.withMissing === 0 && stats.withWrongSize === 0) {
    console.log('\n✅ VÉRIFICATION RÉUSSIE - Toutes les images sont conformes!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  VÉRIFICATION TERMINÉE - Problèmes détectés!\n');
    process.exit(1);
  }
}

main().catch(console.error);
