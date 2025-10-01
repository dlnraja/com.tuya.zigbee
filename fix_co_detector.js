const fs = require('fs');

// Fix co_detector_advanced spécifiquement
const file = 'drivers/co_detector_advanced/driver.compose.json';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\"large\":\s*\"\.\/assets\/images\/large\.png\"/g, '"large": "./assets/large.png"');
fs.writeFileSync(file, content);

// Créer le fichier large.png manquant
const largePath = 'drivers/co_detector_advanced/assets/large.png';
const Canvas = require('canvas');
const canvas = Canvas.createCanvas(500, 500);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#E6E6E6';
ctx.fillRect(0, 0, 500, 500);
fs.writeFileSync(largePath, canvas.toBuffer('image/png'));

console.log('✅ co_detector_advanced corrigé');
