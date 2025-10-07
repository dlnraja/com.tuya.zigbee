#!/usr/bin/env node
/**
 * GENERATE VALID PNGS
 * 
 * Génère des PNG valides aux dimensions requises par Homey:
 * - small: 75x75
 * - large: 500x350
 * 
 * Utilise sharp pour créer des images PNG simples mais valides
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootPath = __dirname;
const driversPath = path.join(rootPath, 'drivers');
const assetsPath = path.join(rootPath, 'assets');

console.log('🎨 GENERATE VALID PNGS - Création PNG dimensions correctes');
console.log('='.repeat(80));
console.log('');

async function createPNG(width, height, text, outputPath) {
  // Créer un SVG simple
  const svg = `
    <svg width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#1E88E5"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" 
            font-family="Arial" font-size="${Math.min(width, height) / 8}" 
            fill="white">${text}</text>
    </svg>
  `;
  
  // Convertir SVG → PNG avec sharp
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
}

async function main() {
  console.log('📸 Génération images APP...');
  console.log('');
  
  // Images APP
  await createPNG(250, 175, 'Tuya', path.join(assetsPath, 'small.png'));
  console.log('   ✅ assets/small.png (250x175)');
  
  await createPNG(500, 350, 'Universal\nTuya Zigbee', path.join(assetsPath, 'large.png'));
  console.log('   ✅ assets/large.png (500x350)');
  
  console.log('');
  console.log('📸 Génération images DRIVERS...');
  console.log('');
  
  // Lister tous les drivers
  const driverFolders = fs.readdirSync(driversPath).filter(f => {
    const fullPath = path.join(driversPath, f);
    return fs.statSync(fullPath).isDirectory();
  });
  
  let count = 0;
  
  for (const driverFolder of driverFolders) {
    const driverAssetsPath = path.join(driversPath, driverFolder, 'assets');
    
    if (!fs.existsSync(driverAssetsPath)) {
      fs.mkdirSync(driverAssetsPath, { recursive: true });
    }
    
    // Créer small (75x75)
    await createPNG(75, 75, 'T', path.join(driverAssetsPath, 'small.png'));
    
    // Créer large (500x350)
    await createPNG(500, 350, driverFolder.substring(0, 15), path.join(driverAssetsPath, 'large.png'));
    
    count++;
    
    if (count % 20 === 0) {
      console.log(`   Progression: ${count}/${driverFolders.length}...`);
    }
  }
  
  console.log(`   ✅ Terminé: ${count}/${driverFolders.length}`);
  console.log('');
  
  // Mettre à jour app.json pour utiliser PNG
  console.log('📝 Mise à jour app.json...');
  
  const appJsonPath = path.join(rootPath, 'app.json');
  let appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
  
  // Remplacer SVG → PNG
  appJsonContent = appJsonContent.replace(/\.svg"/g, '.png"');
  
  fs.writeFileSync(appJsonPath, appJsonContent);
  console.log('   ✅ app.json mis à jour (SVG → PNG)');
  
  console.log('');
  console.log('='.repeat(80));
  console.log('✅ TOUS LES PNG GÉNÉRÉS AVEC DIMENSIONS CORRECTES');
  console.log('='.repeat(80));
  console.log('');
  
  console.log('📋 Images APP:');
  console.log('   - small.png: 250x175 ✅');
  console.log('   - large.png: 500x350 ✅');
  console.log('');
  console.log('📋 Images DRIVERS (×163):');
  console.log('   - small.png: 75x75 ✅');
  console.log('   - large.png: 500x350 ✅');
  console.log('');
  console.log('📋 Prochaine étape:');
  console.log('   homey app build && homey app validate --level=publish');
  console.log('');
}

main().catch(error => {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
});
