'use strict';

/**
 * Script to merge branded drivers into generic unbranded categories
 * and enrich manufacturer IDs
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Mapping of branded drivers to their generic counterparts
const MERGE_MAP = {
  // Lidl/Silvercrest
  'lidl_smart_plug': {
    target: 'plug_smart',
    manufacturerIds: ['_TZ3000_kdi2o9m6', '_TZ3000_plyvnuf5', '_TZ3000_wamqdr3f', '_TZ3000_00mk2xzy', 'LIDL Silvercrest', 'Silvercrest'],
    productIds: ['HG06337', 'HG06338', 'HG08673']
  },
  'lidl_motion_sensor': {
    target: 'motion_sensor',
    manufacturerIds: ['_TZ3000_6ygjfyll', 'LIDL Silvercrest', 'Silvercrest'],
    productIds: ['HG06335', 'HG08164']
  },
  'lidl_contact_sensor': {
    target: 'contact_sensor',
    manufacturerIds: ['_TZ3000_decxrtwa', '_TZ3000_2mbfxlzr', 'LIDL Silvercrest', 'Silvercrest'],
    productIds: ['HG06336']
  },
  'lidl_bulb_color': {
    target: 'bulb_rgbw',
    manufacturerIds: ['_TZ3000_49qchf10', '_TZ3210_sln7ah6r', '_TZ3210_wuheik5l', 'LIDL Silvercrest', 'Silvercrest'],
    productIds: ['HG06106A', 'HG06106B', 'HG06106C', 'HG06492A', 'HG06492B', 'HG06492C', 'HG06467', 'HG07834A', 'HG07834B']
  },

  // Aqara
  'aqara_motion_sensor': {
    target: 'motion_sensor',
    manufacturerIds: ['LUMI', 'lumi', 'Xiaomi', 'aqara'],
    productIds: ['lumi.sensor_motion', 'lumi.sensor_motion.aq2', 'RTCGQ11LM', 'RTCGQ01LM']
  },
  'aqara_contact_sensor': {
    target: 'contact_sensor',
    manufacturerIds: ['LUMI', 'lumi', 'Xiaomi', 'aqara'],
    productIds: ['lumi.sensor_magnet', 'lumi.sensor_magnet.aq2', 'MCCGQ11LM', 'MCCGQ01LM']
  },
  'aqara_climate_sensor': {
    target: 'climate_sensor',
    manufacturerIds: ['LUMI', 'lumi', 'Xiaomi', 'aqara'],
    productIds: ['lumi.weather', 'lumi.sensor_ht', 'WSDCGQ11LM', 'WSDCGQ01LM']
  },
  'aqara_presence_fp1': {
    target: 'presence_sensor',
    manufacturerIds: ['LUMI', 'lumi', 'aqara'],
    productIds: ['lumi.motion.agl001', 'RTCZCGQ11LM']
  },

  // Philips Hue
  'philips_hue_bulb': {
    target: 'bulb_rgbw',
    manufacturerIds: ['Philips', 'Signify Netherlands B.V.'],
    productIds: ['LCT001', 'LCT007', 'LCT010', 'LCT014', 'LCT015', 'LCT016', 'LCA001', 'LCA002', 'LCA003']
  },
  'philips_hue_motion': {
    target: 'motion_sensor',
    manufacturerIds: ['Philips', 'Signify Netherlands B.V.'],
    productIds: ['SML001', 'SML002', 'SML003', 'SML004']
  },
  'philips_hue_dimmer': {
    target: 'dimmer_wireless',
    manufacturerIds: ['Philips', 'Signify Netherlands B.V.'],
    productIds: ['RWL020', 'RWL021', 'RWL022']
  },

  // IKEA
  'ikea_motion_sensor': {
    target: 'motion_sensor',
    manufacturerIds: ['IKEA of Sweden', 'IKEA'],
    productIds: ['TRADFRI motion sensor', 'E1525', 'E1745']
  },
  'ikea_tradfri_bulb': {
    target: 'bulb_rgbw',
    manufacturerIds: ['IKEA of Sweden', 'IKEA'],
    productIds: ['TRADFRI bulb E27 CWS opal 600lm', 'TRADFRI bulb E14 WS opal 400lm', 'LED1624G9', 'LED1649C5']
  },

  // BlitzWolf
  'blitzwolf_smart_plug': {
    target: 'plug_smart',
    manufacturerIds: ['_TZ3000_okaz9tjs', '_TZ3000_typdpbpg', '_TZ3000_cphmq0q7', 'BlitzWolf'],
    productIds: ['BW-SHP13', 'BW-SHP15', 'TS0121']
  },

  // MOES
  'moes_smart_knob': {
    target: 'smart_knob_ts004f',
    manufacturerIds: ['_TZ3000_4fjiwweb', '_TZ3000_uri7ber7', '_TZ3000_ixla93vd', 'MOES'],
    productIds: ['TS004F', 'ERS-10TZBVK-AA']
  },
  'moes_co_detector': {
    target: 'gas_detector',
    manufacturerIds: ['_TZE200_m6kdujme', '_TZE200_5d3vhjro', 'MOES'],
    productIds: ['TS0601', 'CO-Detector']
  },

  // Shelly
  'shelly_door_window': {
    target: 'contact_sensor',
    manufacturerIds: ['Shelly', 'Allterco'],
    productIds: ['SHDW-1', 'SHDW-2']
  },
  'shelly_zigbee_switch': {
    target: 'switch_smart_1gang',
    manufacturerIds: ['Shelly', 'Allterco'],
    productIds: ['SHSW-1', 'Shelly1']
  },

  // Sonoff
  'sonoff_switch': {
    target: 'switch_smart_1gang',
    manufacturerIds: ['SONOFF', 'eWeLink'],
    productIds: ['BASICZBR3', 'ZBMINI', 'ZBMINIL2', 'S31ZB']
  },

  // Zemismart
  'zemismart_switch': {
    target: 'switch_smart_1gang',
    manufacturerIds: ['_TZ3000_7ysdnebc', '_TZ3000_ksw8qtmt', 'Zemismart'],
    productIds: ['ZM-CSW002-D', 'TS0001', 'TS0011']
  }
};

function readDriverConfig(driverName) {
  const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function writeDriverConfig(driverName, config) {
  const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

function mergeArrays(target, source) {
  const set = new Set(target);
  source.forEach(item => set.add(item));
  return Array.from(set);
}

function mergeDriver(sourceName, mergeInfo) {
  const { target, manufacturerIds, productIds } = mergeInfo;

  const targetConfig = readDriverConfig(target);
  if (!targetConfig) {
    console.log(`❌ Target driver ${target} not found, skipping ${sourceName}`);
    return false;
  }

  // Merge manufacturer IDs
  if (targetConfig.zigbee && targetConfig.zigbee.manufacturerName) {
    targetConfig.zigbee.manufacturerName = mergeArrays(
      targetConfig.zigbee.manufacturerName,
      manufacturerIds
    );
  }

  // Merge product IDs
  if (targetConfig.zigbee && targetConfig.zigbee.productId) {
    targetConfig.zigbee.productId = mergeArrays(
      targetConfig.zigbee.productId,
      productIds
    );
  }

  writeDriverConfig(target, targetConfig);
  console.log(`✅ Merged ${sourceName} → ${target}`);
  console.log(`   + ${manufacturerIds.length} manufacturer IDs`);
  console.log(`   + ${productIds.length} product IDs`);

  return true;
}

function deleteDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  if (fs.existsSync(driverPath)) {
    fs.rmSync(driverPath, { recursive: true, force: true });
    console.log(`🗑️  Deleted branded driver: ${driverName}`);
    return true;
  }
  return false;
}

function main() {
  console.log('🔄 MERGING BRANDED DRIVERS INTO GENERIC CATEGORIES\n');
  console.log('='.repeat(60));

  let merged = 0;
  let deleted = 0;
  let skipped = 0;

  for (const [sourceName, mergeInfo] of Object.entries(MERGE_MAP)) {
    const sourcePath = path.join(DRIVERS_DIR, sourceName);

    if (!fs.existsSync(sourcePath)) {
      console.log(`⏭️  ${sourceName} already removed or not found`);
      skipped++;
      continue;
    }

    console.log(`\n📦 Processing: ${sourceName}`);

    if (mergeDriver(sourceName, mergeInfo)) {
      merged++;
      if (deleteDriver(sourceName)) {
        deleted++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 SUMMARY:`);
  console.log(`   ✅ Merged: ${merged} drivers`);
  console.log(`   🗑️  Deleted: ${deleted} branded drivers`);
  console.log(`   ⏭️  Skipped: ${skipped} (already processed)`);
  console.log('\n✨ Done! Branded drivers merged into generic categories.');
}

main();
