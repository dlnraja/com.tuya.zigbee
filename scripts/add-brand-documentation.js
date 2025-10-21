#!/usr/bin/env node
/**
 * 📝 ADD BRAND DOCUMENTATION
 * 
 * Ajoute documentation marques/produits dans les drivers:
 * - Commentaires dans device.js
 * - productId enrichi
 * - manufacturerName enrichi
 * 
 * GARDE structure UNBRANDED (folder/driver names)
 */

const fs = require('fs');
const path = require('path');

// Base de données marques/produits par driver
const BRANDS_DOCUMENTATION = {
  // Motion Sensors
  'motion_sensor_battery': {
    brands: ['Xiaomi', 'Aqara', 'Sonoff', 'Samsung', 'Tuya'],
    products: [
      'Xiaomi Motion Sensor v1/v2 (lumi.sensor_motion*)',
      'Aqara Motion Sensor P1/T1/E1 (lumi.motion.agl04, ac01, ac02)',
      'Sonoff SNZB-03/03P (motion)',
      'Samsung SmartThings motionv4/v5 (3315-S/G)',
      'Tuya PIR Motion Sensors (_TZE200_*, _TZ3000_*)'
    ]
  },
  
  'door_window_sensor_battery': {
    brands: ['Xiaomi', 'Aqara', 'Sonoff', 'Samsung', 'Tuya'],
    products: [
      'Xiaomi Door Sensor v1/v2 (lumi.sensor_magnet*)',
      'Aqara Door Sensor P1/T1/E1 (lumi.magnet.agl02, ac01)',
      'Sonoff SNZB-04/04P (door/window)',
      'Samsung SmartThings multiv4 (3321-S, 3320-L)',
      'Tuya Contact Sensors (_TZE200_*, _TZ3000_*)'
    ]
  },
  
  'temperature_humidity_sensor_battery': {
    brands: ['Xiaomi', 'Aqara', 'Sonoff', 'Tuya'],
    products: [
      'Xiaomi Temp/Humidity v1 (lumi.sensor_ht)',
      'Xiaomi Weather Sensor (lumi.weather)',
      'Aqara Temp/Humidity P1/T1 (lumi.sensor_ht.agl02, airmonitor.acn01)',
      'Sonoff SNZB-02/02D/02P (temp/humidity)',
      'Tuya Temp/Humidity Sensors (_TZE200_*, _TZ3000_*)'
    ]
  },
  
  'smart_plug_ac': {
    brands: ['Xiaomi', 'Sonoff', 'Samsung', 'Tuya'],
    products: [
      'Xiaomi Smart Plug v1/v2 (lumi.plug*)',
      'Aqara Smart Plug H1 (lumi.plug.mmeu01)',
      'Sonoff S31ZB/S40/S26R2ZB',
      'Samsung SmartThings outletv4 (7A-PL-Z-J2)',
      'Tuya Smart Plugs (_TZ3000_*, TS011F)'
    ]
  },
  
  'wall_switch_1gang_ac': {
    brands: ['Xiaomi', 'Aqara', 'Sonoff', 'Legrand', 'Schneider', 'Tuya'],
    products: [
      'Xiaomi Wall Switch 1 Gang v1/v2 (lumi.ctrl_neutral1, lumi.switch.b1nacn02)',
      'Aqara Wall Switch H1 1 Gang (lumi.switch.n1acn1)',
      'Sonoff ZBMINI/ZBMINIL2/BASICZBR3',
      'Legrand Micromodule Switch',
      'Schneider Electric NHPB/SWITCH/1',
      'Tuya 1 Gang Switches (_TZ3000_*)'
    ]
  },
  
  'wall_switch_2gang_ac': {
    brands: ['Xiaomi', 'Aqara', 'Legrand', 'Tuya'],
    products: [
      'Xiaomi Wall Switch 2 Gang v1/v2 (lumi.ctrl_neutral2, lumi.switch.b2nacn02)',
      'Aqara Wall Switch H1 2 Gang (lumi.switch.n2acn1)',
      'Legrand Double Gangs Remote Switch',
      'Tuya 2 Gang Switches (_TZ3000_*)'
    ]
  },
  
  'wireless_switch_cr2032': {
    brands: ['Xiaomi', 'Aqara', 'Sonoff', 'Samsung', 'IKEA'],
    products: [
      'Xiaomi Wireless Button v1/v2/v3 (lumi.sensor_switch*)',
      'Aqara Wireless Button H1/T1 (lumi.remote.b1acn01)',
      'Sonoff SNZB-01/01P (button)',
      'Samsung SmartThings button (IM6001-BTP01)',
      'IKEA SOMRIG Shortcut Button (E2213)'
    ]
  },
  
  'scene_controller_battery': {
    brands: ['Xiaomi', 'Aqara'],
    products: [
      'Xiaomi Cube v1/v2 (lumi.sensor_cube*)',
      'Aqara Cube T1 Pro (lumi.remote.cagl02)'
    ]
  },
  
  'scene_controller_4button_cr2032': {
    brands: ['Aqara', 'IKEA', 'Tuya'],
    products: [
      'Aqara Opple Switch 4 Button (lumi.remote.b486opcn01)',
      'IKEA STYRBAR Remote (E2001, E2002)',
      'Tuya 4 Button Controllers'
    ]
  },
  
  'presence_sensor_fp1_battery': {
    brands: ['Aqara'],
    products: [
      'Aqara Presence Sensor FP1 (lumi.motion.ac01, lumi.motion.agl04)',
      'Advanced mmWave presence detection'
    ]
  },
  
  'presence_sensor_fp2_ac': {
    brands: ['Aqara'],
    products: [
      'Aqara Presence Sensor FP2 (lumi.motion.ac02)',
      'Multi-zone mmWave presence detection'
    ]
  },
  
  'sound_controller_battery': {
    brands: ['IKEA'],
    products: [
      'IKEA SYMFONISK Sound Controller',
      'Remote control for audio systems'
    ]
  },
  
  'shortcut_button_battery': {
    brands: ['IKEA'],
    products: [
      'IKEA SOMRIG Shortcut Button (E2213)',
      'Quick action button'
    ]
  },
  
  'bulb_white_ac': {
    brands: ['Philips', 'IKEA', 'Sengled', 'Sylvania', 'Tuya'],
    products: [
      'Philips Hue White (LCT*, LTW*)',
      'IKEA TRÅDFRI White (LED*)',
      'Sengled White Bulbs (E11-*, E12-*)',
      'Sylvania LIGHTIFY (73740-42)',
      'Tuya White Bulbs (_TZ3000_*)'
    ]
  },
  
  'bulb_color_rgbcct_ac': {
    brands: ['Philips', 'IKEA', 'Sengled', 'OSRAM', 'Tuya'],
    products: [
      'Philips Hue Color (LCT001-016, LCA*)',
      'IKEA TRÅDFRI RGB (LED*)',
      'Sengled Color Bulbs (E1C-*, E1D-*)',
      'OSRAM/LEDVANCE RGBW (Classic A60, Flex)',
      'Tuya RGB Bulbs (_TZ3000_*)'
    ]
  }
};

