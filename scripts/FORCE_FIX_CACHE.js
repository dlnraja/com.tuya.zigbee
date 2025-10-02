const { createCanvas } = require('canvas');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('💥 FORCE FIX CACHE - SOLUTION DÉFINITIVE');

// 1. Kill all Homey processes
try {
  execSync('taskkill /f /im "homey.exe" 2>nul', { stdio: 'ignore' });
} catch (e) {}

// 2. Remove ALL cache
['node_modules/.cache', '.homeybuild', 'npm-cache'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// 3. Create PERFECT 500x500 image
const canvas = createCanvas(500, 500);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#E6E6E6';
ctx.fillRect(0, 0, 500, 500);
const perfectBuffer = canvas.toBuffer('image/png');

// 4. Write to source
fs.writeFileSync('drivers/co_detector_advanced/assets/large.png', perfectBuffer);

console.log('✅ Cache forcé, image parfaite créée');
console.log('🚀 Lancez: homey app build');
