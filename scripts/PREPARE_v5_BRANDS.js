#!/usr/bin/env node

/**
 * PREPARE v5.0.0 - NOUVELLES MARQUES
 * Prépare l'ajout des marques manquantes identifiées
 */

const fs = require('fs');
const path = require('path');

console.log('\n🚀 PREPARE v5.0.0 - NOUVELLES MARQUES\n');

// Nouvelles marques à ajouter
const newBrands = {
  samsung: {
    name: 'Samsung SmartThings',
    priority: 1,
    patterns: ['SmartThings', 'Samsung', 'CentraLite'],
    devices: [
      'motion_sensor',
      'contact_sensor',
      'button',
      'outlet',
      'water_leak_sensor',
      'multipurpose_sensor'
    ],
    manufacturerIDs: [
      'SmartThings',
      'Samsung Electronics',
      'CentraLite',
      '_TZ3000_msl2w2kk',
      '_TZ3000_4fjiwweb'
    ]
  },
  
  sonoff: {
    name: 'Sonoff',
    priority: 1,
    patterns: ['SONOFF', 'eWeLink', 'SNZB'],
    devices: [
      'button_snzb01',
      'temp_humidity_snzb02',
      'motion_snzb03',
      'contact_snzb04',
      'switch_zbmini',
      'plug_s31_lite'
    ],
    manufacturerIDs: [
      'eWeLink',
      'SONOFF',
      '_TZ3000_zmy1waw6',
      '_TZ3000_tk3s5tyg',
      '_TZ3000_fsiepnrh'
    ]
  },
  
  philips: {
    name: 'Philips Hue',
    priority: 1,
    patterns: ['Philips', 'Signify'],
    devices: [
      'bulb_white_e27',
      'bulb_white_e14',
      'bulb_white_gu10',
      'bulb_color_e27',
      'bulb_color_e14',
      'light_strip',
      'outdoor_light',
      'dimmer_switch',
      'motion_sensor',
      'smart_button'
    ],
    manufacturerIDs: [
      'Philips',
      'Signify Netherlands B.V.',
      '_TZ3000_odygigth',
      '_TZ3000_dbou1ap4'
    ]
  },
  
  enki: {
    name: 'Enki (Leroy Merlin)',
    priority: 2,
    patterns: ['ENKI', 'Leroy Merlin'],
    devices: [
      'bulb_white_e27',
      'bulb_white_e14',
      'bulb_rgb_e27',
      'plug',
      'switch_1gang',
      'switch_2gang',
      'dimmer',
      'motion_sensor',
      'contact_sensor'
    ],
    manufacturerIDs: [
      'ENKI',
      '_TZ3000_obacbukl',
      '_TZ3000_el5kt5im',
      '_TZ3000_ss98ec5d'
    ]
  },
  
  osram: {
    name: 'OSRAM/Ledvance',
    priority: 2,
    patterns: ['OSRAM', 'LEDVANCE', 'SYLVANIA'],
    devices: [
      'bulb_white_e27',
      'bulb_tunable_e27',
      'bulb_rgb_e27',
      'light_strip',
      'outdoor_plug',
      'smart_plus_plug'
    ],
    manufacturerIDs: [
      'OSRAM',
      'LEDVANCE',
      'SYLVANIA',
      '_TZ3000_kdpxju99'
    ]
  },
  
  innr: {
    name: 'Innr Lighting',
    priority: 2,
    patterns: ['innr', 'Innr'],
    devices: [
      'bulb_white_e27',
      'bulb_white_e14',
      'bulb_white_gu10',
      'bulb_rgb_e27',
      'light_strip',
      'plug'
    ],
    manufacturerIDs: [
      'innr',
      'Innr',
      '_TZ3000_49qchf10'
    ]
  },
  
  xiaomi: {
    name: 'Xiaomi Mi',
    priority: 2,
    patterns: ['Xiaomi', 'Mi'],
    devices: [
      'smart_plug',
      'smart_bulb',
      'sensor_set',
      'button'
    ],
    manufacturerIDs: [
      'Xiaomi',
      'Mi',
      '_TZ3000_zmy4lslw'
    ]
  },
  
  yeelight: {
    name: 'Yeelight',
    priority: 3,
    patterns: ['Yeelight', 'YEELIGHT'],
    devices: [
      'bulb_color_e27',
      'bulb_white_e27',
      'light_strip',
      'ceiling_light'
    ],
    manufacturerIDs: [
      'Yeelight',
      'YEELIGHT',
      '_TZ3000_qqjaziws'
    ]
  },
  
  gledopto: {
    name: 'Gledopto',
    priority: 3,
    patterns: ['GLEDOPTO', 'Gledopto'],
    devices: [
      'rgb_controller',
      'cct_controller',
      'rgbcct_controller',
      'dimmer_controller'
    ],
    manufacturerIDs: [
      'GLEDOPTO',
      'Gledopto',
      '_TZ3000_riwp3k79'
    ]
  },
  
  sengled: {
    name: 'Sengled',
    priority: 3,
    patterns: ['sengled', 'Sengled'],
    devices: [
      'bulb_white_e27',
      'bulb_white_br30',
      'bulb_color_e27',
      'light_strip',
      'outdoor_light'
    ],
    manufacturerIDs: [
      'sengled',
      'Sengled',
      '_TZ3000_9i8st5im'
    ]
  }
};

