const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing turn_on_duration flow cards to include [[device]] token...\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');

const driversToFix = [
  'energy_monitoring_plug_ac',
  'energy_monitoring_plug_advanced_ac',
  'energy_plug_advanced_ac',
  'extension_plug_ac',
  'power_meter_socket_ac',
  'smart_outlet_monitor_ac',
  'smart_plug_ac',
  'smart_plug_dimmer_ac',
  'smart_plug_energy_ac',
  'smart_plug_power_meter_16a_ac',
  'usb_outlet_ac',
  'usb_outlet_advanced_ac'
];

let fixed = 0;
let errors = 0;

for (const driverName of driversToFix) {
  const composeJsonPath = path.join(driversDir, driverName, 'driver.flow.compose.json');
  
  if (!fs.existsSync(composeJsonPath)) {
    console.log(`⏭️  ${driverName}: driver.flow.compose.json not found`);
    continue;
  }
  
  try {
    const content = fs.readFileSync(composeJsonPath, 'utf8');
    const driver = JSON.parse(content);
    
    if (!driver.actions) {
      continue;
    }
    
    let modified = false;
    
    driver.actions.forEach(action => {
      if (action.id && action.id.includes('turn_on_duration')) {
        if (action.titleFormatted) {
          // Add [[device]] to English title
          if (action.titleFormatted.en && !action.titleFormatted.en.includes('[[device]]')) {
            action.titleFormatted.en = action.titleFormatted.en.replace(
              'Turn on',
              'Turn [[device]] on'
            );
            modified = true;
          }
          
          // Add [[device]] to French title
          if (action.titleFormatted.fr && !action.titleFormatted.fr.includes('[[device]]')) {
            action.titleFormatted.fr = action.titleFormatted.fr.replace(
              'Allumer',
              'Allumer [[device]]'
            );
            modified = true;
          }
        }
      }
    });
    
    if (modified) {
      fs.writeFileSync(composeJsonPath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
      console.log(`✅ ${driverName}`);
      fixed++;
    } else {
      console.log(`⏭️  ${driverName}: already correct`);
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
