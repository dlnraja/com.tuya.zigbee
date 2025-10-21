#!/usr/bin/env node
/**
 * 🔄 RECOVER 26 DRIVERS MANUFACTURER IDs
 * 
 * Récupère les manufacturer IDs des 26 drivers supprimés
 * et les injecte dans les drivers génériques UNBRANDED correspondants
 * 
 * INTELLIGENT: Mapping automatique vers les bons drivers existants
 */

const fs = require('fs');
const path = require('path');

// Manufacturer IDs des 26 drivers supprimés à récupérer
const DELETED_DRIVERS_IDS = {
  // XIAOMI/AQARA (13 drivers)
  motion: {
    mfr: ['lumi.sensor_motion', 'lumi.sensor_motion.aq2', 'lumi.motion.agl04', 'lumi.motion.ac01', 'lumi.motion.ac02', 'lumi.motion.agl02', 'lumi.sensor_motion.aq2b'],
    target: 'motion_sensor_battery'
  },
  door: {
    mfr: ['lumi.sensor_magnet', 'lumi.sensor_magnet.aq2', 'lumi.magnet.agl02', 'lumi.magnet.ac01', 'lumi.magnet.acn001'],
    target: 'door_window_sensor_battery'
  },
  temp_humidity: {
    mfr: ['lumi.weather', 'lumi.sensor_ht', 'lumi.sensor_ht.agl02', 'lumi.airmonitor.acn01'],
    target: 'temperature_humidity_sensor_battery'
  },
  water_leak: {
    mfr: ['lumi.sensor_wleak.aq1', 'lumi.flood.agl02'],
    target: 'water_leak_sensor_battery'
  },
  vibration: {
    mfr: ['lumi.vibration.aq1'],
    target: 'vibration_sensor_battery'
  },
  button: {
    mfr: ['lumi.sensor_switch', 'lumi.sensor_switch.aq2', 'lumi.sensor_switch.aq3', 'lumi.remote.b1acn01', 'lumi.remote.b186acn02'],
    target: 'wireless_switch_cr2032'
  },
  cube: {
    mfr: ['lumi.sensor_cube', 'lumi.sensor_cube.aqgl01', 'lumi.remote.cagl02'],
    target: 'scene_controller_battery'
  },
  plug: {
    mfr: ['lumi.plug', 'lumi.plug.maeu01', 'lumi.plug.maus01', 'lumi.plug.mmeu01'],
    target: 'smart_plug_ac'
  },
  switch_1gang: {
    mfr: ['lumi.ctrl_neutral1', 'lumi.switch.b1nacn02', 'lumi.ctrl_ln1', 'lumi.switch.n1acn1'],
    target: 'wall_switch_1gang_ac'
  },
  switch_2gang: {
    mfr: ['lumi.ctrl_neutral2', 'lumi.switch.b2nacn02', 'lumi.ctrl_ln2', 'lumi.switch.n2acn1'],
    target: 'wall_switch_2gang_ac'
  },
  opple_2button: {
    mfr: ['lumi.remote.b286opcn01'],
    target: 'wireless_switch_2gang_cr2032'
  },
  opple_4button: {
    mfr: ['lumi.remote.b486opcn01'],
    target: 'scene_controller_4button_cr2032'
  },
  opple_6button: {
    mfr: ['lumi.remote.b686opcn01'],
    target: 'scene_controller_6button_cr2032'
  },
  
  // SONOFF (7 drivers)
  sonoff_switch_mini: {
    mfr: ['SONOFF', 'eWeLink'],
    productId: ['ZBMINI', 'ZBMINIL2', 'ZBMINI-L'],
    target: 'smart_switch_1gang_ac'
  },
  sonoff_switch_basic: {
    mfr: ['SONOFF'],
    productId: ['BASICZBR3'],
    target: 'relay_switch_1gang_ac'
  },
  sonoff_temp: {
    mfr: ['SONOFF'],
    productId: ['SNZB-02', 'SNZB-02D', 'SNZB-02P'],
    target: 'temperature_humidity_sensor_battery'
  },
  sonoff_motion: {
    mfr: ['SONOFF'],
    productId: ['SNZB-03', 'SNZB-03P'],
    target: 'motion_sensor_battery'
  },
  sonoff_door: {
    mfr: ['SONOFF'],
    productId: ['SNZB-04', 'SNZB-04P'],
    target: 'door_window_sensor_battery'
  },
  sonoff_button: {
    mfr: ['SONOFF'],
    productId: ['SNZB-01', 'SNZB-01P'],
    target: 'wireless_switch_cr2032'
  },
  sonoff_plug: {
    mfr: ['SONOFF'],
    productId: ['S31ZB', 'S31 Lite zb', 'S40ZBTPB', 'S26R2ZB'],
    target: 'smart_plug_ac'
  },
  
  // SAMSUNG (6 drivers)
  samsung_motion: {
    mfr: ['SmartThings', 'Samsung', 'Samjin'],
    productId: ['motionv4', 'motionv5', '3315-S', '3315-G'],
    target: 'motion_sensor_battery'
  },
  samsung_door: {
    mfr: ['SmartThings', 'Samsung'],
    productId: ['multiv4', '3321-S', '3320-L'],
    target: 'door_window_sensor_battery'
  },
  samsung_water: {
    mfr: ['SmartThings', 'Samsung'],
    productId: ['waterv4', '3315-L'],
    target: 'water_leak_sensor_battery'
  },
  samsung_button: {
    mfr: ['SmartThings', 'Samsung'],
    productId: ['button', 'IM6001-BTP01'],
    target: 'wireless_switch_cr2032'
  },
  samsung_plug: {
    mfr: ['SmartThings', 'Samsung'],
    productId: ['outletv4', '7A-PL-Z-J2'],
    target: 'smart_plug_ac'
  },
  samsung_arrival: {
    mfr: ['SmartThings'],
    productId: ['tagv4'],
    target: 'presence_sensor_radar_battery'
  }
};

