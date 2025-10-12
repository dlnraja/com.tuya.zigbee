const fs = require('fs');
const path = require('path');

function fixDriverImagePaths() {
  console.log('🔧 Fixing driver image paths...\n');
  
  const driversDir = path.join(__dirname, 'drivers');
  const drivers = fs.readdirSync(driversDir).filter(d => {
    return fs.statSync(path.join(driversDir, d)).isDirectory();
  });
  
  let fixed = 0;
  let errors = 0;
  
  for (const driverName of drivers) {
    const driverComposeFile = path.join(driversDir, driverName, 'driver.compose.json');
    
    if (!fs.existsSync(driverComposeFile)) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(driverComposeFile, 'utf8');
      let json = JSON.parse(content);
      
      // Fix image paths
      if (json.images) {
        let changed = false;
        
        // Fix main images
        if (json.images.small && json.images.small.startsWith('./assets/')) {
          json.images.small = json.images.small.replace('./assets/', `./drivers/${driverName}/assets/`);
          changed = true;
        }
        if (json.images.large && json.images.large.startsWith('./assets/')) {
          json.images.large = json.images.large.replace('./assets/', `./drivers/${driverName}/assets/`);
          changed = true;
        }
        if (json.images.xlarge && json.images.xlarge.startsWith('./assets/')) {
          json.images.xlarge = json.images.xlarge.replace('./assets/', `./drivers/${driverName}/assets/`);
          changed = true;
        }
        
        // Fix learnmode image if exists
        if (json.pair) {
          for (let pairStep of json.pair) {
            if (pairStep.id === 'list_devices' && pairStep.learnmode && pairStep.learnmode.image) {
              if (pairStep.learnmode.image.startsWith('./assets/')) {
                pairStep.learnmode.image = pairStep.learnmode.image.replace('./assets/', `./drivers/${driverName}/assets/`);
                changed = true;
              }
            }
          }
        }
        
        if (changed) {
          fs.writeFileSync(driverComposeFile, JSON.stringify(json, null, 2), 'utf8');
          console.log(`✅ ${driverName}`);
          fixed++;
        }
      }
    } catch (err) {
      console.log(`❌ ${driverName}: ${err.message}`);
      errors++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Fixed: ${fixed} drivers`);
  console.log(`   Errors: ${errors} drivers`);
  console.log(`   Total: ${drivers.length} drivers`);
  
  if (fixed > 0) {
    console.log('\n✅ Driver image paths corrected!');
    console.log('🔄 Run: homey app build to regenerate app.json');
  }
}

fixDriverImagePaths();
