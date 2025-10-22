#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DRIVERS = path.join(ROOT, 'drivers');
const LOG = path.join(ROOT, 'ultra_enrichment_log.txt');

// Base de données ultra-complète d'IDs de fabricant par catégorie
const MANUFACTURER_DATABASE = {
  motion_sensor: [
    '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_mcxw5ehu', '_TZ3000_msl6wxk9',
    '_TZ3000_otvn3lne', '_TZ3000_6ygjfyll', '_TZ3040_6ygjfyll', '_TZ3040_bb6xaihh',
    '_TZ3000_nss8amz9', '_TZ3000_lf56vpxj', '_TYZB01_jytabjkb', '_TYZB01_dl7cejts',
    '_TZE200_3towulqd', '_TZE200_bh3n6gk8', '_TZE200_1ibpyhdc', '_TZE200_ttcovulf',
    '_TZ1800_fcdjzz3s', '_TZ3000_hgu1dlak', '_TZ3000_hktqahrq', '_TZ3000_h4wnrtck',
    '_TZ3000_jmrgyl7o', '_TZ3000_kky16aay', '_TZ3000_oikiyf3b', '_TZ3000_pcqjmcud',
    '_TZ3040_wqmtjsyk', '_TZE200_7hfcudw5', '_TZE200_ar0slwnd', '_TZE200_auin8mzr',
    'lumi.sensor_motion', 'lumi.motion.agl04', 'lumi.motion.ac01', 'lumi.motion.ac02',
    'SNZB-03', 'SNZB-03P', '3315-S', '3315-G'
  ],
  
  contact_sensor: [
    '_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_oxslv1c9', '_TZ3000_bmg14ax2',
    '_TZ3000_bzxlofth', '_TZ3000_7tbsruql', '_TZ3000_osu834un', '_TZ3000_7d8yme6f',
    '_TZ3000_rgchmad8', '_TZ3000_au1rjicn', '_TZ3000_4ugnzsli', '_TZ3000_zgrffiwg',
    '_TZ3000_decxrtwa', '_TZ3000_hkcpblrs', '_TZ3000_yxqnffam', '_TZ3000_9eeavbk5',
    '_TZ1800_ejwkn2h2', '_TZ3000_2mbfxlzr', '_TZ3000_402jjyro', '_TZ3000_a33rw7ou',
    'lumi.sensor_magnet', 'lumi.sensor_magnet.aq2', 'SNZB-04', '3321-S', '3321-G'
  ],
  
  temp_humidity: [
    '_TZ3000_bguser20', '_TZ3000_dowj6gyi', '_TZ3000_fllyghyj', '_TZ3000_8ybe88nf',
    '_TZ3000_fie1dpkm', '_TZ3000_0s1izerx', '_TZ3000_xr3htd96', '_TZ3000_saiqcn0y',
    '_TZ3000_f2bw0b6k', '_TZ3000_zl1kmjqx', '_TZ3000_rusu2vzb', '_TZ3000_yd2e749y',
    '_TZ2000_a476raq2', '_TZ2000_xogb73am', '_TZ2000_hjsgdkfl', '_TZE200_bjawzodf',
    '_TZE200_locansqn', '_TZE284_uqfph8ah', '_TZE200_qoy0ekbd', '_TZE200_dwcarsat',
    'lumi.sensor_ht', 'lumi.weather', 'SNZB-02', 'WSDCGQ11LM', 'WSDCGQ12LM'
  ],
  
  smart_plug: [
    '_TZ3000_g5xawfcq', '_TZ3000_vtscrpmw', '_TZ3000_rdtixbnu', '_TZ3000_8nkb7mof',
    '_TZ3000_cphmq0q7', '_TZ3000_ew3ldmgx', '_TZ3000_dpo1ysak', '_TZ3000_w0qqde0g',
    '_TZ3000_u5u4cakc', '_TZ3000_typdpdpg', '_TZ3000_ksw8qtmt', '_TZ3000_zloso4jk',
    '_TZ3000_cehuw1lw', '_TZ3000_kdi2o9m6', '_TZ3000_plyvnuf5', '_TZ3000_j1v25l17',
    '_TZ3000_1obwwnmq', '_TZ3000_2putqrmw', '_TZ3000_3ooaz3ng', '_TZ3000_8lkizccl',
    'lumi.plug', 'lumi.plug.mmeu01', 'ZNCZ02LM', 'SP120', 'SP220'
  ],
  
  smart_switch: [
    '_TZ3000_ji4araar', '_TZ3000_qmi1cfuq', '_TZ3000_npzfdcof', '_TZ3000_tqlv4ug4',
    '_TZ3000_rmjr4ufz', '_TZ3000_hhiodade', '_TZ3000_46t1rvdu', '_TZ3000_majwnphg',
    '_TZ3000_6axxqqi2', '_TZ3000_4js9lo5d', '_TZ3000_fisb3ajo', '_TZ3000_bvrlqyj7',
    '_TZ3000_odzoiovu', '_TZ3000_lvhy15ix', '_TZ3000_qzjcsmar', '_TZ3000_skueekg3',
    'lumi.ctrl_ln1', 'lumi.ctrl_ln2', 'lumi.ctrl_neutral1', 'lumi.ctrl_neutral2'
  ],
  
  dimmer: [
    '_TYZB01_qezuin6k', '_TZ3210_ngqk6jia', '_TZ3000_ktuoyvt5', '_TZ3210_zxbtub8r',
    '_TZ3210_weaqkhab', '_TZ3210_k1msuvg6', '_TYZB01_v8gtiaed', '_TZ3000_92chsky7',
    '_TZ3210_wdexaypg', '_TZE200_la2c2uo9', '_TZE200_ip2akl4w', '_TZE200_1agwnems',
    'lumi.light.aqcn02', 'lumi.light.cb2acn', 'ZNLDP12LM'
  ],
  
  bulb: [
    '_TZ3000_odygigth', '_TZ3000_dbou1ap4', '_TZ3000_keabpigv', '_TZ3000_12sxjap4',
    '_TZ3000_hlijwsai', '_TZ3000_qd7hej8u', '_TZ3210_mja6r5ix', '_TZ3000_q50zhdsc',
    '_TZ3000_oborybow', '_TZ3000_49qchf10', '_TZ3000_el5kt5im', '_TZ3000_kdpxju99',
    'eWeLight', 'lumi.light.cwopcn02', 'lumi.light.cwopcn03'
  ],
  
  led_strip: [
    '_TZ3000_riwp3k79', '_TZ3000_gek6snaj', '_TZ3210_iystcadi', '_TZ3000_obacbukl',
    '_TZ3000_dl4pxp1r', '_TZ3000_qqjaziws', '_TZ3000_i8l0nqdu', '_TZ3000_ukuvyhaa',
    '_TZ3210_k1pe6ibm', '_TZ3000_9cpuaca6', '_TZ3210_r0xgkft5', '_TZ3000_utagpnzs'
  ],
  
  curtain: [
    '_TZ3000_vd43bbfq', '_TZE200_fctwhugx', '_TZE200_cowvfni3', '_TZE200_rddyvrci',
    '_TZE200_nkoabg8w', '_TZE200_xuzcvlku', '_TZE200_bqcqqjpb', '_TZE200_wmcdj3aq',
    '_TZE200_cpbo62rn', '_TYST11_wmcdj3aq', '_TZE200_7eue9vhc', '_TZE200_fdtjuw7u',
    'lumi.curtain', 'lumi.curtain.aq2', 'lumi.curtain.hagl04'
  ],
  
  wireless_switch: [
    '_TZ3000_tk3s5tyg', '_TZ3000_fkp5zyho', '_TZ3000_axpdxqgu', '_TZ3000_peszejy7',
    '_TZ3000_pzui3skt', '_TZ3000_f97vq5mn', '_TZ3000_fa9mlvja', '_TZ3000_itb0omhv',
    '_TZ3000_8rppvwda', '_TZ3000_owgcnkrh', '_TYZB02_keyjhapk', '_TZ3000_oikiyf3b',
    '_TZ3000_a7ouggvs', '_TYZB02_key8kk7r', '_TZ3000_vp6clf9d', '_TZ3000_xabckq1v',
    'lumi.remote.b186acn01', 'lumi.remote.b286acn01', 'WXKG01LM', 'WXKG02LM'
  ],
  
  water_leak: [
    '_TYZB01_sqmd19i1', '_TZ3000_fxvjhdyl', '_TZ3000_eit7p838', '_TZ3000_t6jriawg',
    '_TZ3000_85czd6fy', '_TZ3000_kyb656no', '_TZ3000_0s9gukzt', '_TZ3000_kstbkt6a',
    '_TZ3000_mugyhz0q', '_TZ3000_upgcbody', '_TZ3000_k4ej3ww2', '_TZ3000_ocjlo4ea',
    '_TZE200_qq9mpfhw', '_TZE200_jthf7vb6', 'lumi.sensor_wleak.aq1'
  ],
  
  smoke_sensor: [
    '_TYZB01_dsjszp0x', '_TZE200_ntcy3xu1', '_TZE200_m9skfctm', '_TZ3210_up3pngle',
    '_TZE200_rccxox8p', '_TZE200_vzekyi4c', '_TYZB01_wqcac7lo', '_TZE204_ntcy3xu1',
    '_TZE200_t5p1vj8r', '_TZE200_uebojraa', '_TZE200_yh7aoahi', 'lumi.sensor_smoke'
  ]
};

