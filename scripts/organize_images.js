const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  imageFormats: ['.png', '.jpg', '.jpeg', '.svg'],
  maxDimensions: {
    small: { width: 120, height: 120 },
    large: { width: 256, height: 256 },
    xlarge: { width: 512, height: 512 }
  },
  quality: 80
};

// Statistiques
const stats = {
  totalImages: 0,
  optimized: 0,
  converted: 0,
  errors: 0,
  skipped: 0,
  optimizedSize: 0,
  originalSize: 0
};

// Vérifier et créer les dossiers nécessaires
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Optimiser une image
async function optimizeImage(inputPath, outputPath, options = {}) {
  try {
    const { width, height, quality = CONFIG.quality } = options;
    const originalSize = fs.statSync(inputPath).size;
    
    let image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // Vérifier si une optimisation est nécessaire
    const needsResize = width && height && 
      (metadata.width > width || metadata.height > height);
    
    const needsOptimization = originalSize > 100 * 1024; // > 100KB
    
    if (!needsResize && !needsOptimization) {
      stats.skipped++;
      stats.originalSize += originalSize;
      return false;
    }
    
    // Appliquer les transformations
    if (needsResize) {
      image = image.resize({
        width,
        height,
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Sauvegarder avec optimisation
    await image.toFile(outputPath, {
      quality,
      compressionLevel: 9,
      adaptiveFiltering: true,
      force: true
    });
    
    const optimizedSize = fs.statSync(outputPath).size;
    
    // Mettre à jour les statistiques
    stats.optimized++;
    stats.originalSize += originalSize;
    stats.optimizedSize += optimizedSize;
    
    console.log(`✓ Optimisé: ${path.relative(CONFIG.rootDir, inputPath)} ` +
      `(${(originalSize / 1024).toFixed(2)}KB → ${(optimizedSize / 1024).toFixed(2)}KB)`);
    
    return true;
  } catch (error) {
    console.error(`Erreur lors de l'optimisation de ${inputPath}:`, error.message);
    stats.errors++;
    return false;
  }
}

// Analyser un dossier de pilote
async function processDriver(driverPath) {
  const assetsPath = path.join(driverPath, 'assets');
  if (!fs.existsSync(assetsPath)) return;
  
  const files = fs.readdirSync(assetsPath);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (CONFIG.imageFormats.includes(ext)) {
      stats.totalImages++;
      const inputPath = path.join(assetsPath, file);
      const outputPath = inputPath; // Écraser le fichier original
      
      // Déterminer la taille cible basée sur le nom du fichier
      let options = {};
      if (file.includes('large')) {
        options = CONFIG.maxDimensions.large;
      } else if (file.includes('xlarge')) {
        options = CONFIG.maxDimensions.xlarge;
      } else if (file.includes('small')) {
        options = CONFIG.maxDimensions.small;
      }
      
      await optimizeImage(inputPath, outputPath, options);
    }
  }
}

// Analyser tous les pilotes
async function processAllDrivers() {
  console.log('🚀 Démarrage de l\'optimisation des images...\n');
  
  const driversPath = path.join(CONFIG.rootDir, 'drivers');
  const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(driversPath, dirent.name));
  
  console.log(`🔍 ${drivers.length} pilotes trouvés.\n`);
  
  // Traiter chaque pilote
  for (const driver of drivers) {
    console.log(`📂 Traitement du pilote: ${path.basename(driver)}`);
    await processDriver(driver);
  }
  
  // Afficher le résumé
  console.log('\n✅ Optimisation terminée !');
  console.log('='.repeat(50));
  console.log(`📊 Images traitées: ${stats.totalImages}`);
  console.log(`✅ Optimisées: ${stats.optimized}`);
  console.log(`⏭️  Ignorées: ${stats.skipped}`);
  console.log(`❌ Erreurs: ${stats.errors}`);
  console.log(`💾 Économie totale: ${((stats.originalSize - stats.optimizedSize) / 1024).toFixed(2)}KB`);
  console.log(`📉 Réduction: ${(100 - (stats.optimizedSize / stats.originalSize * 100)).toFixed(2)}%`);
  console.log('='.repeat(50));
}

// Installer les dépendances si nécessaire
function ensureDependencies() {
  try {
    require.resolve('sharp');
  } catch (e) {
    console.log('Installation des dépendances requises...');
    require('child_process').execSync('npm install sharp --no-save', { stdio: 'inherit' });
  }
}

// Point d'entrée
async function main() {
  try {
    ensureDependencies();
    await processAllDrivers();
  } catch (error) {
    console.error('Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  }
}

main();
