const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all driver.flow.compose.json files
const flowFiles = glob.sync('drivers/*/driver.flow.compose.json');

console.log(`Found ${flowFiles.length} flow compose files`);

flowFiles.forEach(file => {
  try {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    const driverId = path.basename(path.dirname(file));
    
    let changed = false;
    
    // Fix actions
    if (content.actions) {
      content.actions = content.actions.map(action => {
        if (['turn_on', 'turn_off', 'toggle', 'set_dim', 'set_brightness'].includes(action.id)) {
          console.log(`${driverId}: ${action.id} -> ${driverId}_${action.id}`);
          action.id = `${driverId}_${action.id}`;
          changed = true;
        }
        return action;
      });
    }
    
    if (changed) {
      fs.writeFileSync(file, JSON.stringify(content, null, 2));
      console.log(`✅ Fixed: ${file}`);
    }
    
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
});

console.log('\n✅ Done!');