// Base de données de Product IDs par catégorie
const PRODUCT_ID_DATABASE = {
  motion_sensor: ['TS0202', 'TY0202', 'TS0601'],
  contact_sensor: ['TS0203', 'TY0203', 'RH3001'],
  temp_humidity: ['TS0201', 'TS0601', 'TY0201', 'RH3052', 'SM0201'],
  smart_plug: ['TS011F', 'TS0121', 'TS0115'],
  smart_switch: ['TS0001', 'TS0011', 'TS0002', 'TS0012', 'TS0003', 'TS0013', 'TS0004', 'TS0014'],
  dimmer: ['TS110F', 'TS110E', 'TS0601'],
  bulb: ['TS0505A', 'TS0505B', 'TS0502A', 'TS0502B', 'ZB-CL01'],
  led_strip: ['TS0505A', 'TS0505B', 'TS0503A', 'TS0503B', 'TS0504B'],
  curtain: ['TS130F', 'TS0601'],
  wireless_switch: ['TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS004F', 'TS0215A'],
  water_leak: ['TS0207', 'TS0601'],
  smoke_sensor: ['TS0205', 'TS0601']
};

function detectCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('motion') || n.includes('pir') || n.includes('radar') || n.includes('presence')) return 'motion_sensor';
  if (n.includes('contact') || n.includes('door') || n.includes('window') || n.includes('magnet')) return 'contact_sensor';
  if (n.includes('temp') || n.includes('humidity') || n.includes('climate') || n.includes('thermo')) return 'temp_humidity';
  if (n.includes('plug') || n.includes('socket') || n.includes('outlet')) return 'smart_plug';
  if (n.includes('switch') && (n.includes('gang') || n.includes('wall') || n.includes('relay'))) return 'smart_switch';
  if (n.includes('dimmer') || n.includes('dim')) return 'dimmer';
  if (n.includes('bulb') || n.includes('lamp')) return 'bulb';
  if (n.includes('strip') || n.includes('led')) return 'led_strip';
  if (n.includes('curtain') || n.includes('blind') || n.includes('shade') || n.includes('roller') || n.includes('shutter')) return 'curtain';
  if (n.includes('wireless') || n.includes('remote') || n.includes('button') || n.includes('scene')) return 'wireless_switch';
  if (n.includes('water') || n.includes('leak') || n.includes('flood')) return 'water_leak';
  if (n.includes('smoke') || n.includes('fire')) return 'smoke_sensor';
  return null;
}

