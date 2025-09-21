const fs = require('fs');

console.log('🔍 COHERENCE CHECKER');

let stats = {drivers: 0, withImages: 0, missing: [], issues: []};

fs.readdirSync('drivers').forEach(d => {
    stats.drivers++;
    const assets = `drivers/${d}/assets`;
    
    if (fs.existsSync(assets)) {
        const images = ['small.svg', 'large.svg', 'xlarge.svg'];
        const existing = images.filter(img => fs.existsSync(`${assets}/${img}`));
        
        if (existing.length === 3) {
            stats.withImages++;
        } else {
            stats.missing.push(`${d}: manque ${images.filter(img => !existing.includes(img)).join(', ')}`);
        }
    } else {
        stats.missing.push(`${d}: aucun dossier assets`);
    }
});

console.log(`📊 RÉSULTATS:`);
console.log(`  • Drivers totaux: ${stats.drivers}`);
console.log(`  • Avec images complètes: ${stats.withImages}`);
console.log(`  • Images manquantes: ${stats.missing.length}`);

if (stats.missing.length > 0) {
    console.log(`\n❌ MANQUANTS (5 premiers):`);
    stats.missing.slice(0, 5).forEach(m => console.log(`  • ${m}`));
}

console.log('\n✅ VÉRIFICATION TERMINÉE');
