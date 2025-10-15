#!/usr/bin/env node

/**
 * RESIZE IMAGES - PRESERVE CONTENT
 * Redimensionne les images en préservant le contenu/design existant
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function resizeImagePreserveContent(sourcePath, targetPath, targetWidth, targetHeight) {
  try {
    if (!fs.existsSync(sourcePath)) {
      console.log(`⚠ Source n'existe pas: ${sourcePath}`);
      return false;
    }

    await sharp(sourcePath)
      .resize(targetWidth, targetHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(targetPath);
    
    return true;
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    return false;
  }
}

async function processDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const assetsPath = path.join(driverPath, 'assets');
  
  if (!fs.existsSync(assetsPath)) {
    return { driver: driverName, status: 'no_assets' };
  }

  const smallPath = path.join(assetsPath, 'small.png');
  const largePath = path.join(assetsPath, 'large.png');
  const xlargePath = path.join(assetsPath, 'xlarge.png');

  let results = { driver: driverName, small: false, large: false, xlarge: false };

  // Si small.png existe mais mauvaise taille, redimensionner
  if (fs.existsSync(smallPath)) {
    const metadata = await sharp(smallPath).metadata();
    if (metadata.width !== 75 || metadata.height !== 75) {
      // Redimensionner en préservant le contenu
      const tempPath = path.join(assetsPath, 'small_temp.png');
      fs.copyFileSync(smallPath, tempPath);
      results.small = await resizeImagePreserveContent(tempPath, smallPath, 75, 75);
      fs.unlinkSync(tempPath);
    } else {
      results.small = true; // Déjà bonne taille
    }
  }

  // Si large.png existe mais mauvaise taille
  if (fs.existsSync(largePath)) {
    const metadata = await sharp(largePath).metadata();
    if (metadata.width !== 500 || metadata.height !== 500) {
      const tempPath = path.join(assetsPath, 'large_temp.png');
      fs.copyFileSync(largePath, tempPath);
      results.large = await resizeImagePreserveContent(tempPath, largePath, 500, 500);
      fs.unlinkSync(tempPath);
    } else {
      results.large = true;
    }
  } else if (fs.existsSync(smallPath)) {
    // Créer large depuis small
    results.large = await resizeImagePreserveContent(smallPath, largePath, 500, 500);
  }

  // Si xlarge.png n'existe pas, créer depuis large ou small
  if (!fs.existsSync(xlargePath)) {
    if (fs.existsSync(largePath)) {
      results.xlarge = await resizeImagePreserveContent(largePath, xlargePath, 1000, 1000);
    } else if (fs.existsSync(smallPath)) {
      results.xlarge = await resizeImagePreserveContent(smallPath, xlargePath, 1000, 1000);
    }
  } else {
    const metadata = await sharp(xlargePath).metadata();
    if (metadata.width !== 1000 || metadata.height !== 1000) {
      const tempPath = path.join(assetsPath, 'xlarge_temp.png');
      fs.copyFileSync(xlargePath, tempPath);
      results.xlarge = await resizeImagePreserveContent(tempPath, xlargePath, 1000, 1000);
      fs.unlinkSync(tempPath);
    } else {
      results.xlarge = true;
    }
  }

  return results;
}

async function main() {
  console.log('\n🎨 RESIZE IMAGES - PRESERVE CONTENT\n');

  const drivers = fs.readdirSync(DRIVERS_DIR).filter(dir => {
    return fs.statSync(path.join(DRIVERS_DIR, dir)).isDirectory();
  });

  console.log(`📁 Traitement de ${drivers.length} drivers...\n`);

  let totalProcessed = 0;
  let totalFixed = 0;

  for (const driver of drivers) {
    const result = await processDriver(driver);
    
    if (result.status !== 'no_assets') {
      totalProcessed++;
      const fixed = [result.small, result.large, result.xlarge].filter(Boolean).length;
      if (fixed > 0) {
        console.log(`✅ ${driver}: ${fixed}/3 images`);
        totalFixed++;
      }
    }
  }

  // Traiter root assets/images aussi
  console.log('\n📱 Traitement logo application (assets/images)...\n');
  
  const assetsImagesPath = path.join(ROOT, 'assets', 'images');
  if (fs.existsSync(assetsImagesPath)) {
    const smallRoot = path.join(assetsImagesPath, 'small.png');
    const largeRoot = path.join(assetsImagesPath, 'large.png');
    const xlargeRoot = path.join(assetsImagesPath, 'xlarge.png');

    // Vérifier et redimensionner si nécessaire
    if (fs.existsSync(smallRoot)) {
      const metadata = await sharp(smallRoot).metadata();
      if (metadata.width !== 250 || metadata.height !== 175) {
        const tempPath = path.join(assetsImagesPath, 'small_temp.png');
        fs.copyFileSync(smallRoot, tempPath);
        await resizeImagePreserveContent(tempPath, smallRoot, 250, 175);
        fs.unlinkSync(tempPath);
        console.log('✅ small.png (250x175) redimensionné');
      } else {
        console.log('✅ small.png (250x175) déjà correcte');
      }
    }

    if (fs.existsSync(largeRoot)) {
      const metadata = await sharp(largeRoot).metadata();
      if (metadata.width !== 500 || metadata.height !== 350) {
        const tempPath = path.join(assetsImagesPath, 'large_temp.png');
        fs.copyFileSync(largeRoot, tempPath);
        await resizeImagePreserveContent(tempPath, largeRoot, 500, 350);
        fs.unlinkSync(tempPath);
        console.log('✅ large.png (500x350) redimensionné');
      } else {
        console.log('✅ large.png (500x350) déjà correcte');
      }
    }

    if (fs.existsSync(xlargeRoot)) {
      const metadata = await sharp(xlargeRoot).metadata();
      if (metadata.width !== 1000 || metadata.height !== 700) {
        const tempPath = path.join(assetsImagesPath, 'xlarge_temp.png');
        fs.copyFileSync(xlargeRoot, tempPath);
        await resizeImagePreserveContent(tempPath, xlargeRoot, 1000, 700);
        fs.unlinkSync(tempPath);
        console.log('✅ xlarge.png (1000x700) redimensionné');
      } else {
        console.log('✅ xlarge.png (1000x700) déjà correcte');
      }
    }
  }

  // Nettoyer cache
  const homeybuildPath = path.join(ROOT, '.homeybuild');
  if (fs.existsSync(homeybuildPath)) {
    fs.rmSync(homeybuildPath, { recursive: true, force: true });
    console.log('\n🧹 .homeybuild nettoyé');
  }

  console.log('\n============================================================');
  console.log('📊 RAPPORT FINAL');
  console.log('============================================================');
  console.log(`✅ Drivers traités: ${totalProcessed}`);
  console.log(`✅ Drivers avec images corrigées: ${totalFixed}`);
  console.log('\n🎉 REDIMENSIONNEMENT TERMINÉ (contenu préservé)!\n');
}

main().catch(console.error);
