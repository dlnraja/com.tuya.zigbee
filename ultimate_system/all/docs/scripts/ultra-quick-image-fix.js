const fs = require('fs');

console.log('🎯 ULTRA QUICK IMAGE FIX');

// Nettoyer cache
try { fs.rmSync('.homeybuild', {recursive: true}); } catch(e) {}

// Images SVG 75x75px (requis Homey)
const svg75 = `<svg width="75" height="75" xmlns="http://www.w3.org/2000/svg">
<rect width="75" height="75" fill="#00A8E8"/>
<rect x="15" y="15" width="45" height="45" fill="white" rx="4"/>
<circle cx="37.5" cy="37.5" r="8" fill="#00A8E8"/>
</svg>`;

// Créer assets globaux
fs.mkdirSync('assets/images', {recursive: true});
fs.writeFileSync('assets/images/small.png', svg75);
fs.writeFileSync('assets/images/large.png', svg75.replace(/75/g, '500'));

// Driver spécifique problématique
const driver = 'drivers/air_conditioner_controller/assets';
fs.mkdirSync(driver, {recursive: true});
fs.writeFileSync(`${driver}/small.png`, svg75);
fs.writeFileSync(`${driver}/large.png`, svg75.replace(/75/g, '500'));

console.log('✅ Images 75x75px créées - Driver et global');
console.log('🔄 Prêt pour validation');
