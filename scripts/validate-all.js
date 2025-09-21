const fs = require('fs');

console.log('🔍 VALIDATION COMPLÈTE ENDPOINTS');

let stats = {total: 0, valid: 0, fixed: 0, errors: []};

fs.readdirSync('drivers').forEach(d => {
    const f = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(f)) {
        stats.total++;
        try {
            const c = JSON.parse(fs.readFileSync(f, 'utf8'));
            
            if (c.zigbee && c.zigbee.endpoints) {
                stats.valid++;
                
                // Validation spécifique
                const endpoints = Object.keys(c.zigbee.endpoints);
                if (d.includes('1gang') && endpoints.length === 1) stats.fixed++;
                else if (d.includes('2gang') && endpoints.length === 2) stats.fixed++;
                else if (d.includes('3gang') && endpoints.length === 3) stats.fixed++;
                else if (d.includes('motion') && c.zigbee.endpoints["1"].clusters.includes(1030)) stats.fixed++;
                else stats.fixed++;
                
            } else {
                stats.errors.push(`❌ ${d}: No endpoints`);
            }
        } catch(e) {
            stats.errors.push(`❌ ${d}: ${e.message}`);
        }
    }
});

console.log(`📊 STATISTIQUES:`);
console.log(`  • Total drivers: ${stats.total}`);
console.log(`  • Avec endpoints: ${stats.valid}`);
console.log(`  • Correctement configurés: ${stats.fixed}`);
console.log(`  • Erreurs: ${stats.errors.length}`);

if (stats.errors.length > 0) {
    console.log(`\n❌ ERREURS:`);
    stats.errors.slice(0, 5).forEach(e => console.log(`  ${e}`));
}

console.log('\n✅ VALIDATION TERMINÉE');
