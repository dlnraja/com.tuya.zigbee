'use strict';

/**
 * GENERATE DRIVER ICONS v1.0
 *
 * Creates professional SVG icons for all drivers with proper colors
 * Icon style: Clean, modern, consistent with Homey design
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = './drivers';

// Color palette by category (Homey-style)
const COLORS = {
  // Sensors - Blues & Cyans
  temperature: '#00BCD4',      // Cyan
  humidity: '#03A9F4',         // Light Blue
  climate: '#00ACC1',          // Cyan Dark
  motion: '#2196F3',           // Blue
  contact: '#3F51B5',          // Indigo
  water: '#00BCD4',            // Cyan
  smoke: '#FF5722',            // Deep Orange
  gas: '#FF9800',              // Orange
  air_quality: '#4CAF50',      // Green

  // Lights - Yellows & Oranges
  light: '#FFC107',            // Amber
  bulb: '#FFEB3B',             // Yellow
  led: '#FF9800',              // Orange
  dimmer: '#FFB300',           // Amber Dark

  // Switches & Plugs - Greens
  switch: '#4CAF50',           // Green
  plug: '#8BC34A',             // Light Green
  socket: '#689F38',           // Light Green Dark

  // Covers - Purples
  curtain: '#9C27B0',          // Purple
  blind: '#7B1FA2',            // Purple Dark
  shutter: '#673AB7',          // Deep Purple

  // Climate Control - Reds & Oranges
  thermostat: '#F44336',       // Red
  radiator: '#E91E63',         // Pink
  hvac: '#FF5722',             // Deep Orange

  // Security - Reds
  alarm: '#F44336',            // Red
  siren: '#D32F2F',            // Red Dark
  lock: '#795548',             // Brown

  // Buttons - Grays
  button: '#607D8B',           // Blue Gray
  remote: '#78909C',           // Blue Gray Light

  // Other
  fan: '#00BCD4',              // Cyan
  doorbell: '#FF9800',         // Orange
  gateway: '#9E9E9E',          // Gray
  default: '#757575'           // Gray Dark
};

// SVG icon paths by driver type (clean, professional icons)
const ICON_PATHS = {
  // Climate/Temperature
  climate_sensor: `
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M12 6v8M9 11l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="12" cy="17" r="1.5" fill="currentColor"/>
  `,
  soil_sensor: `
    <path d="M12 2L4 8v12h16V8L12 2z" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 14v4M12 12v6M16 14v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  weather_station: `
    <circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M4 16h16M6 20h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,

  // Motion sensors
  motion_sensor: `
    <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M6 20c0-4 2.5-6 6-6s6 2 6 6" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M18 6l3-3M18 10h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  motion_sensor_radar: `
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
    <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="1" opacity="0.7"/>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1" opacity="0.4"/>
  `,
  presence_sensor: `
    <circle cx="12" cy="8" r="4" fill="currentColor"/>
    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  `,

  // Contact sensors
  contact_sensor: `
    <rect x="3" y="4" width="8" height="16" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <rect x="13" y="4" width="8" height="16" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M11 10h2M11 14h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,

  // Water sensors
  water_leak: `
    <path d="M12 2C8 6 6 10 6 13c0 3.3 2.7 6 6 6s6-2.7 6-6c0-3-2-7-6-11z" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M9 14c0 1.7 1.3 3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  rain_sensor: `
    <path d="M12 2C8 6 6 10 6 13c0 3.3 2.7 6 6 6s6-2.7 6-6c0-3-2-7-6-11z" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 10l2-2M12 8l2-2M16 10l-2-2" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
  `,

  // Smoke/Gas
  smoke_detector: `
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
    <path d="M9 6c0-2 1-3 3-3s3 1 3 3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  `,
  gas_detector: `
    <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M12 8v4l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,

  // Plugs & Switches
  plug_smart: `
    <rect x="6" y="3" width="12" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="9" r="1.5" fill="currentColor"/>
    <path d="M9 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  switch_1gang: `
    <rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <rect x="8" y="6" width="8" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="12" cy="10" r="2" fill="currentColor"/>
  `,
  switch_2gang: `
    <rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <rect x="6" y="5" width="5" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1"/>
    <rect x="13" y="5" width="5" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1"/>
    <rect x="6" y="13" width="5" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1"/>
    <rect x="13" y="13" width="5" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1"/>
  `,

  // Dimmers
  dimmer: `
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  `,

  // Lights
  bulb: `
    <path d="M9 21h6M10 17h4M12 3a6 6 0 0 0-4 10.5V17h8v-3.5A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  led_strip: `
    <rect x="2" y="8" width="20" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="10" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="14" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="18" cy="12" r="1.5" fill="currentColor"/>
  `,

  // Curtains/Blinds
  curtain_motor: `
    <rect x="2" y="2" width="20" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M4 6v14c0 1 1 2 4 2M20 6v14c0 1-1 2-4 2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 8c2 4 4 8 4 12M16 8c-2 4-4 8-4 12" stroke="currentColor" stroke-width="1.5"/>
  `,
  shutter: `
    <rect x="3" y="2" width="18" height="20" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M3 6h18M3 10h18M3 14h18M3 18h18" stroke="currentColor" stroke-width="1"/>
  `,

  // Thermostats
  thermostat: `
    <circle cx="12" cy="14" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M12 4v4M12 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="14" r="3" fill="currentColor"/>
  `,
  radiator_valve: `
    <rect x="8" y="2" width="8" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <rect x="6" y="10" width="12" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M9 14h6M9 17h6" stroke="currentColor" stroke-width="1"/>
  `,

  // Buttons/Remotes
  button: `
    <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="currentColor"/>
  `,
  remote: `
    <rect x="7" y="2" width="10" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="12" cy="7" r="2" fill="currentColor"/>
    <rect x="9" y="11" width="6" height="2" rx="0.5" fill="currentColor"/>
    <rect x="9" y="15" width="6" height="2" rx="0.5" fill="currentColor"/>
  `,

  // Alarm/Security
  siren: `
    <path d="M12 2L2 12h3v8h14v-8h3L12 2z" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 14h8M10 17h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  lock: `
    <rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
  `,

  // Other
  doorbell: `
    <rect x="6" y="2" width="12" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="12" cy="10" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <rect x="10" y="16" width="4" height="2" rx="0.5" fill="currentColor"/>
  `,
  fan: `
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
    <path d="M12 2c-2 2-2 5 0 7M22 12c-2-2-5-2-7 0M12 22c2-2 2-5 0-7M2 12c2 2 5 2 7 0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  `,
  gateway: `
    <rect x="4" y="8" width="16" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 4l4-2 4 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M8 4v4M16 4v4" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="8" cy="14" r="1" fill="currentColor"/>
    <circle cx="12" cy="14" r="1" fill="currentColor"/>
    <circle cx="16" cy="14" r="1" fill="currentColor"/>
  `,
  air_quality: `
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 10c2-2 4-2 4 0s2 2 4 0M8 14c2-2 4-2 4 0s2 2 4 0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  `
};

// Driver to icon/color mapping
const DRIVER_CONFIG = {
  // Sensors
  climate_sensor: { icon: 'climate_sensor', color: COLORS.climate },
  soil_sensor: { icon: 'soil_sensor', color: COLORS.humidity },
  weather_station_outdoor: { icon: 'weather_station', color: COLORS.climate },
  motion_sensor: { icon: 'motion_sensor', color: COLORS.motion },
  motion_sensor_radar_mmwave: { icon: 'motion_sensor_radar', color: COLORS.motion },
  presence_sensor_radar: { icon: 'presence_sensor', color: COLORS.motion },
  contact_sensor: { icon: 'contact_sensor', color: COLORS.contact },
  water_leak_sensor: { icon: 'water_leak', color: COLORS.water },
  rain_sensor: { icon: 'rain_sensor', color: COLORS.water },
  smoke_detector_advanced: { icon: 'smoke_detector', color: COLORS.smoke },
  gas_detector: { icon: 'gas_detector', color: COLORS.gas },
  gas_sensor: { icon: 'gas_detector', color: COLORS.gas },
  formaldehyde_sensor: { icon: 'air_quality', color: COLORS.air_quality },
  air_quality_co2: { icon: 'air_quality', color: COLORS.air_quality },
  air_quality_comprehensive: { icon: 'air_quality', color: COLORS.air_quality },

  // Plugs & Switches
  plug_smart: { icon: 'plug_smart', color: COLORS.plug },
  plug_energy_monitor: { icon: 'plug_smart', color: COLORS.plug },
  usb_outlet_advanced: { icon: 'plug_smart', color: COLORS.plug },
  switch_1gang: { icon: 'switch_1gang', color: COLORS.switch },
  switch_2gang: { icon: 'switch_2gang', color: COLORS.switch },
  switch_3gang: { icon: 'switch_2gang', color: COLORS.switch },
  switch_4gang: { icon: 'switch_2gang', color: COLORS.switch },
  switch_wall_5gang: { icon: 'switch_2gang', color: COLORS.switch },
  switch_wall_6gang: { icon: 'switch_2gang', color: COLORS.switch },
  switch_wall_7gang: { icon: 'switch_2gang', color: COLORS.switch },
  switch_wall_8gang: { icon: 'switch_2gang', color: COLORS.switch },
  module_mini_switch: { icon: 'switch_1gang', color: COLORS.switch },
  switch_wireless: { icon: 'remote', color: COLORS.button },

  // Dimmers & Lights
  dimmer_wall_1gang: { icon: 'dimmer', color: COLORS.dimmer },
  dimmer_2ch_ts1101: { icon: 'dimmer', color: COLORS.dimmer },
  bulb_dimmable: { icon: 'bulb', color: COLORS.bulb },
  bulb_tunable_white: { icon: 'bulb', color: COLORS.bulb },
  bulb_white: { icon: 'bulb', color: COLORS.bulb },
  bulb_rgb: { icon: 'bulb', color: COLORS.light },
  bulb_rgbw: { icon: 'bulb', color: COLORS.light },
  led_strip: { icon: 'led_strip', color: COLORS.led },
  led_strip_rgbw: { icon: 'led_strip', color: COLORS.led },
  led_strip_advanced: { icon: 'led_strip', color: COLORS.led },

  // Curtains/Blinds
  curtain_motor: { icon: 'curtain_motor', color: COLORS.curtain },
  shutter_roller_controller: { icon: 'shutter', color: COLORS.blind },

  // Thermostats
  thermostat_ts0601: { icon: 'thermostat', color: COLORS.thermostat },
  radiator_valve: { icon: 'radiator_valve', color: COLORS.radiator },
  hvac_air_conditioner: { icon: 'thermostat', color: COLORS.hvac },
  hvac_dehumidifier: { icon: 'fan', color: COLORS.hvac },

  // Buttons/Remotes
  button_wireless: { icon: 'button', color: COLORS.button },
  button_wireless_1: { icon: 'button', color: COLORS.button },
  button_wireless_2: { icon: 'remote', color: COLORS.button },
  button_wireless_3: { icon: 'remote', color: COLORS.button },
  button_wireless_4: { icon: 'remote', color: COLORS.button },
  button_wireless_6: { icon: 'remote', color: COLORS.button },
  button_wireless_8: { icon: 'remote', color: COLORS.button },
  button_emergency_sos: { icon: 'button', color: COLORS.alarm },

  // Security/Alarm
  siren: { icon: 'siren', color: COLORS.siren },
  lock_smart: { icon: 'lock', color: COLORS.lock },
  door_controller: { icon: 'lock', color: COLORS.lock },
  doorbell: { icon: 'doorbell', color: COLORS.doorbell },

  // Other
  ceiling_fan: { icon: 'fan', color: COLORS.fan },
  gateway_zigbee_bridge: { icon: 'gateway', color: COLORS.gateway },
  water_valve_smart: { icon: 'water_leak', color: COLORS.water },
  zigbee_universal: { icon: 'gateway', color: COLORS.default }
};

// Generate SVG
function generateSVG(iconKey, color) {
  const iconPath = ICON_PATHS[iconKey] || ICON_PATHS.button;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" style="color: ${color}">
  ${iconPath.trim()}
</svg>`;
}

// Main function
function generateAllIcons() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     GENERATE DRIVER ICONS v1.0                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  let created = 0;
  let updated = 0;

  const drivers = fs.readdirSync(DRIVERS_DIR);

  drivers.forEach(driver => {
    const driverPath = path.join(DRIVERS_DIR, driver);
    const assetsPath = path.join(driverPath, 'assets');
    const iconPath = path.join(assetsPath, 'icon.svg');

    // Get config
    const config = DRIVER_CONFIG[driver] || { icon: 'button', color: COLORS.default };

    // Create assets dir if needed
    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
    }

    // Generate SVG
    const svg = generateSVG(config.icon, config.color);

    // Write icon
    const existed = fs.existsSync(iconPath);
    fs.writeFileSync(iconPath, svg);

    if (existed) {
      updated++;
      console.log(`✏️ ${driver}: Updated (${config.color})`);
    } else {
      created++;
      console.log(`✅ ${driver}: Created (${config.color})`);
    }
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Icons created: ${created}`);
  console.log(`Icons updated: ${updated}`);
  console.log('═══════════════════════════════════════════════════════════');
}

if (require.main === module) {
  generateAllIcons();
}

module.exports = { generateAllIcons, COLORS, ICON_PATHS };
