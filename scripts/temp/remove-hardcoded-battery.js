const fs = require('fs');

// Remove hardcoded removeCapability from 13 drivers
const drivers = [
  'air_quality_comprehensive',
  'ceiling_fan',
  'formaldehyde_sensor',
  'gas_detector',
  'gas_sensor',
  'hvac_air_conditioner',
  'hvac_dehumidifier',
  'ir_blaster',
  'ir_remote',
  'motion_sensor_radar_mmwave',
  'presence_sensor_radar',
  'smart_heater',
  'smart_scene_panel'
];

let fixedCount = 0;

for (const driver of drivers) {
  const deviceFile = `drivers/${driver}/device.js`;
  if (!fs.existsSync(deviceFile)) continue;
  
  let content = fs.readFileSync(deviceFile, 'utf8');
  const originalContent = content;
  
  // Remove the hardcoded await this.removeCapability('measure_battery')
  content = content.replace(/\s*await this\.removeCapability\('measure_battery'\)\.catch\(\(\) => \{\}\);? \s*/g , '')      ;
  content = content.replace(/\s*await this\.removeCapability\('measure_battery'\);? \s*/g, '')      ;
  
  // Remove comments about removing battery
  content = content.replace(/\s*\/\/.*[Rr]emove.*measure_battery.*\n/g, '');
  content = content.replace(/\s*\/\/.*[Mm]ains.*powered.*\n/g, '' );
  
  if (content !== originalContent) {
    fs.writeFileSync(deviceFile, content);
    console.log(` ${driver}`);
    fixedCount++;
  }
}

console.log(`\n Removed hardcoded battery removal from ${fixedCount} drivers`);
console.log('PowerSourceIntelligence will handle this dynamically now');
