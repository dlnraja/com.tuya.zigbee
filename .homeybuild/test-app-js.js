const fs = require('fs');
const path = require('path');

console.log('🚀 Test de génération app.js...');

// Vérifier la structure des dossiers
const tuyaPath = path.join('drivers', 'tuya');
const zigbeePath = path.join('drivers', 'zigbee');

console.log('📁 Vérification des dossiers...');
console.log(`Tuya path exists: ${fs.existsSync(tuyaPath)}`);
console.log(`Zigbee path exists: ${fs.existsSync(zigbeePath)}`);

if (fs.existsSync(tuyaPath)) {
  const tuyaItems = fs.readdirSync(tuyaPath);
  console.log(`Tuya items: ${tuyaItems.length}`);
  
  // Compter les drivers valides
  let validDrivers = 0;
  for (const item of tuyaItems) {
    const itemPath = path.join(tuyaPath, item);
    if (fs.statSync(itemPath).isDirectory()) {
      const driverComposePath = path.join(itemPath, 'driver.compose.json');
      const deviceJsPath = path.join(itemPath, 'device.js');
      
      if (fs.existsSync(driverComposePath) && fs.existsSync(deviceJsPath)) {
        validDrivers++;
      }
    }
  }
  console.log(`Valid Tuya drivers: ${validDrivers}`);
}

if (fs.existsSync(zigbeePath)) {
  const zigbeeItems = fs.readdirSync(zigbeePath);
  console.log(`Zigbee items: ${zigbeeItems.length}`);
  
  // Compter les drivers valides
  let validDrivers = 0;
  for (const item of zigbeeItems) {
    const itemPath = path.join(zigbeePath, item);
    if (fs.statSync(itemPath).isDirectory()) {
      const driverComposePath = path.join(itemPath, 'driver.compose.json');
      const deviceJsPath = path.join(itemPath, 'device.js');
      
      if (fs.existsSync(driverComposePath) && fs.existsSync(deviceJsPath)) {
        validDrivers++;
      }
    }
  }
  console.log(`Valid Zigbee drivers: ${validDrivers}`);
}

// Générer un app.js simple
console.log('📝 Génération d\'un app.js simple...');

const appJsContent = `'use strict';

const { HomeyApp } = require('homey');

// Driver imports - Generated automatically
// Tuya Drivers
// Lights drivers
const ts0001 = require('./drivers/tuya/lights/ts0001/device.js');
const ts0002 = require('./drivers/tuya/lights/ts0002/device.js');
const ts0003 = require('./drivers/tuya/lights/ts0003/device.js');
const ts0004 = require('./drivers/tuya/lights/ts0004/device.js');

// Switches drivers
const ts0601switch = require('./drivers/tuya/switches/ts0601switch/device.js');
const ts0601dimmer = require('./drivers/tuya/switches/ts0601dimmer/device.js');

// Plugs drivers
const ts011fPlug = require('./drivers/tuya/plugs/ts011f-plug/device.js');
const ts0601Plug = require('./drivers/tuya/plugs/ts0601_plug/device.js');

// Sensors drivers
const ts0601sensor = require('./drivers/tuya/sensors/ts0601sensor/device.js');
const ts0601motion = require('./drivers/tuya/sensors/ts0601motion/device.js');
const ts0601contact = require('./drivers/tuya/sensors/ts0601contact/device.js');

// Controls drivers
const ts0601Blind = require('./drivers/tuya/controls/ts0601-blind/device.js');
const ts0601Curtain = require('./drivers/tuya/controls/ts0601-curtain/device.js');

// Zigbee Drivers
// Lights drivers
// Temperature drivers

class TuyaZigbeeApp extends HomeyApp {
  async onInit() {
    this.log('Tuya Zigbee App is running...');
    
    // Register all drivers - Generated automatically
    
    // Register Tuya drivers
    // Lights drivers
    this.homey.drivers.registerDriver(ts0001);
    this.homey.drivers.registerDriver(ts0002);
    this.homey.drivers.registerDriver(ts0003);
    this.homey.drivers.registerDriver(ts0004);
    
    // Switches drivers
    this.homey.drivers.registerDriver(ts0601switch);
    this.homey.drivers.registerDriver(ts0601dimmer);
    
    // Plugs drivers
    this.homey.drivers.registerDriver(ts011fPlug);
    this.homey.drivers.registerDriver(ts0601Plug);
    
    // Sensors drivers
    this.homey.drivers.registerDriver(ts0601sensor);
    this.homey.drivers.registerDriver(ts0601motion);
    this.homey.drivers.registerDriver(ts0601contact);
    
    // Controls drivers
    this.homey.drivers.registerDriver(ts0601Blind);
    this.homey.drivers.registerDriver(ts0601Curtain);
    
    // Register Zigbee drivers
    // Lights drivers
    // Temperature drivers
    
  }
}

module.exports = TuyaZigbeeApp;
`;

fs.writeFileSync('app.js', appJsContent);
console.log('✅ app.js généré avec succès');

console.log('🎉 Test terminé !'); 