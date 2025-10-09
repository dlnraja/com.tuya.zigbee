const fs = require('fs');
const path = require('path');

console.log('📁 ORGANISATION COMPLÈTE DES FICHIERS PROJET');
console.log('═'.repeat(80));

// Structure de dossiers proposée
const structure = {
  'docs/': {
    description: 'Documentation utilisateur et développeur',
    files: [
      'ACTIONS_A_FAIRE.md',
      'CONTRIBUTING.md',
      'FIX_TS0210_BUG.md',
      'NOUVEAUX_DRIVERS_v2.1.31.md',
      'README_PUBLICATION.md'
    ]
  },
  'docs/forum/': {
    description: 'Posts et réponses forum Homey',
    files: [
      'FORUM_POST_ENGLISH.md',
      'FORUM_POST_ENGLISH_SHORT.md',
      'FORUM_POST_ULTRA_SHORT.txt',
      'POST_FORUM_HOMEY_COMPLET.md',
      'REPONSE_FORUM_HOMEY.md',
      'REPONSE_PROBLEMES_LECTURE_VALEURS.md',
      'MESSAGES_CLOTURE_GITHUB.md'
    ]
  },
  'docs/reports/': {
    description: 'Rapports techniques détaillés',
    files: [
      'RAPPORT_CASCADE_FIXES.md',
      'RESUME_CORRECTIONS_CASCADE.md',
      'RÉSUMÉ_FINAL_TOUTES_CORRECTIONS.md',
      'MEGA_FEATURES_RAPPORT_FINAL.md',
      'COHERENCE_FINAL_SUMMARY.md'
    ]
  },
  'docs/actions/': {
    description: 'Actions et étapes à suivre',
    files: [
      'ACTIONS_IMMEDIATES.md',
      'ACTION_FINALE_MEGA_FEATURES.txt',
      'README_MAINTENANT.txt'
    ]
  },
  'scripts/fixes/': {
    description: 'Scripts de correction automatique',
    files: [
      'FIX_ALL_DRIVERS_CAPABILITIES.js',
      'FIX_DEVICE_CAPABILITIES_CASCADE.js',
      'FIX_MISSING_BATTERIES.js',
      'FIX_SENSOR_RECOGNITION.js',
      'FIX_SETTINGS_VALIDATION.js'
    ]
  },
  'scripts/analysis/': {
    description: 'Scripts d\'analyse',
    files: [
      'ANALYSE_COMPLETE_DEMANDES.js',
      'MEGA_FEATURE_ANALYZER.js',
      'VERIFY_AND_FIX_APP_JSON.js',
      'VERIFY_DRIVERS_COHERENCE.js'
    ]
  },
  'scripts/generators/': {
    description: 'Scripts de génération',
    files: [
      'FLOW_HANDLER_GENERATOR.js',
      'MEGA_FEATURE_IMPLEMENTER.js'
    ]
  },
  'reports/json/': {
    description: 'Rapports JSON',
    files: [
      'APP_JSON_VERIFICATION_REPORT.json',
      'DRIVERS_COHERENCE_REPORT.json',
      'IMPLEMENTATION_REPORT.json',
      'MEGA_FEATURE_REPORT.json',
      'RAPPORT_ANALYSE_COMPLETE.json'
    ]
  },
  'reports/commits/': {
    description: 'Messages de commit',
    files: [
      'COMMIT_MEGA_FEATURES.txt',
      'COMMIT_MESSAGE_CASCADE.txt'
    ]
  }
};

let moved = 0;
let created = 0;

console.log('\n📋 STRUCTURE PROPOSÉE:\n');
Object.entries(structure).forEach(([dir, info]) => {
  console.log(`   ${dir}`);
  console.log(`   └─ ${info.description}`);
  console.log(`   └─ ${info.files.length} fichiers\n`);
});

console.log('\n🔄 DÉPLACEMENT DES FICHIERS...\n');

// Create directories and move files
Object.entries(structure).forEach(([dir, info]) => {
  const dirPath = path.join('.', dir);
  
  // Create directory if doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    created++;
    console.log(`   ✅ Créé: ${dir}`);
  }
  
  // Move files
  info.files.forEach(file => {
    const sourcePath = path.join('.', file);
    const destPath = path.join(dirPath, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destPath);
      moved++;
      console.log(`      📄 Déplacé: ${file} → ${dir}`);
    }
  });
});

console.log('\n═'.repeat(80));
console.log('📊 RÉSUMÉ');
console.log('═'.repeat(80));
console.log(`\n✅ Dossiers créés: ${created}`);
console.log(`✅ Fichiers déplacés: ${moved}`);

console.log('\n📁 STRUCTURE FINALE:');
console.log(`
c:\\Users\\HP\\Desktop\\homey app\\tuya_repair/
├── README.md (principal)
├── CHANGELOG.md
├── CONTRIBUTING.md → docs/
├── app.json
├── package.json
│
├── docs/
│   ├── CONTRIBUTING.md
│   ├── actions/          (3 fichiers - actions à faire)
│   ├── forum/            (7 fichiers - posts forum)
│   └── reports/          (5 fichiers - rapports techniques)
│
├── scripts/
│   ├── analysis/         (4 fichiers - scripts analyse)
│   ├── fixes/            (5 fichiers - scripts correction)
│   ├── generators/       (2 fichiers - générateurs)
│   └── automation/       (existant)
│
├── reports/
│   ├── json/             (5 fichiers - rapports JSON)
│   └── commits/          (2 fichiers - messages commit)
│
├── drivers/              (163 drivers)
├── assets/
└── utils/
`);

console.log('\n🔗 PROCHAINES ÉTAPES:');
console.log('   1. Mettre à jour README.md avec nouveaux chemins');
console.log('   2. Mettre à jour liens dans .github/');
console.log('   3. Commit: git add . && git commit -m "chore: organize project structure"');

console.log('\n✅ ORGANISATION TERMINÉE !');
