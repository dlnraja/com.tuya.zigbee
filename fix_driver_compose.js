const fs = require('fs');
const path = require('path');

console.log('=== FIXING DRIVER.COMPOSE.JSON FILES ===\n');

const driversPath = 'drivers';
const drivers = fs.readdirSync(driversPath).filter(f => 
  fs.statSync(path.join(driversPath, f)).isDirectory()
);

let fixed = 0;

drivers.forEach(driver => {
  const composePath = path.join(driversPath, driver, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    let content = fs.readFileSync(composePath, 'utf8');
    const original = content;
    
    // Fix image paths
    content = content.replace(/"small":\s*"\.\/assets\/images\/small\.png"/g, '"small": "./assets/small.png"');
    content = content.replace(/"fan_speed"/g, '"dim"');
    
    if (content !== original) {
      fs.writeFileSync(composePath, content, 'utf8');
      console.log(`✓ ${driver}`);
      fixed++;
    }
  }
});

console.log(`\n✅ Fixed ${fixed} driver.compose.json files`);
