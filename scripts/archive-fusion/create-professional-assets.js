#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create Professional Assets for Ultimate Zigbee Hub
function createProfessionalAssets() {
    console.log('🎨 Creating Professional Assets for Ultimate Zigbee Hub...');
    
    const driversDir = path.join(__dirname, '..', 'drivers');
    const assetsDir = path.join(__dirname, '..', 'assets');
    
    // Ensure main assets directory exists
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Create professional SVG icons for different device categories
    const deviceIcons = {
        light: createLightSVG(),
        switch: createSwitchSVG(),
        sensor: createSensorSVG(),
        plug: createPlugSVG(),
        thermostat: createThermostatSVG(),
        lock: createLockSVG(),
        cover: createCoverSVG(),
        universal: createUniversalSVG()
    };

    // Create assets for each driver
    const driverFolders = fs.readdirSync(driversDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(name => !name.startsWith('.') && !name.startsWith('_'));

    for (const driverFolder of driverFolders) {
        const driverPath = path.join(driversDir, driverFolder);
        const driverAssetsPath = path.join(driverPath, 'assets');
        const driverImagesPath = path.join(driverAssetsPath, 'images');
        
        // Create directories
        if (!fs.existsSync(driverAssetsPath)) {
            fs.mkdirSync(driverAssetsPath, { recursive: true });
        }
        if (!fs.existsSync(driverImagesPath)) {
            fs.mkdirSync(driverImagesPath, { recursive: true });
        }

        // Determine device category and appropriate icon
        let iconSVG = deviceIcons.universal;
        if (driverFolder.includes('light') || driverFolder.includes('bulb')) {
            iconSVG = deviceIcons.light;
        } else if (driverFolder.includes('switch')) {
            iconSVG = deviceIcons.switch;
        } else if (driverFolder.includes('sensor') || driverFolder.includes('motion') || driverFolder.includes('water') || driverFolder.includes('soil')) {
            iconSVG = deviceIcons.sensor;
        } else if (driverFolder.includes('plug') || driverFolder.includes('socket')) {
            iconSVG = deviceIcons.plug;
        } else if (driverFolder.includes('climate') || driverFolder.includes('thermostat')) {
            iconSVG = deviceIcons.thermostat;
        } else if (driverFolder.includes('lock')) {
            iconSVG = deviceIcons.lock;
        } else if (driverFolder.includes('cover') || driverFolder.includes('blind') || driverFolder.includes('curtain')) {
            iconSVG = deviceIcons.cover;
        }

        // Create small and large SVG files
        const smallSVG = iconSVG.replace('width="75"', 'width="50"').replace('height="75"', 'height="50"');
        const largeSVG = iconSVG.replace('width="75"', 'width="150"').replace('height="75"', 'height="150"');

        // Write SVG files
        fs.writeFileSync(path.join(driverImagesPath, 'small.svg'), smallSVG);
        fs.writeFileSync(path.join(driverImagesPath, 'large.svg'), largeSVG);
        
        console.log(`✅ Created assets for ${driverFolder}`);
    }

    // Create main app icon
    const appIconSVG = createAppIconSVG();
    fs.writeFileSync(path.join(assetsDir, 'icon.svg'), appIconSVG);
    
    // Create app images
    const appImageSVG = createAppImageSVG();
    fs.writeFileSync(path.join(assetsDir, 'images', 'large.svg'), appImageSVG);
    fs.writeFileSync(path.join(assetsDir, 'images', 'small.svg'), appImageSVG.replace('width="512"', 'width="256"').replace('height="512"', 'height="256"'));

    console.log('🎉 Professional assets creation completed!');
}

function createLightSVG() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <radialGradient id="lightGradient" cx="50%" cy="30%" r="50%">
            <stop offset="0%" style="stop-color:#FFF200;stop-opacity:1" />
            <stop offset="70%" style="stop-color:#FF6B35;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#E85D04;stop-opacity:1" />
        </radialGradient>
    </defs>
    <circle cx="37.5" cy="37.5" r="30" fill="url(#lightGradient)" stroke="#333" stroke-width="2"/>
    <path d="M37.5 15 L32 25 L43 25 Z" fill="#FFF200" opacity="0.8"/>
    <path d="M25 37.5 L35 32 L35 43 Z" fill="#FFF200" opacity="0.8"/>
    <path d="M50 37.5 L40 32 L40 43 Z" fill="#FFF200" opacity="0.8"/>
    <circle cx="37.5" cy="37.5" r="8" fill="#FFF" opacity="0.9"/>
</svg>`;
}

function createSwitchSVG() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="15" width="45" height="45" rx="8" fill="#4A90E2" stroke="#2C5F8B" stroke-width="2"/>
    <rect x="22" y="22" width="14" height="20" rx="3" fill="#E8F4FD" stroke="#2C5F8B"/>
    <rect x="39" y="22" width="14" height="20" rx="3" fill="#E8F4FD" stroke="#2C5F8B"/>
    <circle cx="29" cy="27" r="2" fill="#4A90E2"/>
    <circle cx="46" cy="37" r="2" fill="#4A90E2"/>
    <rect x="20" y="48" width="35" height="3" rx="1.5" fill="#2C5F8B"/>
</svg>`;
}

