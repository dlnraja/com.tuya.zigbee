const fs = require('fs');

console.log('🔧 CORRECTION DÉFINITIVE - TOUS CHEMINS APP.JSON');

// Lire app.json
let appJson = fs.readFileSync('app.json', 'utf8');
const original = appJson;

// Corriger TOUS les chemins absolus vers relatifs
appJson = appJson.replace(/\"\/drivers\/[^\"]+\/assets\/images\/small\.png\"/g, '"./assets/small.png"');
appJson = appJson.replace(/\"\/drivers\/[^\"]+\/assets\/images\/large\.png\"/g, '"./assets/images/large.png"');

// Compter les corrections
const fixes = (original.match(/\"\/drivers\/[^\"]+\/assets\/images\//g) || []).length;

// Sauvegarder
fs.writeFileSync('app.json', appJson, 'utf8');

console.log(`✅ ${fixes} chemins absolus corrigés vers relatifs`);
console.log('🚀 app.json maintenant conforme SDK3!');
