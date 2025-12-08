'use strict';

/**
 * Generate learnmode.svg for all drivers that are missing them
 * Each SVG shows a pairing instruction icon specific to the device type
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// SVG templates for different device categories
const SVG_TEMPLATES = {
  // Sensors - show reset button/pin hole
  sensor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="25" y="20" width="50" height="60" rx="5" fill="#4A90D9" stroke="#2E5A87" stroke-width="2"/>
  <circle cx="50" cy="45" r="12" fill="#FFF" opacity="0.9"/>
  <text x="50" y="49" text-anchor="middle" font-size="10" fill="#2E5A87" font-weight="bold">5s</text>
  <circle cx="50" cy="70" r="3" fill="#FF6B6B"/>
  <text x="50" y="88" text-anchor="middle" font-size="7" fill="#666">Hold 5 sec</text>
</svg>`,

  // Buttons/remotes - show button press
  button: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="30" y="15" width="40" height="70" rx="8" fill="#5C6BC0" stroke="#3949AB" stroke-width="2"/>
  <circle cx="50" cy="40" r="15" fill="#7986CB" stroke="#3949AB" stroke-width="2"/>
  <path d="M45 40 L55 40 M50 35 L50 45" stroke="#FFF" stroke-width="2" stroke-linecap="round"/>
  <text x="50" y="88" text-anchor="middle" font-size="7" fill="#666">Press 3x fast</text>
</svg>`,

  // Switches - show toggle action
  switch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="20" y="25" width="60" height="50" rx="5" fill="#FFF" stroke="#333" stroke-width="2"/>
  <rect x="30" y="35" width="40" height="30" rx="3" fill="#4CAF50"/>
  <circle cx="55" cy="50" r="8" fill="#FFF"/>
  <path d="M70 20 L80 10 M72 22 L82 12" stroke="#FF9800" stroke-width="2"/>
  <text x="50" y="88" text-anchor="middle" font-size="7" fill="#666">Toggle 5x</text>
</svg>`,

  // Plugs - show plug action
  plug: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="25" y="20" width="50" height="55" rx="8" fill="#FFF" stroke="#333" stroke-width="2"/>
  <circle cx="37" cy="45" r="5" fill="#333"/>
  <circle cx="63" cy="45" r="5" fill="#333"/>
  <rect x="40" y="55" width="20" height="5" rx="2" fill="#333"/>
  <circle cx="50" cy="85" r="5" fill="#4CAF50"/>
  <text x="50" y="15" text-anchor="middle" font-size="7" fill="#666">Hold button 10s</text>
</svg>`,

  // Lights/LED - show bulb
  light: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <ellipse cx="50" cy="40" rx="25" ry="30" fill="#FFEB3B" stroke="#FFC107" stroke-width="2"/>
  <rect x="40" y="65" width="20" height="15" fill="#9E9E9E" stroke="#757575" stroke-width="1"/>
  <rect x="42" y="80" width="16" height="3" rx="1" fill="#757575"/>
  <path d="M30 20 L25 15 M50 10 L50 5 M70 20 L75 15" stroke="#FFC107" stroke-width="2"/>
  <text x="50" y="95" text-anchor="middle" font-size="7" fill="#666">On/Off 5x</text>
</svg>`,

  // Thermostats - show temperature dial
  thermostat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="45" r="30" fill="#FFF" stroke="#333" stroke-width="2"/>
  <circle cx="50" cy="45" r="25" fill="#E3F2FD" stroke="#2196F3" stroke-width="1"/>
  <text x="50" y="50" text-anchor="middle" font-size="14" fill="#2196F3" font-weight="bold">21°</text>
  <circle cx="50" cy="80" r="4" fill="#FF5722"/>
  <text x="50" y="95" text-anchor="middle" font-size="7" fill="#666">Hold reset 5s</text>
</svg>`,

  // Curtains/blinds - show motor
  curtain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="15" y="20" width="70" height="10" fill="#795548" stroke="#5D4037" stroke-width="1"/>
  <path d="M20 30 L20 75 Q30 80 40 75 L40 30" fill="#BBDEFB" stroke="#64B5F6" stroke-width="1"/>
  <path d="M60 30 L60 75 Q70 80 80 75 L80 30" fill="#BBDEFB" stroke="#64B5F6" stroke-width="1"/>
  <circle cx="50" cy="55" r="8" fill="#FF9800" stroke="#F57C00" stroke-width="1"/>
  <text x="50" y="95" text-anchor="middle" font-size="7" fill="#666">Press reset 5s</text>
</svg>`,

  // Valve/water - show valve
  valve: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="20" y="40" width="60" height="20" rx="3" fill="#78909C" stroke="#546E7A" stroke-width="2"/>
  <circle cx="50" cy="30" r="12" fill="#2196F3" stroke="#1976D2" stroke-width="2"/>
  <rect x="48" y="18" width="4" height="24" fill="#1976D2"/>
  <path d="M35 70 Q50 80 65 70" stroke="#2196F3" stroke-width="3" fill="none"/>
  <text x="50" y="95" text-anchor="middle" font-size="7" fill="#666">Hold valve 5s</text>
</svg>`,

  // Air quality/environmental - show air waves
  air: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="25" y="20" width="50" height="55" rx="5" fill="#E8F5E9" stroke="#4CAF50" stroke-width="2"/>
  <path d="M35 40 Q50 30 65 40" stroke="#81C784" stroke-width="2" fill="none"/>
  <path d="M35 50 Q50 40 65 50" stroke="#66BB6A" stroke-width="2" fill="none"/>
  <path d="M35 60 Q50 50 65 60" stroke="#4CAF50" stroke-width="2" fill="none"/>
  <circle cx="50" cy="82" r="4" fill="#FF5722"/>
  <text x="50" y="95" text-anchor="middle" font-size="7" fill="#666">Hold reset 5s</text>
</svg>`,

  // Power meter - show meter
  meter: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="20" y="20" width="60" height="50" rx="3" fill="#FFF" stroke="#333" stroke-width="2"/>
  <rect x="25" y="25" width="50" height="25" fill="#000"/>
  <text x="50" y="42" text-anchor="middle" font-size="10" fill="#0F0" font-family="monospace">0.00kW</text>
  <circle cx="35" cy="60" r="4" fill="#4CAF50"/>
  <circle cx="50" cy="60" r="4" fill="#FF9800"/>
  <circle cx="65" cy="60" r="4" fill="#F44336"/>
  <text x="50" y="88" text-anchor="middle" font-size="7" fill="#666">Hold button 10s</text>
</svg>`,

  // Scene controller - show scene buttons
  scene: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="20" y="15" width="60" height="70" rx="5" fill="#FFF" stroke="#333" stroke-width="2"/>
  <rect x="28" y="23" width="18" height="18" rx="2" fill="#E3F2FD" stroke="#2196F3" stroke-width="1"/>
  <rect x="54" y="23" width="18" height="18" rx="2" fill="#FFF3E0" stroke="#FF9800" stroke-width="1"/>
  <rect x="28" y="49" width="18" height="18" rx="2" fill="#E8F5E9" stroke="#4CAF50" stroke-width="1"/>
  <rect x="54" y="49" width="18" height="18" rx="2" fill="#FCE4EC" stroke="#E91E63" stroke-width="1"/>
  <text x="50" y="88" text-anchor="middle" font-size="7" fill="#666">Hold any 5s</text>
</svg>`,

  // Weather station - show sun/cloud
  weather: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="40" cy="35" r="15" fill="#FFEB3B" stroke="#FFC107" stroke-width="2"/>
  <path d="M60 50 Q55 35 70 35 Q85 35 85 50 Q85 65 70 65 L45 65 Q35 65 35 55 Q35 45 50 45 Q55 45 60 50" fill="#ECEFF1" stroke="#90A4AE" stroke-width="2"/>
  <path d="M40 75 L40 85 M50 75 L50 82 M60 75 L60 85" stroke="#2196F3" stroke-width="2" stroke-linecap="round"/>
  <text x="50" y="95" text-anchor="middle" font-size="7" fill="#666">Hold reset 5s</text>
</svg>`,

  // Soil sensor - show plant
  soil: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="30" y="55" width="40" height="30" rx="3" fill="#795548" stroke="#5D4037" stroke-width="2"/>
  <path d="M50 55 L50 35 M40 45 Q50 35 60 45" stroke="#4CAF50" stroke-width="3" fill="none"/>
  <ellipse cx="50" cy="30" rx="15" ry="10" fill="#81C784" stroke="#4CAF50" stroke-width="1"/>
  <path d="M35 70 L40 65 L45 70 L50 65 L55 70 L60 65 L65 70" stroke="#3E2723" stroke-width="2" fill="none"/>
  <text x="50" y="95" text-anchor="middle" font-size="7" fill="#666">Hold reset 5s</text>
</svg>`,

  // Universal/generic - show Zigbee symbol
  universal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="35" fill="#FFF" stroke="#EB0443" stroke-width="3"/>
  <path d="M30 35 L70 35 L35 65 L70 65" stroke="#EB0443" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="30" cy="35" r="4" fill="#EB0443"/>
  <circle cx="70" cy="65" r="4" fill="#EB0443"/>
  <text x="50" y="95" text-anchor="middle" font-size="7" fill="#666">Hold button 5s</text>
</svg>`,

  // Heater - show heating element
  heater: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="20" y="25" width="60" height="45" rx="5" fill="#FFF" stroke="#333" stroke-width="2"/>
  <path d="M30 45 Q35 35 40 45 Q45 55 50 45 Q55 35 60 45 Q65 55 70 45" stroke="#FF5722" stroke-width="3" fill="none"/>
  <path d="M30 55 Q35 45 40 55 Q45 65 50 55 Q55 45 60 55 Q65 65 70 55" stroke="#FF7043" stroke-width="3" fill="none"/>
  <circle cx="50" cy="80" r="4" fill="#4CAF50"/>
  <text x="50" y="95" text-anchor="middle" font-size="7" fill="#666">Hold reset 10s</text>
</svg>`,

  // Vibration sensor - show waves
  vibration: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="30" y="30" width="40" height="40" rx="5" fill="#FFF" stroke="#333" stroke-width="2"/>
  <circle cx="50" cy="50" r="8" fill="#FF9800"/>
  <circle cx="50" cy="50" r="15" stroke="#FF9800" stroke-width="2" fill="none" opacity="0.6"/>
  <circle cx="50" cy="50" r="22" stroke="#FF9800" stroke-width="2" fill="none" opacity="0.3"/>
  <text x="50" y="88" text-anchor="middle" font-size="7" fill="#666">Hold reset 5s</text>
</svg>`,

  // Rain sensor
  rain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M30 40 Q25 25 40 25 Q45 15 55 15 Q70 15 75 30 Q85 30 85 45 Q85 55 70 55 L30 55 Q20 55 20 45 Q20 35 30 40" fill="#90CAF9" stroke="#1976D2" stroke-width="2"/>
  <path d="M35 65 L30 80 M50 62 L45 82 M65 65 L60 80" stroke="#2196F3" stroke-width="3" stroke-linecap="round"/>
  <text x="50" y="95" text-anchor="middle" font-size="7" fill="#666">Hold reset 5s</text>
</svg>`,

  // RCBO/breaker
  rcbo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="30" y="15" width="40" height="65" rx="3" fill="#455A64" stroke="#263238" stroke-width="2"/>
  <rect x="40" y="25" width="20" height="25" rx="2" fill="#78909C"/>
  <circle cx="50" cy="60" r="8" fill="#4CAF50" stroke="#388E3C" stroke-width="2"/>
  <text x="50" y="64" text-anchor="middle" font-size="8" fill="#FFF" font-weight="bold">I</text>
  <text x="50" y="95" text-anchor="middle" font-size="7" fill="#666">Toggle 5x fast</text>
</svg>`,

  // Dimmer
  dimmer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="25" y="20" width="50" height="60" rx="5" fill="#FFF" stroke="#333" stroke-width="2"/>
  <circle cx="50" cy="50" r="20" fill="none" stroke="#2196F3" stroke-width="3"/>
  <path d="M50 35 L50 50 L60 55" stroke="#2196F3" stroke-width="2" fill="none"/>
  <circle cx="50" cy="50" r="5" fill="#2196F3"/>
  <text x="50" y="88" text-anchor="middle" font-size="7" fill="#666">Hold 5s</text>
</svg>`,
};

// Map driver names to categories
function getDriverCategory(driverName) {
  const name = driverName.toLowerCase();

  if (name.includes('button') || name.includes('remote') || name.includes('sos')) return 'button';
  if (name.includes('switch') && !name.includes('scene')) return 'switch';
  if (name.includes('plug')) return 'plug';
  if (name.includes('light') || name.includes('led') || name.includes('bulb') || name.includes('rgb') || name.includes('cct') || name.includes('dimmable')) return 'light';
  if (name.includes('thermostat') || name.includes('trv')) return 'thermostat';
  if (name.includes('curtain') || name.includes('blind') || name.includes('shutter') || name.includes('tilt')) return 'curtain';
  if (name.includes('valve') || name.includes('irrigation')) return 'valve';
  if (name.includes('air') || name.includes('co2') || name.includes('co_') || name.includes('formaldehyde') || name.includes('voc')) return 'air';
  if (name.includes('meter') || name.includes('energy') || name.includes('power')) return 'meter';
  if (name.includes('scene')) return 'scene';
  if (name.includes('weather') || name.includes('rain')) return 'weather';
  if (name.includes('soil')) return 'soil';
  if (name.includes('heater')) return 'heater';
  if (name.includes('vibration')) return 'vibration';
  if (name.includes('rcbo') || name.includes('breaker')) return 'rcbo';
  if (name.includes('dimmer')) return 'dimmer';
  if (name.includes('universal') || name.includes('zigbee')) return 'universal';
  if (name.includes('sensor') || name.includes('temp') || name.includes('humid') || name.includes('climate') || name.includes('lcd')) return 'sensor';

  return 'universal'; // Default
}

// Main function
async function generateLearnmodeSvgs() {
  console.log('=== GENERATING LEARNMODE SVGs ===\n');

  const drivers = fs.readdirSync(DRIVERS_DIR);
  let created = 0;
  let skipped = 0;

  for (const driver of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driver);
    const assetsPath = path.join(driverPath, 'assets');
    const learnmodePath = path.join(assetsPath, 'learnmode.svg');

    // Check if directory
    if (!fs.statSync(driverPath).isDirectory()) continue;

    // Check if learnmode.svg already exists
    if (fs.existsSync(learnmodePath)) {
      skipped++;
      continue;
    }

    // Create assets directory if needed
    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
    }

    // Get appropriate SVG template
    const category = getDriverCategory(driver);
    const svg = SVG_TEMPLATES[category] || SVG_TEMPLATES.universal;

    // Write SVG file
    fs.writeFileSync(learnmodePath, svg);
    console.log(`✅ Created: ${driver}/assets/learnmode.svg (${category})`);
    created++;
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Total drivers: ${drivers.length}`);
}

generateLearnmodeSvgs().catch(console.error);
