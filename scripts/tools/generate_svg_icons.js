const fs = require('fs');
const path = require('path');

console.log('🎨 GÉNÉRATION ICÔNES SVG AVEC EMOJIS - STYLE HOMEY\n');

// Mapping driver → emoji + couleur
const driverConfig = {
    // Air Quality
    'air_quality_monitor': { emoji: '🌫️', category: 'AIR QUALITY', colors: ['#4CAF50', '#81C784'] },
    'air_quality_monitor_pro': { emoji: '🌫️', category: 'AIR QUALITY', colors: ['#4CAF50', '#81C784'] },
    'comprehensive_air_monitor': { emoji: '🌬️', category: 'AIR QUALITY', colors: ['#4CAF50', '#81C784'] },
    
    // CO/CO2
    'co_detector_pro': { emoji: '📡', category: 'SENSORS', colors: ['#2196F3', '#64B5F6'] },
    'co2_sensor': { emoji: '🔬', category: 'SENSORS', colors: ['#2196F3', '#64B5F6'] },
    'co2_temp_humidity': { emoji: '🌡️', category: 'CLIMATE', colors: ['#FF9800', '#FFB74D'] },
    
    // Climate
    'climate_monitor': { emoji: '🌡️', category: 'CLIMATE', colors: ['#FF9800', '#FFB74D'] },
    'temperature_humidity_sensor': { emoji: '🌡️', category: 'CLIMATE', colors: ['#FF9800', '#FFB74D'] },
    'temperature_sensor': { emoji: '🌡️', category: 'CLIMATE', colors: ['#FF9800', '#FFB74D'] },
    'humidity_sensor': { emoji: '💧', category: 'CLIMATE', colors: ['#2196F3', '#64B5F6'] },
    'thermostat': { emoji: '🎚️', category: 'CLIMATE', colors: ['#FF5722', '#FF8A65'] },
    'trv': { emoji: '🎚️', category: 'HEATING', colors: ['#FF5722', '#FF8A65'] },
    
    // Fans
    'ceiling_fan': { emoji: '💨', category: 'FANS', colors: ['#00BCD4', '#4DD0E1'] },
    'fan': { emoji: '💨', category: 'FANS', colors: ['#00BCD4', '#4DD0E1'] },
    
    // Lights
    'ceiling_light_controller': { emoji: '💡', category: 'LIGHTING', colors: ['#FFC107', '#FFD54F'] },
    'ceiling_light_rgb': { emoji: '🌈', category: 'LIGHTING', colors: ['#FFC107', '#FFD54F'] },
    'light_controller': { emoji: '💡', category: 'LIGHTING', colors: ['#FFC107', '#FFD54F'] },
    'light_dimmer': { emoji: '🔆', category: 'LIGHTING', colors: ['#FFC107', '#FFD54F'] },
    'light_rgb': { emoji: '🌈', category: 'LIGHTING', colors: ['#FFC107', '#FFD54F'] },
    'light_switch': { emoji: '💡', category: 'LIGHTING', colors: ['#FFC107', '#FFD54F'] },
    'bulb': { emoji: '💡', category: 'LIGHTING', colors: ['#FFC107', '#FFD54F'] },
    
    // Switches
    'switch': { emoji: '⚡', category: 'SWITCHES', colors: ['#4CAF50', '#81C784'] },
    'switch_1': { emoji: '⚡', category: 'SWITCHES', colors: ['#4CAF50', '#81C784'] },
    'switch_2': { emoji: '⚡', category: 'SWITCHES', colors: ['#4CAF50', '#81C784'] },
    'switch_3': { emoji: '⚡', category: 'SWITCHES', colors: ['#4CAF50', '#81C784'] },
    'switch_4': { emoji: '⚡', category: 'SWITCHES', colors: ['#4CAF50', '#81C784'] },
    'button': { emoji: '🔘', category: 'CONTROLS', colors: ['#9C27B0', '#BA68C8'] },
    'scene_switch': { emoji: '🎬', category: 'CONTROLS', colors: ['#9C27B0', '#BA68C8'] },
    
    // Motion/PIR
    'motion_sensor': { emoji: '🏃', category: 'SENSORS', colors: ['#2196F3', '#64B5F6'] },
    'pir_sensor': { emoji: '👁️', category: 'SENSORS', colors: ['#2196F3', '#64B5F6'] },
    
    // Contact/Door
    'contact_sensor': { emoji: '🚪', category: 'SENSORS', colors: ['#2196F3', '#64B5F6'] },
    'door_sensor': { emoji: '🚪', category: 'SENSORS', colors: ['#2196F3', '#64B5F6'] },
    'window_sensor': { emoji: '🪟', category: 'SENSORS', colors: ['#2196F3', '#64B5F6'] },
    
    // Plugs/Socket
    'plug': { emoji: '🔌', category: 'ENERGY', colors: ['#9C27B0', '#BA68C8'] },
    'socket': { emoji: '🔌', category: 'ENERGY', colors: ['#9C27B0', '#BA68C8'] },
    'energy_monitor': { emoji: '⚡', category: 'ENERGY', colors: ['#9C27B0', '#BA68C8'] },
    
    // Curtains
    'curtain': { emoji: '🪟', category: 'COVERS', colors: ['#795548', '#A1887F'] },
    'blind': { emoji: '🪟', category: 'COVERS', colors: ['#795548', '#A1887F'] },
    'shade': { emoji: '🪟', category: 'COVERS', colors: ['#795548', '#A1887F'] },
    
    // Security
    'smoke_detector': { emoji: '🚨', category: 'SECURITY', colors: ['#F44336', '#E57373'] },
    'smoke_sensor': { emoji: '🚨', category: 'SECURITY', colors: ['#F44336', '#E57373'] },
    'gas_sensor': { emoji: '⚠️', category: 'SECURITY', colors: ['#F44336', '#E57373'] },
    'water_leak': { emoji: '💧', category: 'SECURITY', colors: ['#2196F3', '#64B5F6'] },
    'leak_sensor': { emoji: '💧', category: 'SECURITY', colors: ['#2196F3', '#64B5F6'] },
    'siren': { emoji: '🔔', category: 'SECURITY', colors: ['#F44336', '#E57373'] },
    'alarm': { emoji: '🚨', category: 'SECURITY', colors: ['#F44336', '#E57373'] },
    
    // Vibration
    'vibration_sensor': { emoji: '📳', category: 'SENSORS', colors: ['#2196F3', '#64B5F6'] },
    
    // Water
    'water_valve': { emoji: '🚰', category: 'WATER', colors: ['#2196F3', '#64B5F6'] },
    
    // IR
    'ir_controller': { emoji: '📡', category: 'CONTROLS', colors: ['#9C27B0', '#BA68C8'] },
    
    // Default
    'default': { emoji: '📱', category: 'DEVICES', colors: ['#607D8B', '#90A4AE'] }
};

