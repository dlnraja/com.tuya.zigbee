const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

(async () => {
  console.log('🎨 Création images APP\n');
  
  const img = await loadImage('assets/images/xlarge.png');
  
  // Small 250x175
  let canvas = createCanvas(250, 175);
  let ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 250, 175);
  fs.writeFileSync('assets/images/small.png', canvas.toBuffer('image/png'));
  console.log('✅ small.png (250x175)');
  
  // Large 500x350
  canvas = createCanvas(500, 350);
  ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 500, 350);
  fs.writeFileSync('assets/images/large.png', canvas.toBuffer('image/png'));
  console.log('✅ large.png (500x350)\n');
})();