// Créer structure pour v5.0.0
console.log('Création structure v5.0.0...\n');

const v5Dir = path.join(__dirname, '..', 'planning_v5');
if (!fs.existsSync(v5Dir)) {
  fs.mkdirSync(v5Dir, { recursive: true });
}

// Sauvegarder configuration
const configPath = path.join(v5Dir, 'NEW_BRANDS_CONFIG.json');
fs.writeFileSync(configPath, JSON.stringify(newBrands, null, 2));
console.log(`✅ Config saved: planning_v5/NEW_BRANDS_CONFIG.json\n`);

// Créer plan de drivers
const driversPlan = {};
let totalDrivers = 0;

for (const [brandKey, brandData] of Object.entries(newBrands)) {
  driversPlan[brandKey] = {
    name: brandData.name,
    drivers: []
  };
  
  for (const device of brandData.devices) {
    const driverName = `${brandKey}_${device}`;
    driversPlan[brandKey].drivers.push({
      name: driverName,
      type: device,
      priority: brandData.priority
    });
    totalDrivers++;
  }
}

const planPath = path.join(v5Dir, 'DRIVERS_PLAN.json');
fs.writeFileSync(planPath, JSON.stringify(driversPlan, null, 2));
console.log(`✅ Plan saved: planning_v5/DRIVERS_PLAN.json\n`);

// Créer summary
const summary = {
  version: '5.0.0',
  new_brands: Object.keys(newBrands).length,
  new_drivers: totalDrivers,
  current_drivers: 279,
  total_after_v5: 279 + totalDrivers,
  priority_1_brands: Object.values(newBrands).filter(b => b.priority === 1).length,
  priority_2_brands: Object.values(newBrands).filter(b => b.priority === 2).length,
  priority_3_brands: Object.values(newBrands).filter(b => b.priority === 3).length,
  estimated_weeks: 8
};

const summaryPath = path.join(v5Dir, 'V5_SUMMARY.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`✅ Summary saved: planning_v5/V5_SUMMARY.json\n`);

// Créer markdown summary
const mdContent = `# 📊 v5.0.0 PLANNING SUMMARY

## Nouvelles Marques: ${summary.new_brands}

### Priority 1 (Urgent):
${Object.entries(newBrands).filter(([k, v]) => v.priority === 1).map(([k, v]) => 
  `- **${v.name}**: ${v.devices.length} devices`
).join('\n')}

### Priority 2 (Important):
${Object.entries(newBrands).filter(([k, v]) => v.priority === 2).map(([k, v]) => 
  `- **${v.name}**: ${v.devices.length} devices`
).join('\n')}

### Priority 3 (Nice to have):
${Object.entries(newBrands).filter(([k, v]) => v.priority === 3).map(([k, v]) => 
  `- **${v.name}**: ${v.devices.length} devices`
).join('\n')}

## Statistiques:
- Nouveaux drivers: ${summary.new_drivers}
- Drivers actuels: ${summary.current_drivers}
- Total après v5: ${summary.total_after_v5}
- Temps estimé: ${summary.estimated_weeks} semaines

## Timeline:
- Semaines 1-2: Priority 1 brands
- Semaines 3-4: Priority 2 brands
- Semaines 5-6: Priority 3 brands
- Semaines 7-8: Testing & Polish
`;

const mdPath = path.join(v5Dir, 'V5_PLANNING.md');
fs.writeFileSync(mdPath, mdContent);
console.log(`✅ Planning saved: planning_v5/V5_PLANNING.md\n`);

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           PREPARE v5.0.0 - TERMINÉ                            ║
╚═══════════════════════════════════════════════════════════════╝

📊 RÉSUMÉ:
   Nouvelles marques:         ${summary.new_brands}
   Nouveaux drivers:          ${summary.new_drivers}
   Total après v5:            ${summary.total_after_v5}
   
   Priority 1:                ${summary.priority_1_brands} marques (Samsung, Sonoff, Philips)
   Priority 2:                ${summary.priority_2_brands} marques (Enki, OSRAM, Innr, Xiaomi)
   Priority 3:                ${summary.priority_3_brands} marques (Yeelight, Gledopto, Sengled)

📁 FICHIERS CRÉÉS:
   - planning_v5/NEW_BRANDS_CONFIG.json
   - planning_v5/DRIVERS_PLAN.json
   - planning_v5/V5_SUMMARY.json
   - planning_v5/V5_PLANNING.md

✅ v5.0.0 planning prêt!
`);
