#!/usr/bin/env node
'use strict';

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SOURCES_DIR = path.join(ROOT, 'scripts', 'sources');
const ENRICHERS_DIR = path.join(SOURCES_DIR, 'enrichers');
const REPORTS_DIR = path.join(ENRICHERS_DIR, 'reports');

// Base de connaissances pour l'enrichissement
const KNOWLEDGE_BASE = {
    manufacturers: {
        '_TZE200': 'Tuya Zigbee',
        '_TZ3000': 'Tuya Zigbee',
        '_TZ3210': 'Tuya Zigbee',
        'lumi': 'Xiaomi/Aqara',
        'tradfri': 'IKEA',
        'hue': 'Philips',
        'sonoff': 'ITEAD',
        'ledvance': 'LEDVANCE',
        'osram': 'OSRAM'
    },
    
    categories: {
        'light': ['bulb', 'strip', 'spot', 'ceiling', 'wall', 'floor'],
        'switch': ['switch', 'dimmer', 'relay', 'outlet'],
        'sensor': ['motion', 'contact', 'temperature', 'humidity', 'lux', 'smoke', 'leak'],
        'cover': ['curtain', 'blind', 'shade', 'garage'],
        'climate': ['thermostat', 'valve', 'fan'],
        'security': ['lock', 'siren', 'alarm'],
        'remote': ['remote', 'button', 'scene'],
        'meter': ['power', 'energy', 'gas', 'water']
    },
    
    capabilities: {
        'onoff': { type: 'boolean', writable: true, category: 'control' },
        'dim': { type: 'number', min: 0, max: 1, writable: true, category: 'control' },
        'light_temperature': { type: 'number', min: 0, max: 1000, writable: true, category: 'light' },
        'light_hue': { type: 'number', min: 0, max: 360, writable: true, category: 'light' },
        'light_saturation': { type: 'number', min: 0, max: 1, writable: true, category: 'light' },
        'measure_power': { type: 'number', unit: 'W', writable: false, category: 'measurement' },
        'measure_temperature': { type: 'number', unit: '°C', writable: false, category: 'measurement' },
        'measure_humidity': { type: 'number', unit: '%', writable: false, category: 'measurement' },
        'alarm_motion': { type: 'boolean', writable: false, category: 'security' },
        'alarm_contact': { type: 'boolean', writable: false, category: 'security' }
    }
};

// Fonction pour suggérer une catégorie basée sur le nom et les capacités
function suggestCategory(driverName, capabilities = []) {
    const name = driverName.toLowerCase();
    
    // Vérifier d'abord les capacités
    for (const [category, keywords] of Object.entries(KNOWLEDGE_BASE.categories)) {
        if (capabilities.some(cap => keywords.some(keyword => cap.toLowerCase().includes(keyword)))) {
            return category;
        }
    }
    
    // Vérifier le nom du driver
    for (const [category, keywords] of Object.entries(KNOWLEDGE_BASE.categories)) {
        if (keywords.some(keyword => name.includes(keyword))) {
            return category;
        }
    }
    
    // Heuristiques supplémentaires
    if (name.includes('bulb') || name.includes('light') || name.includes('lamp')) return 'light';
    if (name.includes('switch') || name.includes('dimmer')) return 'switch';
    if (name.includes('sensor') || name.includes('motion') || name.includes('temp')) return 'sensor';
    if (name.includes('curtain') || name.includes('blind')) return 'cover';
    if (name.includes('thermostat') || name.includes('valve')) return 'climate';
    if (name.includes('lock') || name.includes('siren')) return 'security';
    if (name.includes('remote') || name.includes('button')) return 'remote';
    if (name.includes('meter') || name.includes('power')) return 'meter';
    
    return 'other';
}

// Fonction pour suggérer un vendor basé sur le manufacturer
function suggestVendor(manufacturerName) {
    if (!manufacturerName) return 'generic';
    
    const manufacturer = manufacturerName.toLowerCase();
    
    for (const [pattern, vendor] of Object.entries(KNOWLEDGE_BASE.manufacturers)) {
        if (manufacturer.includes(pattern.toLowerCase())) {
            return vendor.toLowerCase().replace(/[^a-z0-9]/g, '');
        }
    }
    
    // Heuristiques supplémentaires
    if (manufacturer.includes('tuya') || manufacturer.startsWith('_tz') || manufacturer.startsWith('_ty')) {
        return 'tuya';
    }
    if (manufacturer.includes('aqara') || manufacturer.includes('lumi')) return 'aqara';
    if (manufacturer.includes('ikea') || manufacturer.includes('tradfri')) return 'ikea';
    if (manufacturer.includes('philips') || manufacturer.includes('hue')) return 'philips';
    if (manufacturer.includes('sonoff') || manufacturer.includes('itead')) return 'sonoff';
    if (manufacturer.includes('ledvance') || manufacturer.includes('osram')) return 'ledvance';
    if (manufacturer.includes('xiaomi') || manufacturer.includes('mi')) return 'xiaomi';
    
    return 'generic';
}

