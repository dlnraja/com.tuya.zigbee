#!/usr/bin/env node

/**
 * Ultimate Zigbee Hub - Unbranded Structure Creator
 * Organizes all drivers by device function, not by brand
 * Following professional device categorization standards
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 ULTIMATE ZIGBEE HUB - UNBRANDED ORGANIZATION');
console.log('📂 Creating professional device categorization structure');

// Professional device categories based on FUNCTION, not brand
const deviceCategories = {
  'motion-detection': {
    name: 'Motion & Presence Detection',
    description: 'PIR sensors, radar sensors, and presence detection devices',
    drivers: ['motion_sensor', 'presence_sensor', 'pir_motion_sensor', 'radar_sensor', 'human_presence_sensor']
  },
  'contact-security': {
    name: 'Contact & Security',
    description: 'Door/window sensors, smart locks, and security devices',
    drivers: ['contact_sensor', 'door_window_sensor', 'door_windows_sensor', 'smart_lock']
  },
  'climate-monitoring': {
    name: 'Climate Monitoring',
    description: 'Temperature, humidity, and environmental sensors',
    drivers: ['temperature_humidity_sensor', 'lcd_temperature_humidity_sensor', 'temp_and_hum_sensor', 'air_quality_sensor', 'soil_sensor']
  },
  'smart-lighting': {
    name: 'Smart Lighting',
    description: 'Smart bulbs, switches, dimmers, and lighting control',
    drivers: ['smart_light', 'light_switch', 'dimmer_switch', 'rgb_light', 'smart_rotary_dimmer']
  },
  'power-control': {
    name: 'Power & Energy Control',
    description: 'Smart plugs, outlets, and energy monitoring devices',
    drivers: ['smart_plug', 'energy_plug', 'smart_socket_ip_3010s', 'outdoor_power_plug', 'smart_switch_with_power_monitor']
  },
  'safety-detection': {
    name: 'Safety & Detection',
    description: 'Smoke, water leak, CO detectors, and emergency devices',
    drivers: ['smoke_detector', 'enhanced_smoke_detector', 'water_leak_detector', 'water_leak_sensor', 'co_detector', 'sos_button']
  },
  'automation-control': {
    name: 'Automation & Control',
    description: 'Smart buttons, scene switches, and automation controllers',
    drivers: ['smart_button', 'scene_switch', 'smart_knob', 'scene_remote_2gang', 'scene_remote_4gang', 'curtain_motor']
  },
  'climate-control': {
    name: 'Climate Control',
    description: 'Thermostats, radiator valves, and temperature control',
    drivers: ['thermostat', 'moes_smart_thermostatic_radiator_valve', 'tuya_smart_thermostatic_radiator_valve']
  }
};

function updateDriverName(driverPath, categoryInfo) {
  try {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
      return false;
    }

    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Update driver name to be function-focused, not brand-focused
    if (compose.name && compose.name.en) {
      const currentName = compose.name.en;
      
      // Remove brand prefixes and focus on function
      let newName = currentName
        .replace(/^(Tuya|MOES|Aqara|IKEA|Philips|Xiaomi|Sonoff|Nedis|Silvercrest|Smart9|Zemismart)\s*/i, '')
        .replace(/\s*(Tuya|MOES|Aqara|IKEA|Philips|Xiaomi|Sonoff|Nedis|Silvercrest|Smart9|Zemismart)$/i, '')
        .replace(/Zigbee\s*/i, '')
        .replace(/Smart\s*Home\s*/i, '')
        .trim();
      
      // Capitalize properly
      newName = newName.charAt(0).toUpperCase() + newName.slice(1);
      
      if (newName !== currentName) {
        compose.name.en = newName;
        console.log(`✅ Updated: ${currentName} → ${newName}`);
      }
    }

    // Update class to be more generic if brand-specific
    if (compose.class) {
      const brandSpecificClasses = {
        'tuya_sensor': 'sensor',
        'tuya_light': 'light',
        'tuya_switch': 'switch'
      };
      
      if (brandSpecificClasses[compose.class]) {
        compose.class = brandSpecificClasses[compose.class];
      }
    }

    // Write updated driver
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating ${path.basename(driverPath)}:`, error.message);
    return false;
  }
}

function createCategoryDocumentation() {
  let markdown = '# Ultimate Zigbee Hub - Professional Device Categories\n\n';
  markdown += '## Organized by Device Function, Not Brand\n\n';
  
  Object.entries(deviceCategories).forEach(([categoryId, category]) => {
    markdown += `### ${category.name}\n`;
    markdown += `${category.description}\n\n`;
    markdown += '**Compatible Drivers:**\n';
    category.drivers.forEach(driver => {
      markdown += `- ${driver.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
    });
    markdown += '\n';
  });
  
  markdown += '---\n\n';
  markdown += '**Note:** All devices work universally across manufacturers. ';
  markdown += 'Selection is based on what the device DOES, not who made it.\n';
  
  fs.writeFileSync(
    path.join(__dirname, '../../docs/UNBRANDED_CATEGORIES.md'),
    markdown,
    'utf8'
  );
  
  console.log('📄 Created unbranded categories documentation');
}

function main() {
  const driversDir = path.join(__dirname, '../../drivers');
  
  if (!fs.existsSync(driversDir)) {
    console.error('❌ Drivers directory not found');
    return;
  }

  const drivers = fs.readdirSync(driversDir);
  let updated = 0;
  let total = 0;

  console.log(`🔍 Processing ${drivers.length} drivers for unbranded organization...`);
  
  drivers.forEach(driverName => {
    const driverPath = path.join(driversDir, driverName);
    
    if (fs.statSync(driverPath).isDirectory()) {
      total++;
      
      // Find category for this driver
      let categoryInfo = null;
      Object.values(deviceCategories).forEach(category => {
        if (category.drivers.some(d => driverName.includes(d) || d.includes(driverName.split('_')[0]))) {
          categoryInfo = category;
        }
      });
      
      if (updateDriverName(driverPath, categoryInfo)) {
        updated++;
      }
    }
  });

  // Create category documentation
  createCategoryDocumentation();

  console.log(`\n📊 UNBRANDED ORGANIZATION SUMMARY:`);
  console.log(`✅ Updated: ${updated}/${total} drivers`);
  console.log(`📂 Categories: ${Object.keys(deviceCategories).length} functional categories`);
  console.log(`🎯 Focus: Device FUNCTION over brand names`);
  console.log(`🏷️  Result: Professional, unbranded user experience`);
  
  // Generate organization report
  const report = {
    timestamp: new Date().toISOString(),
    updated: updated,
    total: total,
    categories: deviceCategories,
    principle: 'Function over Brand',
    unbranded: true,
    success: updated > 0
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../reports/unbranded-organization-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log(`\n🎉 UNBRANDED ORGANIZATION COMPLETE!`);
  console.log(`📄 Report: scripts/reports/unbranded-organization-report.json`);
}

if (require.main === module) {
  main();
}
