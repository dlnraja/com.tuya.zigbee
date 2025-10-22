#!/usr/bin/env node
'use strict';

/**
 * CUSTOM ENRICHMENT SCRIPT
 * 
 * Ce script effectue un enrichissement personnalisé des drivers en fonction de leur catégorie.
 * Il ajoute des IDs de fabricant pertinents pour chaque type de périphérique.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration des chemins
const ROOT_DIR = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');
const LOG_FILE = path.join(ROOT_DIR, 'enrichment_log.txt');

// Catégories de produits avec leurs IDs de fabricant
const PRODUCT_CATEGORIES = {
  // Capteurs de mouvement
  motion_sensor: {
    keywords: ['motion', 'pir', 'radar', 'presence', 'occupancy'],
    manufacturerIds: [
      '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_mcxw5ehu',
      '_TZ3000_msl6wxk9', '_TZ3000_otvn3lne', '_TZ3000_6ygjfyll',
      '_TZ3040_6ygjfyll', '_TZ3040_bb6xaihh', '_TZ3000_nss8amz9',
      '_TZ3000_lf56vpxj', '_TYZB01_jytabjkb', '_TYZB01_dl7cejts',
      '_TZE200_3towulqd', '_TZE200_bh3n6gk8', '_TZE200_1ibpyhdc',
      '_TZE200_ttcovulf', '_TZ1800_fcdjzz3s', 'lumi.sensor_motion',
      'lumi.motion.agl04', 'lumi.motion.ac01', 'lumi.motion.ac02',
      'SNZB-03', '3315-S', '3315-G'
    ]
  },
  
  // Capteurs d'ouverture/fermeture
  contact_sensor: {
    keywords: ['contact', 'door', 'window', 'magnet'],
    manufacturerIds: [
      '_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_oxslv1c9',
      '_TZ3000_bmg14ax2', '_TZ3000_bzxlofth', '_TZ3000_7tbsruql',
      '_TZ3000_osu834un', '_TZ3000_7d8yme6f', '_TZ3000_rgchmad8',
      '_TZ3000_au1rjicn', '_TZ3000_4ugnzsli', '_TZ3000_zgrffiwg',
      'lumi.sensor_magnet', 'lumi.sensor_magnet.aq2', 'SNZB-04',
      '3321-S', '3321-G'
    ]
  },
  
  // Capteurs de température/humidité
  temp_humidity_sensor: {
    keywords: ['temp', 'temperature', 'humidity', 'climate', 'thermo'],
    manufacturerIds: [
      '_TZ3000_bguser20', '_TZ3000_dowj6gyi', '_TZ3000_fllyghyj',
      '_TZ3000_8ybe88nf', '_TZ3000_fie1dpkm', '_TZ3000_0s1izerx',
      '_TZ3000_xr3htd96', '_TZ3000_saiqcn0y', '_TZ3000_f2bw0b6k',
      'lumi.sensor_ht', 'lumi.weather', 'SNZB-02', 'WSDCGQ11LM',
      'WSDCGQ12LM', 'GZCGQ01LM', 'RTCGQ11LM'
    ]
  },
  
  // Prises intelligentes
  smart_plug: {
    keywords: ['plug', 'socket', 'outlet', 'power'],
    manufacturerIds: [
      '_TZ3000_g5xawfcq', '_TZ3000_vtscrpmw', '_TZ3000_rdtixbnu',
      '_TZ3000_8nkb7mof', '_TZ3000_cphmq0q7', '_TZ3000_ew3ldmgx',
      '_TZ3000_dpo1ysak', '_TZ3000_w0qqde0g', '_TZ3000_u5u4cakc',
      'lumi.plug', 'lumi.plug.mmeu01', 'ZNCZ02LM', 'QBCZ11LM',
      'SP120', 'SP220', 'SSM-U01', 'SSM-U02', 'SSM-U03', 'SSM-U04'
    ]
  },
  
  // Interrupteurs intelligents
  smart_switch: {
    keywords: ['switch', 'gang', 'wall', 'relay'],
    manufacturerIds: [
      '_TZ3000_ji4araar', '_TZ3000_qmi1cfuq', '_TZ3000_npzfdcof',
      '_TZ3000_tqlv4ug4', '_TZ3000_rmjr4ufz', '_TZ3000_hhiodade',
      '_TZ3000_46t1rvdu', '_TZ3000_majwnphg', '_TZ3000_6axxqqi2',
      'lumi.ctrl_ln1', 'lumi.ctrl_ln2', 'lumi.ctrl_neutral1',
      'lumi.ctrl_neutral2', 'QBCZ03LM', 'WXKG03LM', 'WXKG02LM',
      'WXKG01LM', 'WXKG11LM', 'WXKG12LM', 'WXKG13LM', 'WXKG14LM'
    ]
  },
  
  // Variateurs
  dimmer: {
    keywords: ['dimmer', 'dim', 'brightness'],
    manufacturerIds: [
      '_TYZB01_qezuin6k', '_TZ3210_ngqk6jia', '_TZ3000_ktuoyvt5',
      '_TZ3210_zxbtub8r', '_TZ3210_weaqkhab', '_TZ3210_k1msuvg6',
      '_TYZB01_v8gtiaed', 'lumi.light.aqcn02', 'lumi.light.cb2acn',
      'ZNLDP12LM', 'ZNCJMB14LM', 'ZNCJMB11LM', 'ZNDDMK11LM',
      'ZNDDMK12LM', 'ZNDDMK13LM', 'ZNDDMK14LM', 'ZNDDMK15LM'
    ]
  },
  
  // Ampoules
  bulb: {
    keywords: ['bulb', 'lamp', 'light', 'rgb', 'color', 'white', 'tunable'],
    manufacturerIds: [
      '_TZ3000_odygigth', '_TZ3000_dbou1ap4', '_TZ3000_keabpigv',
      '_TZ3000_12sxjap4', '_TZ3000_hlijwsai', '_TZ3000_qd7hej8u',
      '_TZ3210_mja6r5ix', 'lumi.light.aqcn02', 'lumi.light.cb2acn',
      'ZNLDP12LM', 'ZNCJMB14LM', 'ZNCJMB11LM', 'ZNDDMK11LM',
      'ZNDDMK12LM', 'ZNDDMK13LM', 'ZNDDMK14LM', 'ZNDDMK15LM'
    ]
  },
  
  // Stores et rideaux
  curtain: {
    keywords: ['curtain', 'blind', 'shade', 'roller', 'shutter'],
    manufacturerIds: [
      '_TZ3000_vd43bbfq', '_TZE200_fctwhugx', '_TZE200_cowvfni3',
      '_TZE200_rddyvrci', '_TZE200_nkoabg8w', '_TZE200_xuzcvlku',
      'lumi.curtain', 'lumi.curtain.aq2', 'lumi.curtain.hagl04',
      'ZNCZ04LM', 'ZNCZ11LM', 'ZNCZ12LM', 'ZNCZ13LM', 'ZNCZ14LM',
      'ZNCZ15LM', 'ZNCZ16LM', 'ZNCZ17LM', 'ZNCZ18LM', 'ZNCZ19LM'
    ]
  },
  
  // Détecteurs de fumée
  smoke_sensor: {
    keywords: ['smoke', 'fire', 'alarm'],
    manufacturerIds: [
      '_TYZB01_dsjszp0x', '_TZE200_ntcy3xu1', '_TZE200_m9skfctm',
      '_TZ3210_up3pngle', '_TZE200_rccxox8p', '_TZE200_vzekyi4c',
      'lumi.sensor_smoke', 'lumi.sensor_smoke.acn03', 'JTYJ-GD-01LM/BW',
      'JTYJ-GD-01LM/BW', 'JTYJ-GD-01LM/BW', 'JTYJ-GD-01LM/BW',
      'JTYJ-GD-01LM/BW', 'JTYJ-GD-01LM/BW', 'JTYJ-GD-01LM/BW'
    ]
  },
  
  // Détecteurs de fuite d'eau
  water_leak_sensor: {
    keywords: ['water', 'leak', 'flood', 'moisture'],
    manufacturerIds: [
      '_TYZB01_sqmd19i1', '_TZ3000_fxvjhdyl', '_TZ3000_eit7p838',
      '_TZ3000_t6jriawg', '_TZ3000_85czd6fy', '_TZ3000_kyb656no',
      'lumi.sensor_wleak.aq1', 'lumi.sensor_wleak', 'SJCGQ11LM',
      'SJCGQ12LM', 'SJCGQ13LM', 'SJCGQ14LM', 'SJCGQ15LM', 'SJCGQ16LM'
    ]
  },
  
  // Télécommandes et boutons
  remote_control: {
    keywords: ['remote', 'button', 'scene', 'controller', 'switch'],
    manufacturerIds: [
      '_TZ3000_tk3s5tyg', '_TZ3000_fkp5zyho', '_TZ3000_axpdxqgu',
      '_TZ3000_peszejy7', '_TZ3000_pzui3skt', '_TZ3000_f97vq5mn',
      'lumi.remote.b186acn01', 'lumi.remote.b186acn02', 'lumi.remote.b286acn01',
      'lumi.remote.b286acn02', 'lumi.remote.b486opcn01', 'lumi.remote.b486opcn01',
      'WXKG01LM', 'WXKG02LM', 'WXKG03LM', 'WXKG04LM', 'WXKG05LM',
      'WXKG06LM', 'WXKG07LM', 'WXKG08LM', 'WXKG09LM', 'WXKG10LM'
    ]
  }
};

// Fonction pour déterminer la catégorie d'un driver
function detectCategory(driverName) {
  const lowerName = driverName.toLowerCase();
  
  for (const [category, data] of Object.entries(PRODUCT_CATEGORIES)) {
    if (data.keywords.some(keyword => lowerName.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
}

// Fonction pour lire un fichier JSON
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading JSON file ${filePath}:`, err.message);
    return null;
  }
}

// Fonction pour écrire dans un fichier JSON
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    return true;
  } catch (err) {
    console.error(`Error writing JSON file ${filePath}:`, err.message);
    return false;
  }
}

// Fonction pour ajouter des IDs de fabricant manquants
function addMissingManufacturerIds(compose, category) {
  if (!compose.zigbee) {
    compose.zigbee = {};
  }
  
  if (!compose.zigbee.manufacturerName) {
    compose.zigbee.manufacturerName = [];
  } else if (typeof compose.zigbee.manufacturerName === 'string') {
    // Convertir en tableau si c'est une chaîne
    compose.zigbee.manufacturerName = [compose.zigbee.manufacturerName];
  }
  
  const categoryData = PRODUCT_CATEGORIES[category];
  if (!categoryData) {
    return 0; // Aucun ID à ajouter pour cette catégorie
  }
  
  const currentIds = new Set(compose.zigbee.manufacturerName);
  const newIds = [];
  
  // Ajouter les IDs manquants
  for (const id of categoryData.manufacturerIds) {
    if (!currentIds.has(id)) {
      newIds.push(id);
      currentIds.add(id);
    }
  }
  
  if (newIds.length > 0) {
    // Mettre à jour la liste des IDs
    compose.zigbee.manufacturerName = Array.from(currentIds).sort();
    return newIds.length;
  }
  
  return 0;
}

// Fonction principale
async function main() {
  console.log('🚀 DÉMARRAGE DE L\'ENRICHISSEMENT PERSONNALISÉ\n');
  
  // Créer le fichier de log
  fs.writeFileSync(LOG_FILE, `Enrichment started at: ${new Date().toISOString()}\n\n`);
  
  // Lire tous les dossiers de drivers
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`📋 ${drivers.length} drivers trouvés\n`);
  
  let enrichedCount = 0;
  let totalIdsAdded = 0;
  
  // Parcourir chaque driver
  for (const driver of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driver);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    // Vérifier si le fichier compose.json existe
    if (!fs.existsSync(composePath)) {
      console.log(`⚠️  Fichier driver.compose.json manquant pour: ${driver}`);
      fs.appendFileSync(LOG_FILE, `⚠️  ${driver}: Fichier driver.compose.json manquant\n`);
      continue;
    }
    
    // Lire le fichier compose.json
    const compose = readJsonFile(composePath);
    if (!compose) {
      console.log(`❌ Erreur de lecture du fichier pour: ${driver}`);
      fs.appendFileSync(LOG_FILE, `❌ ${driver}: Erreur de lecture du fichier\n`);
      continue;
    }
    
    // Détecter la catégorie du driver
    const category = detectCategory(driver);
    
    // Ajouter les IDs de fabricant manquants
    const idsAdded = addMissingManufacturerIds(compose, category);
    
    if (idsAdded > 0) {
      // Sauvegarder les modifications
      if (writeJsonFile(composePath, compose)) {
        console.log(`✅ ${driver}: ${idsAdded} IDs de fabricant ajoutés (${category})`);
        fs.appendFileSync(LOG_FILE, `✅ ${driver}: ${idsAdded} IDs ajoutés (${category})\n`);
        enrichedCount++;
        totalIdsAdded += idsAdded;
      } else {
        console.log(`❌ ${driver}: Échec de l'écriture du fichier`);
        fs.appendFileSync(LOG_FILE, `❌ ${driver}: Échec de l'écriture du fichier\n`);
      }
    } else {
      console.log(`ℹ️  ${driver}: Aucun ID à ajouter (${category})`);
      fs.appendFileSync(LOG_FILE, `ℹ️  ${driver}: Aucun ID à ajouter (${category})\n`);
    }
  }
  
  // Afficher le résumé
  const summary = `\n📊 RÉSUMÉ DE L'ENRICHISSEMENT\n` +
    `================================\n` +
    `Drivers enrichis:      ${enrichedCount}/${drivers.length}\n` +
    `IDs de fabricant ajoutés: ${totalIdsAdded}\n` +
    `Fichier de log:       ${LOG_FILE}\n`;
  
  console.log(summary);
  fs.appendFileSync(LOG_FILE, '\n' + summary);
  
  console.log('✅ Enrichissement terminé avec succès !');
}

// Exécuter le script
main().catch(err => {
  console.error('❌ ERREUR:', err);
  process.exit(1);
});
