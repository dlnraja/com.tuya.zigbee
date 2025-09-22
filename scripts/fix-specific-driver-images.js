const fs = require('fs');
const path = require('path');

console.log('🎯 FIX DRIVER SPÉCIFIQUE - air_conditioner_controller');

// Nettoyer complètement
try { fs.rmSync('.homeybuild', {recursive: true}); } catch(e) {}
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}

// Driver problématique
const driver = 'air_conditioner_controller';
const driverPath = `drivers/${driver}`;
const assetsPath = `${driverPath}/assets`;

// Créer dossier assets driver
if (!fs.existsSync(assetsPath)) {
  fs.mkdirSync(assetsPath, {recursive: true});
}

// Créer images aux tailles correctes Homey SDK3
const createDriverImage = (size, name) => {
  const [w, h] = size.split('x');
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
<rect width="${w}" height="${h}" fill="#0066CC"/>
<rect x="${w/4}" y="${h/4}" width="${w/2}" height="${h/2}" fill="white" rx="4"/>
<circle cx="${w/2}" cy="${h/2}" r="8" fill="#0066CC"/>
</svg>`;
  fs.writeFileSync(`${assetsPath}/${name}.png`, svg);
  console.log(`✅ ${driver}/${name}.png: ${size}px`);
};

// Images driver spécifique
createDriverImage('75x75', 'small');
createDriverImage('500x500', 'large');

// Images globales aussi
const globalAssets = 'assets/images';
if (!fs.existsSync(globalAssets)) {
  fs.mkdirSync(globalAssets, {recursive: true});
}

createDriverImage('75x75', `../../${globalAssets}/small`);
createDriverImage('500x500', `../../${globalAssets}/large`);

console.log('🎯 Driver et images globales corrigés');
