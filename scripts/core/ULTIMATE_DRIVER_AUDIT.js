#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔍 ULTIMATE DRIVER AUDIT - DEEP VERIFICATION\n');
console.log('=' .repeat(70) + '\n');

const issues = [];
const warnings = [];
const stats = {
    total: 0,
    valid: 0,
    withIssues: 0,
    withWarnings: 0
};

function checkDriver(driverName) {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const driverIssues = [];
    const driverWarnings = [];
    
    // 1. Vérifier structure de base
    const deviceJs = path.join(driverPath, 'device.js');
    const driverCompose = path.join(driverPath, 'driver.compose.json');
    const driverJson = path.join(driverPath, 'driver.json');
    const assetsDir = path.join(driverPath, 'assets');
    
    if (!fs.existsSync(deviceJs)) {
        driverIssues.push('❌ device.js manquant');
    }
    
    if (!fs.existsSync(driverCompose) && !fs.existsSync(driverJson)) {
        driverIssues.push('❌ driver.compose.json ou driver.json manquant');
    }
    
    if (!fs.existsSync(assetsDir)) {
        driverIssues.push('❌ Dossier assets/ manquant');
        return { issues: driverIssues, warnings: driverWarnings };
    }
    
    // 2. Vérifier images requises
    const requiredImages = ['icon.svg', 'small.png', 'large.png'];
    requiredImages.forEach(img => {
        const imgPath = path.join(assetsDir, img);
        if (!fs.existsSync(imgPath)) {
            driverIssues.push(`❌ Image manquante: ${img}`);
        } else {
            // Vérifier taille fichier (pas vide)
            const stats = fs.statSync(imgPath);
            if (stats.size < 100) {
                driverWarnings.push(`⚠️  ${img} semble vide ou corrompu (${stats.size} bytes)`);
            }
        }
    });
    
    // 3. Analyser driver.compose.json ou driver.json
    let driverConfig = null;
    try {
        if (fs.existsSync(driverCompose)) {
            driverConfig = JSON.parse(fs.readFileSync(driverCompose, 'utf8'));
        } else if (fs.existsSync(driverJson)) {
            driverConfig = JSON.parse(fs.readFileSync(driverJson, 'utf8'));
        }
        
        if (driverConfig) {
            // Vérifier champs essentiels
            if (!driverConfig.id) {
                driverIssues.push('❌ driver.id manquant dans config');
            } else if (driverConfig.id !== driverName) {
                driverWarnings.push(`⚠️  driver.id (${driverConfig.id}) != nom dossier (${driverName})`);
            }
            
            if (!driverConfig.name || typeof driverConfig.name !== 'object') {
                driverIssues.push('❌ driver.name manquant ou invalide');
            }
            
            if (!driverConfig.class) {
                driverIssues.push('❌ driver.class manquant');
            }
            
            if (!driverConfig.capabilities || !Array.isArray(driverConfig.capabilities) || driverConfig.capabilities.length === 0) {
                driverWarnings.push('⚠️  Aucune capability définie');
            }
            
            // Vérifier manufacturer IDs
            if (!driverConfig.zigbee || !driverConfig.zigbee.manufacturerName) {
                driverWarnings.push('⚠️  zigbee.manufacturerName manquant');
            }
            
            if (!driverConfig.zigbee || !driverConfig.zigbee.productId || driverConfig.zigbee.productId.length === 0) {
                driverWarnings.push('⚠️  zigbee.productId vide ou manquant');
            }
        }
    } catch (e) {
        driverIssues.push(`❌ Erreur parsing JSON: ${e.message}`);
    }
    
    // 4. Analyser device.js
    if (fs.existsSync(deviceJs)) {
        try {
            const deviceCode = fs.readFileSync(deviceJs, 'utf8');
            
            // Vérifier imports de base
            if (!deviceCode.includes('require') && !deviceCode.includes('import')) {
                driverWarnings.push('⚠️  device.js sans imports (peut être vide)');
            }
            
            // Vérifier class/module.exports
            if (!deviceCode.includes('class') && !deviceCode.includes('module.exports')) {
                driverWarnings.push('⚠️  device.js sans class ou module.exports');
            }
            
            // Vérifier longueur (trop court = probablement vide)
            if (deviceCode.length < 100) {
                driverWarnings.push(`⚠️  device.js très court (${deviceCode.length} chars)`);
            }
        } catch (e) {
            driverWarnings.push(`⚠️  Erreur lecture device.js: ${e.message}`);
        }
    }
    
    // 5. Vérifier cohérence nom/type
    const name = driverName.toLowerCase();
    const expectedClasses = {
        'light': ['ceiling_light', 'bulb', 'light_', 'dimmer', 'led'],
        'socket': ['plug', 'socket', 'outlet'],
        'sensor': ['sensor', 'detector', 'monitor', 'pir', 'motion', 'temperature', 'humidity', 'co2', 'air_quality'],
        'curtain': ['curtain', 'blind', 'shade'],
        'lock': ['lock'],
        'fan': ['fan'],
        'thermostat': ['thermostat', 'trv'],
        'button': ['button', 'switch', 'scene', 'remote', 'wireless']
    };
    
    if (driverConfig && driverConfig.class) {
        let matched = false;
        for (const [className, keywords] of Object.entries(expectedClasses)) {
            if (keywords.some(kw => name.includes(kw))) {
                if (driverConfig.class !== className) {
                    // Cas spécial: switch peut être 'socket' ou 'light'
                    if (name.includes('switch') && !['socket', 'light', 'button'].includes(driverConfig.class)) {
                        driverWarnings.push(`⚠️  Class '${driverConfig.class}' inhabituelle pour nom '${driverName}'`);
                    } else if (!name.includes('switch')) {
                        driverWarnings.push(`⚠️  Class '${driverConfig.class}' != attendue '${className}' pour '${driverName}'`);
                    }
                }
                matched = true;
                break;
            }
        }
    }
    
    return { issues: driverIssues, warnings: driverWarnings };
}

