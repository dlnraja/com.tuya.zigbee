#!/usr/bin/env node

/**
 * CONTEXT IMAGE ANALYZER v2.0
 * Analyse contextuelle images vs types produits pour cohérence
 */

const fs = require('fs');
const path = require('path');

const IMAGE_CONTEXTS = {
    // SWITCHES - Images doivent correspondre au nombre de gangs
    'wall_switch_3gang_ac': {
        expected: '3 buttons visible',
        colors: ['#4CAF50', '#8BC34A'], // Green tones
        elements: ['3 switch elements', 'wall plate design']
    },
    'wireless_switch_2gang_cr2032': {
        expected: '2 buttons + battery indicator', 
        colors: ['#607D8B', '#455A64'], // Automation gray-blue
        elements: ['2 button elements', 'CR2032 battery', 'wireless symbol']
    },
    
    // SENSORS - Images selon fonction
    'motion_sensor': {
        expected: 'PIR dome or radar element',
        colors: ['#2196F3', '#03A9F4'], // Blue sensors
        elements: ['detection dome', 'sensor housing']
    },
    'soil_moisture_sensor': {
        expected: 'Soil probe with moisture indication',
        colors: ['#8BC34A', '#4CAF50'], // Green nature
        elements: ['probe design', 'moisture symbols']
    }
};

async function analyzeImageContexts() {
    console.log('🔍 ANALYZING Image vs Context Coherence...');
    
    const driversPath = path.join(__dirname, '../../drivers');
    const drivers = await fs.readdir(driversPath);
    const issues = [];
    
    for (const driver of drivers) {
        const driverPath = path.join(driversPath, driver);
        const imagesPath = path.join(driverPath, 'assets', 'images');
        
        if (fs.existsSync(imagesPath)) {
            const context = IMAGE_CONTEXTS[driver];
            if (context) {
                console.log(`📊 Analyzing ${driver}...`);
                // Vérification cohérence image-contexte
                issues.push({
                    driver,
                    expected: context.expected,
                    status: 'needs_verification'
                });
            }
        }
    }
    
    return issues;
}

if (require.main === module) {
    analyzeImageContexts().then(issues => {
        console.log('📋 Image Context Issues:', issues.length);
        console.log(JSON.stringify(issues, null, 2));
    });
}

module.exports = { analyzeImageContexts, IMAGE_CONTEXTS };
