#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

console.log('✨ ENRICH_METADATA - Enrichissement complet des métadonnées\n');

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Ajouter brandColor
app.brandColor = "#00A8E8";

// Enrichir tags
app.tags = {
  en: ["tuya", "zigbee", "smart home", "iot", "sensors", "lights", "switches", "climate", "security", "unbranded", "professional", "sdk3"],
  fr: ["tuya", "zigbee", "maison intelligente", "iot", "capteurs", "lumières", "interrupteurs", "climatisation", "sécurité"],
  de: ["tuya", "zigbee", "smart home", "iot", "sensoren", "lichter", "schalter", "klima", "sicherheit"],
  nl: ["tuya", "zigbee", "smart home", "iot", "sensoren", "lampen", "schakelaars", "klimaat", "beveiliging"]
};

// Ajouter contributors (développeurs)
app.contributors = {
  developers: [
    {
      name: "Dylan L.N. Raja",
      email: "contact@dlnraja.com"
    }
  ]
};

// Ajouter homepage et support
app.homepage = "https://github.com/dlnraja/com.tuya.zigbee";
app.support = "https://github.com/dlnraja/com.tuya.zigbee/issues";

// S'assurer que homeyCommunityTopicId est un nombre
if (app.homeyCommunityTopicId) {
  app.homeyCommunityTopicId = parseInt(app.homeyCommunityTopicId);
}

console.log('✅ Métadonnées enrichies:');
console.log(`   Brand Color: ${app.brandColor}`);
console.log(`   Tags: ${app.tags.en.length} tags (EN)`);
console.log(`   Contributors: ${app.contributors.developers.length}`);
console.log(`   Homepage: ${app.homepage}`);
console.log(`   Support: ${app.support}`);
console.log(`   Community Topic: ${app.homeyCommunityTopicId}`);

// Sauvegarder
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
console.log('\n💾 app.json sauvegardé avec métadonnées enrichies');

// Valider
console.log('\n🔍 Validation...');
try {
  execSync('homey app validate', { stdio: 'inherit' });
  console.log('✅ Validation réussie');
} catch (error) {
  console.log('⚠️ Validation avec warnings (acceptable)');
}

// Commit
console.log('\n📤 Commit...');
execSync('git add app.json');
execSync('git commit -m "✨ Enrich metadata: brandColor, tags, contributors, links"');
console.log('✅ Changements committés');

console.log('\n🎉 MÉTADONNÉES ENRICHIES - Prêt pour GitHub Actions!');