// Scanner tous les drivers
const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    const stat = fs.statSync(path.join(DRIVERS_DIR, d));
    return stat.isDirectory() && !d.startsWith('.');
}).sort();

console.log(`📋 Analyse de ${drivers.length} drivers...\n`);

for (const driver of drivers) {
    stats.total++;
    const result = checkDriver(driver);
    
    if (result.issues.length > 0) {
        stats.withIssues++;
        issues.push({
            driver,
            problems: result.issues
        });
        console.log(`❌ ${driver}`);
        result.issues.forEach(issue => console.log(`   ${issue}`));
    } else if (result.warnings.length > 0) {
        stats.withWarnings++;
        warnings.push({
            driver,
            warnings: result.warnings
        });
        console.log(`⚠️  ${driver}`);
        result.warnings.forEach(warn => console.log(`   ${warn}`));
    } else {
        stats.valid++;
        // Afficher seulement tous les 20 drivers valides pour ne pas spammer
        if (stats.valid % 20 === 0) {
            console.log(`✅ ${stats.valid} drivers valides...`);
        }
    }
}

console.log('\n' + '='.repeat(70) + '\n');

// Rapport final
console.log('📊 STATISTIQUES FINALES:\n');
console.log(`   Total drivers analysés: ${stats.total}`);
console.log(`   ✅ Valides (0 problèmes): ${stats.valid} (${Math.round(stats.valid/stats.total*100)}%)`);
console.log(`   ⚠️  Avec warnings: ${stats.withWarnings} (${Math.round(stats.withWarnings/stats.total*100)}%)`);
console.log(`   ❌ Avec issues critiques: ${stats.withIssues} (${Math.round(stats.withIssues/stats.total*100)}%)`);

console.log('\n' + '='.repeat(70) + '\n');

if (issues.length > 0) {
    console.log('🚨 ISSUES CRITIQUES À CORRIGER:\n');
    issues.forEach(item => {
        console.log(`\n❌ ${item.driver}:`);
        item.problems.forEach(p => console.log(`   ${p}`));
    });
}

// Sauvegarder rapport détaillé
const reportDir = path.join(ROOT, 'reports');
if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
}

const reportPath = path.join(reportDir, 'ULTIMATE_AUDIT_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    stats,
    issues,
    warnings,
    summary: {
        totalDrivers: stats.total,
        validDrivers: stats.valid,
        needsAttention: stats.withIssues + stats.withWarnings,
        healthScore: Math.round(stats.valid / stats.total * 100)
    }
}, null, 2));

console.log(`\n✅ Rapport détaillé sauvegardé: ${reportPath}`);

// Exit code
if (stats.withIssues > 0) {
    console.log('\n⚠️  Il y a des issues critiques à corriger!');
    process.exit(1);
} else if (stats.withWarnings > 5) {
    console.log('\n⚠️  Il y a plusieurs warnings à vérifier.');
    process.exit(0);
} else {
    console.log('\n🎉 Tous les drivers sont en bon état!');
    process.exit(0);
}
