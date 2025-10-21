#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 AUTO-FIX DRIVERS - CORRECTION AUTOMATIQUE\n');
console.log('=' .repeat(70) + '\n');

const stats = {
    total: 0,
    iconsCopied: 0,
    idsAdded: 0,
    skipped: 0,
    errors: 0
};

function fixDriver(driverName) {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const assetsDir = path.join(driverPath, 'assets');
    const driverCompose = path.join(driverPath, 'driver.compose.json');
    const driverJson = path.join(driverPath, 'driver.json');
    
    let fixed = [];
    
    // 1. Copier small.png vers icon.svg si manquant
    const iconSvg = path.join(assetsDir, 'icon.svg');
    const smallPng = path.join(assetsDir, 'small.png');
    
    if (!fs.existsSync(iconSvg) && fs.existsSync(smallPng)) {
        // Créer un SVG simple qui pointe vers le PNG
        // OU copier le small.png comme icon.png
        // Pour Homey, on peut créer un SVG wrapper ou juste renommer
        
        // Solution: Créer un SVG simple pointant vers l'emoji du driver
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#1E88E5" rx="15"/>
  <text x="50" y="70" font-size="60" text-anchor="middle" fill="white">📱</text>
</svg>`;
        
        try {
            fs.writeFileSync(iconSvg, svgContent);
            stats.iconsCopied++;
            fixed.push('✅ icon.svg créé');
        } catch (e) {
            stats.errors++;
            fixed.push(`❌ Erreur création icon.svg: ${e.message}`);
        }
    }
    
    // 2. Ajouter driver.id si manquant dans config
    let configPath = null;
    let config = null;
    
    if (fs.existsSync(driverCompose)) {
        configPath = driverCompose;
    } else if (fs.existsSync(driverJson)) {
        configPath = driverJson;
    }
    
    if (configPath) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            if (!config.id) {
                config.id = driverName;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                stats.idsAdded++;
                fixed.push('✅ driver.id ajouté');
            }
        } catch (e) {
            stats.errors++;
            fixed.push(`❌ Erreur config: ${e.message}`);
        }
    }
    
    return fixed;
}

// Scanner tous les drivers
const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    const stat = fs.statSync(path.join(DRIVERS_DIR, d));
    return stat.isDirectory() && !d.startsWith('.');
}).sort();

console.log(`🔧 Correction de ${drivers.length} drivers...\n`);

for (const driver of drivers) {
    stats.total++;
    const fixes = fixDriver(driver);
    
    if (fixes.length > 0) {
        console.log(`🔧 ${driver}:`);
        fixes.forEach(fix => console.log(`   ${fix}`));
    } else {
        stats.skipped++;
        if (stats.skipped % 20 === 0) {
            console.log(`✅ ${stats.skipped} drivers déjà OK...`);
        }
    }
}

console.log('\n' + '='.repeat(70) + '\n');
console.log('📊 RÉSULTATS:\n');
console.log(`   Total drivers: ${stats.total}`);
console.log(`   Icons créés: ${stats.iconsCopied}`);
console.log(`   IDs ajoutés: ${stats.idsAdded}`);
console.log(`   Déjà OK: ${stats.skipped}`);
console.log(`   Erreurs: ${stats.errors}`);

console.log('\n✅ Corrections terminées!\n');