function createSensorSVG() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
    <circle cx="37.5" cy="37.5" r="32" fill="#50C878" stroke="#2E7D32" stroke-width="2"/>
    <circle cx="37.5" cy="30" r="8" fill="#FFF" opacity="0.9"/>
    <circle cx="37.5" cy="30" r="4" fill="#2E7D32"/>
    <path d="M20 45 Q37.5 35 55 45" stroke="#FFF" stroke-width="3" fill="none" opacity="0.8"/>
    <path d="M25 52 Q37.5 47 50 52" stroke="#FFF" stroke-width="2" fill="none" opacity="0.6"/>
    <circle cx="25" cy="35" r="2" fill="#FFF" opacity="0.7"/>
    <circle cx="50" cy="35" r="2" fill="#FFF" opacity="0.7"/>
</svg>`;
}

function createPlugSVG() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="20" width="45" height="35" rx="8" fill="#FF6B35" stroke="#E85D04" stroke-width="2"/>
    <rect x="28" y="12" width="4" height="12" rx="2" fill="#333"/>
    <rect x="43" y="12" width="4" height="12" rx="2" fill="#333"/>
    <circle cx="30" cy="35" r="3" fill="#FFF"/>
    <circle cx="45" cy="35" r="3" fill="#FFF"/>
    <rect x="25" y="42" width="25" height="8" rx="2" fill="#FFF" opacity="0.8"/>
    <text x="37.5" y="47" text-anchor="middle" font-size="8" fill="#FF6B35" font-weight="bold">W</text>
</svg>`;
}

function createThermostatSVG() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
    <circle cx="37.5" cy="37.5" r="30" fill="#2196F3" stroke="#1976D2" stroke-width="2"/>
    <circle cx="37.5" cy="37.5" r="20" fill="#FFF" opacity="0.9"/>
    <path d="M37.5 20 L37.5 37.5 L50 45" stroke="#FF6B35" stroke-width="3" stroke-linecap="round"/>
    <circle cx="37.5" cy="37.5" r="3" fill="#FF6B35"/>
    <text x="30" y="52" font-size="8" fill="#1976D2" font-weight="bold">°C</text>
</svg>`;
}

function createLockSVG() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="35" width="35" height="25" rx="4" fill="#795548" stroke="#5D4037" stroke-width="2"/>
    <path d="M28 35 L28 25 C28 20 32 15 37.5 15 C43 15 47 20 47 25 L47 35" 
          stroke="#5D4037" stroke-width="3" fill="none"/>
    <circle cx="37.5" cy="47" r="4" fill="#FFF"/>
    <rect x="36" y="49" width="3" height="6" fill="#FFF"/>
</svg>`;
}

function createCoverSVG() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="15" width="45" height="45" rx="4" fill="#9C27B0" stroke="#7B1FA2" stroke-width="2"/>
    <rect x="18" y="18" width="39" height="8" fill="#FFF" opacity="0.8"/>
    <rect x="18" y="28" width="39" height="8" fill="#FFF" opacity="0.6"/>
    <rect x="18" y="38" width="39" height="8" fill="#FFF" opacity="0.4"/>
    <rect x="18" y="48" width="39" height="9" fill="#FFF" opacity="0.2"/>
    <circle cx="52" cy="22" r="2" fill="#FFF"/>
</svg>`;
}

function createUniversalSVG() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="universalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#4A90E2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#50C878;stop-opacity:1" />
        </linearGradient>
    </defs>
    <circle cx="37.5" cy="37.5" r="30" fill="url(#universalGradient)" stroke="#333" stroke-width="2"/>
    <path d="M25 25 L50 25 L50 37.5 L37.5 37.5 L37.5 50 L25 50 Z" fill="#FFF" opacity="0.8"/>
    <circle cx="31" cy="31" r="2" fill="#333"/>
    <circle cx="44" cy="31" r="2" fill="#333"/>
    <circle cx="31" cy="44" r="2" fill="#333"/>
</svg>`;
}

function createAppIconSVG() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <radialGradient id="appGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" style="stop-color:#FFF200;stop-opacity:1" />
            <stop offset="40%" style="stop-color:#FF6B35;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#E85D04;stop-opacity:1" />
        </radialGradient>
    </defs>
    <circle cx="256" cy="256" r="240" fill="url(#appGradient)" stroke="#333" stroke-width="8"/>
    <circle cx="256" cy="180" r="60" fill="#FFF" opacity="0.9" stroke="#333" stroke-width="4"/>
    <path d="M150 280 Q256 240 362 280" stroke="#FFF" stroke-width="12" fill="none"/>
    <path d="M180 340 Q256 320 332 340" stroke="#FFF" stroke-width="8" fill="none"/>
    <circle cx="200" cy="200" r="12" fill="#FFF" opacity="0.8"/>
    <circle cx="312" cy="200" r="12" fill="#FFF" opacity="0.8"/>
    <text x="256" y="420" text-anchor="middle" font-size="36" fill="#FFF" font-weight="bold">ZIGBEE</text>
</svg>`;
}

function createAppImageSVG() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#E85D04;stop-opacity:1" />
        </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#bgGradient)"/>
    <circle cx="256" cy="256" r="200" fill="#FFF" opacity="0.1"/>
    <text x="256" y="200" text-anchor="middle" font-size="48" fill="#FFF" font-weight="bold">ULTIMATE</text>
    <text x="256" y="260" text-anchor="middle" font-size="72" fill="#FFF" font-weight="bold">ZIGBEE</text>
    <text x="256" y="320" text-anchor="middle" font-size="48" fill="#FFF" font-weight="bold">HUB</text>
    <text x="256" y="380" text-anchor="middle" font-size="24" fill="#FFF" opacity="0.8">500+ Devices • Professional Drivers</text>
</svg>`;
}

if (require.main === module) {
    createProfessionalAssets();
}

module.exports = { createProfessionalAssets };
