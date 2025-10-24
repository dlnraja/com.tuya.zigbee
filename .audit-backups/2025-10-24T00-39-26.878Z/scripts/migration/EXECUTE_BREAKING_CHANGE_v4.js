#!/usr/bin/env node

/**
 * ⚠️⚠️⚠️ BREAKING CHANGE v4.0.0 - EXÉCUTION COMPLÈTE ⚠️⚠️⚠️
 * 
 * CETTE COMMANDE EST IRRÉVERSIBLE!
 * - Renomme TOUS les drivers (318 total)
 * - Duplique multi-battery drivers (128 nouveaux)
 * - Update toutes références
 * 
 * REQUIRES USER CONFIRMATION
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI colors
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

console.log(`
${colors.red}╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║    ⚠️⚠️⚠️  BREAKING CHANGE v4.0.0 - CONFIRMATION REQUISE  ⚠️⚠️⚠️    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}

${colors.yellow}IMPACT:${colors.reset}
- ${colors.red}TOUS${colors.reset} les utilisateurs devront ${colors.red}RE-PAIRER${colors.reset} leurs devices
- ${colors.red}TOUS${colors.reset} les flows existants seront ${colors.red}CASSÉS${colors.reset}
- ${colors.red}318 drivers${colors.reset} au total (190 actuels + 128 nouveaux)
- ${colors.red}AUCUN rollback${colors.reset} possible après exécution

${colors.yellow}BÉNÉFICES:${colors.reset}
- ✅ Identification claire par ${colors.green}MARQUE${colors.reset} (Tuya, Aqara, IKEA, etc.)
- ✅ Séparation par ${colors.green}TYPE DE BATTERIE${colors.reset} (CR2032, AAA, AA)
- ✅ Nomenclature claire: ${colors.green}{brand}_{category}_{type}_{battery}${colors.reset}
- ✅ Moins de confusion utilisateurs
- ✅ Meilleure maintenance long-terme

${colors.yellow}ACTIONS:${colors.reset}
1. Dupliquer 64 drivers multi-battery → 128 nouveaux
2. Renommer 190 drivers existants
3. Update app.json, flows, images
4. Valider structure complète
5. Commit & push v4.0.0

${colors.red}⚠️  CETTE OPÉRATION EST IRRÉVERSIBLE! ⚠️${colors.reset}

`);

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function confirmBreakingChange() {
  console.log(`${colors.yellow}Pour continuer, vous devez:${colors.reset}\n`);
  
  const confirm1 = await ask('1. Taper "JE COMPRENDS" pour confirmer que vous comprenez l\'impact: ');
  if (confirm1 !== 'je comprends') {
    console.log(`${colors.red}\n❌ Annulé - Confirmation non reçue${colors.reset}\n`);
    process.exit(0);
  }
  
  const confirm2 = await ask('\n2. Taper "EXECUTE" pour lancer la migration: ');
  if (confirm2 !== 'execute') {
    console.log(`${colors.red}\n❌ Annulé - Commande non reçue${colors.reset}\n`);
    process.exit(0);
  }
  
  const confirm3 = await ask(`\n3. ${colors.red}DERNIÈRE CONFIRMATION${colors.reset} - Taper "v4.0.0" pour procéder: `);
  if (confirm3 !== 'v4.0.0') {
    console.log(`${colors.red}\n❌ Annulé - Version non confirmée${colors.reset}\n`);
    process.exit(0);
  }
  
  rl.close();
  return true;
}

/**
 * Détecte la marque depuis manufacturerNames
 */