// Fonction pour suggérer des capacités basées sur le nom et la catégorie
function suggestCapabilities(driverName, category) {
    const name = driverName.toLowerCase();
    const suggestions = [];
    
    // Capacités de base selon la catégorie
    switch (category) {
        case 'light':
            suggestions.push('onoff');
            if (name.includes('dimmable') || name.includes('dimmer')) suggestions.push('dim');
            if (name.includes('rgb') || name.includes('color')) {
                suggestions.push('light_hue', 'light_saturation');
            }
            if (name.includes('tunable') || name.includes('temperature')) {
                suggestions.push('light_temperature');
            }
            break;
            
        case 'switch':
            suggestions.push('onoff');
            if (name.includes('dimmer') || name.includes('dimmable')) suggestions.push('dim');
            break;
            
        case 'sensor':
            if (name.includes('motion')) suggestions.push('alarm_motion');
            if (name.includes('contact')) suggestions.push('alarm_contact');
            if (name.includes('temperature')) suggestions.push('measure_temperature');
            if (name.includes('humidity')) suggestions.push('measure_humidity');
            if (name.includes('lux') || name.includes('light')) suggestions.push('measure_luminance');
            if (name.includes('smoke')) suggestions.push('alarm_smoke');
            if (name.includes('leak') || name.includes('water')) suggestions.push('alarm_water');
            break;
            
        case 'cover':
            suggestions.push('windowcoverings_set');
            if (name.includes('curtain')) suggestions.push('windowcoverings_tilt_set');
            break;
            
        case 'climate':
            if (name.includes('thermostat')) {
                suggestions.push('target_temperature', 'measure_temperature');
            }
            if (name.includes('valve')) suggestions.push('valve_set');
            break;
            
        case 'security':
            if (name.includes('lock')) suggestions.push('lock_state');
            if (name.includes('siren')) suggestions.push('alarm_siren');
            break;
            
        case 'meter':
            if (name.includes('power')) suggestions.push('measure_power');
            if (name.includes('energy')) suggestions.push('measure_power', 'meter_power');
            break;
    }
    
    return [...new Set(suggestions)];
}

// Fonction pour enrichir un driver
function enrichDriver(driverData) {
    console.log('🔍 Enrichissement du driver:', JSON.stringify(driverData, null, 2));
    
    if (!driverData || typeof driverData !== 'object') {
        console.warn('⚠️ Données de driver invalides:', driverData);
        return {
            id: 'unknown',
            name: 'Unknown Device',
            suggested_category: 'other',
            suggested_vendor: 'generic',
            suggested_capabilities: [],
            enrichment: {
                enriched_at: new Date().toISOString(),
                engine: 'ai-enrichment-engine',
                confidence: 0,
                error: 'Invalid driver data'
            }
        };
    }
    
    const enriched = { ...driverData };
    
    // Suggérer une catégorie
    if (!enriched.suggested_category) {
        const driverName = enriched.name || enriched.id || '';
        const capabilities = Array.isArray(enriched.capabilities) ? enriched.capabilities : [];
        console.log(`📂 Suggestion catégorie pour "${driverName}" avec capacités:`, capabilities);
        enriched.suggested_category = suggestCategory(driverName, capabilities);
        console.log(`✅ Catégorie suggérée: ${enriched.suggested_category}`);
    }
    
    // Suggérer un vendor
    if (!enriched.suggested_vendor) {
        const manufacturer = enriched.manufacturer || enriched.manufacturerName || '';
        console.log(`🏷️ Suggestion vendor pour manufacturer: "${manufacturer}"`);
        enriched.suggested_vendor = suggestVendor(manufacturer);
        console.log(`✅ Vendor suggéré: ${enriched.suggested_vendor}`);
    }
    
    // Suggérer des capacités
    if (!enriched.suggested_capabilities) {
        const driverName = enriched.name || enriched.id || '';
        const category = enriched.suggested_category || 'other';
        console.log(`⚙️ Suggestion capacités pour "${driverName}" (catégorie: ${category})`);
        enriched.suggested_capabilities = suggestCapabilities(driverName, category);
        console.log(`✅ Capacités suggérées:`, enriched.suggested_capabilities);
    }
    
    // Ajouter des métadonnées d'enrichissement
    enriched.enrichment = {
        enriched_at: new Date().toISOString(),
        engine: 'ai-enrichment-engine',
        confidence: calculateConfidence(enriched),
        suggestions: {
            category: enriched.suggested_category,
            vendor: enriched.suggested_vendor,
            capabilities: enriched.suggested_capabilities
        }
    };
    
    console.log('🎯 Driver enrichi:', JSON.stringify(enriched, null, 2));
    return enriched;
}

