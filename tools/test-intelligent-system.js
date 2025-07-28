const fs = require('fs');
const path = require('path');

console.log('Testing Intelligent Driver Determination System');

// Load intelligent driver system
const systemData = JSON.parse(fs.readFileSync('ref/intelligent-driver-system.json', 'utf8'));
const system = systemData.intelligent_driver_system;

console.log('System loaded successfully');
console.log('Manufacturers:', Object.keys(system.referentials.manufacturers).length);
console.log('Product Categories:', Object.keys(system.referentials.product_categories).length);

// Device detection function
function detectDevice(model, manufacturer, clusters = []) {
    let confidence = 0;
    let detectedManufacturer = 'unknown';
    let detectedCategory = 'unknown';
    let detectedCapabilities = ['onoff'];
    
    // Manufacturer detection
    for (const [key, mfg] of Object.entries(system.referentials.manufacturers)) {
        if (mfg.aliases.includes(manufacturer) || 
            mfg.model_prefixes.some(prefix => model.startsWith(prefix))) {
            detectedManufacturer = key;
            confidence += 0.3;
            break;
        }
    }
    
    // Category detection based on clusters
    for (const [key, category] of Object.entries(system.referentials.product_categories)) {
        const clusterMatch = category.clusters.every(cluster => clusters.includes(cluster));
        if (clusterMatch) {
            detectedCategory = key;
            detectedCapabilities = category.capabilities;
            confidence += 0.4;
            break;
        }
    }
    
    // If no category found by clusters, try by model
    if (detectedCategory === 'unknown') {
        for (const [key, category] of Object.entries(system.referentials.product_categories)) {
            for (const pattern of category.model_patterns) {
                const cleanPattern = pattern.replace('*', '');
                if (cleanPattern.length > 0 && model.includes(cleanPattern)) {
                    detectedCategory = key;
                    detectedCapabilities = category.capabilities;
                    confidence += 0.3;
                    break;
                }
            }
            if (detectedCategory !== 'unknown') break;
        }
    }
    
    return {
        manufacturer: detectedManufacturer,
        category: detectedCategory,
        capabilities: detectedCapabilities,
        confidence: Math.min(confidence, 1.0),
        model: model,
        original_manufacturer: manufacturer,
        clusters: clusters
    };
}

// Test devices
const testDevices = [
    { model: 'TS0001', manufacturer: 'Tuya', clusters: ['genBasic', 'genOnOff'] },
    { model: 'TS0207', manufacturer: 'Zemismart', clusters: ['genBasic', 'genOnOff', 'genLevelCtrl'] },
    { model: 'BW-SHP13', manufacturer: 'BlitzWolf', clusters: ['genBasic', 'genOnOff', 'genPowerCfg'] },
    { model: 'MS-104BZ', manufacturer: 'Moes', clusters: ['genBasic', 'genOnOff', 'genLevelCtrl'] },
    { model: 'GS-SD01', manufacturer: 'Gosund', clusters: ['genBasic', 'genOnOff', 'genPowerCfg'] },
    { model: 'MR-SS01', manufacturer: 'Meross', clusters: ['genBasic', 'genOnOff', 'genLevelCtrl'] },
    { model: 'TK-SS01', manufacturer: 'Teckin', clusters: ['genBasic', 'genOnOff', 'genPowerCfg'] },
    { model: 'UNKNOWN-001', manufacturer: 'Unknown', clusters: ['genBasic', 'genOnOff'] }
];

console.log('\nTesting device detection:');
const results = testDevices.map(device => {
    const detected = detectDevice(device.model, device.manufacturer, device.clusters);
    console.log(`${device.model} -> ${detected.manufacturer} ${detected.category} (Confidence: ${detected.confidence})`);
    return detected;
});

// Save results
fs.writeFileSync('ref/detected-devices-test.json', JSON.stringify(results, null, 2));
console.log('\nResults saved to ref/detected-devices-test.json');