// Détecter config depuis nom driver
function getDriverConfig(driverName) {
    const name = driverName.toLowerCase();
    
    // Recherche exacte
    if (driverConfig[name]) {
        return driverConfig[name];
    }
    
    // Recherche par mot-clé
    for (const [key, config] of Object.entries(driverConfig)) {
        if (name.includes(key) || key.includes(name)) {
            return config;
        }
    }
    
    // Recherche partielle
    if (name.includes('temp') || name.includes('humidity')) return driverConfig.climate_monitor;
    if (name.includes('light')) return driverConfig.light_controller;
    if (name.includes('switch')) return driverConfig.switch;
    if (name.includes('sensor')) return driverConfig.motion_sensor;
    if (name.includes('plug') || name.includes('socket')) return driverConfig.plug;
    if (name.includes('curtain') || name.includes('blind')) return driverConfig.curtain;
    if (name.includes('smoke') || name.includes('gas')) return driverConfig.smoke_detector;
    if (name.includes('motion') || name.includes('pir')) return driverConfig.motion_sensor;
    if (name.includes('contact') || name.includes('door')) return driverConfig.contact_sensor;
    if (name.includes('fan')) return driverConfig.ceiling_fan;
    
    return driverConfig.default;
}

// Générer SVG
function generateSVG(driverName, size) {
    const config = getDriverConfig(driverName);
    const [color1, color2] = config.colors;
    const isSmall = size === 75;
    
    const viewBox = `0 0 ${size} ${size}`;
    const borderRadius = isSmall ? 12 : 60;
    const iconY = isSmall ? size * 0.55 : size * 0.56;
    const fontSize = isSmall ? 40 : 140;
    const circleRadius = isSmall ? 20 : 100;
    const circleY = isSmall ? size * 0.4 : size * 0.44;
    const badgeY = isSmall ? size * 0.78 : size * 0.78;
    const badgeHeight = isSmall ? 16 : 50;
    const badgeRadius = isSmall ? 8 : 25;
    const badgeWidth = isSmall ? size * 0.8 : 300;
    const badgeX = (size - badgeWidth) / 2;
    const categoryFontSize = isSmall ? 8 : 22;
    const categoryY = isSmall ? badgeY + 11 : badgeY + 35;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad_${driverName}_${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:0.8" />
    </linearGradient>
    <filter id="shadow_${size}">
      <feDropShadow dx="0" dy="${isSmall ? 2 : 4}" stdDeviation="${isSmall ? 4 : 8}" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background with gradient -->
  <rect width="${size}" height="${size}" fill="url(#grad_${driverName}_${size})" rx="${borderRadius}"/>
  
  <!-- Icon circle background -->
  <circle cx="${size/2}" cy="${circleY}" r="${circleRadius}" fill="white" opacity="0.2" filter="url(#shadow_${size})"/>
  
  <!-- Large icon/emoji -->
  <text x="${size/2}" y="${iconY}" font-family="Arial, sans-serif" font-size="${fontSize}" 
        fill="white" text-anchor="middle" font-weight="bold" 
        filter="url(#shadow_${size})">${config.emoji}</text>
  
  <!-- Category badge -->
  <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="${badgeRadius}" fill="white" opacity="0.95"/>
  <text x="${size/2}" y="${categoryY}" font-family="Arial, sans-serif" font-size="${categoryFontSize}" 
        fill="${color1}" text-anchor="middle" font-weight="bold">${config.category}</text>
</svg>`;
}

// Traiter tous les drivers
function processAllDrivers() {
    const driversDir = path.join(process.cwd(), 'drivers');
    const drivers = fs.readdirSync(driversDir).filter(f => {
        return fs.statSync(path.join(driversDir, f)).isDirectory();
    });
    
    let processed = 0;
    const emojiCount = {};
    
    for (const driver of drivers) {
        const driverPath = path.join(driversDir, driver);
        const assetsPath = path.join(driverPath, 'assets');
        
        if (!fs.existsSync(assetsPath)) {
            fs.mkdirSync(assetsPath, { recursive: true });
        }
        
        const config = getDriverConfig(driver);
        emojiCount[config.emoji] = (emojiCount[config.emoji] || 0) + 1;
        
        try {
            // Small 75x75
            const svgSmall = generateSVG(driver, 75);
            fs.writeFileSync(path.join(assetsPath, 'small.svg'), svgSmall);
            
            // Large 500x500
            const svgLarge = generateSVG(driver, 500);
            fs.writeFileSync(path.join(assetsPath, 'large.svg'), svgLarge);
            
            processed++;
            
            if (processed % 20 === 0) {
                console.log(`   ${processed}/${drivers.length} drivers...`);
            }
        } catch (error) {
            console.log(`   ⚠️ ${driver}: ${error.message}`);
        }
    }
    
    console.log(`\n✅ ${processed} drivers traités\n`);
    console.log('📊 Emojis utilisés:');
    Object.entries(emojiCount).sort((a, b) => b[1] - a[1]).forEach(([emoji, count]) => {
        console.log(`   ${emoji}: ${count}`);
    });
    
    return processed;
}

// Exécution
console.log('================================================');
console.log('  GÉNÉRATION ICÔNES SVG STYLE HOMEY AVEC EMOJIS');
console.log('================================================\n');

try {
    const count = processAllDrivers();
    
    console.log('\n================================================');
    console.log('✅ TERMINÉ!');
    console.log(`   - ${count * 2} images SVG`);
    console.log('   - Format: large.svg + small.svg');
    console.log('   - Style: Homey avec emojis');
    console.log('================================================\n');
    
} catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
}
