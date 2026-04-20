const fs = require('fs');
const path = require('path');

// Copy placeholder images from existing thermostat driver to new radiator drivers
const sourceDriver = 'drivers/thermostat_tuya_dp';
const targetDrivers = ['drivers/radiator_valve_zigbee', 'drivers/radiator_wifi_tuya'];

for (const targetDriver of targetDrivers) {
  const targetImagesDir = path.join(targetDriver, 'assets/images');
  
  if (!fs.existsSync(targetImagesDir)) {
    fs.mkdirSync(targetImagesDir, { recursive: true });
  }

  // Check if source has images
  const sourceImagesDir = path.join(sourceDriver, 'assets/images');
  if (fs.existsSync(sourceImagesDir)) {
    // Copy all image files
    const files = fs.readdirSync(sourceImagesDir);
    for (const file of files) {
      const sourcePath = path.join(sourceImagesDir, file);
      const targetPath = path.join(targetImagesDir, file);
      
      if (fs.statSync(sourcePath).isFile()) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
    console.log(` Copied images from ${sourceDriver} to ${targetDriver}`);
  } else {
    // Create minimal 1x1 PNG placeholder
    const placeholder = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
      0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
      0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
      0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    ['small.png', 'large.png', 'xlarge.png'].forEach(filename => {
      fs.writeFileSync(path.join(targetImagesDir, filename), placeholder);
    });
    
    console.log(` Created placeholder images for ${targetDriver}`);
  }
}

console.log(' All radiator driver images ready');
