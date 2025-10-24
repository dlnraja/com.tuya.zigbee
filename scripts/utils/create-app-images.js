const fs = require('fs');
const { createCanvas } = require('canvas');

// Small 250x175
let canvas = createCanvas(250, 175);
let ctx = canvas.getContext('2d');
let gradient = ctx.createLinearGradient(0, 0, 250, 175);
gradient.addColorStop(0, '#4CAF50');
gradient.addColorStop(1, '#2196F3');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 250, 175);
ctx.fillStyle = '#FFFFFF';
ctx.font = 'bold 32px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Universal', 125, 70);
ctx.font = 'bold 28px Arial';
ctx.fillText('Tuya Zigbee', 125, 110);
fs.writeFileSync('assets/images/small.png', canvas.toBuffer('image/png'));

// Large 500x350
canvas = createCanvas(500, 350);
ctx = canvas.getContext('2d');
gradient = ctx.createLinearGradient(0, 0, 500, 350);
gradient.addColorStop(0, '#4CAF50');
gradient.addColorStop(1, '#2196F3');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 500, 350);
ctx.fillStyle = '#FFFFFF';
ctx.font = 'bold 64px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Universal', 250, 140);
ctx.font = 'bold 56px Arial';
ctx.fillText('Tuya Zigbee', 250, 210);
fs.writeFileSync('assets/images/large.png', canvas.toBuffer('image/png'));

console.log('APP images created: 250x175 and 500x350');
