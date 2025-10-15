const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

console.log('🎨 Création images simples 75x75/500x500 pour CHAQUE driver\n');

const driversPath = path.join(__dirname, 'drivers');
const drivers = fs.readdirSync(driversPath).filter(d => 
  fs.statSync(path.join(driversPath, d)).isDirectory()
);

let created = 0;

drivers.forEach((driver, index) => {
  const imagesPath = path.join(driversPath, driver, 'assets', 'images');
  
  // Créer dossier
  fs.mkdirSync(imagesPath, { recursive: true });
  
  // Créer small.png (75x75) - Simple carré gris
  let canvas = createCanvas(75, 75);
  let ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4A90E2';
  ctx.fillRect(0, 0, 75, 75);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', 37.5, 37.5);
  fs.writeFileSync(path.join(imagesPath, 'small.png'), canvas.toBuffer('image/png'));
  
  // Créer large.png (500x500) - Simple carré gris
  canvas = createCanvas(500, 500);
  ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4A90E2';
  ctx.fillRect(0, 0, 500, 500);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', 250, 250);
  fs.writeFileSync(path.join(imagesPath, 'large.png'), canvas.toBuffer('image/png'));
  
  created++;
  if (index % 20 === 0) console.log(`  ${created}/${drivers.length}...`);
});

console.log(`\n✅ ${created} drivers - images 75x75/500x500 créées`);
console.log('   Images simples "Z" bleu\n');
