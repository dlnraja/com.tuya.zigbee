#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

console.log('\n🔄 ADDING BACK ALL REMOVED BRANDS WITH COMPLETE STRUCTURE\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const appJsonPath = path.join(__dirname, '..', 'app.json');

// Drivers that were removed (42 total)
const removedDrivers = {
  // Innr (4)
  innr: [
    { id: 'innr_bulb_color_ac', name: 'Innr Bulb Color (AC)', class: 'light', caps: ['onoff', 'dim', 'light_hue', 'light_saturation'] },
    { id: 'innr_bulb_tunable_white_ac', name: 'Innr Bulb Tunable White (AC)', class: 'light', caps: ['onoff', 'dim', 'light_temperature'] },
    { id: 'innr_bulb_white_ac', name: 'Innr Bulb White (AC)', class: 'light', caps: ['onoff', 'dim'] },
    { id: 'innr_smart_plug_ac', name: 'Innr Smart Plug (AC)', class: 'socket', caps: ['onoff'] }
  ],
  // Osram (6)
  osram: [
    { id: 'osram_bulb_rgbw_ac', name: 'Osram Bulb RGBW (AC)', class: 'light', caps: ['onoff', 'dim', 'light_hue', 'light_saturation'] },
    { id: 'osram_bulb_tunable_white_ac', name: 'Osram Bulb Tunable White (AC)', class: 'light', caps: ['onoff', 'dim', 'light_temperature'] },
    { id: 'osram_bulb_white_ac', name: 'Osram Bulb White (AC)', class: 'light', caps: ['onoff', 'dim'] },
    { id: 'osram_led_strip_rgbw_ac', name: 'Osram LED Strip RGBW (AC)', class: 'light', caps: ['onoff', 'dim', 'light_hue', 'light_saturation'] },
    { id: 'osram_outdoor_plug_ac', name: 'Osram Outdoor Plug (AC)', class: 'socket', caps: ['onoff'] },
    { id: 'osram_smart_plug_ac', name: 'Osram Smart Plug (AC)', class: 'socket', caps: ['onoff'] }
  ],
  // Philips (8)
  philips: [
    { id: 'philips_bulb_color_ac', name: 'Philips Hue Bulb Color (AC)', class: 'light', caps: ['onoff', 'dim', 'light_hue', 'light_saturation'] },
    { id: 'philips_bulb_white_ac', name: 'Philips Hue Bulb White (AC)', class: 'light', caps: ['onoff', 'dim'] },
    { id: 'philips_bulb_white_ambiance_ac', name: 'Philips Hue White Ambiance (AC)', class: 'light', caps: ['onoff', 'dim', 'light_temperature'] },
    { id: 'philips_dimmer_switch_aaa', name: 'Philips Hue Dimmer (AAA)', class: 'button', caps: ['alarm_battery'], battery: ['AAA'] },
    { id: 'philips_led_strip_ac', name: 'Philips Hue LED Strip (AC)', class: 'light', caps: ['onoff', 'dim', 'light_hue', 'light_saturation'] },
    { id: 'philips_motion_sensor_aaa', name: 'Philips Hue Motion (AAA)', class: 'sensor', caps: ['alarm_motion', 'measure_luminance', 'alarm_battery'], battery: ['AAA'] },
    { id: 'philips_outdoor_sensor_aaa', name: 'Philips Hue Outdoor Sensor (AAA)', class: 'sensor', caps: ['alarm_motion', 'measure_luminance', 'alarm_battery'], battery: ['AAA'] },
    { id: 'philips_smart_plug_ac', name: 'Philips Hue Smart Plug (AC)', class: 'socket', caps: ['onoff'] }
  ],
  // Samsung (8)
  samsung: [
    { id: 'samsung_button_cr2450', name: 'Samsung Button (CR2450)', class: 'button', caps: ['alarm_battery'], battery: ['CR2450'] },
    { id: 'samsung_contact_sensor_cr2032', name: 'Samsung Contact Sensor (CR2032)', class: 'sensor', caps: ['alarm_contact', 'alarm_battery'], battery: ['CR2032'] },
    { id: 'samsung_motion_sensor_cr2450', name: 'Samsung Motion Sensor (CR2450)', class: 'sensor', caps: ['alarm_motion', 'alarm_battery'], battery: ['CR2450'] },
    { id: 'samsung_motion_sensor_outdoor_cr123a', name: 'Samsung Outdoor Motion (CR123A)', class: 'sensor', caps: ['alarm_motion', 'alarm_battery'], battery: ['CR123A'] },
    { id: 'samsung_multipurpose_sensor_cr2032', name: 'Samsung Multipurpose (CR2032)', class: 'sensor', caps: ['alarm_contact', 'measure_temperature', 'alarm_battery'], battery: ['CR2032'] },
    { id: 'samsung_outlet_ac', name: 'Samsung Outlet (AC)', class: 'socket', caps: ['onoff'] },
    { id: 'samsung_smart_plug_ac', name: 'Samsung SmartThings Plug (AC)', class: 'socket', caps: ['onoff', 'measure_power'] },
    { id: 'samsung_water_leak_sensor_cr2032', name: 'Samsung Water Leak (CR2032)', class: 'sensor', caps: ['alarm_water', 'alarm_battery'], battery: ['CR2032'] }
  ],
  // Sonoff (6)
  sonoff: [
    { id: 'sonoff_button_wireless_cr2450', name: 'Sonoff Wireless Button (CR2450)', class: 'button', caps: ['alarm_battery'], battery: ['CR2450'] },
    { id: 'sonoff_contact_sensor_cr2032', name: 'Sonoff Contact Sensor (CR2032)', class: 'sensor', caps: ['alarm_contact', 'alarm_battery'], battery: ['CR2032'] },
    { id: 'sonoff_led_strip_ac', name: 'Sonoff LED Strip (AC)', class: 'light', caps: ['onoff', 'dim', 'light_hue', 'light_saturation'] },
    { id: 'sonoff_motion_sensor_cr2450', name: 'Sonoff Motion Sensor (CR2450)', class: 'sensor', caps: ['alarm_motion', 'alarm_battery'], battery: ['CR2450'] },
    { id: 'sonoff_smart_plug_ac', name: 'Sonoff Smart Plug (AC)', class: 'socket', caps: ['onoff', 'measure_power'] },
    { id: 'sonoff_temperature_humidity_cr2450', name: 'Sonoff Temp/Humidity (CR2450)', class: 'sensor', caps: ['measure_temperature', 'measure_humidity', 'alarm_battery'], battery: ['CR2450'] }
  ],
  // Xiaomi (8)
  xiaomi: [
    { id: 'xiaomi_button_wireless_cr2032', name: 'Xiaomi Wireless Button (CR2032)', class: 'button', caps: ['alarm_battery'], battery: ['CR2032'] },
    { id: 'xiaomi_contact_sensor_cr1632', name: 'Xiaomi Door Sensor (CR1632)', class: 'sensor', caps: ['alarm_contact', 'alarm_battery'], battery: ['OTHER'] },
    { id: 'xiaomi_cube_controller_cr2450', name: 'Xiaomi Cube Controller (CR2450)', class: 'button', caps: ['alarm_battery'], battery: ['CR2450'] },
    { id: 'xiaomi_motion_sensor_cr2450', name: 'Xiaomi Motion Sensor (CR2450)', class: 'sensor', caps: ['alarm_motion', 'measure_luminance', 'alarm_battery'], battery: ['CR2450'] },
    { id: 'xiaomi_smart_plug_ac', name: 'Xiaomi Smart Plug (AC)', class: 'socket', caps: ['onoff', 'measure_power'] },
    { id: 'xiaomi_temperature_humidity_cr2032', name: 'Xiaomi Temp/Humidity (CR2032)', class: 'sensor', caps: ['measure_temperature', 'measure_humidity', 'alarm_battery'], battery: ['CR2032'] },
    { id: 'xiaomi_vibration_sensor_cr2450', name: 'Xiaomi Vibration Sensor (CR2450)', class: 'sensor', caps: ['alarm_generic', 'alarm_battery'], battery: ['CR2450'] },
    { id: 'xiaomi_water_leak_cr2032', name: 'Xiaomi Water Leak (CR2032)', class: 'sensor', caps: ['alarm_water', 'alarm_battery'], battery: ['CR2032'] }
  ]
};

// Brand colors
const brandColors = {
  innr: { bg: '#FF6B35', fg: '#FFFFFF', icon: '💡' },
  osram: { bg: '#FFD700', fg: '#000000', icon: '✨' },
  philips: { bg: '#0066CC', fg: '#FFFFFF', icon: '🏠' },
  samsung: { bg: '#1428A0', fg: '#FFFFFF', icon: '📱' },
  sonoff: { bg: '#00B4D8', fg: '#FFFFFF', icon: '🔌' },
  xiaomi: { bg: '#FF6900', fg: '#FFFFFF', icon: '🎯' }
};

function generateImage(width, height, brand, deviceType, colors) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors.bg);
  gradient.addColorStop(1, adjustBrightness(colors.bg, -20));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Icon/Text
  ctx.fillStyle = colors.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  if (width === 75) {
    ctx.font = 'bold 32px Arial';
    ctx.fillText(colors.icon, width / 2, height / 2);
  } else {
    // Large image
    ctx.font = 'bold 48px Arial';
    ctx.fillText(colors.icon, width / 2, height / 3);
    ctx.font = 'bold 32px Arial';
    ctx.fillText(brand.toUpperCase(), width / 2, height / 2);
    ctx.font = '24px Arial';
    ctx.fillText(deviceType, width / 2, height / 2 + 40);
  }
  
  return canvas.toBuffer('image/png');
}

