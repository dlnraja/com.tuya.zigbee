const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing duplicate flow card IDs...\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');

// Drivers with duplicate flow card IDs that need fixing
const driverFlowCards = {
  'contact_sensor_battery': ['is_open', 'is_closed', 'contact_opened', 'contact_closed'],
  'door_controller_ac': ['is_open', 'is_closed', 'contact_opened', 'contact_closed'],
  'door_lock_battery': ['is_open', 'is_closed', 'contact_opened', 'contact_closed'],
  'door_window_sensor_battery': ['is_open', 'is_closed', 'contact_opened', 'contact_closed'],
  'doorbell_camera_ac': ['is_open', 'is_closed', 'contact_opened', 'contact_closed'],
  'doorbell_cr2032': ['is_open', 'is_closed', 'contact_opened', 'contact_closed'],
  'garage_door_controller_ac': ['is_open', 'is_closed', 'contact_opened', 'contact_closed'],
  'garage_door_opener_cr2032': ['is_open', 'is_closed', 'contact_opened', 'contact_closed'],
  'led_strip_outdoor_color_ac': ['is_open', 'is_closed', 'contact_opened', 'contact_closed'],
  'outdoor_light_controller_ac': ['is_open', 'is_closed', 'contact_opened', 'contact_closed'],
  'outdoor_siren_cr2032': ['is_open', 'is_closed', 'contact_opened', 'contact_closed'],
  'smart_doorbell_battery': ['is_open', 'is_closed', 'contact_opened', 'contact_closed']
};

let fixed = 0;
let errors = 0;

for (const [driverName, cardIds] of Object.entries(driverFlowCards)) {
  const composeJsonPath = path.join(driversDir, driverName, 'driver.flow.compose.json');
  
  if (!fs.existsSync(composeJsonPath)) {
    console.log(`⏭️  ${driverName}: driver.flow.compose.json not found`);
    continue;
  }
  
  try {
    const content = fs.readFileSync(composeJsonPath, 'utf8');
    let modified = content;
    
    // Replace each generic ID with driver-specific ID
    for (const cardId of cardIds) {
      const newId = `${driverName}_${cardId}`;
      
      // Replace in "id" field
      const idPattern = new RegExp(`"id":\\s*"${cardId}"`, 'g');
      modified = String(modified).replace(idPattern, `"id": "${newId}"`);
      
      console.log(`   ${cardId} → ${newId}`);
    }
    
    // Only write if changes were made
    if (modified !== content) {
      fs.writeFileSync(composeJsonPath, modified, 'utf8');
      console.log(`✅ ${driverName}`);
      fixed++;
    }
    
  } catch (err) {
    console.error(`❌ ${driverName}: ${err.message}`);
    errors++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   ✅ Fixed: ${fixed}`);
console.log(`   ❌ Errors: ${errors}`);
console.log(`\n🎉 Done!`);