async function enrichDriver(driverName, driverPath) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return { success: false, reason: 'No compose file' };
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const category = detectCategory(driverName);
  if (!category) return { success: false, reason: 'Unknown category' };
  
  let changes = 0;
  
  // Enrichir manufacturerName
  if (!compose.zigbee) compose.zigbee = {};
  if (!compose.zigbee.manufacturerName) compose.zigbee.manufacturerName = [];
  if (typeof compose.zigbee.manufacturerName === 'string') {
    compose.zigbee.manufacturerName = [compose.zigbee.manufacturerName];
  }
  
  const currentIds = new Set(compose.zigbee.manufacturerName);
  const categoryIds = MANUFACTURER_DATABASE[category] || [];
  
  for (const id of categoryIds) {
    if (!currentIds.has(id)) {
      currentIds.add(id);
      changes++;
    }
  }
  
  compose.zigbee.manufacturerName = Array.from(currentIds).sort();
  
  // Enrichir productId
  const productIds = PRODUCT_ID_DATABASE[category] || [];
  if (productIds.length > 0) {
    if (!compose.zigbee.productId) {
      compose.zigbee.productId = productIds;
      changes++;
    } else if (Array.isArray(compose.zigbee.productId)) {
      const currentPids = new Set(compose.zigbee.productId);
      for (const pid of productIds) {
        if (!currentPids.has(pid)) {
          currentPids.add(pid);
          changes++;
        }
      }
      compose.zigbee.productId = Array.from(currentPids).sort();
    }
  }
  
  if (changes > 0) {
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
    return { success: true, changes, category };
  }
  
  return { success: false, reason: 'No changes needed' };
}

