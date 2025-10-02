const { createCanvas } = require('canvas');
const fs = require('fs');

// Force recreate 500x500 image
const canvas = createCanvas(500, 500);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#E6E6E6';
ctx.fillRect(0, 0, 500, 500);

// Write to both locations
fs.writeFileSync('drivers/co_detector_advanced/assets/large.png', canvas.toBuffer('image/png'));
fs.writeFileSync('.homeybuild/assets/large.png', canvas.toBuffer('image/png'));

console.log('✅ Image 500x500 forcée dans cache');
