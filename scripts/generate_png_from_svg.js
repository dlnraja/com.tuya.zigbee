const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  driversDir: path.join(__dirname, '..', 'drivers'),
  sizes: {
    small: 75,
    large: 500
  }
};

// Statistiques
const stats = {
  processed: 0,
  generated: 0,
  skipped: 0,
  errors: []
};

/**
 * Vérifier si ImageMagick est installé
 */
async function checkImageMagick() {
  try {
    await execPromise('magick -version');
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Convertir SVG en PNG avec ImageMagick
 */
async function convertSvgToPng(svgPath, pngPath, size) {
  try {
    const command = `magick -background none -density 300 "${svgPath}" -resize ${size}x${size} "${pngPath}"`;
    await execPromise(command);
    return true;
  } catch (err) {
    throw new Error(`ImageMagick conversion failed: ${err.message}`);
  }
}

/**
 * Convertir SVG en PNG avec Inkscape (alternative)
 */
async function convertSvgToPngInkscape(svgPath, pngPath, size) {
  try {
    const command = `inkscape "${svgPath}" --export-filename="${pngPath}" --export-width=${size} --export-height=${size}`;
    await execPromise(command);
    return true;
  } catch (err) {
    throw new Error(`Inkscape conversion failed: ${err.message}`);
  }
}

/**
 * Générer une image PNG simple basée sur SVG (méthode de secours sans dépendances)
 */
function generateFallbackPng(svgPath, pngPath, size) {
  // Cette méthode nécessite une bibliothèque comme sharp, mais pour l'instant
  // nous allons simplement copier le SVG et laisser l'utilisateur le convertir manuellement
  console.log(`  ⚠️  Conversion manuelle nécessaire pour: ${path.basename(pngPath)}`);
  return false;
}

/**
 * Traiter un pilote
 */
async function processDriver(driverName, converter) {
  const driverPath = path.join(CONFIG.driversDir, driverName);
  const assetsPath = path.join(driverPath, 'assets');
  const iconSvgPath = path.join(assetsPath, 'icon.svg');
  
  // Vérifier si icon.svg existe
  if (!fs.existsSync(iconSvgPath)) {
    return { status: 'no_svg', message: 'icon.svg not found' };
  }
  
  stats.processed++;
  
  const results = {
    small: false,
    large: false
  };
  
  // Générer small.png si manquant
  const smallPngPath = path.join(assetsPath, 'images', 'small.png');
  if (!fs.existsSync(smallPngPath)) {
    try {
      // Créer le dossier images si nécessaire
      const imagesDir = path.join(assetsPath, 'images');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      await converter(iconSvgPath, smallPngPath, CONFIG.sizes.small);
      results.small = true;
      stats.generated++;
    } catch (err) {
      stats.errors.push({
        driver: driverName,
        file: 'small.png',
        error: err.message
      });
    }
  }
  
  // Générer large.png si manquant
  const largePngPath = path.join(assetsPath, 'images', 'large.png');
  if (!fs.existsSync(largePngPath)) {
    try {
      // Créer le dossier images si nécessaire
      const imagesDir = path.join(assetsPath, 'images');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      await converter(iconSvgPath, largePngPath, CONFIG.sizes.large);
      results.large = true;
      stats.generated++;
    } catch (err) {
      stats.errors.push({
        driver: driverName,
        file: 'large.png',
        error: err.message
      });
    }
  }
  
  if (!results.small && !results.large) {
    stats.skipped++;
    return { status: 'skipped', message: 'PNG files already exist' };
  }
  
  return {
    status: 'success',
    small: results.small,
    large: results.large
  };
}

/**
 * Générer les PNG pour tous les pilotes
 */
async function generateAllPngs() {
  console.log('🖼️  Génération des images PNG à partir des SVG...\n');
  console.log('='.repeat(80));
  
  // Vérifier quel outil de conversion est disponible
  console.log('🔍 Vérification des outils de conversion...');
  
  let converter = null;
  let converterName = '';
  
  const hasImageMagick = await checkImageMagick();
  if (hasImageMagick) {
    converter = convertSvgToPng;
    converterName = 'ImageMagick';
    console.log('✅ ImageMagick trouvé\n');
  } else {
    console.log('⚠️  ImageMagick non trouvé');
    console.log('⚠️  Installation recommandée: https://imagemagick.org/\n');
    console.log('💡 Pour installer ImageMagick sur Windows:');
    console.log('   1. Téléchargez depuis https://imagemagick.org/script/download.php');
    console.log('   2. Installez avec l\'option "Install legacy utilities (e.g. convert)"\n');
    console.log('⚠️  Les PNG ne seront pas générés sans ImageMagick\n');
    return;
  }
  
  // Lister tous les pilotes
  const drivers = fs.readdirSync(CONFIG.driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`📁 ${drivers.length} pilotes à traiter\n`);
  console.log(`🔧 Utilisation de: ${converterName}\n`);
  
  // Traiter chaque pilote
  for (let i = 0; i < drivers.length; i++) {
    const driverName = drivers[i];
    process.stdout.write(`\r[${i + 1}/${drivers.length}] ${driverName}...`.padEnd(100));
    
    try {
      await processDriver(driverName, converter);
    } catch (err) {
      stats.errors.push({
        driver: driverName,
        error: err.message
      });
    }
  }
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`  Pilotes traités:      ${stats.processed}`);
  console.log(`  Images générées:      ${stats.generated}`);
  console.log(`  Déjà existantes:      ${stats.skipped}`);
  console.log(`  Erreurs:              ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n❌ ERREURS (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach(err => {
      console.log(`  • ${err.driver}${err.file ? ` (${err.file})` : ''}: ${err.error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`  ... et ${stats.errors.length - 10} autres erreurs`);
    }
  }
  
  console.log(`\n✅ Génération terminée!\n`);
}

// Point d'entrée
generateAllPngs().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
