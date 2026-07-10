const fs = require('fs');
const path = require('path');
const glob = require('glob');

const GOLDEN_TEMPLATES = {
    'module_switch': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="200" y="200" width="560" height="560" rx="60" stroke="black" stroke-width="40" fill="none"/>
  <circle cx="480" cy="480" r="100" stroke="black" stroke-width="40" fill="none"/>
  <path d="M480 300V380M480 580V660M300 480H380M580 480H660" stroke="black" stroke-width="40" stroke-linecap="round"/>
</svg>`,

    'wall_switch_1g': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="180" y="180" width="600" height="600" rx="40" stroke="black" stroke-width="40" fill="none"/>
  <rect x="280" y="280" width="400" height="400" rx="20" stroke="black" stroke-width="30" fill="none"/>
</svg>`,

    'wall_switch_2g': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="180" y="180" width="600" height="600" rx="40" stroke="black" stroke-width="40" fill="none"/>
  <line x1="480" y1="280" x2="480" y2="680" stroke="black" stroke-width="30"/>
  <rect x="280" y="280" width="400" height="400" rx="20" stroke="black" stroke-width="30" fill="none"/>
</svg>`,

    'wall_switch_3g': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="180" y="180" width="600" height="600" rx="40" stroke="black" stroke-width="40" fill="none"/>
  <line x1="380" y1="280" x2="380" y2="680" stroke="black" stroke-width="20"/>
  <line x1="580" y1="280" x2="580" y2="680" stroke="black" stroke-width="20"/>
  <rect x="280" y="280" width="400" height="400" rx="20" stroke="black" stroke-width="30" fill="none"/>
</svg>`,

    'wall_switch_4g': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="180" y="180" width="600" height="600" rx="40" stroke="black" stroke-width="40" fill="none"/>
  <line x1="480" y1="280" x2="480" y2="680" stroke="black" stroke-width="20"/>
  <line x1="280" y1="480" x2="680" y2="480" stroke="black" stroke-width="20"/>
  <rect x="280" y="280" width="400" height="400" rx="20" stroke="black" stroke-width="30" fill="none"/>
</svg>`,

    'plug': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="480" cy="480" r="300" stroke="black" stroke-width="40" fill="none"/>
  <rect x="400" y="350" width="40" height="120" rx="20" fill="black"/>
  <rect x="520" y="350" width="40" height="120" rx="20" fill="black"/>
  <circle cx="480" cy="580" r="30" fill="black"/>
</svg>`,

    'bulb': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M480 150C370 150 280 240 280 350C280 430 320 500 380 540V680H580V540C640 500 680 430 680 350C680 240 590 150 480 150Z" stroke="black" stroke-width="40" fill="none"/>
  <rect x="420" y="700" width="120" height="40" rx="10" fill="black"/>
  <rect x="440" y="760" width="80" height="40" rx="10" fill="black"/>
</svg>`,

    'sensor_motion': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="480" cy="400" r="200" stroke="black" stroke-width="40" fill="none"/>
  <path d="M280 750C280 650 370 560 480 560C590 560 680 650 680 750" stroke="black" stroke-width="40" fill="none"/>
  <circle cx="480" cy="400" r="60" fill="black"/>
</svg>`,

    'sensor_contact': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="250" y="200" width="200" height="560" rx="40" stroke="black" stroke-width="40" fill="none"/>
  <rect x="510" y="280" width="100" height="400" rx="30" stroke="black" stroke-width="30" fill="none"/>
</svg>`,

    'sensor_climate': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M480 750C535 750 580 705 580 650C580 605 550 565 510 552V250C510 233 497 220 480 220C463 220 450 233 450 250V552C410 565 380 605 380 650C380 705 425 750 480 750Z" stroke="black" stroke-width="40" fill="none"/>
  <circle cx="480" cy="650" r="50" fill="black"/>
  <line x1="480" y1="550" x2="480" y2="350" stroke="black" stroke-width="20" stroke-linecap="round"/>
</svg>`,

    'cover': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="200" y="150" width="560" height="660" rx="20" stroke="black" stroke-width="40" fill="none"/>
  <rect x="240" y="190" width="480" height="80" fill="black"/>
  <rect x="240" y="300" width="480" height="60" fill="black" opacity="0.8"/>
  <rect x="240" y="390" width="480" height="60" fill="black" opacity="0.6"/>
  <rect x="240" y="480" width="480" height="60" fill="black" opacity="0.4"/>
</svg>`,

    'thermostat': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="300" y="150" width="360" height="500" rx="60" stroke="black" stroke-width="40" fill="none"/>
  <rect x="350" y="650" width="260" height="160" rx="20" stroke="black" stroke-width="30" fill="none"/>
  <line x1="380" y1="250" x2="580" y2="250" stroke="black" stroke-width="20"/>
  <line x1="380" y1="350" x2="580" y2="350" stroke="black" stroke-width="20"/>
  <circle cx="480" cy="500" r="40" fill="black"/>
</svg>`,

    'remote': `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="960" viewBox="0 0 960 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="300" y="100" width="360" height="760" rx="60" stroke="black" stroke-width="40" fill="none"/>
  <circle cx="480" cy="250" r="40" fill="black"/>
  <circle cx="480" cy="400" r="40" fill="black"/>
  <circle cx="480" cy="550" r="40" fill="black"/>
  <rect x="400" y="650" width="160" height="80" rx="20" fill="black"/>
</svg>`
};

