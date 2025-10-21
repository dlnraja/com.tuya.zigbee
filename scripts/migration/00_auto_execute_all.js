#!/usr/bin/env node

/**
 * AUTO-EXÉCUTION COMPLÈTE - BREAKING CHANGE v4.0.0
 * Exécute TOUTES les phases automatiquement sans confirmation
 */

const { execSync } = require('child_process');
const path = require('path');

const phases = [
  { num: '01', name: 'Analyse & Mapping', file: '01_analyze_and_map.js' },
  { num: '02', name: 'Duplication Multi-Battery', file: '02_duplicate_drivers.js' },
  { num: '03', name: 'Renommage Drivers', file: '03_rename_drivers.js' },
  { num: '04', name: 'Update Références', file: '04_update_references.js' },
  { num: '05', name: 'Validation Finale', file: '05_validate.js' }
];

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 AUTO-EXÉCUTION BREAKING CHANGE v4.0.0                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

⚡ EXÉCUTION AUTOMATIQUE - SANS CONFIRMATION
🎯 5 PHASES SERONT EXÉCUTÉES

TRANSFORMATIONS:
- 190 drivers actuels → 318 drivers finaux
- Préfixe marque: tuya_, aqara_, ikea_, etc.
- Suffixe batterie: _cr2032, _aaa, _aa, etc.
- Duplication: 64 drivers × 2 types = 128 nouveaux

⏱️  Durée estimée: ~15 minutes

🚀 DÉMARRAGE...
`);

const startTime = Date.now();

for (const phase of phases) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`PHASE ${phase.num}: ${phase.name.toUpperCase()}`);
  console.log('='.repeat(70));
  
  const phaseStart = Date.now();
  
  try {
    const scriptPath = path.join(__dirname, phase.file);
    execSync(`node "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', '..')
    });
    
    const duration = ((Date.now() - phaseStart) / 1000).toFixed(1);
    console.log(`\n✅ Phase ${phase.num} terminée en ${duration}s\n`);
    
  } catch (err) {
    console.error(`\n❌ ERREUR Phase ${phase.num}:`, err.message);
    console.log(`\n⚠️  Migration arrêtée à la phase ${phase.num}`);
    console.log(`Vous pouvez reprendre avec: node scripts/migration/${phase.file}\n`);
    process.exit(1);
  }
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║      ✅ MIGRATION v4.0.0 TERMINÉE AVEC SUCCÈS                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

📊 RÉSUMÉ:
   ✅ Toutes les 5 phases exécutées
   ✅ Drivers dupliqués et renommés
   ✅ Références mises à jour
   ✅ Validation réussie
   ⏱️  Durée totale: ${totalDuration}s

🎯 PROCHAINES ÉTAPES:

1. VÉRIFICATION:
   git status
   git diff drivers/ --stat

2. TEST LOCAL (CRITIQUE):
   homey app run
   # Tester quelques devices de chaque marque

3. COMMIT:
   git add -A
   git commit -m "feat: v4.0.0 breaking change - brand & battery reorganization"

4. PUSH:
   git push origin master

⚠️  IMPORTANT:
   - Créer migration guide pour utilisateurs
   - Annoncer sur forum Homey
   - Mettre à jour CHANGELOG.md avec breaking changes
   - Tous les utilisateurs devront RE-PAIRER leurs devices!

📝 FICHIERS GÉNÉRÉS:
   - scripts/migration/MIGRATION_MAP_v4.json (mapping complet)
   - docs/MIGRATION_GUIDE_v4.md (guide utilisateur)
   - CHANGELOG.md (mis à jour)
   - README.md (mis à jour)

🎉 MIGRATION COMPLÈTE!
`);
