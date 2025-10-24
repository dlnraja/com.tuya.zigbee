#!/usr/bin/env node

/**
 * EXÉCUTER TOUTES LES AMÉLIORATIONS MULTI-BATTERY
 * Sans breaking change!
 */

const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  { name: 'Amélioration noms', file: '01_improve_multibattery_names.js' },
  { name: 'Ajout setting battery type', file: '02_add_battery_type_setting.js' },
  { name: 'Création Battery Calculator', file: '03_add_battery_calculation.js' }
];

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🔋 AMÉLIORATIONS MULTI-BATTERY - SANS BREAKING CHANGE     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

✅ ACTIONS:
   1. Clarifier noms: "Motion Sensor (CR2032/AAA)"
   2. Ajouter setting pour choisir type batterie
   3. Créer helper calcul adaptatif

⚠️  PAS DE BREAKING CHANGE:
   - Aucun driver renommé
   - Aucun device cassé
   - Settings optionnels
   - Backward compatible 100%

`);

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Continuer? (oui/non): ', (answer) => {
  rl.close();
  
  if (answer.toLowerCase() !== 'oui') {
    console.log('\n❌ Annulé\n');
    process.exit(0);
  }
  
  console.log('\n🚀 Démarrage...\n');
  
  for (const script of scripts) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(script.name.toUpperCase());
    console.log('='.repeat(70));
    
    try {
      const scriptPath = path.join(__dirname, script.file);
      execSync(`node "${scriptPath}"`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..', '..')
      });
      
      console.log(`\n✅ ${script.name} terminé\n`);
      
    } catch (err) {
      console.error(`\n❌ ERREUR ${script.name}:`, err.message);
      process.exit(1);
    }
  }
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              ✅ AMÉLIORATIONS TERMINÉES                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

📊 RÉSUMÉ:
   ✅ Noms clarifiés avec batteries supportées
   ✅ Setting "Battery Type" ajouté
   ✅ BatteryCalculator créé (lib/BatteryCalculator.js)

🎯 BÉNÉFICES:
   ✅ Utilisateurs voient quelles batteries sont supportées
   ✅ Peuvent choisir leur type dans settings
   ✅ Calcul batterie optimisé par type
   ✅ Pas de breaking change!

📝 PROCHAINES ÉTAPES:
   1. Vérifier: git status
   2. Tester: homey app validate
   3. Commit: git add -A && git commit
   4. Push: git push origin master

💡 UTILISATION BATTERY CALCULATOR:
   Voir: lib/BatteryCalculator.example.js
`);
});
