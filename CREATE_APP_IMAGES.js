const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

console.log('🎨 Création images APP aux bonnes dimensions\n');

async function createAppImages() {
  // Charger xlarge comme base
  const xlargeImg = await loadImage('assets/images/xlarge.png');
  
  // Créer small (250x175)
  const smallCanvas = createCanvas(250, 175);
  const smallCtx = smallCanvas.getContext('2d');
  smallCtx.drawImage(xlargeImg, 0, 0, 250, 175);
  const smallBuffer = smallCanvas.toBuffer('image/png');
  fs.writeFileSync('assets/images/small.png', smallBuffer);
  console.log('✅ small.png créé (250x175)');
  
  // Créer large (500x350)
  const largeCanvas = createCanvas(500, 350);
  const largeCtx = largeCanvas.getContext('2d');
  largeCtx.drawImage(xlargeImg, 0, 0, 500, 350);
  const largeBuffer = largeCanvas.toBuffer('image/png');
  fs.writeFileSync('assets/images/large.png', largeBuffer);
  console.log('✅ large.png créé (500x350)');
  
  console.log('\n✅ Images APP créées aux bonnes dimensions!');
  console.log('   Les drivers utiliseront leurs propres images\n');
}

createAppImages().catch(console.error);