class BrandDocumenter {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.stats = { documented: 0, skipped: 0 };
  }

  log(msg, color = 'reset') {
    const COLORS = { reset: '\x1b[0m', green: '\x1b[32m', cyan: '\x1b[36m', magenta: '\x1b[35m', yellow: '\x1b[33m' };
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  addDocumentation(driverId, brandInfo) {
    const devicePath = path.join(this.driversDir, driverId, 'device.js');
    
    if (!fs.existsSync(devicePath)) {
      this.log(`  ⏭️  ${driverId}: device.js manquant`, 'yellow');
      this.stats.skipped++;
      return;
    }
    
    try {
      let content = fs.readFileSync(devicePath, 'utf8');
      
      // Vérifier si déjà documenté
      if (content.includes('* SUPPORTED BRANDS:')) {
        this.stats.skipped++;
        return;
      }
      
      // Créer le commentaire de documentation
      const doc = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * ${this.toPascalCase(driverId)}Device
 * 
 * SUPPORTED BRANDS:
${brandInfo.brands.map(b => ` * - ${b}`).join('\n')}
 * 
 * COMPATIBLE PRODUCTS:
${brandInfo.products.map(p => ` * - ${p}`).join('\n')}
 * 
 * Note: Driver ID and folder name are UNBRANDED for universal compatibility.
 * Brand identification happens via manufacturerName and productId fields.
 */

class ${this.toPascalCase(driverId)}Device extends ZigBeeDevice {`;
      
      // Remplacer le début du fichier
      const match = content.match(/(class\s+\w+Device\s+extends\s+ZigBeeDevice\s+{)/);
      if (match) {
        const beforeClass = content.substring(0, content.indexOf(match[0]));
        const afterClass = content.substring(content.indexOf(match[0]) + match[0].length);
        
        content = doc + afterClass;
        
        fs.writeFileSync(devicePath, content);
        this.stats.documented++;
        this.log(`  ✅ ${driverId}`, 'green');
      }
      
    } catch (err) {
      this.log(`  ❌ Erreur ${driverId}: ${err.message}`, 'red');
    }
  }

  toPascalCase(str) {
    return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }

  async run() {
    this.log('\n╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     📝 DOCUMENTATION MARQUES DANS DRIVERS                           ║', 'magenta');
    this.log('║     Structure UNBRANDED + Documentation Marques                     ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝\n', 'magenta');
    
    this.log('📝 Ajout documentation marques/produits dans device.js:\n', 'cyan');
    
    for (const [driverId, brandInfo] of Object.entries(BRANDS_DOCUMENTATION)) {
      this.addDocumentation(driverId, brandInfo);
    }
    
    this.log('\n═══════════════════════════════════════════════════════════════════════', 'magenta');
    this.log(`  ✅ Drivers documentés: ${this.stats.documented}`, 'green');
    this.log(`  ⏭️  Skippés (déjà fait): ${this.stats.skipped}`, 'cyan');
    this.log('═══════════════════════════════════════════════════════════════════════\n', 'magenta');
    
    this.log('✅ DOCUMENTATION AJOUTÉE!', 'green');
    this.log('ℹ️  Structure UNBRANDED maintenue, marques documentées en commentaires\n', 'cyan');
  }
}

if (require.main === module) {
  const documenter = new BrandDocumenter();
  documenter.run().catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
}

module.exports = BrandDocumenter;
