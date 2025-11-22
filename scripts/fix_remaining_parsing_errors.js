#!/usr/bin/env node
/**
 * Correction automatique des 6 dernières erreurs de parsing
 * Cible: contact_sensor_vibration, doorbell_button, thermostat_*, water_valve_controller
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION DES ERREURS DE PARSING RESTANTES\n');

// Fichiers à corriger basés sur les erreurs ESLint
const filesToFix = [
  {
    file: 'drivers/contact_sensor_vibration/device.js',
    fixes: [
      {
        line: 225,
        type: 'method_start',
        search: '  async setupIASZone() {\n  this.log(',
        replace: '  async setupIASZone() {\n    this.log(',
        description: 'Fix setupIASZone indentation line 226'
      }
    ]
  },
  {
    file: 'drivers/doorbell_button/device.js',
    fixes: [
      {
        line: 368,
        type: 'method_start',
        search: '  async setupIASZone() {\n  this.log(',
        replace: '  async setupIASZone() {\n    this.log(',
        description: 'Fix setupIASZone indentation line 369'
      }
    ]
  },
  {
    file: 'drivers/thermostat_advanced/device.js',
    fixes: [
      {
        line: 188,
        type: 'method_body',
        search: '  async triggerFlowCard(cardId, tokens = {}) {\n  try {',
        replace: '  async triggerFlowCard(cardId, tokens = {}) {\n    try {',
        description: 'Fix triggerFlowCard indentation line 189'
      }
    ]
  },
  {
    file: 'drivers/thermostat_smart/device.js',
    fixes: [
      {
        line: 188,
        type: 'method_body',
        search: '  async triggerFlowCard(cardId, tokens = {}) {\n  try {',
        replace: '  async triggerFlowCard(cardId, tokens = {}) {\n    try {',
        description: 'Fix triggerFlowCard indentation line 189'
      }
    ]
  },
  {
    file: 'drivers/thermostat_temperature_control/device.js',
    fixes: [
      {
        line: 189,
        type: 'method_body',
        search: '  async triggerFlowCard(cardId, tokens = {}) {\n  try {',
        replace: '  async triggerFlowCard(cardId, tokens = {}) {\n    try {',
        description: 'Fix triggerFlowCard indentation line 190'
      }
    ]
  },
  {
    file: 'drivers/water_valve_controller/device.js',
    fixes: [
      {
        line: 189,
        type: 'method_body',
        search: '  async triggerFlowCard(cardId, tokens = {}) {\n  try {',
        replace: '  async triggerFlowCard(cardId, tokens = {}) {\n    try {',
        description: 'Fix triggerFlowCard indentation line 190'
      }
    ]
  }
];

const results = {
  success: [],
  errors: [],
  skipped: []
};

function fixFile(fileConfig) {
  const filePath = path.join(__dirname, fileConfig.file);

  console.log(`📝 Traitement: ${fileConfig.file}`);

  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  Fichier introuvable: ${filePath}`);
    results.skipped.push(fileConfig.file);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    fileConfig.fixes.forEach((fix, index) => {
      console.log(`   🔍 Fix ${index + 1}: ${fix.description}`);

      if (content.includes(fix.search)) {
        content = content.replace(fix.search, fix.replace);
        modified = true;
        console.log(`      ✅ Appliqué`);
      } else {
        // Tentative de fix plus large pour capturer les variations
        const lines = content.split('\n');
        const targetLine = fix.line - 1; // 0-indexed

        if (targetLine < lines.length) {
          // Vérifier si la ligne suivante commence par 2 espaces au lieu de 4
          if (lines[targetLine + 1] && lines[targetLine + 1].match(/^  [a-z]/)) {
            lines[targetLine + 1] = '  ' + lines[targetLine + 1];
            content = lines.join('\n');
            modified = true;
            console.log(`      ✅ Appliqué (méthode alternative)`);
          } else {
            console.log(`      ⊗ Pattern non trouvé - peut-être déjà corrigé`);
          }
        }
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ Fichier sauvegardé`);
      results.success.push(fileConfig.file);
    } else {
      console.log(`   ℹ️  Aucune modification nécessaire`);
      results.skipped.push(fileConfig.file);
    }

  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}`);
    results.errors.push({ file: fileConfig.file, error: err.message });
  }

  console.log('');
}

// Traiter tous les fichiers
console.log('🔄 DÉBUT DES CORRECTIONS\n');
console.log('═'.repeat(60));
console.log('');

filesToFix.forEach(fixFile);

// Rapport final
console.log('═'.repeat(60));
console.log('\n📊 RAPPORT FINAL\n');

console.log(`✅ Succès: ${results.success.length}`);
results.success.forEach(f => console.log(`   - ${f}`));
console.log('');

console.log(`⊗ Ignorés: ${results.skipped.length}`);
results.skipped.forEach(f => console.log(`   - ${f}`));
console.log('');

console.log(`❌ Erreurs: ${results.errors.length}`);
results.errors.forEach(e => console.log(`   - ${e.file}: ${e.error}`));
console.log('');

if (results.success.length > 0) {
  console.log('✅ CORRECTIONS APPLIQUÉES!');
  console.log('');
  console.log('⏭️  PROCHAINES ÉTAPES:');
  console.log('   1. Vérifier: npm run lint');
  console.log('   2. Valider: homey app validate --level publish');
  console.log('   3. Si OK: git add . && git commit -m "fix: Correct remaining parsing errors"');
} else if (results.skipped.length > 0) {
  console.log('ℹ️  Tous les fichiers semblent déjà corrigés');
} else {
  console.log('⚠️  Aucune correction appliquée - vérifiez les logs ci-dessus');
}

console.log('');
console.log('✨ FIN DU TRAITEMENT');
