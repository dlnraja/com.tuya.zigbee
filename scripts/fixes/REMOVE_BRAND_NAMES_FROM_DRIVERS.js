#!/usr/bin/env node
/**
 * 🏷️ REMOVE BRAND NAMES FROM DRIVER NAMES
 * 
 * Supprime TOUTES les marques des noms de drivers
 * Les marques doivent être dans manufacturerName/productId, PAS dans le nom!
 * 
 * Marques à supprimer:
 * - Tuya, Avatto, Moes, Lonsonho, Zemismart, Neo, Nous, LSC
 * - Lidl, Action, Blitzwolf, Loratap, Aqara, Xiaomi, Ikea
 * - Philips, Innr, Osram, Gledopto, LEDVANCE, Paulmann
 * - Sonoff, eWeLink, Shelly, etc.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const HOMEYCOMPOSE_DRIVERS = path.join(ROOT, '.homeycompose', 'drivers');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🏷️  REMOVE BRAND NAMES FROM DRIVER NAMES\n');
console.log('═══════════════════════════════════════════════════════\n');

// Liste COMPLÈTE des marques à supprimer
const BRANDS = [
  // Tuya ecosystem
  'Tuya', 'Avatto', 'Moes', 'MOES', 'Lonsonho', 'Zemismart', 'Neo', 'Nous',
  'Blitzwolf', 'BlitzWolf', 'Loratap', 'Bseed', 'BSEED', 'Girier',
  
  // Retailers
  'Lidl', 'Action', 'LSC', 'Silvercrest',
  
  // Xiaomi ecosystem
  'Aqara', 'Xiaomi', 'Mi', 'Yeelight',
  
  // IKEA
  'Ikea', 'IKEA', 'Tradfri', 'TRADFRI',
  
  // Philips & partners
  'Philips', 'Hue', 'Innr', 'INNR',
  
  // Lighting brands
  'Osram', 'OSRAM', 'Gledopto', 'GLEDOPTO', 'LEDVANCE', 'Paulmann',
  
  // Smart home
  'Sonoff', 'SONOFF', 'eWeLink', 'Shelly',
  
  // Others
  'Heiman', 'Eurotronic', 'Danfoss', 'Salus', 'Hive',
  'Samsung', 'SmartThings', 'Centralite', 'Develco',
  'Ecolink', 'Fibaro', 'Greenwave', 'Hank',
  'Iris', 'Jung', 'Keen', 'Legrand', 'Leviton',
  'Lutron', 'Megaman', 'Namron', 'Netatmo',
  'Owon', 'Peq', 'Philio', 'Ring', 'Securifi',
  'Sengled', 'SimPal', 'SLV', 'Ubisys', 'Visonic',
  'Yale', 'Zipato', 'Zyxel'
];

// Créer regex pour détecter marques (case-insensitive, word boundary)
const brandRegex = new RegExp(`\\b(${BRANDS.join('|')})\\b`, 'gi');

// Fonction pour nettoyer le nom
function cleanDriverName(name) {
  if (!name) return name;
  
  // Supprimer les marques
  let cleaned = name.replace(brandRegex, '').trim();
  
  // Nettoyer espaces multiples
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Supprimer espaces en début/fin
  cleaned = cleaned.trim();
  
  // Si le nom devient vide ou trop court, garder l'original (sera amélioré manuellement)
  if (cleaned.length < 5) {
    return name;
  }
  
  return cleaned;
}

// Fonction pour améliorer le nom générique
function improveGenericName(driverName, cleanedName) {
  // Si le nom nettoyé est trop générique, ajouter contexte du driver
  if (cleanedName.length < 10) {
    // Extraire infos du driver name
    if (driverName.includes('switch')) {
      cleanedName = 'Wall Switch ' + cleanedName;
    } else if (driverName.includes('plug')) {
      cleanedName = 'Smart Plug ' + cleanedName;
    } else if (driverName.includes('dimmer')) {
      cleanedName = 'Dimmer ' + cleanedName;
    } else if (driverName.includes('sensor')) {
      cleanedName = 'Sensor ' + cleanedName;
    } else if (driverName.includes('bulb')) {
      cleanedName = 'Smart Bulb ' + cleanedName;
    } else if (driverName.includes('led_strip')) {
      cleanedName = 'LED Strip ' + cleanedName;
    } else if (driverName.includes('curtain') || driverName.includes('blind')) {
      cleanedName = 'Curtain Controller ' + cleanedName;
    } else if (driverName.includes('thermostat')) {
      cleanedName = 'Thermostat ' + cleanedName;
    } else if (driverName.includes('lock')) {
      cleanedName = 'Smart Lock ' + cleanedName;
    } else if (driverName.includes('doorbell')) {
      cleanedName = 'Doorbell ' + cleanedName;
    } else if (driverName.includes('siren')) {
      cleanedName = 'Siren ' + cleanedName;
    } else if (driverName.includes('smoke')) {
      cleanedName = 'Smoke Detector ' + cleanedName;
    } else if (driverName.includes('water')) {
      cleanedName = 'Water Sensor ' + cleanedName;
    } else if (driverName.includes('gas')) {
      cleanedName = 'Gas Sensor ' + cleanedName;
    } else if (driverName.includes('button') || driverName.includes('remote')) {
      cleanedName = 'Wireless Button ' + cleanedName;
    }
    
    // Nettoyer à nouveau
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
  }
  
  // Capitaliser première lettre
  if (cleanedName) {
    cleanedName = cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1);
  }
  
  return cleanedName;
}

// Analyser tous les drivers
const drivers = fs.readdirSync(HOMEYCOMPOSE_DRIVERS).filter(name => {
  const fullPath = path.join(HOMEYCOMPOSE_DRIVERS, name);
  return fs.statSync(fullPath).isDirectory();
});

console.log(`📂 ${drivers.length} drivers à vérifier\n`);

let cleaned = 0;
let alreadyClean = 0;
const changes = [];

for (const driver of drivers) {
  const composePath = path.join(HOMEYCOMPOSE_DRIVERS, driver, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    if (!compose.name) continue;
    
    let modified = false;
    
    // Nettoyer nom EN
    if (compose.name.en) {
      const originalEn = compose.name.en;
      let cleanedEn = cleanDriverName(originalEn);
      
      // Améliorer si nécessaire
      cleanedEn = improveGenericName(driver, cleanedEn);
      
      if (cleanedEn !== originalEn) {
        compose.name.en = cleanedEn;
        modified = true;
        
        changes.push({
          driver,
          lang: 'en',
          before: originalEn,
          after: cleanedEn
        });
      }
    }
    
    // Nettoyer nom FR (synchroniser avec EN ou nettoyer si différent)
    if (compose.name.fr) {
      const originalFr = compose.name.fr;
      let cleanedFr = cleanDriverName(originalFr);
      
      // Si FR était identique à EN, garder synchronisé
      if (originalFr === compose.name.en && compose.name.en !== cleanedFr) {
        cleanedFr = compose.name.en; // Utiliser le EN nettoyé
      } else {
        // Améliorer si nécessaire
        cleanedFr = improveGenericName(driver, cleanedFr);
      }
      
      if (cleanedFr !== originalFr) {
        compose.name.fr = cleanedFr;
        modified = true;
        
        if (!changes.find(c => c.driver === driver && c.lang === 'en')) {
          changes.push({
            driver,
            lang: 'fr',
            before: originalFr,
            after: cleanedFr
          });
        }
      }
    }
    
    if (modified) {
      // Sauvegarder dans .homeycompose
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
      
      // Sauvegarder aussi dans drivers/
      const driverComposePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
      if (fs.existsSync(driverComposePath)) {
        fs.writeFileSync(driverComposePath, JSON.stringify(compose, null, 2), 'utf8');
      }
      
      cleaned++;
      
      if (cleaned % 20 === 0) {
        console.log(`  🧹 ${cleaned} drivers nettoyés...`);
      }
    } else {
      alreadyClean++;
    }
    
  } catch (err) {
    console.log(`  ⚠️  ${driver}: ${err.message}`);
  }
}

console.log(`\n✅ Analyse terminée!\n`);
console.log(`📊 RÉSULTATS:`);
console.log(`  Nettoyés: ${cleaned}`);
console.log(`  Déjà propres: ${alreadyClean}`);
console.log(`  Total: ${drivers.length}\n`);

if (changes.length > 0) {
  console.log(`📝 TOP 10 CHANGEMENTS:\n`);
  
  changes.slice(0, 10).forEach((change, i) => {
    console.log(`${i + 1}. ${change.driver}`);
    console.log(`   Avant: "${change.before}"`);
    console.log(`   Après: "${change.after}"\n`);
  });
  
  if (changes.length > 10) {
    console.log(`   ... et ${changes.length - 10} autres\n`);
  }
}

// Sauvegarder rapport complet
const reportPath = path.join(ROOT, 'reports', 'BRAND_NAMES_REMOVED_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify({
  date: new Date().toISOString(),
  cleaned,
  alreadyClean,
  total: drivers.length,
  changes
}, null, 2), 'utf8');

console.log(`📄 Rapport complet: ${reportPath}\n`);
console.log('✅ NETTOYAGE TERMINÉ!\n');