async function harmonizeIcons() {
    console.log('Starting Icon Harmonization...');
    const driversPath = path.join(process.cwd(), 'drivers');
    const drivers = fs.readdirSync(driversPath).filter(f => fs.lstatSync(path.join(driversPath, f)).isDirectory());

    let updatedCount = 0;

    for (const driver of drivers) {
        const composePath = path.join(driversPath, driver, 'driver.compose.json');
        const iconPath = path.join(driversPath, driver, 'assets', 'icon.svg');

        if (!fs.existsSync(composePath)) continue;

        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        const deviceClass = compose.class || 'other';
        const capabilities = compose.capabilities || [];

        let templateId = 'module_switch'; // Default

        // Logic to determine template
        if (driver.includes('switch') || driver.includes('dimmer') || driver.includes('plug') || driver.includes('socket')) {
            if (driver.includes('wall') || driver.includes('tx_') || driver.includes('touch')) {
                if (driver.includes('4gang') || driver.includes('4ch') || driver.includes('4_gang')) templateId = 'wall_switch_4g';
                else if (driver.includes('3gang') || driver.includes('3ch') || driver.includes('3_gang')) templateId = 'wall_switch_3g';
                else if (driver.includes('2gang') || driver.includes('2ch') || driver.includes('2_gang')) templateId = 'wall_switch_2g';
                else templateId = 'wall_switch_1g';
            } else if (driver.includes('plug') || driver.includes('socket')) {
                templateId = 'plug';
            } else {
                templateId = 'module_switch';
            }
        } else if (driver.includes('bulb') || driver.includes('light') || driver.includes('led')) {
            templateId = 'bulb';
        } else if (driver.includes('sensor')) {
            if (driver.includes('motion') || driver.includes('presence') || driver.includes('pir')) templateId = 'sensor_motion';
            else if (driver.includes('contact') || driver.includes('door') || driver.includes('window')) templateId = 'sensor_contact';
            else if (driver.includes('climate') || driver.includes('temp') || driver.includes('hum')) templateId = 'sensor_climate';
            else templateId = 'module_switch'; // Generic sensor box
        } else if (driver.includes('cover') || driver.includes('curtain') || driver.includes('shutter') || driver.includes('blind')) {
            templateId = 'cover';
        } else if (driver.includes('thermostat') || driver.includes('trv') || driver.includes('radiator') || driver.includes('heater')) {
            templateId = 'thermostat';
        } else if (driver.includes('remote') || driver.includes('button') || driver.includes('scene')) {
            templateId = 'remote';
        }

        // Apply template
        const svg = GOLDEN_TEMPLATES[templateId];
        if (svg) {
            const assetsDir = path.dirname(iconPath);
            if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
            fs.writeFileSync(iconPath, svg);
            updatedCount++;
        }
    }

    console.log(`\nHarmonization Complete!`);
    console.log(`Updated ${updatedCount} icons across the fleet.`);
}

harmonizeIcons();
