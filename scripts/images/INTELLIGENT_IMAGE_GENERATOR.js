#!/usr/bin/env node
/**
 * INTELLIGENT IMAGE GENERATOR
 * Génère des images contextuelles intelligentes pour chaque driver
 * basé sur le folder name et recherches internet
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Mapping intelligent folder name -> type de produit -> couleur/icône
const PRODUCT_MAPPING = {
  // Buttons & Remotes
  button_emergency_sos: {
    type: 'Emergency Button',
    category: 'security',
    icon: 'emergency-button',
    color: '#F44336',
    gradient: ['#F44336', '#E91E63'],
    description: 'SOS Emergency Button',
    searchTerms: ['zigbee sos button', 'emergency button', 'panic button zigbee']
  },
  button_wireless_1: {
    type: 'Wireless Button 1-Gang',
    category: 'automation',
    icon: 'button-single',
    color: '#607D8B',
    gradient: ['#607D8B', '#78909C'],
    description: 'Single Button Remote',
    searchTerms: ['zigbee wireless button 1 gang', 'single button remote']
  },
  button_wireless_2: {
    type: 'Wireless Button 2-Gang',
    category: 'automation',
    icon: 'button-double',
    color: '#607D8B',
    gradient: ['#607D8B', '#78909C'],
    description: '2-Button Remote',
    searchTerms: ['zigbee wireless button 2 gang', 'double button remote']
  },
  button_wireless_3: {
    type: 'Wireless Button 3-Gang',
    category: 'automation',
    icon: 'button-triple',
    color: '#607D8B',
    gradient: ['#607D8B', '#78909C'],
    description: '3-Button Remote',
    searchTerms: ['zigbee wireless button 3 gang', 'triple button remote']
  },
  button_wireless_4: {
    type: 'Wireless Button 4-Gang',
    category: 'automation',
    icon: 'button-quad',
    color: '#607D8B',
    gradient: ['#607D8B', '#78909C'],
    description: '4-Button Remote',
    searchTerms: ['zigbee wireless button 4 gang', 'quad button remote']
  },
  
  // Sensors
  contact_sensor: {
    type: 'Contact Sensor',
    category: 'security',
    icon: 'door-sensor',
    color: '#2196F3',
    gradient: ['#2196F3', '#03A9F4'],
    description: 'Door/Window Sensor',
    searchTerms: ['zigbee door sensor', 'window contact sensor']
  },
  motion_sensor: {
    type: 'Motion Sensor',
    category: 'security',
    icon: 'motion-sensor',
    color: '#2196F3',
    gradient: ['#2196F3', '#03A9F4'],
    description: 'PIR Motion Sensor',
    searchTerms: ['zigbee motion sensor', 'pir sensor']
  },
  motion_sensor_battery: {
    type: 'Motion Sensor Battery',
    category: 'security',
    icon: 'motion-sensor',
    color: '#2196F3',
    gradient: ['#2196F3', '#03A9F4'],
    description: 'Battery Motion Sensor',
    searchTerms: ['zigbee motion sensor battery', 'wireless pir sensor']
  },
  water_leak_sensor: {
    type: 'Water Leak Sensor',
    category: 'security',
    icon: 'water-sensor',
    color: '#2196F3',
    gradient: ['#2196F3', '#00BCD4'],
    description: 'Water Leak Detector',
    searchTerms: ['zigbee water leak sensor', 'flood detector']
  },
  gas_sensor: {
    type: 'Gas Sensor',
    category: 'security',
    icon: 'gas-sensor',
    color: '#FF9800',
    gradient: ['#FF9800', '#FF5722'],
    description: 'Gas Leak Detector',
    searchTerms: ['zigbee gas sensor', 'gas leak detector']
  },
  smoke_sensor: {
    type: 'Smoke Sensor',
    category: 'security',
    icon: 'smoke-sensor',
    color: '#FF5722',
    gradient: ['#FF5722', '#F44336'],
    description: 'Smoke Detector',
    searchTerms: ['zigbee smoke detector', 'fire alarm sensor']
  },
  
  // Climate
  climate_monitor_temp_humidity: {
    type: 'Temperature & Humidity',
    category: 'climate',
    icon: 'temp-humidity',
    color: '#FF9800',
    gradient: ['#FF9800', '#FF5722'],
    description: 'Temp/Humidity Monitor',
    searchTerms: ['zigbee temperature humidity sensor', 'climate monitor']
  },
  climate_sensor_soil: {
    type: 'Soil Sensor',
    category: 'climate',
    icon: 'soil-sensor',
    color: '#8BC34A',
    gradient: ['#8BC34A', '#4CAF50'],
    description: 'Soil Moisture Sensor',
    searchTerms: ['zigbee soil moisture sensor', 'plant sensor']
  },
  thermostat_temperature_control: {
    type: 'Thermostat',
    category: 'climate',
    icon: 'thermostat',
    color: '#FF9800',
    gradient: ['#FF9800', '#FF5722'],
    description: 'Temperature Controller',
    searchTerms: ['zigbee thermostat', 'temperature controller']
  },
  radiator_valve_smart: {
    type: 'Radiator Valve',
    category: 'climate',
    icon: 'radiator-valve',
    color: '#FF9800',
    gradient: ['#FF9800', '#FF5722'],
    description: 'Smart TRV',
    searchTerms: ['zigbee radiator valve', 'smart trv']
  },
  
  // Switches & Plugs
  switch_wall_1gang: {
    type: 'Wall Switch 1-Gang',
    category: 'switches',
    icon: 'switch-1gang',
    color: '#4CAF50',
    gradient: ['#4CAF50', '#8BC34A'],
    description: '1-Gang Wall Switch',
    searchTerms: ['zigbee wall switch 1 gang', 'single gang switch']
  },
  switch_wall_2gang: {
    type: 'Wall Switch 2-Gang',
    category: 'switches',
    icon: 'switch-2gang',
    color: '#4CAF50',
    gradient: ['#4CAF50', '#8BC34A'],
    description: '2-Gang Wall Switch',
    searchTerms: ['zigbee wall switch 2 gang', 'double gang switch']
  },
  switch_wall_3gang: {
    type: 'Wall Switch 3-Gang',
    category: 'switches',
    icon: 'switch-3gang',
    color: '#4CAF50',
    gradient: ['#4CAF50', '#8BC34A'],
    description: '3-Gang Wall Switch',
    searchTerms: ['zigbee wall switch 3 gang', 'triple gang switch']
  },
  plug_energy_monitoring: {
    type: 'Smart Plug',
    category: 'energy',
    icon: 'smart-plug',
    color: '#9C27B0',
    gradient: ['#9C27B0', '#673AB7'],
    description: 'Energy Monitoring Plug',
    searchTerms: ['zigbee smart plug energy monitoring', 'power monitor plug']
  },
  module_mini_switch: {
    type: 'Mini Switch Module',
    category: 'switches',
    icon: 'mini-module',
    color: '#4CAF50',
    gradient: ['#4CAF50', '#8BC34A'],
    description: 'Compact Switch Module',
    searchTerms: ['zigbee mini switch module', 'compact relay']
  },
  
  // Lighting
  bulb_rgb: {
    type: 'RGB Bulb',
    category: 'lighting',
    icon: 'bulb-rgb',
    color: '#FFD700',
    gradient: ['#FFD700', '#FFA500'],
    description: 'RGB Smart Bulb',
    searchTerms: ['zigbee rgb bulb', 'color smart bulb']
  },
  bulb_tunable_white: {
    type: 'Tunable White Bulb',
    category: 'lighting',
    icon: 'bulb-white',
    color: '#FFD700',
    gradient: ['#FFD700', '#FFA500'],
    description: 'CCT Smart Bulb',
    searchTerms: ['zigbee tunable white bulb', 'cct bulb']
  },
  led_strip_rgbw: {
    type: 'LED Strip RGBW',
    category: 'lighting',
    icon: 'led-strip',
    color: '#FFD700',
    gradient: ['#FFD700', '#FFA500'],
    description: 'RGB+W LED Strip',
    searchTerms: ['zigbee led strip rgbw', 'rgb led strip controller']
  },
  ceiling_light_rgb: {
    type: 'RGB Ceiling Light',
    category: 'lighting',
    icon: 'ceiling-light',
    color: '#FFD700',
    gradient: ['#FFD700', '#FFA500'],
    description: 'RGB Smart Ceiling',
    searchTerms: ['zigbee rgb ceiling light', 'smart ceiling lamp']
  },
  
  // Security
  siren: {
    type: 'Siren Alarm',
    category: 'security',
    icon: 'siren',
    color: '#F44336',
    gradient: ['#F44336', '#E91E63'],
    description: 'Smart Siren',
    searchTerms: ['zigbee siren alarm', 'smart alarm siren']
  },
  lock_smart: {
    type: 'Smart Lock',
    category: 'security',
    icon: 'smart-lock',
    color: '#F44336',
    gradient: ['#F44336', '#E91E63'],
    description: 'Smart Door Lock',
    searchTerms: ['zigbee smart lock', 'electronic door lock']
  },
  
  // Curtains & Covers
  curtain_controller: {
    type: 'Curtain Controller',
    category: 'automation',
    icon: 'curtain',
    color: '#607D8B',
    gradient: ['#607D8B', '#78909C'],
    description: 'Smart Curtain Motor',
    searchTerms: ['zigbee curtain controller', 'smart curtain motor']
  },
  blind_controller: {
    type: 'Blind Controller',
    category: 'automation',
    icon: 'blind',
    color: '#607D8B',
    gradient: ['#607D8B', '#78909C'],
    description: 'Smart Blind Motor',
    searchTerms: ['zigbee blind controller', 'roller blind motor']
  }
};

// Génération SVG intelligent
function generateSVG(config, size = 500) {
  const { type, icon, color, gradient, description } = config;
  
  // Créer un SVG avec gradient et icône contextuelle
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${gradient[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${gradient[1]};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background circle with gradient -->
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.45}" fill="url(#grad1)" filter="url(#shadow)"/>
  
  <!-- Icon placeholder (contextuel selon le type) -->
  ${getIconSVG(icon, size)}
  
  <!-- Device type text (pour les grandes images) -->
  ${size >= 500 ? `
  <text x="${size/2}" y="${size - 40}" 
        font-family="Arial, sans-serif" 
        font-size="24" 
        font-weight="bold" 
        text-anchor="middle" 
        fill="#FFFFFF" 
        opacity="0.9">
    ${type}
  </text>` : ''}
</svg>`;

  return svg;
}

function getIconSVG(iconType, size) {
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 500;
  
  // Bibliothèque d'icônes contextuelles
  const icons = {
    'emergency-button': `
      <circle cx="${cx}" cy="${cy}" r="${60*scale}" fill="#FFFFFF" opacity="0.9"/>
      <text x="${cx}" y="${cy + 20*scale}" font-family="Arial" font-size="${60*scale}" font-weight="bold" text-anchor="middle" fill="${PRODUCT_MAPPING.button_emergency_sos.color}">!</text>
    `,
    'button-single': `
      <rect x="${cx - 40*scale}" y="${cy - 40*scale}" width="${80*scale}" height="${80*scale}" rx="${10*scale}" fill="#FFFFFF" opacity="0.9"/>
    `,
    'button-double': `
      <rect x="${cx - 50*scale}" y="${cy - 40*scale}" width="${40*scale}" height="${80*scale}" rx="${8*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx + 10*scale}" y="${cy - 40*scale}" width="${40*scale}" height="${80*scale}" rx="${8*scale}" fill="#FFFFFF" opacity="0.9"/>
    `,
    'button-triple': `
      <rect x="${cx - 65*scale}" y="${cy - 30*scale}" width="${35*scale}" height="${60*scale}" rx="${6*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx - 17.5*scale}" y="${cy - 30*scale}" width="${35*scale}" height="${60*scale}" rx="${6*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx + 30*scale}" y="${cy - 30*scale}" width="${35*scale}" height="${60*scale}" rx="${6*scale}" fill="#FFFFFF" opacity="0.9"/>
    `,
    'button-quad': `
      <rect x="${cx - 50*scale}" y="${cy - 50*scale}" width="${40*scale}" height="${40*scale}" rx="${6*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx + 10*scale}" y="${cy - 50*scale}" width="${40*scale}" height="${40*scale}" rx="${6*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx - 50*scale}" y="${cy + 10*scale}" width="${40*scale}" height="${40*scale}" rx="${6*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx + 10*scale}" y="${cy + 10*scale}" width="${40*scale}" height="${40*scale}" rx="${6*scale}" fill="#FFFFFF" opacity="0.9"/>
    `,
    'door-sensor': `
      <rect x="${cx - 50*scale}" y="${cy - 60*scale}" width="${50*scale}" height="${120*scale}" rx="${8*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx + 10*scale}" y="${cy - 50*scale}" width="${40*scale}" height="${100*scale}" rx="${8*scale}" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="${cx - 20*scale}" cy="${cy}" r="${8*scale}" fill="#000000" opacity="0.3"/>
    `,
    'motion-sensor': `
      <circle cx="${cx}" cy="${cy - 20*scale}" r="${50*scale}" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="${cx - 25*scale}" cy="${cy - 20*scale}" r="${15*scale}" fill="#000000" opacity="0.3"/>
      <circle cx="${cx + 25*scale}" cy="${cy - 20*scale}" r="${15*scale}" fill="#000000" opacity="0.3"/>
      <path d="M ${cx - 30*scale} ${cy + 40*scale} Q ${cx} ${cy + 60*scale} ${cx + 30*scale} ${cy + 40*scale}" stroke="#FFFFFF" stroke-width="${8*scale}" fill="none" opacity="0.9"/>
    `,
    'water-sensor': `
      <ellipse cx="${cx}" cy="${cy + 20*scale}" rx="${60*scale}" ry="${40*scale}" fill="#FFFFFF" opacity="0.9"/>
      <path d="M ${cx - 20*scale} ${cy - 30*scale} Q ${cx} ${cy - 60*scale} ${cx + 20*scale} ${cy - 30*scale} Q ${cx} ${cy} ${cx - 20*scale} ${cy - 30*scale}" fill="#FFFFFF" opacity="0.9"/>
    `,
    'temp-humidity': `
      <rect x="${cx - 40*scale}" y="${cy - 60*scale}" width="${80*scale}" height="${100*scale}" rx="${10*scale}" fill="#FFFFFF" opacity="0.9"/>
      <text x="${cx}" y="${cy - 10*scale}" font-family="Arial" font-size="${40*scale}" font-weight="bold" text-anchor="middle" fill="${PRODUCT_MAPPING.climate_monitor_temp_humidity.color}">°C</text>
      <text x="${cx}" y="${cy + 30*scale}" font-family="Arial" font-size="${30*scale}" text-anchor="middle" fill="${PRODUCT_MAPPING.climate_monitor_temp_humidity.color}">%</text>
    `,
    'smart-plug': `
      <rect x="${cx - 40*scale}" y="${cy - 60*scale}" width="${80*scale}" height="${120*scale}" rx="${10*scale}" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="${cx - 15*scale}" cy="${cy - 10*scale}" r="${8*scale}" fill="#000000" opacity="0.3"/>
      <circle cx="${cx + 15*scale}" cy="${cy - 10*scale}" r="${8*scale}" fill="#000000" opacity="0.3"/>
      <rect x="${cx - 5*scale}" y="${cy + 15*scale}" width="${10*scale}" height="${25*scale}" fill="#000000" opacity="0.3"/>
    `,
    'bulb-rgb': `
      <circle cx="${cx}" cy="${cy - 20*scale}" r="${50*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx - 20*scale}" y="${cy + 35*scale}" width="${40*scale}" height="${30*scale}" rx="${5*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx - 15*scale}" y="${cy + 65*scale}" width="${30*scale}" height="${10*scale}" fill="#FFFFFF" opacity="0.9"/>
    `,
    'led-strip': `
      <rect x="${cx - 80*scale}" y="${cy - 15*scale}" width="${160*scale}" height="${30*scale}" rx="${5*scale}" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="${cx - 60*scale}" cy="${cy}" r="${8*scale}" fill="#FF0000" opacity="0.6"/>
      <circle cx="${cx - 30*scale}" cy="${cy}" r="${8*scale}" fill="#00FF00" opacity="0.6"/>
      <circle cx="${cx}" cy="${cy}" r="${8*scale}" fill="#0000FF" opacity="0.6"/>
      <circle cx="${cx + 30*scale}" cy="${cy}" r="${8*scale}" fill="#FFFF00" opacity="0.6"/>
      <circle cx="${cx + 60*scale}" cy="${cy}" r="${8*scale}" fill="#FF00FF" opacity="0.6"/>
    `,
    'switch-1gang': `
      <rect x="${cx - 50*scale}" y="${cy - 70*scale}" width="${100*scale}" height="${140*scale}" rx="${10*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx - 25*scale}" y="${cy - 30*scale}" width="${50*scale}" height="${60*scale}" rx="${5*scale}" fill="${PRODUCT_MAPPING.switch_wall_1gang.color}" opacity="0.7"/>
    `,
    'switch-2gang': `
      <rect x="${cx - 50*scale}" y="${cy - 70*scale}" width="${100*scale}" height="${140*scale}" rx="${10*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx - 45*scale}" y="${cy - 30*scale}" width="${35*scale}" height="${60*scale}" rx="${5*scale}" fill="${PRODUCT_MAPPING.switch_wall_2gang.color}" opacity="0.7"/>
      <rect x="${cx + 10*scale}" y="${cy - 30*scale}" width="${35*scale}" height="${60*scale}" rx="${5*scale}" fill="${PRODUCT_MAPPING.switch_wall_2gang.color}" opacity="0.7"/>
    `,
    'switch-3gang': `
      <rect x="${cx - 60*scale}" y="${cy - 70*scale}" width="${120*scale}" height="${140*scale}" rx="${10*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx - 50*scale}" y="${cy - 30*scale}" width="${28*scale}" height="${60*scale}" rx="${4*scale}" fill="${PRODUCT_MAPPING.switch_wall_3gang.color}" opacity="0.7"/>
      <rect x="${cx - 14*scale}" y="${cy - 30*scale}" width="${28*scale}" height="${60*scale}" rx="${4*scale}" fill="${PRODUCT_MAPPING.switch_wall_3gang.color}" opacity="0.7"/>
      <rect x="${cx + 22*scale}" y="${cy - 30*scale}" width="${28*scale}" height="${60*scale}" rx="${4*scale}" fill="${PRODUCT_MAPPING.switch_wall_3gang.color}" opacity="0.7"/>
    `,
    'siren': `
      <circle cx="${cx}" cy="${cy}" r="${60*scale}" fill="#FFFFFF" opacity="0.9"/>
      <path d="M ${cx - 30*scale} ${cy} L ${cx} ${cy - 40*scale} L ${cx + 30*scale} ${cy} L ${cx} ${cy + 40*scale} Z" fill="${PRODUCT_MAPPING.siren.color}" opacity="0.7"/>
    `,
    'curtain': `
      <rect x="${cx - 60*scale}" y="${cy - 60*scale}" width="${120*scale}" height="${10*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx - 55*scale}" y="${cy - 45*scale}" width="${20*scale}" height="${100*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx - 25*scale}" y="${cy - 45*scale}" width="${20*scale}" height="${100*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx + 5*scale}" y="${cy - 45*scale}" width="${20*scale}" height="${100*scale}" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${cx + 35*scale}" y="${cy - 45*scale}" width="${20*scale}" height="${100*scale}" fill="#FFFFFF" opacity="0.9"/>
    `
  };
  
  return icons[iconType] || `<circle cx="${cx}" cy="${cy}" r="${50*scale}" fill="#FFFFFF" opacity="0.9"/>`;
}

async function generateImagesForDriver(driverName, driverPath) {
  console.log(`\n📸 Generating images for: ${driverName}`);
  
  const config = PRODUCT_MAPPING[driverName];
  
  if (!config) {
    console.log(`  ⚠️  No mapping found for ${driverName}, using generic`);
    return;
  }
  
  const assetsDir = path.join(driverPath, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  
  // Générer les 3 tailles requises
  const sizes = [
    { name: 'small', size: 75 },
    { name: 'large', size: 500 },
    { name: 'xlarge', size: 1000 }
  ];
  
  for (const { name, size } of sizes) {
    const svgContent = generateSVG(config, size);
    const svgPath = path.join(assetsDir, `${name}.svg`);
    
    fs.writeFileSync(svgPath, svgContent, 'utf8');
    console.log(`  ✅ Generated: ${name}.svg (${size}x${size})`);
    
    // Convertir SVG en PNG si ImageMagick/librsvg disponible
    try {
      const pngPath = path.join(assetsDir, `${name}.png`);
      
      // Essayer avec magick (ImageMagick 7)
      try {
        execSync(`magick -background none -density 300 "${svgPath}" -resize ${size}x${size} "${pngPath}"`, { stdio: 'pipe' });
        console.log(`  ✅ Converted: ${name}.png`);
      } catch (e) {
        // Essayer avec convert (ImageMagick 6)
        try {
          execSync(`convert -background none -density 300 "${svgPath}" -resize ${size}x${size} "${pngPath}"`, { stdio: 'pipe' });
          console.log(`  ✅ Converted: ${name}.png`);
        } catch (e2) {
          console.log(`  ⚠️  PNG conversion skipped (install ImageMagick)`);
        }
      }
    } catch (err) {
      // Pas grave si la conversion échoue
    }
  }
  
  // Générer un fichier info.json avec les search terms
  const infoPath = path.join(assetsDir, 'image-info.json');
  fs.writeFileSync(infoPath, JSON.stringify({
    type: config.type,
    description: config.description,
    category: config.category,
    color: config.color,
    searchTerms: config.searchTerms,
    generatedAt: new Date().toISOString()
  }, null, 2), 'utf8');
  
  console.log(`  ℹ️  Search terms: ${config.searchTerms.join(', ')}`);
}

function main() {
  console.log('🎨 INTELLIGENT IMAGE GENERATOR\n');
  console.log('Generating contextual images for all drivers...\n');
  
  if (!fs.existsSync(DRIVERS_DIR)) {
    console.error('❌ Drivers directory not found');
    process.exit(1);
  }
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(name => {
      const fullPath = path.join(DRIVERS_DIR, name);
      return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
    });
  
  let generatedCount = 0;
  let skippedCount = 0;
  
  for (const driverName of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    
    if (PRODUCT_MAPPING[driverName]) {
      generateImagesForDriver(driverName, driverPath);
      generatedCount++;
    } else {
      console.log(`\n⏭️  Skipping: ${driverName} (no mapping)`);
      skippedCount++;
    }
  }
  
  // Rapport final
  const report = {
    date: new Date().toISOString(),
    totalDrivers: drivers.length,
    generated: generatedCount,
    skipped: skippedCount,
    mappings: Object.keys(PRODUCT_MAPPING).length
  };
  
  const reportPath = path.join(ROOT, 'reports', 'IMAGE_GENERATION_REPORT.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`\n✅ Image generation complete!`);
  console.log(`   Generated: ${generatedCount} drivers`);
  console.log(`   Skipped: ${skippedCount} drivers`);
  console.log(`   Report: ${reportPath}`);
  console.log(`\n💡 To download real product images, check image-info.json in each driver's assets/`);
}

main();