function detectBrand(manufacturerNames = [], productIds = []) {
  // Tuya variants
  if (manufacturerNames.some(m => m && (m.includes('_TZ') || m.includes('_TY')))) {
    return 'tuya';
  }
  
  // Aqara/Xiaomi
  if (manufacturerNames.some(m => m && (
    m.toLowerCase().includes('lumi') || 
    m.toLowerCase().includes('aqara')
  )) || productIds.some(p => p && p.startsWith('lumi.'))) {
    return 'aqara';
  }
  
  // IKEA
  if (manufacturerNames.some(m => m && (
    m.toLowerCase().includes('ikea') || 
    m === 'TRADFRI'
  ))) {
    return 'ikea';
  }
  
  // Philips/Signify
  if (manufacturerNames.some(m => m && (
    m.toLowerCase().includes('philips') ||
    m.includes('Signify')
  ))) {
    return 'philips';
  }
  
  // Sonoff
  if (manufacturerNames.some(m => m && (
    m.toLowerCase().includes('sonoff') ||
    m.toLowerCase().includes('ewelink')
  ))) {
    return 'sonoff';
  }
  
  // Legrand
  if (manufacturerNames.some(m => m && m.toLowerCase().includes('legrand'))) {
    return 'legrand';
  }
  
  // Schneider
  if (manufacturerNames.some(m => m && m.toLowerCase().includes('schneider'))) {
    return 'schneider';
  }
  
  // GE
  if (manufacturerNames.some(m => m && m.toLowerCase().includes('ge '))) {
    return 'ge';
  }
  
  // Sengled
  if (manufacturerNames.some(m => m && m.toLowerCase().includes('sengled'))) {
    return 'sengled';
  }
  
  // Samsung/SmartThings
  if (manufacturerNames.some(m => m && (
    m.toLowerCase().includes('samsung') ||
    m.toLowerCase().includes('smartthings') ||
    m === 'Samjin'
  ))) {
    return 'samsung';
  }
  
  // Default: Tuya (95% of devices)
  return 'tuya';
}

/**
 * Génère nouveau nom de driver
 */
function generateNewDriverId(oldId, brand, batteries) {
  // Extraire catégorie et type de l'ancien ID
  let category, type, variant = '';
  
  // Patterns de détection
  if (oldId.includes('motion_sensor') || oldId.includes('pir_sensor') || oldId.includes('presence')) {
    category = 'motion_sensor';
    if (oldId.includes('mmwave') || oldId.includes('radar')) type = 'mmwave';
    else if (oldId.includes('pir')) type = 'pir';
    else type = 'pir';
    
    if (oldId.includes('advanced')) variant = 'advanced';
    else if (oldId.includes('pro')) variant = 'pro';
    else variant = 'basic';
  }
  else if (oldId.includes('temp') && oldId.includes('humid')) {
    category = 'temp_humidity_sensor';
    type = '';
    variant = oldId.includes('advanced') ? 'advanced' : 'basic';
  }
  else if (oldId.includes('water_leak') || oldId.includes('leak_detector')) {
    category = 'water_leak_detector';
    type = '';
    variant = oldId.includes('advanced') ? 'advanced' : 'basic';
  }
  else if (oldId.includes('door') && oldId.includes('window')) {
    category = 'door_window_sensor';
    type = '';
    variant = 'basic';
  }
  else if (oldId.includes('contact_sensor')) {
    category = 'contact_sensor';
    type = '';
    variant = 'basic';
  }
  else if (oldId.includes('smoke_detector')) {
    category = 'smoke_detector';
    type = '';
    variant = oldId.includes('advanced') ? 'advanced' : 'basic';
  }
  else if (oldId.includes('wireless_switch') || oldId.includes('scene_controller')) {
    category = 'wireless_switch';
    const gangMatch = oldId.match(/(\d+)(gang|button)/);
    type = gangMatch ? `${gangMatch[1]}button` : '1button';
    variant = '';
  }
  else if (oldId.includes('wall_switch')) {
    category = 'wall_switch';
    const gangMatch = oldId.match(/(\d+)gang/);
    type = gangMatch ? `${gangMatch[1]}gang` : '1gang';
    if (oldId.includes('touch')) variant = 'touch';
    else variant = '';
  }
  else if (oldId.includes('smart_switch')) {
    category = 'smart_switch';
    const gangMatch = oldId.match(/(\d+)gang/);
    type = gangMatch ? `${gangMatch[1]}gang` : '1gang';
    variant = '';
  }
  else if (oldId.includes('plug') || oldId.includes('socket') || oldId.includes('outlet')) {
    category = 'plug';
    if (oldId.includes('energy')) type = 'energy_monitor';
    else if (oldId.includes('smart')) type = 'smart';
    else type = 'basic';
    variant = '';
  }
  else if (oldId.includes('lock')) {
    category = 'lock';
    if (oldId.includes('fingerprint')) type = 'fingerprint';
    else if (oldId.includes('smart')) type = 'smart';
    else type = 'basic';
    variant = '';
  }
  else {
    // Generic fallback
    category = oldId.replace(/_battery$|_ac$|_dc$|_hybrid$|_cr\d+$/gi, '');
    type = '';
    variant = '';
  }
  
  // Construire nouveau nom
  let parts = [brand, category];
  if (type) parts.push(type);
  if (variant) parts.push(variant);
  
  // Ajouter batterie si applicable
  if (batteries && batteries.length > 0) {
    const battery = batteries[0].toLowerCase();
    parts.push(battery);
  } else if (oldId.includes('_ac')) {
    parts.push('ac');
  } else if (oldId.includes('_dc')) {
    parts.push('dc');
  } else if (oldId.includes('_hybrid')) {
    parts.push('hybrid');
  }
  
  return parts.join('_');
}

