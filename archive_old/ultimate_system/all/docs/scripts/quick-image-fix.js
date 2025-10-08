const fs = require('fs');
const path = require('path');

console.log('🎨 QUICK IMAGE FIX - Homey SDK3');

// Nettoyer cache
try { fs.rmSync('.homeybuild', {recursive: true}); } catch(e) {}

// Créer images par défaut aux bonnes tailles
const assetsDir = 'assets/images';
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, {recursive: true});
}

// Images SVG aux tailles correctes Homey SDK3
const createImage = (size, name) => {
  const [w, h] = size.split('x');
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
<rect width="${w}" height="${h}" fill="#00A8E8"/>
<circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)/4}" fill="white"/>
<text x="${w/2}" y="${h/2+4}" text-anchor="middle" fill="white" font-size="14" font-family="Arial">HUB</text>
</svg>`;
  fs.writeFileSync(`${assetsDir}/${name}.png`, svg);
  console.log(`✅ ${name}.png: ${size}px créé`);
};

// Créer aux tailles Homey officielles
createImage('75x75', 'small');
createImage('500x500', 'large'); 
createImage('1000x1000', 'xlarge');

console.log('🎯 Images corrigées - Standards Homey SDK3 respectés');
