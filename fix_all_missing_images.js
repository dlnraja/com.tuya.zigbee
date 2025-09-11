const fs = require('fs');
const path = require('path');

function ensureImagesExist(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      ensureImagesExist(fullPath);
    } else if (file.name === 'driver.compose.json') {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const json = JSON.parse(content);
        
        // Check if this driver needs images (has id and is not excluded)
        if (json.id && !json.id.startsWith('_test')) {
          const driverDir = path.dirname(fullPath);
          const assetsDir = path.join(driverDir, 'assets');
          const imagesDir = path.join(assetsDir, 'images');
          
          // Ensure assets/images directory exists
          if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
          }
          if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
          }
          
          // Copy images if they don't exist
          const smallPath = path.join(imagesDir, 'small.png');
          const largePath = path.join(imagesDir, 'large.png');
          
          if (!fs.existsSync(smallPath)) {
            fs.copyFileSync('./correct_small_75x75.png', smallPath);
            console.log(`Added small.png to ${json.id}`);
          }
          
          if (!fs.existsSync(largePath)) {
            fs.copyFileSync('./correct_large_500x500.png', largePath);
            console.log(`Added large.png to ${json.id}`);
          }
          
          // Ensure driver.compose.json has images property
          if (!json.images) {
            json.images = {
              small: "{{driverAssetsPath}}/images/small.png",
              large: "{{driverAssetsPath}}/images/large.png"
            };
            fs.writeFileSync(fullPath, JSON.stringify(json, null, 2));
            console.log(`Added images property to ${json.id}`);
          }
        }
      } catch (error) {
        console.error(`Error processing ${fullPath}:`, error.message);
      }
    }
  }
}

// Fix all drivers
ensureImagesExist('./drivers');
console.log('All driver images and properties fixed.');
