#!/usr/bin/env node
'use strict';

'use strict';
/**
 * Script de test pour l'AI Enrichment Engine
 * Teste avec des données réelles et affiche les résultats en mode verbose
 */
const { enrichAllDrivers, enrichDriver } = require('./sources/enrichers/ai-enrichment-engine');

console.log('🧪 === TEST AI ENRICHMENT ENGINE ===\n');

// Test avec des données réelles
const testDrivers = [
    {
        id: 'ts0601_bulb',
        name: 'TS0601 Bulb',
        manufacturer: '_TZE200_xxxxx',
        capabilities: ['onoff', 'dim']
    },
    {
        id: 'zigbee_sensor',
        name: 'Zigbee Temperature Sensor',
        manufacturer: 'generic',
        capabilities: ['measure_temperature']
    },
    {
        id: 'aqara_motion',
        name: 'Aqara Motion Sensor',
        manufacturer: 'lumi',
        capabilities: ['alarm_motion']
    },
    {
        id: 'tuya_switch',
        name: 'Tuya Smart Switch',
        manufacturer: '_TZ3000_xxxxx',
        capabilities: ['onoff', 'measure_power']
    },
    {
        id: 'ikea_curtain',
        name: 'IKEA Curtain',
        manufacturer: 'tradfri',
        capabilities: ['windowcoverings_set', 'windowcoverings_state']
    }
];

console.log('📋 Drivers de test:');
testDrivers.forEach((driver, index) => {
    console.log(`  ${index + 1}. ${driver.name} (${driver.manufacturer})`);
});
console.log('');

// Test de l'enrichissement complet
console.log('🚀 Test de l\'enrichissement complet...\n');
const results = enrichAllDrivers(testDrivers);

console.log('\n🎉 === RÉSULTATS DU TEST ===');
console.log(`📊 Total drivers traités: ${results.summary.total}`);
console.log(`📂 Avec catégorie: ${results.summary.withCategory}`);
console.log(`🏷️ Avec vendor: ${results.summary.withVendor}`);
console.log(`⚙️ Avec capacités: ${results.summary.withCapabilities}`);
console.log(`🎯 Confiance moyenne: ${results.summary.averageConfidence.toFixed(1)}%`);

console.log('\n📝 Détail des drivers enrichis:');
results.enriched.forEach((driver, index) => {
    console.log(`\n  ${index + 1}. ${driver.name || driver.id}`);
    console.log(`     📂 Catégorie: ${driver.suggested_category}`);
    console.log(`     🏷️ Vendor: ${driver.suggested_vendor}`);
    console.log(`     ⚙️ Capacités suggérées: ${driver.suggested_capabilities.join(', ')}`);
    console.log(`     🎯 Confiance: ${driver.enrichment?.confidence || 0}%`);
    if (driver.enrichment?.error) {
        console.log(`     ❌ Erreur: ${driver.enrichment.error}`);
    }
});

console.log('\n✅ Test terminé avec succès !');
