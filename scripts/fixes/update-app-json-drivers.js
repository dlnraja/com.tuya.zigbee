#!/usr/bin/env node

/**
 * UPDATE app.json DRIVER REFERENCES
 * Replace old hybrid driver names with new names
 */

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', '..', 'app.json');

console.log('\n🔄 UPDATING app.json DRIVER REFERENCES\n');
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
    let obj = JSON.parse(content);
    let modified = false;
    
    // Update drivers array
    if (obj.drivers && Array.isArray(obj.drivers)) {
        obj.drivers = obj.drivers.map(driver => {
            const replacement = replacements.find(r => driver.id === r.from);
            if (replacement) {
                console.log(`   ✅ ${driver.id} → ${replacement.to}`);
                modified = true;
                return { ...driver, id: replacement.to };
            }
            return driver;
        });
    }
    
    // Update flow cards if they reference old driver IDs
    ['triggers', 'conditions', 'actions'].forEach(flowType => {
        if (obj.flow && obj.flow[flowType]) {
            Object.keys(obj.flow[flowType]).forEach(cardId => {
                const card = obj.flow[flowType][cardId];
                if (card.filter) {
                    const driverFilter = card.filter.includes('driver_id=');
                    if (driverFilter) {
                        replacements.forEach(({ from, to }) => {
                            if (card.filter.includes(`driver_id=${from}`)) {
                                card.filter = card.filter.replace(`driver_id=${from}`, `driver_id=${to}`);
                                modified = true;
                                console.log(`   ✅ Flow card ${cardId}: ${from} → ${to}`);
                            }
                        });
                    }
                }
            });
        }
    });
    
    if (modified) {
        const newContent = JSON.stringify(obj, null, 2);
        fs.writeFileSync(appJsonPath, newContent, 'utf8');
        console.log('\n✅ app.json UPDATED!\n');
    } else {
        console.log('\nℹ️  No changes needed in app.json\n');
    }
    
} catch (error) {
    console.log(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
}
