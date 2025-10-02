const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

fs.readdirSync('drivers').forEach(driver => {
  const assetsPath = path.join('drivers', driver, 'assets');
  if (!fs.existsSync(assetsPath)) fs.mkdirSync(assetsPath, { recursive: true });
  
  // Create small.png 75x75
  const smallCanvas = createCanvas(75, 75);
  const smallCtx = smallCanvas.getContext('2d');
  smallCtx.fillStyle = '#E6E6E6';
  smallCtx.fillRect(0, 0, 75, 75);
  fs.writeFileSync(path.join(assetsPath, 'small.png'), smallCanvas.toBuffer('image/png'));
});

console.log('Images fixed for all drivers');
