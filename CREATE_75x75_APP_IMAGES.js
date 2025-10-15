const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

console.log('🎨 Création images APP 75x75/500x500 (dimensions driver)\n');

(async () => {
  // Prendre une image driver comme base
  const driverSmall = await loadImage('drivers/motion_sensor_battery/assets/images/small.png');
  const driverLarge = await loadImage('drivers/motion_sensor_battery/assets/images/large.png');
  
  // Copier directement
  fs.copyFileSync('drivers/motion_sensor_battery/assets/images/small.png', 'assets/images/small.png');
  fs.copyFileSync('drivers/motion_sensor_battery/assets/images/large.png', 'assets/images/large.png');
  
  console.log('✅ small.png (75x75) - Motion sensor');
  console.log('✅ large.png (500x500) - Motion sensor');
  console.log('\n⚠️  COMPROMIS: Tous les drivers auront cette image de fallback\n');
})();
