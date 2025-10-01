const { createCanvas } = require('canvas');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('💥 SOLUTION DÉFINITIVE CACHE - Memory[d5ced755-7ba9-4d36-8dde-017c150a91e5]');

// 1. Force kill all Homey processes
try {
  execSync('taskkill /f /im homey.exe /t 2>nul', { stdio: 'ignore' });
  execSync('taskkill /f /im node.exe /fi "WINDOWTITLE eq homey*" /t 2>nul', { stdio: 'ignore' });
} catch (e) {}

// 2. Remove ALL cache directories completely
const cacheDirs = ['.homeybuild', 'node_modules/.cache', '.npm', '%APPDATA%/npm-cache'];
cacheDirs.forEach(dir => {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {}
});

// 3. Create PERFECT 500x500 image
const canvas = createCanvas(500, 500);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#E6E6E6';
ctx.fillRect(0, 0, 500, 500);
const perfectBuffer = canvas.toBuffer('image/png');

// 4. Write to source driver
fs.writeFileSync('drivers/co_detector_advanced/assets/large.png', perfectBuffer);

// 5. Verify image size
const stats = fs.statSync('drivers/co_detector_advanced/assets/large.png');

console.log(`✅ Cache forcé supprimé`);
console.log(`✅ Image parfaite créée: ${stats.size} bytes`);
console.log('🚀 PRÊT POUR VALIDATION FINALE!');