// Fonction pour calculer un score de confiance
function calculateConfidence(enriched) {
    let score = 0;
    
    if (enriched.suggested_category && enriched.suggested_category !== 'other') score += 30;
    if (enriched.suggested_vendor && enriched.suggested_vendor !== 'generic') score += 25;
    if (enriched.suggested_capabilities && enriched.suggested_capabilities.length > 0) score += 25;
    if (enriched.manufacturer) score += 10;
    if (enriched.model) score += 10;
    
    return Math.min(score, 100);
}

// Fonction pour enrichir tous les drivers
function enrichAllDrivers(driversData = []) {
    console.log('🚀 === DÉBUT DE L\'ENRICHISSEMENT IA ===');
    console.log('📊 Données d\'entrée:', JSON.stringify(driversData, null, 2));
    
    const list = Array.isArray(driversData) ? driversData : [];
    console.log(`📋 Liste des drivers à traiter: ${list.length} éléments`);
    
    if (list.length === 0) {
        console.log('⚠️ Aucun driver à traiter');
        return { enriched: [], summary: { total: 0, withCategory: 0, withVendor: 0, withCapabilities: 0, averageConfidence: 0 } };
    }
    
    console.log('🔄 Traitement des drivers...');
    const enriched = [];
    
    for (let i = 0; i < list.length; i++) {
        const driver = list[i];
        console.log(`\n📝 Traitement du driver ${i + 1}/${list.length}:`, driver);
        
        try {
            const enrichedDriver = enrichDriver(driver);
            enriched.push(enrichedDriver);
            console.log(`✅ Driver ${i + 1} enrichi avec succès`);
        } catch (error) {
            console.error(`❌ Erreur lors de l'enrichissement du driver ${i + 1}:`, error);
            // Ajouter un driver d'erreur
            enriched.push({
                ...driver,
                suggested_category: 'other',
                suggested_vendor: 'generic',
                suggested_capabilities: [],
                enrichment: {
                    enriched_at: new Date().toISOString(),
                    engine: 'ai-enrichment-engine',
                    confidence: 0,
                    error: error.message
                }
            });
        }
    }
    
    console.log(`\n📊 Calcul du résumé pour ${enriched.length} drivers...`);
    const summary = {
        total: enriched.length,
        withCategory: enriched.filter(d => d.suggested_category && d.suggested_category !== 'other').length,
        withVendor: enriched.filter(d => d.suggested_vendor && d.suggested_vendor !== 'generic').length,
        withCapabilities: enriched.filter(d => d.suggested_capabilities && d.suggested_capabilities.length > 0).length,
        averageConfidence: enriched.length ? (enriched.reduce((sum, d) => sum + (d.enrichment?.confidence || 0), 0) / enriched.length) : 0
    };
    
    console.log('🎯 Résumé calculé:', summary);
    return { enriched, summary };
}

// Fonction principale
function main() {
    try {
        // Créer les dossiers nécessaires
        [SOURCES_DIR, ENRICHERS_DIR, REPORTS_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
        
        console.log('📁 Dossiers créés avec succès');
        
        // Exemple d'utilisation
        const sampleDrivers = [
            { id: 'ts0601_bulb', name: 'TS0601 Bulb', manufacturer: '_TZE200_xxxxx' },
            { id: 'zigbee_sensor', name: 'Zigbee Temperature Sensor', manufacturer: 'generic' },
            { id: 'aqara_motion', name: 'Aqara Motion Sensor', manufacturer: 'lumi' }
        ];
        
        const results = enrichAllDrivers(sampleDrivers);
        
        // Sauvegarder le rapport
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(REPORTS_DIR, `ai-enrichment-${timestamp}.json`);
        
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        console.log(`\n✅ Rapport d'enrichissement IA sauvegardé: ${reportPath}`);
        
        console.log('\n🎉 Enrichissement IA terminé avec succès !');
        console.log(`📊 Résumé:`);
        console.log(`  🚗 Total drivers: ${results.summary.total}`);
        console.log(`  📂 Avec catégorie: ${results.summary.withCategory}`);
        console.log(`  🏷️ Avec vendor: ${results.summary.withVendor}`);
        console.log(`  ⚙️ Avec capacités: ${results.summary.withCapabilities}`);
        console.log(`  🎯 Confiance moyenne: ${results.summary.averageConfidence.toFixed(1)}%`);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'enrichissement IA:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { enrichAllDrivers, enrichDriver, suggestCategory, suggestVendor, suggestCapabilities };