// Generate drivers
console.log('\nGenerating drivers...');
const generatedDrivers = results.map(device => {
    const manufacturer = system.referentials.manufacturers[device.manufacturer];
    const category = system.referentials.product_categories[device.category];
    
    let strategy = 'fallback';
    if (device.confidence >= 0.8) strategy = 'optimized';
    else if (device.confidence >= 0.6) strategy = 'compatible';
    
    const driver = {
        id: `${device.manufacturer}-${device.category}-${device.model.toLowerCase()}`,
        title: {
            en: `${manufacturer?.name || 'Unknown'} ${category?.name || 'Device'} - ${device.model}`,
            fr: `${manufacturer?.name || 'Inconnu'} ${category?.name || 'Appareil'} - ${device.model}`,
            nl: `${manufacturer?.name || 'Onbekend'} ${category?.name || 'Apparaat'} - ${device.model}`,
            ta: `${manufacturer?.name || 'தெரியாத'} ${category?.name || 'சாதனம்'} - ${device.model}`
        },
        class: 'device',
        capabilities: device.capabilities,
        images: {
            small: `/assets/images/small/${device.manufacturer}-${device.category}.png`,
            large: `/assets/images/large/${device.manufacturer}-${device.category}.png`
        },
        pairing: [
            {
                id: 'generic_switch',
                title: {
                    en: 'Generic Switch',
                    fr: 'Interrupteur Générique',
                    nl: 'Generieke Schakelaar',
                    ta: 'பொதுவான சுவிட்ச்'
                },
                capabilities: device.capabilities,
                clusters: category?.clusters || ['genBasic', 'genOnOff']
            }
        ],
        settings: [
            {
                id: 'manufacturer',
                type: 'text',
                title: {
                    en: 'Manufacturer',
                    fr: 'Fabricant',
                    nl: 'Fabrikant',
                    ta: 'உற்பத்தியாளர்'
                },
                value: manufacturer?.name || 'Unknown'
            },
            {
                id: 'model',
                type: 'text',
                title: {
                    en: 'Model',
                    fr: 'Modèle',
                    nl: 'Model',
                    ta: 'மாடல்'
                },
                value: device.model
            }
        ],
        flow: {
            triggers: [],
            conditions: [],
            actions: []
        }
    };
    
    // Add capabilities based on category
    if (category?.capabilities?.includes('dim')) {
        driver.flow.actions.push({
            id: 'dim',
            title: {
                en: 'Set Dim Level',
                fr: 'Définir le Niveau de Luminosité',
                nl: 'Dimniveau Instellen',
                ta: 'மங்கல் நிலையை அமைக்கவும்'
            },
            args: [
                {
                    name: 'level',
                    type: 'number',
                    title: {
                        en: 'Level',
                        fr: 'Niveau',
                        nl: 'Niveau',
                        ta: 'நிலை'
                    },
                    min: 0,
                    max: 100
                }
            ]
        });
    }
    
    if (category?.capabilities?.includes('measure_power')) {
        driver.flow.triggers.push({
            id: 'power_changed',
            title: {
                en: 'Power Changed',
                fr: 'Puissance Modifiée',
                nl: 'Vermogen Gewijzigd',
                ta: 'சக்தி மாற்றப்பட்டது'
            }
        });
    }
    
    console.log(`Generated driver: ${driver.id} (${strategy})`);
    return { device, driver, strategy };
});

// Create drivers directory
const driversDir = 'drivers/intelligent';
if (!fs.existsSync(driversDir)) {
    fs.mkdirSync(driversDir, { recursive: true });
}

// Save each driver
generatedDrivers.forEach(({ device, driver }) => {
    const driverPath = path.join(driversDir, `${driver.id}.driver.compose.json`);
    fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2));
});

// Summary
const summary = {
    generated_at: new Date().toISOString(),
    total_drivers: generatedDrivers.length,
    by_confidence: {
        high: generatedDrivers.filter(d => d.device.confidence >= 0.8).length,
        medium: generatedDrivers.filter(d => d.device.confidence >= 0.6 && d.device.confidence < 0.8).length,
        low: generatedDrivers.filter(d => d.device.confidence < 0.6).length
    },
    by_manufacturer: {},
    by_category: {},
    by_strategy: {
        optimized: generatedDrivers.filter(d => d.strategy === 'optimized').length,
        compatible: generatedDrivers.filter(d => d.strategy === 'compatible').length,
        fallback: generatedDrivers.filter(d => d.strategy === 'fallback').length
    }
};

generatedDrivers.forEach(({ device, driver }) => {
    summary.by_manufacturer[device.manufacturer] = (summary.by_manufacturer[device.manufacturer] || 0) + 1;
    summary.by_category[device.category] = (summary.by_category[device.category] || 0) + 1;
});

fs.writeFileSync('ref/driver-generation-summary-test.json', JSON.stringify(summary, null, 2));

console.log('\nDriver generation completed:');
console.log(`- Total drivers: ${summary.total_drivers}`);
console.log(`- High confidence: ${summary.by_confidence.high}`);
console.log(`- Medium confidence: ${summary.by_confidence.medium}`);
console.log(`- Low confidence: ${summary.by_confidence.low}`);
console.log(`- Optimized strategy: ${summary.by_strategy.optimized}`);
console.log(`- Compatible strategy: ${summary.by_strategy.compatible}`);
console.log(`- Fallback strategy: ${summary.by_strategy.fallback}`);

console.log('\nBy Manufacturer:');
Object.entries(summary.by_manufacturer).forEach(([manufacturer, count]) => {
    console.log(`- ${manufacturer}: ${count} drivers`);
});

console.log('\nBy Category:');
Object.entries(summary.by_category).forEach(([category, count]) => {
    console.log(`- ${category}: ${count} drivers`);
});

console.log('\nIntelligent driver determination system test completed successfully!'); 