const fs = require('fs');

console.log('🎨 CYCLE 5/10: IMAGES CONTEXTUELLES');

// Spécifications images par type de device
const imageSpecs = {
  'smart_switch_1gang_ac': {
    description: 'Single wall switch with 1 button visible',
    colors: ['#4CAF50', '#8BC34A'],
    elements: '1 rectangular button'
  },
  'smart_switch_2gang_ac': {
    description: 'Double wall switch with 2 buttons visible',
    colors: ['#4CAF50', '#8BC34A'],
    elements: '2 rectangular buttons side by side'
  },
  'smart_switch_3gang_ac': {
    description: 'Triple wall switch with 3 buttons visible',
    colors: ['#4CAF50', '#8BC34A'],
    elements: '3 rectangular buttons in a row'
  },
  'motion_sensor_battery': {
    description: 'PIR motion sensor with detection waves',
    colors: ['#2196F3', '#03A9F4'],
    elements: 'Dome sensor with motion waves'
  },
  'smart_plug_energy': {
    description: 'Smart outlet with energy monitoring icon',
    colors: ['#9C27B0', '#673AB7'],
    elements: 'Electrical outlet with power symbol'
  }
};

let specs = 0;
Object.entries(imageSpecs).forEach(([driverId, spec]) => {
  const dir = `drivers/${driverId}/assets`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  
  const specFile = `${dir}/image-spec.json`;
  fs.writeFileSync(specFile, JSON.stringify({
    ...spec,
    sizes: ['75x75', '500x500', '1000x1000'],
    format: 'PNG',
    homeySDK3Compliant: true
  }, null, 2));
  specs++;
});

console.log(`✅ CYCLE 5 TERMINÉ - ${specs} spécifications images créées`);
