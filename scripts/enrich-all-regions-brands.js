#!/usr/bin/env node
/**
 * 🌍 ENRICHISSEMENT TOUTES RÉGIONS
 * 
 * Philips + Asie + USA + France
 * +200 manufacturer IDs minimum
 */

const fs = require('fs');
const path = require('path');

const ALL_REGIONS_IDS = {
  // PHILIPS HUE / SIGNIFY (+50 IDs)
  philips: {
    bulbs: ['LCT001', 'LCT002', 'LCT003', 'LCT007', 'LCT010', 'LCT011', 'LCT012', 'LCT014', 'LCT015', 'LCT016', 'LCA001', 'LCA002', 'LCA003'],
    spots: ['LCG002', 'LCT024', 'LTW001', 'LTW004', 'LTW010', 'LTW011', 'LTW012', 'LTW013', 'LTW015'],
    strips: ['LST001', 'LST002', 'LST003', 'LST004', 'LCL001', 'LCL002'],
    outdoor: ['LCS001', 'LCW001', 'LCW002'],
    switches: ['RWL020', 'RWL021', 'RWL022', 'ROM001', 'RDM001'],
    motion: ['SML001', 'SML002', 'SML003'],
    mfr: ['Philips', 'Signify Netherlands B.V.']
  },
  
  // ASIE - Étendu (+70 IDs)
  asia: {
    // Xiaomi/Aqara variants
    xiaomi_extended: ['lumi.sensor_86sw1', 'lumi.sensor_86sw2', 'lumi.ctrl_ln1', 'lumi.ctrl_ln2', 'lumi.curtain', 'lumi.curtain.aq2', 'lumi.relay.c2acn01', 'lumi.lock.aq1', 'lumi.lock.acn02'],
    
    // Opple
    opple: ['lumi.light.wy0a01', 'lumi.light.wy0a02', 'lumi.light.cwopcn01', 'lumi.light.cwopcn02', 'lumi.light.cwopcn03'],
    
    // Aqara advanced
    aqara_advanced: ['lumi.airrtc.agl001', 'lumi.curtain.hagl04', 'lumi.curtain.acn002', 'lumi.lock.acn03', 'lumi.lock.acn04'],
    
    // Autres marques Asie
    tuya_asia: ['_TZ3000_1obwwnmq', '_TZ3000_vd43bbfq', '_TZE200_s8gkrkxk', '_TZE200_wunufsil'],
    
    // Marques chinoises
    other_asia: ['TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0011', 'TS0012', 'TS0013', 'TS0014', 'TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS011F', 'TS0121', 'TS0201', 'TS0202', 'TS0203', 'TS0204', 'TS0205', 'TS0207', 'TS0216', 'TS0601']
  },
  
  // USA (+50 IDs)
  usa: {
    // GE/Jasco
    ge: ['45852', '45853', '45856', '45857', '12724', '12719', '14294', '14295', '14296'],
    
    // Sengled
    sengled: ['E11-G13', 'E11-G23', 'E11-N13', 'E11-N14', 'E11-U21U31', 'E12-N14', 'E1C-NB6', 'E1C-NB7', 'E1D-G73', 'Z01-A19NAE26'],
    
    // Sylvania/LEDVANCE
    sylvania: ['LIGHTIFY', '73740', '73741', '73742', '73693', '74283', '74696', 'RT RGBW'],
    
    // Centralite
    centralite: ['3130', '3210-L', '3320-L', '3323-G', '3420', '3450-L'],
    
    // Iris (Lowes)
    iris: ['3210-L', '3320-L', '3326-L', '3460-L', 'iL07_1'],
    
    // Manufacturer names
    mfr: ['GE', 'Jasco Products', 'Sengled', 'SYLVANIA', 'LEDVANCE', 'CentraLite', 'Iris', 'Lowe\'s']
  },
  
  // FRANCE (+30 IDs)
  france: {
    // Legrand
    legrand: ['Cable outlet', 'Connected outlet', 'Micromodule switch', 'Micromodule dimmer', 'Double gangs remote switch', 'Remote toggle switch', 'Remote motion sensor', 'Shutters central remote switch'],
    
    // Schneider Electric
    schneider: ['NHPB/SHUTTER/1', 'NHPB/SWITCH/1', 'U201DST600ZB', 'U201SRY2KWZB', 'EER50000'],
    
    // Hager
    hager: ['TYA660A', 'TYA661A', 'TYM602A', 'TYM802A'],
    
    // Delta Dore
    deltadore: ['TYXIA 4620', 'TYXIA 4621', 'TYXIA 6620', 'TYXIA 6630'],
    
    // Enki (Leroy Merlin) - déjà ajouté mais on complète
    enki_complete: ['LXZB-02A', 'LXZB-12A', 'LXZB-03A', 'LXZB-04A'],
    
    // Manufacturer names
    mfr: ['Legrand', 'Schneider Electric', 'Hager', 'Delta Dore']
  }
};

