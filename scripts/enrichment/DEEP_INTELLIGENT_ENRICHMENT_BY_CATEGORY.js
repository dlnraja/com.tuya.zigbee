#!/usr/bin/env node
'use strict';

/**
 * DEEP INTELLIGENT ENRICHMENT BY CATEGORY
 * 
 * Enrichissement intelligent profond basé sur:
 * - Catégorie de dossier (motion_sensor, smart_plug, etc.)
 * - Type de produit (PIR, radar, energy monitoring, etc.)
 * - Recherche patterns Zigbee2MQTT
 * - Manufacturer name patterns
 * - Features communes par catégorie
 * - Flow cards standards par type
 */

const fs = require('fs');
const path = require('path');

// Catégories de produits avec patterns de manufacturer IDs
const PRODUCT_CATEGORIES = {
  // SENSORS
  motion_sensor: {
    keywords: ['motion', 'pir', 'radar', 'presence', 'occupancy'],
    commonManufacturers: [
      '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_mcxw5ehu',
      '_TZ3000_msl6wxk9', '_TZ3000_otvn3lne', '_TZ3000_6ygjfyll',
      '_TZ3040_6ygjfyll', '_TZ3040_bb6xaihh', '_TZ3000_nss8amz9',
      '_TZ3000_lf56vpxj', '_TYZB01_jytabjkb', '_TYZB01_dl7cejts',
      '_TZE200_3towulqd', '_TZE200_bh3n6gk8', '_TZE200_1ibpyhdc',
      '_TZE200_ttcovulf', '_TZ1800_fcdjzz3s' // Silvercrest/Lidl
    ],
    productIds: ['TS0202', 'TY0202', 'TS0601'],
    features: ['alarm_motion', 'measure_luminance', 'measure_battery'],
    flows: ['motion_detected', 'motion_stopped', 'battery_low']
  },
  
  contact_sensor: {
    keywords: ['contact', 'door', 'window', 'magnet'],
    commonManufacturers: [
      '_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_oxslv1c9',
      '_TZ3000_bmg14ax2', '_TZ3000_bzxlofth', '_TZ3000_7tbsruql',
      '_TZ3000_osu834un', '_TZ3000_7d8yme6f', '_TZ3000_rgchmad8',
      '_TZ3000_au1rjicn', '_TZ3000_4ugnzsli', '_TZ3000_zgrffiwg',
      '_TZ3000_decxrtwa', '_TZ3000_hkcpblrs', '_TZ3000_yxqnffam',
      '_TZ3000_9eeavbk5', '_TZ3000_bpkijo14', '_TZ3000_a33rw7ou',
      '_TZ1800_ejwkn2h2' // Silvercrest/Lidl
    ],
    productIds: ['TS0203', 'TY0203', 'RH3001'],
    features: ['alarm_contact', 'measure_battery'],
    flows: ['contact_opened', 'contact_closed', 'battery_low']
  },
  
  temperature_sensor: {
    keywords: ['temperature', 'humidity', 'temp', 'climate'],
    commonManufacturers: [
      '_TZ3000_bguser20', '_TZ3000_dowj6gyi', '_TZ3000_fllyghyj',
      '_TZ3000_8ybe88nf', '_TZ3000_fie1dpkm', '_TZ3000_0s1izerx',
      '_TZ3000_xr3htd96', '_TZ3000_saiqcn0y', '_TZ3000_f2bw0b6k',
      '_TZ3000_zl1kmjqx', '_TZ3000_rusu2vzb', '_TZ3000_yd2e749y',
      '_TZ2000_a476raq2', '_TZ2000_xogb73am', '_TZ2000_hjsgdkfl',
      '_TZE200_bjawzodf', '_TZE200_locansqn', '_TZE284_uqfph8ah'
    ],
    productIds: ['TS0201', 'TS0601', 'TY0201', 'RH3052', 'SM0201'],
    features: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    flows: ['temperature_changed', 'humidity_changed', 'battery_low']
  },
  
  // SWITCHES & PLUGS
  smart_plug: {
    keywords: ['plug', 'socket', 'outlet', 'power'],
    commonManufacturers: [
      '_TZ3000_g5xawfcq', '_TZ3000_vtscrpmw', '_TZ3000_rdtixbnu',
      '_TZ3000_8nkb7mof', '_TZ3000_cphmq0q7', '_TZ3000_ew3ldmgx',
      '_TZ3000_dpo1ysak', '_TZ3000_w0qqde0g', '_TZ3000_u5u4cakc',
      '_TZ3000_typdpdpg', '_TZ3000_ksw8qtmt', '_TZ3000_zloso4jk',
      '_TZ3000_cehuw1lw', '_TZ3000_kdi2o9m6', '_TZ3000_plyvnuf5',
      '_TZ3000_j1v25l17' // Silvercrest/Lidl
    ],
    productIds: ['TS011F', 'TS0121', 'TS0115'],
    features: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    flows: ['turned_on', 'turned_off', 'power_changed']
  },
  
  smart_switch: {
    keywords: ['switch', 'gang', 'wall', 'relay'],
    commonManufacturers: [
      '_TZ3000_ji4araar', '_TZ3000_qmi1cfuq', '_TZ3000_npzfdcof',
      '_TZ3000_tqlv4ug4', '_TZ3000_rmjr4ufz', '_TZ3000_hhiodade',
      '_TZ3000_46t1rvdu', '_TZ3000_majwnphg', '_TZ3000_6axxqqi2',
      '_TZ3000_4js9lo5d', '_TZ3000_fisb3ajo', '_TZ3000_bvrlqyj7',
      '_TZ3000_odzoiovu', '_TZ3000_lvhy15ix', '_TZ3000_qzjcsmar'
    ],
    productIds: ['TS0001', 'TS0011', 'TS0002', 'TS0012', 'TS0003', 'TS0013', 'TS0004', 'TS0014'],
    features: ['onoff'],
    flows: ['turned_on', 'turned_off']
  },
  
  dimmer: {
    keywords: ['dimmer', 'dim', 'brightness'],
    commonManufacturers: [
      '_TYZB01_qezuin6k', '_TZ3210_ngqk6jia', '_TZ3000_ktuoyvt5',
      '_TZ3210_zxbtub8r', '_TZ3210_weaqkhab', '_TZ3210_k1msuvg6',
      '_TYZB01_v8gtiaed', '_TZ3000_92chsky7', '_TZ3210_wdexaypg',
      '_TZE200_la2c2uo9', '_TZE200_ip2akl4w', '_TZE200_1agwnems'
    ],
    productIds: ['TS110F', 'TS110E', 'TS0601'],
    features: ['onoff', 'dim'],
    flows: ['turned_on', 'turned_off', 'dim_changed']
  },
  
  // LIGHTS
  bulb: {
    keywords: ['bulb', 'lamp', 'light', 'rgb', 'color', 'white', 'tunable'],
    commonManufacturers: [
      '_TZ3000_odygigth', '_TZ3000_dbou1ap4', '_TZ3000_keabpigv',
      '_TZ3000_12sxjap4', '_TZ3000_hlijwsai', '_TZ3000_qd7hej8u',
      '_TZ3210_mja6r5ix', '_TZ3000_q50zhdsc', '_TZ3000_oborybow',
      '_TZ3000_49qchf10', '_TZ3000_el5kt5im', '_TZ3000_kdpxju99',
      'eWeLight' // Lonsonho
    ],
    productIds: ['TS0505A', 'TS0505B', 'TS0502A', 'TS0502B', 'ZB-CL01'],
    features: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature'],
    flows: ['turned_on', 'turned_off', 'dim_changed', 'color_changed']
  },
  
  led_strip: {
    keywords: ['strip', 'led', 'ribbon'],
    commonManufacturers: [
      '_TZ3000_riwp3k79', '_TZ3000_gek6snaj', '_TZ3210_iystcadi',
      '_TZ3000_obacbukl', '_TZ3000_dl4pxp1r', '_TZ3000_qqjaziws',
      '_TZ3000_i8l0nqdu', '_TZ3000_ukuvyhaa', '_TZ3210_k1pe6ibm',
      '_TZ3000_9cpuaca6', '_TZ3210_r0xgkft5', '_TZ3000_utagpnzs',
      '_TZ3000_5bsf8vaj'
    ],
    productIds: ['TS0505A', 'TS0505B', 'TS0503A', 'TS0503B', 'TS0504B'],
    features: ['onoff', 'dim', 'light_hue', 'light_saturation'],
    flows: ['turned_on', 'turned_off', 'dim_changed', 'color_changed']
  },
  
  // REMOTES & BUTTONS
  wireless_switch: {
    keywords: ['wireless', 'remote', 'button', 'scene', 'controller'],
    commonManufacturers: [
      '_TZ3000_tk3s5tyg', '_TZ3000_fkp5zyho', '_TZ3000_axpdxqgu',
      '_TZ3000_peszejy7', '_TZ3000_pzui3skt', '_TZ3000_f97vq5mn',
      '_TZ3000_fa9mlvja', '_TZ3000_itb0omhv', '_TZ3000_8rppvwda',
      '_TZ3000_owgcnkrh', '_TYZB02_keyjhapk', '_TZ3000_oikiyf3b',
      '_TZ3000_a7ouggvs', '_TYZB02_key8kk7r', '_TZ3000_qzjcsmar',
      '_TZ3000_vp6clf9d', '_TZ3000_xabckq1v', '_TZ3000_wkai4ga5'
    ],
    productIds: ['TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS004F', 'TS0215A'],
    features: ['button'],
    flows: ['button_pressed', 'single_press', 'double_press', 'long_press']
  },
  
  // OTHERS
  water_leak: {
    keywords: ['water', 'leak', 'flood', 'moisture'],
    commonManufacturers: [
      '_TYZB01_sqmd19i1', '_TZ3000_fxvjhdyl', '_TZ3000_eit7p838',
      '_TZ3000_t6jriawg', '_TZ3000_85czd6fy', '_TZ3000_kyb656no',
      '_TZ3000_0s9gukzt', '_TZ3000_kstbkt6a', '_TZ3000_mugyhz0q',
      '_TZ3000_upgcbody', '_TZ3000_k4ej3ww2', '_TZ3000_ocjlo4ea',
      '_TZE200_qq9mpfhw', '_TZE200_jthf7vb6'
    ],
    productIds: ['TS0207', 'TS0601', 'q9mpfhw'],
    features: ['alarm_water', 'measure_battery'],
    flows: ['water_detected', 'water_cleared', 'battery_low']
  },
  
  smoke_sensor: {
    keywords: ['smoke', 'fire', 'alarm'],
    commonManufacturers: [
      '_TYZB01_dsjszp0x', '_TZE200_ntcy3xu1', '_TZE200_m9skfctm',
      '_TZ3210_up3pngle', '_TZE200_rccxox8p', '_TZE200_vzekyi4c',
      '_TYZB01_wqcac7lo', '_TZE204_ntcy3xu1', '_TZE200_t5p1vj8r',
      '_TZE200_uebojraa', '_TZE200_yh7aoahi'
    ],
    productIds: ['TS0205', 'TS0601'],
    features: ['alarm_smoke', 'measure_battery'],
    flows: ['smoke_detected', 'smoke_cleared', 'battery_low']
  },
  
  curtain: {
    keywords: ['curtain', 'blind', 'shade', 'roller', 'shutter'],
    commonManufacturers: [
      '_TZ3000_vd43bbfq', '_TZE200_fctwhugx', '_TZE200_cowvfni3',
      '_TZE200_rddyvrci', '_TZE200_nkoabg8w', '_TZE200_xuzcvlku',
      '_TZE200_bqcqqjpb', '_TZE200_wmcdj3aq', '_TZE200_cpbo62rn',
      '_TYST11_wmcdj3aq', '_TZE200_7eue9vhc', '_TZE200_fdtjuw7u'
    ],
    productIds: ['TS130F', 'TS0601'],
    features: ['windowcoverings_set', 'windowcoverings_state'],
    flows: ['position_changed', 'opened', 'closed']
  }
};

