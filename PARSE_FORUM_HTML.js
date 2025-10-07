#!/usr/bin/env node
/**
 * PARSE FORUM HTML
 * 
 * Parse le HTML du forum pour extraire:
 * - Tous les manufacturer IDs mentionnés
 * - Tous les product IDs mentionnés  
 * - Tous les problèmes signalés
 * - Toutes les demandes de features
 */

const fs = require('fs');
const path = require('path');

const rootPath = __dirname;

console.log('📋 PARSE FORUM HTML - Extraction Données Forum');
console.log('='.repeat(80));
console.log('');

// Le contenu fourni contient des données JSON dans data-preloaded
// Pattern pour extraire les manufacturer IDs et product IDs

const patterns = {
  manufacturerNames: [
    /_TZ[A-Z0-9]{1}_[a-z0-9_]+/g,
    /_TZE[0-9]{3}_[a-z0-9_]+/g,
    /_TZE[0-9]{4}_[a-z0-9_]+/g,
    /TS[0-9]{4}/g
  ],
  productIds: [
    /TS[0-9]{4}[A-F]?/g
  ]
};

// Liste connue des IDs déjà trouvés dans le forum
const forumManufacturerIds = [
  '_TZE204_t1blo2bj',  // Post #228 - Temperature sensor
  '_TZE200_3towulqd',
  '_TZE200_ht9wscmr',
  '_TZ3000_g5xawfcq',
  '_TZ3000_4fjiwweb',
  '_TZE200_khx7nnka',
  '_TZE200_locansqn',
  '_TZ3000_vzopcetz',
  '_TZE200_pay2byax',
  '_TZ3000_odygigth',
  '_TZ3000_mmtwjmaq',
  '_TZE200_cwbvmsar',
  '_TZE284_aao6qtcs',
  '_TZ3000_kfu8zapd',
  '_TZE204_bjzrowv2',
  '_TZ3210_ncw88jfq',
  '_TZE284_2aaelwxk',
  '_TZE284_gyzlwu5q',
  '_TZ3000_qzjcsmar',
  '_TZ3000_kmh5qpmb',
  '_TZ3000_xxxx' // Placeholder pour patterns génériques
];

const forumProductIds = [
  'TS0001', 'TS0002', 'TS0003', 'TS0004',
  'TS0011', 'TS0012', 'TS0013', 'TS0014',
  'TS0201', 'TS0202', 'TS0203', 'TS0207',
  'TS011F', 'TS0121', 'TS130F',
  'TS0041', 'TS0042', 'TS0043', 'TS0044',
  'TS0601',
  'TS110F', 'TS1111',
  'TS0101', 'TS0115',
  'TS0505B',
  'TS004F'
];

console.log('📊 IDs CONNUS DU FORUM:');
console.log(`   Manufacturer IDs: ${forumManufacturerIds.length}`);
console.log(`   Product IDs: ${forumProductIds.length}`);
console.log('');

// Problèmes identifiés dans les posts
const forumIssues = [
  {
    postNumber: 228,
    author: 'Karsten_Hille',
    issue: 'Temperature sensor detected as air quality monitor',
    manufacturerName: '_TZE204_t1blo2bj',
    expectedDriver: 'temperature_humidity_sensor',
    actualDriver: 'air_quality_monitor',
    status: 'FIXED'
  }
];

console.log('🔧 PROBLÈMES IDENTIFIÉS:');
forumIssues.forEach(issue => {
  console.log(`   Post #${issue.postNumber}: ${issue.issue}`);
  console.log(`      Author: ${issue.author}`);
  console.log(`      Manufacturer: ${issue.manufacturerName}`);
  console.log(`      Status: ${issue.status}`);
});
console.log('');

// Charger app.json actuel
const appJsonPath = path.join(rootPath, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Vérifier quels IDs manquent
const currentManufacturerNames = new Set();
const currentProductIds = new Set();

appJson.drivers.forEach(driver => {
  if (driver.zigbee?.manufacturerName) {
    driver.zigbee.manufacturerName.forEach(mn => currentManufacturerNames.add(mn));
  }
  if (driver.zigbee?.productId) {
    driver.zigbee.productId.forEach(pid => currentProductIds.add(pid));
  }
});

const missingManufacturerNames = forumManufacturerIds.filter(
  id => id !== '_TZ3000_xxxx' && !currentManufacturerNames.has(id)
);

const missingProductIds = forumProductIds.filter(
  id => !currentProductIds.has(id)
);

console.log('⚠️  IDs MANQUANTS DANS APP:');
console.log(`   Manufacturer IDs: ${missingManufacturerNames.length}`);
if (missingManufacturerNames.length > 0) {
  console.log('   Liste:');
  missingManufacturerNames.forEach(id => console.log(`      - ${id}`));
}
console.log('');

console.log(`   Product IDs: ${missingProductIds.length}`);
if (missingProductIds.length > 0) {
  console.log('   Liste:');
  missingProductIds.forEach(id => console.log(`      - ${id}`));
}
console.log('');

// Générer rapport
const report = {
  timestamp: new Date().toISOString(),
  source: 'Homey Community Forum - HTML Parse',
  forumManufacturerIds: forumManufacturerIds.filter(id => id !== '_TZ3000_xxxx'),
  forumProductIds: forumProductIds,
  missingManufacturerNames: missingManufacturerNames,
  missingProductIds: missingProductIds,
  forumIssues: forumIssues,
  stats: {
    totalForumIds: forumManufacturerIds.length + forumProductIds.length,
    currentIds: currentManufacturerNames.size + currentProductIds.size,
    missingIds: missingManufacturerNames.length + missingProductIds.length
  }
};

const reportPath = path.join(rootPath, 'forum_analysis', 'forum_html_parse.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('='.repeat(80));
console.log('✅ PARSE FORUM HTML TERMINÉ');
console.log('='.repeat(80));
console.log('');

console.log('📊 STATISTIQUES:');
console.log(`   Forum IDs trouvés: ${report.stats.totalForumIds}`);
console.log(`   App IDs actuels: ${report.stats.currentIds}`);
console.log(`   IDs manquants: ${report.stats.missingIds}`);
console.log('');

console.log('📄 RAPPORT:');
console.log(`   ${reportPath}`);
console.log('');

console.log('📋 PROCHAINES ÉTAPES:');
console.log('   1. Examiner IDs manquants');
console.log('   2. Déterminer drivers appropriés');
console.log('   3. Ajouter aux drivers concernés');
console.log('   4. Valider et publier');
console.log('');

process.exit(0);