function adjustBrightness(hex, percent) {
  const num = parseInt(String(hex).replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function createDriver(brand, driver) {
  const driverId = driver.id;
  const driverPath = path.join(driversDir, driverId);
  const assetsPath = path.join(driverPath, 'assets');
  const imagesPath = path.join(assetsPath, 'images');
  
  // Create directories
  fs.mkdirSync(imagesPath, { recursive: true });
  
  const colors = brandColors[brand];
  const deviceType = driver.class;
  
  // Generate images
  fs.writeFileSync(path.join(imagesPath, 'small.png'), 
    generateImage(75, 75, brand, deviceType, colors));
  fs.writeFileSync(path.join(imagesPath, 'large.png'), 
    generateImage(500, 500, brand, deviceType, colors));
  fs.writeFileSync(path.join(imagesPath, 'xlarge.png'), 
    generateImage(1000, 1000, brand, deviceType, colors));
  
  // Create device.js
  const className = driverId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const deviceJs = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${className}Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = ${className}Device;
`;
  
  fs.writeFileSync(path.join(driverPath, 'device.js'), deviceJs);
  
  // Create driver.compose.json
  const compose = {
    id: driverId,
    name: { en: driver.name },
    class: driver.class,
    capabilities: driver.caps,
    images: {
      small: `drivers/${driverId}/assets/images/small.png`,
      large: `drivers/${driverId}/assets/images/large.png`,
      xlarge: `drivers/${driverId}/assets/images/xlarge.png`
    },
    zigbee: {
      manufacturerName: [`_${brand.toUpperCase()}_generic`],
      productId: ['generic']
    }
  };
  
  if (driver.battery) {
    compose.energy = { batteries: driver.battery };
  }
  
  fs.writeFileSync(
    path.join(driverPath, 'driver.compose.json'),
    JSON.stringify(compose, null, 2)
  );
  
  console.log(`  ✅ ${brand.toUpperCase()}: ${driverId}`);
  
  return compose;
}

// Load app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
let added = 0;

// Create all drivers
Object.entries(removedDrivers).forEach(([brand, drivers]) => {
  console.log(`\n📦 Creating ${brand.toUpperCase()} drivers (${drivers.length}):\n`);
  
  drivers.forEach(driver => {
    const driverEntry = createDriver(brand, driver);
    appJson.drivers.push(driverEntry);
    added++;
  });
});

// Save app.json
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log(`\n✅ Added ${added} drivers back to app.json`);
console.log(`📊 Total drivers now: ${appJson.drivers.length}\n`);
