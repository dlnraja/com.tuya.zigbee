const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

console.log('🎨 Création images APP correctes (250x175 et 500x350)\n');

(async () => {
  const xlarge = await loadImage('assets/images/xlarge.png');
  
  // Small 250x175 (APP)
  let canvas = createCanvas(250, 175);
  let ctx = canvas.getContext('2d');
  ctx.drawImage(xlarge, 0, 0, 250, 175);
  fs.writeFileSync('assets/images/small.png', canvas.toBuffer('image/png'));
  console.log('✅ small.png (250x175) - APP dimensions');
  
  // Large 500x350 (APP)
  canvas = createCanvas(500, 350);
  ctx = canvas.getContext('2d');
  ctx.drawImage(xlarge, 0, 0, 500, 350);
  fs.writeFileSync('assets/images/large.png', canvas.toBuffer('image/png'));
  console.log('✅ large.png (500x350) - APP dimensions');
  
  console.log('\n✅ Images APP créées aux BONNES dimensions!');
  console.log('   Drivers ont leurs propres images dans /drivers/*/assets/images/\n');
})();