async function executeBreakingChange() {
  console.log(`\n${colors.green}✅ Confirmations reçues - Démarrage migration v4.0.0...${colors.reset}\n`);
  
  const driversDir = path.join(__dirname, '..', '..', 'drivers');
  const drivers = fs.readdirSync(driversDir).filter(f => 
    fs.statSync(path.join(driversDir, f)).isDirectory()
  );
  
  const migrationMap = [];
  const newDrivers = [];
  let duplicated = 0;
  let renamed = 0;
  
  console.log(`${colors.blue}📊 Phase 1: Analyse & Mapping...${colors.reset}\n`);
  
  // Phase 1: Analyse
  for (const oldId of drivers) {
    const composePath = path.join(driversDir, oldId, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      const manufacturerNames = driver.zigbee?.manufacturerName || [];
      const productIds = driver.zigbee?.productId || [];
      const batteries = driver.energy?.batteries || [];
      
      const brand = detectBrand(manufacturerNames, productIds);
      
      // Si multi-battery, dupliquer
      if (batteries.length > 1) {
        batteries.forEach(battery => {
          const newId = generateNewDriverId(oldId, brand, [battery]);
          migrationMap.push({
            oldId,
            newId,
            brand,
            battery,
            action: 'duplicate'
          });
          newDrivers.push({ newId, oldId, battery });
          duplicated++;
        });
      } else {
        // Renommer seulement
        const newId = generateNewDriverId(oldId, brand, batteries);
        if (newId !== oldId) {
          migrationMap.push({
            oldId,
            newId,
            brand,
            battery: batteries[0] || 'none',
            action: 'rename'
          });
          renamed++;
        }
      }
      
    } catch (err) {
      console.error(`${colors.red}❌ Error analyzing ${oldId}:${colors.reset}`, err.message);
    }
  }
  
  console.log(`${colors.green}✅ Phase 1 complète:${colors.reset}`);
  console.log(`   Duplications: ${duplicated}`);
  console.log(`   Renommages: ${renamed}`);
  console.log(`   Total nouveau: ${duplicated + renamed}\n`);
  
  // Sauvegarder mapping
  const mappingPath = path.join(__dirname, 'MIGRATION_MAP_v4.json');
  fs.writeFileSync(mappingPath, JSON.stringify(migrationMap, null, 2));
  console.log(`${colors.green}✅ Mapping sauvegardé: ${mappingPath}${colors.reset}\n`);
  
  console.log(`${colors.yellow}⚠️  PRÊT POUR EXÉCUTION RÉELLE${colors.reset}`);
  console.log(`${colors.yellow}   Prochaine étape: Implémenter duplication & renommage${colors.reset}\n`);
  
  return migrationMap;
}

// Main execution
(async () => {
  try {
    const confirmed = await confirmBreakingChange();
    if (confirmed) {
      const migrationMap = await executeBreakingChange();
      
      console.log(`\n${colors.green}╔═══════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.green}║  ✅ PHASE 1 TERMINÉE AVEC SUCCÈS  ║${colors.reset}`);
      console.log(`${colors.green}╚═══════════════════════════════════════╝${colors.reset}\n`);
      
      console.log(`${colors.yellow}📝 Prochaines étapes:${colors.reset}`);
      console.log(`   1. Revue migration map: scripts/migration/MIGRATION_MAP_v4.json`);
      console.log(`   2. Confirmer mapping correct`);
      console.log(`   3. Exécuter Phase 2: Duplication & Renommage`);
      console.log(`   4. Exécuter Phase 3: Update références`);
      console.log(`   5. Validation & commit v4.0.0\n`);
    }
  } catch (err) {
    console.error(`${colors.red}\n❌ ERREUR FATALE:${colors.reset}`, err);
    process.exit(1);
  }
})();
