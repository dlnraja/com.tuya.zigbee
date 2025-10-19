const fs = require('fs');
const path = require('path');

console.log('🔧 HARMONISATION INTELLIGENTE - TOUS LES NOMS DE DRIVERS');
console.log('═'.repeat(80));

const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
const driversDir = './drivers';

const renameMappings = [];

// Règles de standardisation
const RULES = {
  // Caractères à supprimer ou remplacer
  specialChars: [
    { pattern: /\(/g, replace: '' },
    { pattern: /\)/g, replace: '' },
    { pattern: /\s+/g, replace: '_' },
    { pattern: /-+/g, replace: '_' },
    { pattern: /_+/g, replace: '_' },
    { pattern: /^_|_$/g, replace: '' }
  ],
  
  // Patterns de type d'alimentation à standardiser
  powerTypes: [
    { pattern: /battery/i, standard: 'battery' },
    { pattern: /\bac\b/i, standard: 'ac' },
    { pattern: /\bdc\b/i, standard: 'dc' },
    { pattern: /hybrid/i, standard: 'hybrid' }
  ],
  
  // Patterns de nombre de gangs à standardiser
  gangs: [
    { pattern: /1gang|1_gang|one_gang/i, standard: '1gang' },
    { pattern: /2gang|2_gang|two_gang/i, standard: '2gang' },
    { pattern: /3gang|3_gang|three_gang/i, standard: '3gang' },
    { pattern: /4gang|4_gang|four_gang/i, standard: '4gang' },
    { pattern: /5gang|5_gang|five_gang/i, standard: '5gang' },
    { pattern: /6gang|6_gang|six_gang/i, standard: '6gang' },
    { pattern: /8gang|8_gang|eight_gang/i, standard: '8gang' }
  ],
  
  // Patterns de types de batteries
  batteryTypes: [
    { pattern: /cr2032/i, standard: 'cr2032' },
    { pattern: /cr2450/i, standard: 'cr2450' },
    { pattern: /aa/i, standard: 'aa' },
    { pattern: /aaa/i, standard: 'aaa' }
  ]
};

console.log('\n📋 Analyse de ' + appJson.drivers.length + ' drivers...\n');

// Analyser chaque driver
appJson.drivers.forEach((driver, index) => {
  const oldName = driver.id;
  let newName = oldName;
  let changes = [];
  
  // 1. Supprimer les caractères spéciaux
  RULES.specialChars.forEach(rule => {
    const before = newName;
    newName = newName.replace(rule.pattern, rule.replace);
    if (before !== newName) {
      changes.push('removed_special_chars');
    }
  });
  
  // 2. Standardiser les types d'alimentation
  let hasPowerType = false;
  RULES.powerTypes.forEach(rule => {
    if (rule.pattern.test(newName)) {
      hasPowerType = true;
      // Remplacer par le standard
      newName = newName.replace(rule.pattern, rule.standard);
    }
  });
  
  // 3. Vérifier si le driver nécessite une précision AC/DC/battery
  const needsPowerType = [
    'switch', 'wall_switch', 'smart_switch', 'dimmer', 
    'plug', 'socket', 'outlet', 'motion_sensor', 'wireless'
  ].some(type => newName.includes(type));
  
  if (needsPowerType && !hasPowerType) {
    // Deviner le type d'alimentation selon le contexte
    const capabilities = driver.capabilities || [];
    const hasBattery = capabilities.includes('measure_battery');
    const hasEnergy = driver.energy?.batteries;
    
    if (hasBattery || hasEnergy) {
      // Déterminer le type de batterie
      if (hasEnergy && hasEnergy.length > 0) {
        const batteryType = hasEnergy[0].toLowerCase();
        if (batteryType.includes('cr2032')) {
          newName += '_cr2032';
        } else if (batteryType.includes('cr2450')) {
          newName += '_cr2450';
        } else {
          newName += '_battery';
        }
      } else {
        newName += '_battery';
      }
      changes.push('added_power_type_battery');
    } else if (newName.includes('plug') || newName.includes('socket')) {
      newName += '_ac';
      changes.push('added_power_type_ac');
    }
  }
  
  // 4. Standardiser les gangs
  RULES.gangs.forEach(rule => {
    if (rule.pattern.test(newName)) {
      newName = newName.replace(rule.pattern, rule.standard);
      changes.push('standardized_gang');
    }
  });
  
  // 5. Nettoyer les underscores multiples
  newName = newName.replace(/_+/g, '_').replace(/^_|_$/g, '');
  
  // 6. Convertir en minuscules
  newName = newName.toLowerCase();
  
  // Si changement nécessaire
  if (newName !== oldName) {
    const driverPath = path.join(driversDir, oldName);
    const newPath = path.join(driversDir, newName);
    
    // Vérifier si le nouveau nom existe déjà
    if (fs.existsSync(newPath)) {
      console.log(`   🔀 FUSION: ${oldName} → ${newName} (existe déjà)`);
      renameMappings.push({
        old: oldName,
        new: newName,
        action: 'merge',
        changes: changes
      });
    } else {
      console.log(`   📝 RENAME: ${oldName}`);
      console.log(`            → ${newName}`);
      console.log(`            Changes: ${changes.join(', ')}`);
      renameMappings.push({
        old: oldName,
        new: newName,
        action: 'rename',
        changes: changes
      });
    }
  }
  
  if ((index + 1) % 20 === 0) {
    console.log(`   Progress: ${index + 1}/${appJson.drivers.length}...`);
  }
});

console.log('\n═'.repeat(80));
console.log('📊 RÉSUMÉ ANALYSE');
console.log('═'.repeat(80));

const renameCount = renameMappings.filter(m => m.action === 'rename').length;
const mergeCount = renameMappings.filter(m => m.action === 'merge').length;

console.log(`\n✅ Drivers à renommer: ${renameCount}`);
console.log(`✅ Drivers à fusionner: ${mergeCount}`);
console.log(`✅ Total changements: ${renameMappings.length}`);

if (renameMappings.length > 0) {
  // Grouper par type de changement
  const byChange = {};
  renameMappings.forEach(m => {
    m.changes.forEach(change => {
      byChange[change] = (byChange[change] || 0) + 1;
    });
  });
  
  console.log('\n📊 TYPES DE CHANGEMENTS:');
  Object.entries(byChange).forEach(([change, count]) => {
    console.log(`   ${count}× ${change}`);
  });
  
  // Sauvegarder le mapping
  fs.writeFileSync('./HARMONIZE_MAPPING.json', JSON.stringify(renameMappings, null, 2));
  console.log('\n📝 Mapping sauvegardé: HARMONIZE_MAPPING.json');
  
  console.log('\n🚀 PROCHAINES ÉTAPES:');
  console.log('   1. Vérifier le mapping');
  console.log('   2. Appliquer: node APPLY_HARMONIZATION.js');
  console.log('   3. Valider: homey app validate');
  console.log('   4. Commit & Push');
} else {
  console.log('\n✅ Aucun changement nécessaire - tous les noms sont déjà cohérents !');
}

console.log('\n✅ ANALYSE TERMINÉE !');
