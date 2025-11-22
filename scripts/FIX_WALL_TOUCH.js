const fs = require('fs');
const path = require('path');

const drivers = [
  'wall_touch_2gang',
  'wall_touch_3gang',
  'wall_touch_4gang',
  'wall_touch_5gang',
  'wall_touch_6gang',
  'wall_touch_7gang',
  'wall_touch_8gang'
];

console.log('Fixing wall_touch drivers...\n');

for (const driver of drivers) {
  const filePath = path.join(__dirname, 'drivers', driver, 'driver.js');
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the syntax error
    content = content.replace(
      'await // TEMPORARY FIX v4.9.276: Disabled due to missing flow cards\n // this.registerFlowCards();',
      '// TEMPORARY FIX v4.9.276: Disabled due to missing flow cards\n    // this.registerFlowCards();'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${driver}`);
  } else {
    console.log(`❌ Not found: ${driver}`);
  }
}

console.log('\n✅ All wall_touch drivers fixed!');