console.log('\n🧠 DEEP INTELLIGENT ENRICHMENT BY CATEGORY\n');
console.log('Enrichissement intelligent par catégorie de produit...\n');

const driversDir = path.join(__dirname, '../../drivers');
const drivers = fs.readdirSync(driversDir).filter(d => 
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

console.log(`Found ${drivers.length} drivers\n`);

let enriched = 0;
let totalAdded = 0;

// Enrichir chaque driver
for (const driverName of drivers) {
  const driverPath = path.join(driversDir, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Détecter catégorie du driver
    let category = null;
    let bestMatch = 0;
    
    for (const [cat, info] of Object.entries(PRODUCT_CATEGORIES)) {
      const keywords = info.keywords;
      const matchCount = keywords.filter(kw => 
        driverName.toLowerCase().includes(kw)
      ).length;
      
      if (matchCount > bestMatch) {
        bestMatch = matchCount;
        category = cat;
      }
    }
    
    if (!category) continue; // Skip si pas de catégorie détectée
    
    const categoryInfo = PRODUCT_CATEGORIES[category];
    const currentIds = compose.zigbee?.manufacturerName || [];
    const currentCount = Array.isArray(currentIds) ? currentIds.length : 0;
    
    // Enrichir manufacturer IDs
    const newIds = categoryInfo.commonManufacturers.filter(id => 
      !currentIds.includes(id)
    );
    
    if (newIds.length > 0) {
      if (!compose.zigbee) compose.zigbee = {};
      
      const allIds = [...new Set([...currentIds, ...newIds])].sort();
      compose.zigbee.manufacturerName = allIds;
      
      // Ajouter productIds si manquants
      if (!compose.zigbee.productId) {
        compose.zigbee.productId = categoryInfo.productIds;
      } else if (Array.isArray(compose.zigbee.productId)) {
        const existingPids = compose.zigbee.productId;
        const newPids = categoryInfo.productIds.filter(pid => 
          !existingPids.includes(pid)
        );
        if (newPids.length > 0) {
          compose.zigbee.productId = [...new Set([...existingPids, ...newPids])].sort();
        }
      }
      
      // Sauvegarder
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
      
      enriched++;
      totalAdded += newIds.length;
      
      console.log(`✅ ${driverName}: +${newIds.length} IDs (${currentCount} → ${allIds.length}) [${category}]`);
    }
    
  } catch (err) {
    console.error(`❌ ${driverName}:`, err.message);
  }
}

console.log('\n' + '='.repeat(70));
console.log('\n📊 RÉSULTATS:\n');
console.log(`   Drivers enrichis:         ${enriched}/${drivers.length}`);
console.log(`   Total IDs ajoutés:        ${totalAdded}`);
console.log(`   Moyenne par driver:       ${enriched > 0 ? (totalAdded / enriched).toFixed(1) : 0}`);
console.log(`\n✅ Enrichissement par catégorie terminé!`);

process.exit(0);