class RecoveryEnricher {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.stats = { enriched: 0, idsAdded: 0 };
  }

  log(msg, color = 'reset') {
    const COLORS = { reset: '\x1b[0m', green: '\x1b[32m', cyan: '\x1b[36m', yellow: '\x1b[33m', magenta: '\x1b[35m' };
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  enrichDriver(targetDriver, mfrIds, prodIds) {
    const composePath = path.join(this.driversDir, targetDriver, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
      this.log(`  ⚠️  ${targetDriver}: n'existe pas`, 'yellow');
      return 0;
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (!data.zigbee) return 0;
      
      let mfr = Array.isArray(data.zigbee.manufacturerName) 
        ? data.zigbee.manufacturerName 
        : [data.zigbee.manufacturerName || ''];
      
      let prod = Array.isArray(data.zigbee.productId) 
        ? data.zigbee.productId 
        : [data.zigbee.productId || ''];
      
      let added = 0;
      
      // Ajouter manufacturer IDs
      if (mfrIds) {
        for (const id of mfrIds) {
          if (id && !mfr.includes(id)) {
            mfr.push(id);
            added++;
          }
        }
      }
      
      // Ajouter product IDs
      if (prodIds) {
        for (const id of prodIds) {
          if (id && !prod.includes(id)) {
            prod.push(id);
            added++;
          }
        }
      }
      
      if (added > 0) {
        data.zigbee.manufacturerName = mfr.filter(x => x);
        data.zigbee.productId = prod.filter(x => x);
        fs.writeFileSync(composePath, JSON.stringify(data, null, 2));
        this.stats.enriched++;
        this.stats.idsAdded += added;
        return added;
      }
    } catch (err) {
      this.log(`  ❌ Erreur ${targetDriver}: ${err.message}`, 'red');
    }
    
    return 0;
  }

  async run() {
    this.log('\n╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🔄 RECOVERY 26 DRIVERS MANUFACTURER IDs                         ║', 'magenta');
    this.log('║     Injection intelligente dans drivers UNBRANDED                   ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝\n', 'magenta');
    
    this.log('📦 Récupération + Injection manufacturer IDs:\n', 'cyan');
    
    for (const [source, data] of Object.entries(DELETED_DRIVERS_IDS)) {
      const added = this.enrichDriver(data.target, data.mfr, data.productId);
      if (added > 0) {
        this.log(`  ✅ ${data.target}: +${added} IDs récupérés`, 'green');
      }
    }
    
    this.log('\n═══════════════════════════════════════════════════════════════════════', 'magenta');
    this.log(`  ✅ Drivers enrichis: ${this.stats.enriched}`, 'green');
    this.log(`  ➕ IDs récupérés: ${this.stats.idsAdded}`, 'green');
    this.log('═══════════════════════════════════════════════════════════════════════\n', 'magenta');
    
    this.log('✅ RÉCUPÉRATION TERMINÉE!', 'green');
    this.log('ℹ️  Tous les IDs des 26 drivers sont maintenant dans les drivers UNBRANDED\n', 'cyan');
  }
}

if (require.main === module) {
  const recoverer = new RecoveryEnricher();
  recoverer.run().catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
}

module.exports = RecoveryEnricher;
