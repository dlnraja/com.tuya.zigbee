#!/usr/bin/env node

/**
 * COMPLETE UNBRAND FIX
 * Updates all references in app.json including flow cards
 */

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', '..', 'app.json');

console.log('\n🔄 COMPLETE UNBRAND FIX - UPDATING app.json\n');
console.log('═'.repeat(60));

const replacements = [
    { from: 'switch_hybrid_1gang', to: 'switch_1gang' },
    { from: 'switch_hybrid_2gang_alt', to: 'switch_2gang_alt' },
    { from: 'switch_hybrid_2gang', to: 'switch_2gang' },
    { from: 'switch_hybrid_3gang', to: 'switch_3gang' },
    { from: 'switch_hybrid_4gang', to: 'switch_4gang' },
    { from: 'water_valve_smart_hybrid', to: 'water_valve_controller' }
];

try {
    let content = fs.readFileSync(appJsonPath, 'utf8');
    let totalReplacements = 0;
    
    replacements.forEach(({ from, to }) => {
        const regex = new RegExp(from, 'g');
        const matches = content.match(regex);
        if (matches) {
            console.log(`   ✅ ${from} → ${to} (${matches.length} occurrences)`);
            content = content.replace(regex, to);
            totalReplacements += matches.length;
        }
    });
    
    if (totalReplacements > 0) {
        // Validate JSON before saving
        try {
            JSON.parse(content);
            fs.writeFileSync(appJsonPath, content, 'utf8');
            console.log('\n' + '═'.repeat(60));
            console.log(`✅ UPDATED: ${totalReplacements} total replacements\n`);
        } catch (parseError) {
            console.log(`\n❌ JSON VALIDATION FAILED: ${parseError.message}\n`);
            process.exit(1);
        }
    } else {
        console.log('\nℹ️  No changes needed\n');
    }
    
} catch (error) {
    console.log(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
}