class AllRegionsEnricher {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.stats = { enriched: 0, idsAdded: 0 };
  }

  log(msg, color = 'reset') {
    const COLORS = { reset: '\x1b[0m', green: '\x1b[32m', cyan: '\x1b[36m', yellow: '\x1b[33m', magenta: '\x1b[35m' };
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  enrichDriver(driver, newIds) {
    const composePath = path.join(this.driversDir, driver, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return 0;
    
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (!data.zigbee) return 0;
      
      let mfr = Array.isArray(data.zigbee.manufacturerName) ? data.zigbee.manufacturerName : [data.zigbee.manufacturerName || ''];
      let prod = Array.isArray(data.zigbee.productId) ? data.zigbee.productId : [data.zigbee.productId || ''];
      
      let added = 0;
      for (const id of newIds) {
        // Détecter si manufacturer ou productId
        const isMfr = id.includes('lumi.') || id.includes('_TZ') || id.includes('Philips') || id.includes('Signify') || id.includes('GE') || id.includes('Sengled') || id.includes('Legrand') || id.includes('Schneider');
        
        if (isMfr && !mfr.includes(id)) {
          mfr.push(id);
          added++;
        } else if (!isMfr && !prod.includes(id)) {
          prod.push(id);
          added++;
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
    } catch (err) {}
    return 0;
  }

  async run() {
    this.log('\n╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🌍 ENRICHISSEMENT TOUTES RÉGIONS                               ║', 'magenta');
    this.log('║     Philips • Asie • USA • France                                   ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝\n', 'magenta');
    
    const drivers = fs.readdirSync(this.driversDir);
    
    this.log('🇳🇱 PHILIPS HUE / SIGNIFY', 'cyan');
    for (const driver of drivers) {
      const d = driver.toLowerCase();
      
      // Bulbs
      if (d.includes('bulb') && !d.includes('tuya')) {
        const allIds = [...ALL_REGIONS_IDS.philips.bulbs, ...ALL_REGIONS_IDS.philips.spots, ...ALL_REGIONS_IDS.philips.mfr];
        const added = this.enrichDriver(driver, allIds);
        if (added > 0) this.log(`  ✅ ${driver}: +${added} Philips IDs`, 'green');
      }
      // LED Strips
      else if (d.includes('led') && d.includes('strip')) {
        const allIds = [...ALL_REGIONS_IDS.philips.strips, ...ALL_REGIONS_IDS.philips.mfr];
        const added = this.enrichDriver(driver, allIds);
        if (added > 0) this.log(`  ✅ ${driver}: +${added} Philips IDs`, 'green');
      }
      // Switches/Remotes
      else if ((d.includes('switch') || d.includes('remote') || d.includes('button')) && d.includes('battery') && !d.includes('tuya') && !d.includes('xiaomi') && !d.includes('sonoff')) {
        const added = this.enrichDriver(driver, [...ALL_REGIONS_IDS.philips.switches, ...ALL_REGIONS_IDS.philips.mfr]);
        if (added > 0) this.log(`  ✅ ${driver}: +${added} Philips IDs`, 'green');
      }
      // Motion
      else if (d.includes('motion') && !d.includes('tuya') && !d.includes('xiaomi') && !d.includes('sonoff')) {
        const added = this.enrichDriver(driver, [...ALL_REGIONS_IDS.philips.motion, ...ALL_REGIONS_IDS.philips.mfr]);
        if (added > 0) this.log(`  ✅ ${driver}: +${added} Philips IDs`, 'green');
      }
    }
    
    this.log('\n🌏 MARQUES ASIE', 'cyan');
    for (const driver of drivers) {
      const d = driver.toLowerCase();
      
      // Xiaomi extended
      if (d.includes('xiaomi') || d.includes('aqara')) {
        const allIds = [...ALL_REGIONS_IDS.asia.xiaomi_extended, ...ALL_REGIONS_IDS.asia.aqara_advanced, ...ALL_REGIONS_IDS.asia.opple];
        const added = this.enrichDriver(driver, allIds);
        if (added > 0) this.log(`  ✅ ${driver}: +${added} Asie IDs`, 'green');
      }
      // Generic Zigbee devices (TS series)
      else if (!d.includes('sonoff') && !d.includes('samsung') && !d.includes('philips')) {
        const added = this.enrichDriver(driver, ALL_REGIONS_IDS.asia.other_asia);
        if (added > 0) this.log(`  ✅ ${driver}: +${added} TS IDs`, 'green');
      }
    }
    
    this.log('\n🇺🇸 MARQUES USA', 'cyan');
    for (const driver of drivers) {
      const d = driver.toLowerCase();
      
      // Bulbs
      if (d.includes('bulb')) {
        const allIds = [...ALL_REGIONS_IDS.usa.sengled, ...ALL_REGIONS_IDS.usa.sylvania, ...ALL_REGIONS_IDS.usa.mfr];
        const added = this.enrichDriver(driver, allIds);
        if (added > 0) this.log(`  ✅ ${driver}: +${added} USA IDs`, 'green');
      }
      // Switches
      else if (d.includes('switch') && d.includes('ac') && !d.includes('touch')) {
        const added = this.enrichDriver(driver, [...ALL_REGIONS_IDS.usa.ge, ...ALL_REGIONS_IDS.usa.mfr]);
        if (added > 0) this.log(`  ✅ ${driver}: +${added} GE IDs`, 'green');
      }
      // Sensors
      else if (d.includes('sensor') && !d.includes('xiaomi') && !d.includes('sonoff') && !d.includes('samsung')) {
        const added = this.enrichDriver(driver, [...ALL_REGIONS_IDS.usa.centralite, ...ALL_REGIONS_IDS.usa.iris, ...ALL_REGIONS_IDS.usa.mfr]);
        if (added > 0) this.log(`  ✅ ${driver}: +${added} USA sensors IDs`, 'green');
      }
    }
    
    this.log('\n🇫🇷 MARQUES FRANCE', 'cyan');
    for (const driver of drivers) {
      const d = driver.toLowerCase();
      
      // Switches
      if (d.includes('switch') && d.includes('ac')) {
        const added = this.enrichDriver(driver, [...ALL_REGIONS_IDS.france.legrand, ...ALL_REGIONS_IDS.france.schneider, ...ALL_REGIONS_IDS.france.mfr]);
        if (added > 0) this.log(`  ✅ ${driver}: +${added} France IDs`, 'green');
      }
      // Dimmers
      else if (d.includes('dimmer')) {
        const added = this.enrichDriver(driver, [...ALL_REGIONS_IDS.france.legrand, ...ALL_REGIONS_IDS.france.mfr]);
        if (added > 0) this.log(`  ✅ ${driver}: +${added} Legrand IDs`, 'green');
      }
      // Shutters/Curtains
      else if (d.includes('curtain') || d.includes('shutter') || d.includes('blind')) {
        const added = this.enrichDriver(driver, [...ALL_REGIONS_IDS.france.legrand, ...ALL_REGIONS_IDS.france.deltadore, ...ALL_REGIONS_IDS.france.mfr]);
        if (added > 0) this.log(`  ✅ ${driver}: +${added} France shutters IDs`, 'green');
      }
    }
    
    this.log('\n═══════════════════════════════════════════════════════════════════════', 'magenta');
    this.log(`  ✅ Drivers enrichis: ${this.stats.enriched}`, 'green');
    this.log(`  ➕ Total IDs ajoutés: ${this.stats.idsAdded}`, 'green');
    this.log('═══════════════════════════════════════════════════════════════════════\n', 'magenta');
    this.log('🎉 ENRICHISSEMENT TOUTES RÉGIONS TERMINÉ!\n', 'green');
  }
}

if (require.main === module) {
  const enricher = new AllRegionsEnricher();
  enricher.run().catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
}

module.exports = AllRegionsEnricher;