async function main() {
  console.log('\n🚀 ULTRA DEEP ENRICHMENT - TOUS LES IDS ET VALUES\n');
  console.log('═'.repeat(70));
  
  fs.writeFileSync(LOG, `Ultra Deep Enrichment - ${new Date().toISOString()}\n\n`);
  
  const drivers = fs.readdirSync(DRIVERS, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  console.log(`\n📋 ${drivers.length} drivers à enrichir\n`);
  
  let enriched = 0;
  let totalChanges = 0;
  const categoryStats = {};
  
  for (const driver of drivers) {
    const result = await enrichDriver(driver, path.join(DRIVERS, driver));
    
    if (result.success) {
      console.log(`✅ ${driver}: ${result.changes} modifications (${result.category})`);
      fs.appendFileSync(LOG, `✅ ${driver}: ${result.changes} modifications (${result.category})\n`);
      enriched++;
      totalChanges += result.changes;
      categoryStats[result.category] = (categoryStats[result.category] || 0) + 1;
    } else {
      console.log(`ℹ️  ${driver}: ${result.reason}`);
      fs.appendFileSync(LOG, `ℹ️  ${driver}: ${result.reason}\n`);
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 RÉSUMÉ ULTRA DEEP ENRICHMENT\n');
  console.log(`Drivers enrichis:      ${enriched}/${drivers.length}`);
  console.log(`Total modifications:   ${totalChanges}`);
  console.log(`\n📂 Par catégorie:\n`);
  
  Object.entries(categoryStats).forEach(([cat, count]) => {
    console.log(`   ${cat.padEnd(20)} ${count} drivers`);
  });
  
  console.log('\n✅ ENRICHISSEMENT ULTRA-APPROFONDI TERMINÉ !\n');
}

main().catch(err => {
  console.error('❌ ERREUR:', err);
  process.exit(1);
});
