const fs = require('fs');
const path = require('path');

console.log('🚀 APPLICATION HARMONISATION - RENOMMAGE + MISE À JOUR');
console.log('═'.repeat(80));

// Charger le mapping
let mapping = JSON.parse(fs.readFileSync('./HARMONIZE_MAPPING.json', 'utf8'));

// Nettoyer les doublons (ex: cr2032_cr2032 → cr2032)
mapping = mapping.map(m => {
  let newName = m.new;
  
  // Supprimer les doublons de battery types
  newName = String(newName).replace(/_(cr2032)_\1/g, '_$1');
  newName = String(newName).replace(/_(cr2450)_\1/g, '_$1');
  newName = String(newName).replace(/_(aa)_\1/g, '_$1');
  newName = String(newName).replace(/_(battery)_\1/g, '_$1');
  newName = String(newName).replace(/_(ac)_\1/g, '_$1');
  newName = String(newName).replace(/_(dc)_\1/g, '_$1');
  
  // Nettoyer underscores multiples
  newName = String(newName).replace(/_+/g, '_').replace(/^_|_$/g, '');
  
  if (newName !== m.new) {
    console.log(`   🔧 Cleaned: ${m.new} → ${newName}`);
  }
  
  return {
    ...m,
    new: newName
  };
});

// Supprimer les entrées où old === new après nettoyage
mapping = mapping.filter(m => m.old !== m.new);

console.log(`\n📋 Application de ${mapping.length} renommages...\n`);

const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
let renamed = 0;
let updated = 0;

// 1. Renommer les dossiers
mapping.forEach((item, index) => {
  const oldPath = `./drivers/${item.old}`;
  const newPath = `./drivers/${item.new}`;
  
  if (fs.existsSync(oldPath)) {
    if (!fs.existsSync(newPath)) {
      fs.renameSync(oldPath, newPath);
      renamed++;
      console.log(`   ✅ ${item.old}`);
      console.log(`      → ${item.new}`);
    } else {
      console.log(`   ⚠️  ${item.old} → ${item.new} (destination existe déjà)`);
    }
  } else {
    console.log(`   ⚠️  ${item.old} (dossier introuvable)`);
  }
  
  if ((index + 1) % 10 === 0) {
    console.log(`   Progress: ${index + 1}/${mapping.length}...`);
  }
});

console.log('\n📝 2. MISE À JOUR APP.JSON...\n');

// Créer un dictionnaire pour recherche rapide
const renameDict = {};
mapping.forEach(m => {
  renameDict[m.old] = m.new;
});

// Fonction récursive pour remplacer dans tout l'objet
const replaceInObject = (obj) => {
  if (typeof obj === 'string') {
    let newStr = obj;
    Object.entries(renameDict).forEach(([oldName, newName]) => {
      if (newStr.includes(oldName)) {
        newStr = String(newStr).replace(new RegExp(oldName, 'g'), newName);
        updated++;
      }
    });
    return newStr;
  } else if (Array.isArray(obj)) {
    return obj.map(item => replaceInObject(item));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    Object.entries(obj).forEach(([key, value]) => {
      newObj[key] = replaceInObject(value);
    });
    return newObj;
  }
  return obj;
};

const updatedAppJson = replaceInObject(appJson);
fs.writeFileSync('./app.json', JSON.stringify(updatedAppJson, null, 2));

console.log(`   ✅ ${updated} références mises à jour dans app.json`);

console.log('\n═'.repeat(80));
console.log('📊 RÉSUMÉ');
console.log('═'.repeat(80));

console.log(`\n✅ Dossiers renommés: ${renamed}`);
console.log(`✅ Références mises à jour: ${updated}`);

// Sauvegarder le mapping nettoyé
fs.writeFileSync('./HARMONIZE_MAPPING_APPLIED.json', JSON.stringify(mapping, null, 2));
console.log(`\n📝 Mapping appliqué sauvegardé: HARMONIZE_MAPPING_APPLIED.json`);

console.log('\n✅ HARMONISATION APPLIQUÉE !');
console.log('\n🔍 Vérifier maintenant: homey app validate');
